// Regression coverage for tools/web_content_builder_server.js, written after
// the assets/<lang>/ restructure. Confirms three things:
//   1. Content creation still works for all four web-content services plus
//      standalone pages, with and without evidence (including multi-evidence
//      and update-in-place).
//   2. Every upsert now fans the same (English) entry out to all five
//      language files, not just assets/en/, and evidence catalog entries
//      still land in all five languages the way they did before.
//   3. The Police caseNumber generator (GET /next-police-case-number) scans
//      assets/en/police.json fresh on every call rather than trusting a
//      separate counter, so it correctly picks up a case number the moment
//      a record carrying it is actually injected.
//   4. The Progress Evidence panel's server half: the progressEvidenceId
//      allocator (GET /next-progress-evidence-id) and the upsert of a
//      definition into assets/progressEvidence.json, with those fields
//      stripped from the copy stored in the site content files.
//
// The server is a plain Node HTTP server (tools/web_content_builder_server.js),
// not part of the app served by tests/support/static-server.cjs, so this spec
// spawns it directly and talks to its API. Every record/evidence id created is
// prefixed with a per-run token and removed from disk in afterAll, so the
// suite leaves the real content files untouched even when a test fails
// partway through.
const { test, expect, request } = require("@playwright/test");
const { spawn } = require("child_process");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { CASE_NUMBER_PATTERN, parseCaseNumber } = require("../../tools/police_case_number");
const {
  CONTROL_DIGIT_BY_SERVICE,
  highestProgressEvidenceSequence,
} = require("../../tools/progress_evidence_id");

// tests/tools/ -> repo root.
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const SERVER_SCRIPT = path.join(PROJECT_ROOT, "tools", "web_content_builder_server.js");
const API_URL = "http://127.0.0.1:5058/api/web-content/upsert";
const NEXT_CASE_NUMBER_API_URL = "http://127.0.0.1:5058/api/web-content/next-police-case-number";
const NEXT_PROGRESS_EVIDENCE_ID_API_URL = "http://127.0.0.1:5058/api/web-content/next-progress-evidence-id";
const PROGRESS_EVIDENCE_DEFINITIONS_PATH = path.join(ASSETS_DIR, "progressEvidence.json");
const LANGUAGES = ["en", "de", "es", "fr", "it"];

const SITE_FILE_BY_ID = {
  zoomsearch: "zoomsearch.json",
  library: "library.json",
  police: "police.json",
  archives: "archives.json",
  standalone: "standalone-pages.json",
};

const EVIDENCE_CATALOG_FILE_BY_TYPE = {
  photo: "photos_evidences.json",
  report: "reports_evidences.json",
};

const RUN_ID = `pwbuild${Date.now()}`;
let recordId = 0;
function nextId(label) {
  recordId += 1;
  return `${RUN_ID}-${label}-${recordId}`;
}

let serverProcess = null;
let serverStartedByThisSuite = false;
let apiContext = null;

// Tracks every (siteId, bucket, id) record and every (evidenceType, entryId)
// catalog entry this suite writes, so afterAll can strip them back out of
// every language file regardless of which tests passed or failed.
const createdRecords = [];
const createdCatalogEntries = [];

function siteFilePath(languageCode, siteId) {
  return path.join(ASSETS_DIR, languageCode, SITE_FILE_BY_ID[siteId]);
}

function catalogFilePath(languageCode, evidenceType) {
  return path.join(ASSETS_DIR, languageCode, EVIDENCE_CATALOG_FILE_BY_TYPE[evidenceType]);
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function probeServerUp() {
  try {
    const context = await request.newContext();
    const response = await context.fetch(API_URL, { method: "OPTIONS" });
    await context.dispose();
    return response.status() === 204 || response.ok();
  } catch {
    return false;
  }
}

test.beforeAll(async () => {
  if (!(await probeServerUp())) {
    serverProcess = spawn(process.execPath, [SERVER_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: "ignore",
    });
    serverStartedByThisSuite = true;

    const deadline = Date.now() + 15000;
    let isUp = false;
    while (Date.now() < deadline && !isUp) {
      // eslint-disable-next-line no-await-in-loop
      isUp = await probeServerUp();
      if (!isUp) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!isUp) {
      throw new Error("Web content builder API did not start within 15s.");
    }
  }

  apiContext = await request.newContext();
});

test.afterAll(async () => {
  if (apiContext) {
    await apiContext.dispose();
  }

  for (const { siteId, bucket, id } of createdRecords) {
    for (const languageCode of LANGUAGES) {
      // eslint-disable-next-line no-await-in-loop
      await removeRecordFromFile(siteFilePath(languageCode, siteId), bucket, id);
    }
  }

  for (const { evidenceType, entryId } of createdCatalogEntries) {
    for (const languageCode of LANGUAGES) {
      // eslint-disable-next-line no-await-in-loop
      await removeCatalogEntryFromFile(catalogFilePath(languageCode, evidenceType), entryId);
    }
  }

  await removeGeneratedProgressEvidenceDefinitions();

  // Don't just trust the removal loops above: re-read every site file and
  // every evidence catalog, in every language, and fail loudly if anything
  // tagged with this run's id prefix is still there. This is what actually
  // confirms teardown worked, rather than merely attempting it.
  await assertNoLeftoverTestContent();

  if (serverStartedByThisSuite && serverProcess) {
    serverProcess.kill();
  }
});

async function assertNoLeftoverTestContent() {
  const leftoverDescriptions = [];

  for (const languageCode of LANGUAGES) {
    for (const siteId of Object.keys(SITE_FILE_BY_ID)) {
      // eslint-disable-next-line no-await-in-loop
      const json = await readJsonFile(siteFilePath(languageCode, siteId));
      const records = Array.isArray(json.records) ? json.records : [];
      records
        .filter((entry) => String(entry?.id || "").startsWith(RUN_ID))
        .forEach((entry) => leftoverDescriptions.push(`${siteId}/records in assets/${languageCode}: id '${entry.id}'`));
    }

    for (const evidenceType of Object.keys(EVIDENCE_CATALOG_FILE_BY_TYPE)) {
      // eslint-disable-next-line no-await-in-loop
      const json = await readJsonFile(catalogFilePath(languageCode, evidenceType));
      const entries = Array.isArray(json.entries) ? json.entries : [];
      entries
        .filter((entry) => String(entry?.id || "").startsWith(RUN_ID))
        .forEach((entry) => leftoverDescriptions.push(`${evidenceType} catalog in assets/${languageCode}: id '${entry.id}'`));
    }
  }

  const progressEvidenceJson = await readProgressEvidenceDefinitions();
  (progressEvidenceJson.definitions || [])
    .filter((definition) => String(definition?.itemId || "").startsWith(RUN_ID))
    .forEach((definition) => leftoverDescriptions.push(
      `progress evidence definition in assets/progressEvidence.json: itemId '${definition.itemId}'`
    ));

  expect(
    leftoverDescriptions,
    `Test teardown left content behind:\n${leftoverDescriptions.join("\n")}`
  ).toEqual([]);
}

async function readProgressEvidenceDefinitions() {
  if (!fsSync.existsSync(PROGRESS_EVIDENCE_DEFINITIONS_PATH)) {
    return { definitions: [] };
  }

  return readJsonFile(PROGRESS_EVIDENCE_DEFINITIONS_PATH);
}

async function findProgressEvidenceDefinition(service, itemId) {
  const json = await readProgressEvidenceDefinitions();
  return (json.definitions || []).find(
    (definition) => definition?.service === service && definition?.itemId === itemId
  ) || null;
}

// Progress evidence definitions are keyed by service + itemId, and every id this
// suite creates carries the run prefix, so anything matching it is ours.
async function removeGeneratedProgressEvidenceDefinitions() {
  const json = await readProgressEvidenceDefinitions();
  const definitions = Array.isArray(json.definitions) ? json.definitions : [];
  const filtered = definitions.filter((definition) => !String(definition?.itemId || "").startsWith(RUN_ID));
  if (filtered.length === definitions.length) {
    return;
  }

  json.definitions = filtered;
  await fs.writeFile(PROGRESS_EVIDENCE_DEFINITIONS_PATH, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

// The same file the server scans, read straight from disk.
async function readHighestAllocatedSequence(service) {
  return highestProgressEvidenceSequence(await readProgressEvidenceDefinitions(), service);
}

async function fetchNextProgressEvidenceId(service) {
  const response = await apiContext.get(`${NEXT_PROGRESS_EVIDENCE_ID_API_URL}?service=${service}`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return String(body.progressEvidenceId || "");
}

// What the builder's Progress Evidence panel adds to every entry it sends.
function progressEvidenceFields(progressEvidenceId, {
  activated = false,
  developerEnabled = false,
  image = "./assets/photos/progressEvidenceImages/pwTestProgressEvidence.png",
} = {}) {
  return {
    progressEvidenceId,
    progressEvidenceImage: image,
    progressEvidenceActivated: activated,
    progressEvidenceDeveloperEnabled: developerEnabled,
  };
}

async function removeRecordFromFile(filePath, bucket, id) {
  if (!fsSync.existsSync(filePath)) {
    return;
  }

  const json = await readJsonFile(filePath);
  if (!Array.isArray(json[bucket])) {
    return;
  }

  const filtered = json[bucket].filter((entry) => entry?.id !== id);
  if (filtered.length === json[bucket].length) {
    return;
  }

  json[bucket] = filtered;
  await fs.writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

async function removeCatalogEntryFromFile(filePath, entryId) {
  if (!fsSync.existsSync(filePath)) {
    return;
  }

  const json = await readJsonFile(filePath);
  if (!Array.isArray(json.entries)) {
    return;
  }

  const filtered = json.entries.filter((entry) => entry?.id !== entryId);
  if (filtered.length === json.entries.length) {
    return;
  }

  json.entries = filtered;
  await fs.writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

// Registers a record for teardown before it is ever posted. Used directly by
// the rejection tests: a payload the server is *supposed* to refuse writes
// nothing, but if a refusal ever regresses into an acceptance, the record must
// still be cleaned up — and assertNoLeftoverTestContent() will then be the
// thing that fails, rather than the content files quietly gaining a malformed
// record that breaks an unrelated spec later.
function trackRecordForCleanup(siteId, bucket, id) {
  createdRecords.push({ siteId, bucket, id });
  return id;
}

// Posts a payload, records it for cleanup regardless of outcome, and returns
// the parsed response plus the raw HTTP response (for status-code checks).
async function inject(payload) {
  trackRecordForCleanup(payload.siteId, payload.bucket, payload.entry.id);

  const evidenceEntries = Array.isArray(payload.entry.evidence)
    ? payload.entry.evidence
    : payload.entry.evidence
      ? [payload.entry.evidence]
      : [];
  if (payload.entry.awardsEvidence) {
    evidenceEntries.forEach((evidence) => {
      const evidenceType = String(evidence?.type || "").trim().toLowerCase();
      if (evidenceType === "photo" || evidenceType === "report") {
        createdCatalogEntries.push({
          evidenceType,
          entryId: String(evidence?.source?.entryId || evidence?.name || "").trim(),
        });
      }
    });
  }

  const httpResponse = await apiContext.post(API_URL, { data: payload });
  const body = httpResponse.ok() ? await httpResponse.json() : await httpResponse.text();
  return { httpResponse, body };
}

function noEvidence() {
  return {
    awardsEvidence: false,
    evidence: {
      type: "",
      storageKey: "",
      titleKey: "",
      name: "",
      defaultTitleString: "",
      paperStyle: "",
      description: "",
      photoCaption: "",
      source: { kind: "", languageAware: false, catalogPathTemplate: "", entryId: "" },
    },
  };
}

function reportEvidence(entryId, { description = "A test report description." } = {}) {
  return {
    awardsEvidence: true,
    evidence: {
      type: "report",
      storageKey: "reports",
      titleKey: "reports",
      name: entryId,
      defaultTitleString: `Title for ${entryId}`,
      paperStyle: "report-parchment",
      description,
      source: {
        kind: "report-localized-catalog-entry",
        languageAware: true,
        catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
        entryId,
      },
    },
  };
}

function photoEvidence(entryId, { photoPath = "./assets/photos/pwTestPhoto.png" } = {}) {
  return {
    awardsEvidence: true,
    evidence: {
      type: "photo",
      storageKey: "photos",
      titleKey: "photos",
      name: entryId,
      defaultTitleString: `Title for ${entryId}`,
      paperStyle: "photo-mounted",
      description: "A test photo description.",
      photoCaption: "A test caption.",
      source: {
        kind: "photo-localized-catalog-entry",
        languageAware: true,
        catalogPathTemplate: "./assets/{lang}/photos_evidences.json",
        entryId,
        photoPath,
      },
    },
  };
}

function expectSiteContentUpdatesCoverAllLanguages(siteContentUpdates, siteId, expectedAction) {
  expect(siteContentUpdates).toHaveLength(LANGUAGES.length);
  const byLanguage = Object.fromEntries(siteContentUpdates.map((update) => [update.language, update]));
  for (const languageCode of LANGUAGES) {
    expect(byLanguage[languageCode]).toBeTruthy();
    expect(byLanguage[languageCode].action).toBe(expectedAction);
    expect(byLanguage[languageCode].file).toBe(`assets/${languageCode}/${SITE_FILE_BY_ID[siteId]}`);
  }
}

async function expectRecordInEveryLanguage(siteId, bucket, id, assertEntry) {
  for (const languageCode of LANGUAGES) {
    // eslint-disable-next-line no-await-in-loop
    const json = await readJsonFile(siteFilePath(languageCode, siteId));
    const entry = (json[bucket] || []).find((candidate) => candidate?.id === id);
    expect(entry, `expected ${siteId}/${bucket} entry '${id}' in assets/${languageCode}`).toBeTruthy();
    if (assertEntry) {
      assertEntry(entry, languageCode);
    }
  }
}

async function expectCatalogEntryInEveryLanguage(evidenceType, entryId, assertEntry) {
  for (const languageCode of LANGUAGES) {
    // eslint-disable-next-line no-await-in-loop
    const json = await readJsonFile(catalogFilePath(languageCode, evidenceType));
    const entry = (json.entries || []).find((candidate) => candidate?.id === entryId);
    expect(entry, `expected ${evidenceType} catalog entry '${entryId}' in assets/${languageCode}`).toBeTruthy();
    if (assertEntry) {
      assertEntry(entry, languageCode);
    }
  }
}

test.describe("web content builder server", () => {
  test("zoomsearch: creates a record with no evidence and copies it to all five languages", async () => {
    const id = nextId("zoomsearch-plain");
    const evidenceFields = noEvidence();
    const payload = {
      siteId: "zoomsearch",
      bucket: "records",
      entry: {
        id,
        websiteName: "Test Zoom Site",
        pageTitle: "A Test Page",
        url: `http://www.zoomsearch.net/manual/${id}`,
        keywords: ["test keyword"],
        summary: "A test summary.",
        pageContent: ["Body paragraph one."],
        images: [],
        awardsEvidence: evidenceFields.awardsEvidence,
        evidence: evidenceFields.evidence,
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expect(body.ok).toBe(true);
    expect(body.action).toBe("created");
    expect(body.targetFile).toBe("assets/en/zoomsearch.json");
    expect(body.evidenceCatalogUpdates).toEqual([]);
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "zoomsearch", "created");

    await expectRecordInEveryLanguage("zoomsearch", "records", id, (entry) => {
      expect(entry.websiteName).toBe("Test Zoom Site");
      expect(entry.keywords).toEqual(["test keyword"]);
    });
  });

  test("zoomsearch: creates a record with report evidence and syncs the catalog across languages", async () => {
    const id = nextId("zoomsearch-report");
    const entryId = `${id}-evidence`;
    const evidenceFields = reportEvidence(entryId);
    const payload = {
      siteId: "zoomsearch",
      bucket: "records",
      entry: {
        id,
        websiteName: "Test Zoom Site",
        pageTitle: "A Report-Bearing Page",
        url: `http://www.zoomsearch.net/manual/${id}`,
        keywords: ["report keyword"],
        summary: "Summary.",
        pageContent: ["The report body text."],
        images: [],
        awardsEvidence: evidenceFields.awardsEvidence,
        evidence: evidenceFields.evidence,
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expect(body.evidenceCatalogUpdates).toHaveLength(LANGUAGES.length);
    expect(body.evidenceCatalogUpdates.every((update) => update.action === "created")).toBe(true);
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "zoomsearch", "created");

    await expectRecordInEveryLanguage("zoomsearch", "records", id);
    await expectCatalogEntryInEveryLanguage("report", entryId, (entry) => {
      expect(entry.reportText).toBe("The report body text.");
      expect(entry.descriptionText).toBe("A test report description.");
    });
  });

  test("library: creates a record with photo evidence and syncs the catalog across languages", async () => {
    const id = nextId("library-photo");
    const entryId = `${id}-evidence`;
    const evidenceFields = photoEvidence(entryId);
    const payload = {
      siteId: "library",
      bucket: "records",
      entry: {
        id,
        author: "Test Author",
        title: "Test Publication",
        keywords: ["Test Publication"],
        summary: "Summary.",
        extract: ["Extract body."],
        images: [{ src: "./assets/photos/pwTestPhoto.png", alt: "", caption: "" }],
        awardsEvidence: evidenceFields.awardsEvidence,
        evidence: evidenceFields.evidence,
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expect(body.evidenceCatalogUpdates).toHaveLength(LANGUAGES.length);
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "library", "created");

    await expectRecordInEveryLanguage("library", "records", id, (entry) => {
      expect(entry.author).toBe("Test Author");
    });
    await expectCatalogEntryInEveryLanguage("photo", entryId, (entry) => {
      expect(entry.photoPath).toBe("./assets/photos/pwTestPhoto.png");
      expect(entry.captionText).toBe("A test caption.");
    });
  });

  test("police: creates a record without evidence, then updates it in place across all languages", async () => {
    const id = nextId("police-update");
    const basePayload = (title) => ({
      siteId: "police",
      bucket: "records",
      entry: {
        id,
        title,
        keywords: ["police test keyword"],
        summary: "Summary.",
        report: ["Report body."],
        requiredPrivilegeLevel: 0,
        images: [],
        ...noEvidence(),
      },
    });

    const first = await inject(basePayload("Original Title"));
    expect(first.body.action).toBe("created");
    expectSiteContentUpdatesCoverAllLanguages(first.body.siteContentUpdates, "police", "created");

    const second = await inject(basePayload("Updated Title"));
    expect(second.body.action).toBe("updated");
    expectSiteContentUpdatesCoverAllLanguages(second.body.siteContentUpdates, "police", "updated");

    await expectRecordInEveryLanguage("police", "records", id, (entry) => {
      expect(entry.title).toBe("Updated Title");
    });

    // Confirm the update replaced the record rather than duplicating it.
    for (const languageCode of LANGUAGES) {
      // eslint-disable-next-line no-await-in-loop
      const json = await readJsonFile(siteFilePath(languageCode, "police"));
      const matches = json.records.filter((entry) => entry?.id === id);
      expect(matches).toHaveLength(1);
    }
  });

  test("police: creates a record with multiple queued evidence entries (report + photo)", async () => {
    const id = nextId("police-multi");
    const reportEntryId = `${id}-report`;
    const photoEntryId = `${id}-photo`;
    const payload = {
      siteId: "police",
      bucket: "records",
      entry: {
        id,
        title: "Multi Evidence Record",
        keywords: ["multi evidence keyword"],
        summary: "Summary.",
        report: ["Report body for multi-evidence record."],
        requiredPrivilegeLevel: 1,
        images: [{ src: "./assets/photos/pwTestPhoto.png", alt: "", caption: "" }],
        awardsEvidence: true,
        evidence: [
          reportEvidence(reportEntryId).evidence,
          photoEvidence(photoEntryId).evidence,
        ],
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expect(body.evidenceCatalogUpdates).toHaveLength(LANGUAGES.length * 2);
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "police", "created");

    await expectCatalogEntryInEveryLanguage("report", reportEntryId);
    await expectCatalogEntryInEveryLanguage("photo", photoEntryId);
  });

  test("next-police-case-number: returns a well-formed case number strictly higher than the current highest", async () => {
    const before = await readJsonFile(siteFilePath("en", "police"));
    const highestBefore = before.records.reduce((highest, record) => {
      const parsed = parseCaseNumber(record?.caseNumber);
      return parsed !== null && parsed > highest ? parsed : highest;
    }, 0);

    const httpResponse = await apiContext.get(NEXT_CASE_NUMBER_API_URL);
    expect(httpResponse.ok()).toBe(true);
    const body = await httpResponse.json();

    expect(body.caseNumber).toMatch(CASE_NUMBER_PATTERN);
    const generatedNumber = parseCaseNumber(body.caseNumber);
    // The random increment is 10-100 inclusive.
    expect(generatedNumber).toBeGreaterThanOrEqual(highestBefore + 10);
    expect(generatedNumber).toBeLessThanOrEqual(highestBefore + 100);
  });

  test("next-police-case-number: picks up a just-injected record's case number on the very next call", async () => {
    const first = await apiContext.get(NEXT_CASE_NUMBER_API_URL);
    const firstCaseNumber = (await first.json()).caseNumber;
    const firstNumber = parseCaseNumber(firstCaseNumber);

    const id = nextId("police-casenum");
    await inject({
      siteId: "police",
      bucket: "records",
      entry: {
        id,
        title: "Case Number Generation Test Record",
        keywords: ["case number generation test"],
        summary: "Summary.",
        report: ["Report body."],
        requiredPrivilegeLevel: 0,
        caseNumber: firstCaseNumber,
        images: [],
        ...noEvidence(),
      },
    });

    // Confirm the record actually landed with that exact case number before
    // trusting the next generation to have seen it.
    await expectRecordInEveryLanguage("police", "records", id, (entry) => {
      expect(entry.caseNumber).toBe(firstCaseNumber);
    });

    const second = await apiContext.get(NEXT_CASE_NUMBER_API_URL);
    const secondCaseNumber = (await second.json()).caseNumber;
    const secondNumber = parseCaseNumber(secondCaseNumber);

    expect(secondCaseNumber).toMatch(CASE_NUMBER_PATTERN);
    expect(secondNumber).toBeGreaterThanOrEqual(firstNumber + 10);
  });

  test("archives: creates a record with photo evidence", async () => {
    const id = nextId("archives-photo");
    const entryId = `${id}-evidence`;
    const evidenceFields = photoEvidence(entryId);
    const payload = {
      siteId: "archives",
      bucket: "records",
      entry: {
        id,
        province: "Saskatchewan",
        headline: "Test Headline",
        publication: "Test Gazette",
        keywords: ["archives test keyword"],
        summary: "Summary.",
        article: ["Article body."],
        requiredAccessLevel: 0,
        images: [{ src: "./assets/photos/pwTestPhoto.png", alt: "", caption: "" }],
        awardsEvidence: evidenceFields.awardsEvidence,
        evidence: evidenceFields.evidence,
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "archives", "created");

    await expectRecordInEveryLanguage("archives", "records", id, (entry) => {
      expect(entry.headline).toBe("Test Headline");
    });
    await expectCatalogEntryInEveryLanguage("photo", entryId);
  });

  test("standalone: creates a page with report evidence", async () => {
    const id = nextId("standalone-report");
    const entryId = `${id}-evidence`;
    const evidenceFields = reportEvidence(entryId);
    const payload = {
      siteId: "standalone",
      bucket: "records",
      entry: {
        id,
        title: "Test Standalone Page",
        url: `http://test-standalone.example/${id}`,
        content: ["Standalone page body."],
        images: [],
        style: {
          backgroundColor: "#eceff3",
          textColor: "#0f1b2a",
          fontFamily: "Arial, Helvetica, sans-serif",
        },
        awardsEvidence: evidenceFields.awardsEvidence,
        evidence: evidenceFields.evidence,
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expect(body.targetFile).toBe("assets/en/standalone-pages.json");
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "standalone", "created");

    await expectRecordInEveryLanguage("standalone", "records", id, (entry) => {
      expect(entry.url).toBe(`http://test-standalone.example/${id}`);
    });
    await expectCatalogEntryInEveryLanguage("report", entryId, (entry) => {
      expect(entry.reportText).toBe("Standalone page body.");
    });
  });

  test("standalone: creates a page with no evidence", async () => {
    const id = nextId("standalone-plain");
    const payload = {
      siteId: "standalone",
      bucket: "records",
      entry: {
        id,
        title: "Test Standalone Page (No Evidence)",
        url: `http://test-standalone.example/${id}`,
        content: ["Standalone page body, no evidence."],
        images: [],
        style: {
          backgroundColor: "#eceff3",
          textColor: "#0f1b2a",
          fontFamily: "Arial, Helvetica, sans-serif",
        },
        ...noEvidence(),
      },
    };

    const { httpResponse, body } = await inject(payload);
    expect(httpResponse.ok()).toBe(true);
    expect(body.evidenceCatalogUpdates).toEqual([]);
    expectSiteContentUpdatesCoverAllLanguages(body.siteContentUpdates, "standalone", "created");
    await expectRecordInEveryLanguage("standalone", "records", id);
  });

  test("rejects a payload with no entry id", async () => {
    const httpResponse = await apiContext.post(API_URL, {
      data: {
        siteId: "zoomsearch",
        bucket: "records",
        entry: { id: "", websiteName: "x", pageTitle: "x", keywords: ["x"] },
      },
    });
    expect(httpResponse.status()).toBe(400);
    expect(await httpResponse.text()).toContain("entry.id is required");
  });

  test("rejects an unsupported siteId", async () => {
    const httpResponse = await apiContext.post(API_URL, {
      data: { siteId: "not-a-real-site", bucket: "records", entry: { id: "x" } },
    });
    expect(httpResponse.status()).toBe(400);
    expect(await httpResponse.text()).toContain("Unsupported siteId");
  });

  test("rejects an unsupported bucket", async () => {
    const httpResponse = await apiContext.post(API_URL, {
      data: { siteId: "zoomsearch", bucket: "notABucket", entry: { id: "x" } },
    });
    expect(httpResponse.status()).toBe(400);
    expect(await httpResponse.text()).toContain("Unsupported bucket");
  });

  test("next-progress-evidence-id: allocates inside the requested service's block", async () => {
    for (const [service, controlDigit] of Object.entries(CONTROL_DIGIT_BY_SERVICE)) {
      // eslint-disable-next-line no-await-in-loop
      const allocated = await fetchNextProgressEvidenceId(service);

      // Five digits: the service's control digit, then one past the highest
      // four-digit sequence already used inside that service's own block.
      expect(allocated).toMatch(/^\d{5}$/);
      expect(allocated.charAt(0)).toBe(controlDigit);
      // eslint-disable-next-line no-await-in-loop
      expect(Number(allocated.slice(1))).toBe((await readHighestAllocatedSequence(service)) + 1);
    }

    // Purely a read: asking twice without injecting anything hands out the same
    // id, because nothing has claimed it yet.
    expect(await fetchNextProgressEvidenceId("police")).toBe(await fetchNextProgressEvidenceId("police"));
  });

  test("next-progress-evidence-id: rejects a service it does not know", async () => {
    const response = await apiContext.get(`${NEXT_PROGRESS_EVIDENCE_ID_API_URL}?service=notaservice`);
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("Unknown service");
  });

  test("next-progress-evidence-id: picks up a just-injected definition on the very next call", async () => {
    const id = nextId("zoomsearch-progress-next-id");
    const allocated = await fetchNextProgressEvidenceId("zoomsearch");

    const { httpResponse } = await inject({
      siteId: "zoomsearch",
      bucket: "records",
      entry: {
        id,
        websiteName: "Progress Evidence Test Site",
        pageTitle: "Progress Evidence Test Page",
        keywords: [id],
        summary: "",
        pageContent: ["Body."],
        images: [],
        ...noEvidence(),
        ...progressEvidenceFields(allocated),
      },
    });
    expect(httpResponse.ok()).toBe(true);

    // The id just used is now taken, so the next allocation for that service
    // moves past it — and no other service's block is disturbed.
    expect(await fetchNextProgressEvidenceId("zoomsearch")).toBe(
      `0${String(Number(allocated.slice(1)) + 1).padStart(4, "0")}`
    );
    expect((await fetchNextProgressEvidenceId("police")).charAt(0)).toBe("2");
  });

  test("progress evidence fields become a definition and are stripped from the site content", async () => {
    const id = nextId("police-progress-definition");
    const allocated = await fetchNextProgressEvidenceId("police");

    const { httpResponse, body } = await inject({
      siteId: "police",
      bucket: "records",
      entry: {
        id,
        title: "Progress Evidence Police Record",
        keywords: [id],
        summary: "",
        report: ["Body."],
        requiredPrivilegeLevel: 0,
        images: [],
        ...noEvidence(),
        ...progressEvidenceFields(allocated, {
          activated: true,
          developerEnabled: true,
          image: "./assets/photos/progressEvidenceImages/pwTestProgressEvidence.png",
        }),
      },
    });

    expect(httpResponse.ok()).toBe(true);
    expect(body.progressEvidenceUpdate).toMatchObject({
      action: "created",
      file: "assets/progressEvidence.json",
      progressEvidenceId: allocated,
      progressEvidenceActivated: true,
      progressEvidenceDeveloperEnabled: true,
    });

    // The registry owns these fields...
    expect(await findProgressEvidenceDefinition("police", id)).toMatchObject({
      progressEvidenceId: allocated,
      service: "police",
      itemId: id,
      label: "Progress Evidence Police Record",
      imagePath: "./assets/photos/progressEvidenceImages/pwTestProgressEvidence.png",
      progressEvidenceActivated: true,
      progressEvidenceDeveloperEnabled: true,
    });

    // ...so the site content copy carries none of them, in any language.
    await expectRecordInEveryLanguage("police", "records", id, (entry) => {
      expect(entry.progressEvidenceId).toBeUndefined();
      expect(entry.progressEvidenceImage).toBeUndefined();
      expect(entry.progressEvidenceActivated).toBeUndefined();
      expect(entry.progressEvidenceDeveloperEnabled).toBeUndefined();
    });
  });

  test("re-injecting a record updates its definition in place and keeps the id already allocated to it", async () => {
    const id = nextId("archives-progress-reinject");
    const firstAllocated = await fetchNextProgressEvidenceId("archives");

    const buildPayload = (progressEvidenceId, options) => ({
      siteId: "archives",
      bucket: "records",
      entry: {
        id,
        province: "Saskatchewan",
        headline: "Progress Evidence Archives Headline",
        publication: "Test Gazette",
        keywords: [id],
        summary: "",
        article: ["Body."],
        requiredAccessLevel: 0,
        images: [],
        ...noEvidence(),
        ...progressEvidenceFields(progressEvidenceId, options),
      },
    });

    await inject(buildPayload(firstAllocated, { activated: false, developerEnabled: false }));

    // A second pass with a freshly allocated id (which is what the form would
    // hand out after a reload) must not strand the id the game may already have
    // recorded against this record.
    const secondAllocated = await fetchNextProgressEvidenceId("archives");
    expect(secondAllocated).not.toBe(firstAllocated);

    const { body } = await inject(buildPayload(secondAllocated, {
      activated: true,
      developerEnabled: true,
      image: "./assets/photos/progressEvidenceImages/pwTestProgressEvidenceUpdated.png",
    }));

    expect(body.progressEvidenceUpdate).toMatchObject({
      action: "updated",
      progressEvidenceId: firstAllocated,
    });

    const definitions = (await readProgressEvidenceDefinitions()).definitions || [];
    expect(definitions.filter((definition) => definition.itemId === id)).toHaveLength(1);
    expect(await findProgressEvidenceDefinition("archives", id)).toMatchObject({
      progressEvidenceId: firstAllocated,
      imagePath: "./assets/photos/progressEvidenceImages/pwTestProgressEvidenceUpdated.png",
      progressEvidenceActivated: true,
      progressEvidenceDeveloperEnabled: true,
    });
  });

  test("rejects an entry carrying a progressEvidenceId with no image", async () => {
    const httpResponse = await apiContext.post(API_URL, {
      data: {
        siteId: "zoomsearch",
        bucket: "records",
        entry: {
          id: trackRecordForCleanup("zoomsearch", "records", nextId("zoomsearch-progress-no-image")),
          websiteName: "x",
          pageTitle: "x",
          keywords: ["x"],
          progressEvidenceId: "09999",
          progressEvidenceImage: "",
        },
      },
    });

    expect(httpResponse.status()).toBe(400);
    expect(await httpResponse.text()).toContain("progressEvidenceImage is required");
  });

  test("rejects an entry carrying a malformed progressEvidenceId", async () => {
    const httpResponse = await apiContext.post(API_URL, {
      data: {
        siteId: "zoomsearch",
        bucket: "records",
        entry: {
          id: trackRecordForCleanup("zoomsearch", "records", nextId("zoomsearch-progress-bad-id")),
          websiteName: "x",
          pageTitle: "x",
          keywords: ["x"],
          progressEvidenceId: "not-a-number",
          progressEvidenceImage: "./assets/photos/progressEvidenceImages/x.png",
        },
      },
    });

    expect(httpResponse.status()).toBe(400);
    expect(await httpResponse.text()).toContain("must be five digits led by a known service control digit");
  });

  test("rejects an entry whose progressEvidenceId control digit names a different service", async () => {
    const httpResponse = await apiContext.post(API_URL, {
      data: {
        siteId: "zoomsearch",
        bucket: "records",
        entry: {
          id: trackRecordForCleanup("zoomsearch", "records", nextId("zoomsearch-progress-wrong-service")),
          websiteName: "x",
          pageTitle: "x",
          keywords: ["x"],
          // Leading 2 is the Police block, but this is a ZoomSearch record.
          progressEvidenceId: "29999",
          progressEvidenceImage: "./assets/photos/progressEvidenceImages/x.png",
        },
      },
    });

    expect(httpResponse.status()).toBe(400);
    expect(await httpResponse.text()).toContain("belongs to service 'police'");
  });
});
