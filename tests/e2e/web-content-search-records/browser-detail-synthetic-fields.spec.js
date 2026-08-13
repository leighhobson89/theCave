// Proves detail-view rendering code that real content deliberately never
// exercises. Case Number and Date are now real, authored content on every
// Police record (see browser-record-catalog.spec.js), so this file's real
// contribution for those two is a *richer*, more varied set of values than
// any single record shows -- but Officer, Classification, Declassification
// Status and Province (Police), Province and References (Library), and
// Edition (Archives) are a different case entirely: `webContentRegistry.js`
// still renders all of them correctly (see buildLibraryDetail /
// buildPoliceDetail / buildArchiveDetail), but as of the 2026-08-13
// test-coverage follow-up none of them feed a search-results table column,
// so they were deliberately left out of both the content backfill and
// `tools/web_content_builder.js` -- see docs/test-coverage-analysis.md §1.3
// and tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md. No real record populates
// them, on purpose, which makes this the *only* place their rendering is
// checked at all. It also covers ground no real record can: a
// References/Attachments list with more than one entry, and a labeled
// `{ label, value }` entry, neither of which a single-item authored list
// would exercise.
//
// This intercepts each site's catalog fetch to add one deliberately
// fully-populated synthetic record -- the same technique
// evidence-missing-catalog-entry.spec.js uses to reach an otherwise
// unreachable error path.
const { test, expect } = require("@playwright/test");
const { startNewGame, openNetscape, openLibrary, openPolice, openArchives, policeQuery } = require("../../support/game-helpers");

const EMPTY_EVIDENCE = Object.freeze({
  type: "",
  storageKey: "",
  titleKey: "",
  name: "",
  defaultTitleString: "",
  paperStyle: "",
  description: "",
  photoCaption: "",
  source: { kind: "", languageAware: false, catalogPathTemplate: "", entryId: "" },
});

function metadataValue(scope, label) {
  return scope
    .locator(".browser-detail-meta-item")
    .filter({ has: scope.page().locator(".browser-detail-meta-label", { hasText: new RegExp(`^${label}$`) }) })
    .locator(".browser-detail-meta-value");
}

test("a fully-populated Library record renders Publisher, Province and its References block", async ({ page }) => {
  await page.route("**/assets/en/library.json", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.records.push({
      id: "test-full-metadata-library",
      author: "Testing Author",
      title: "Full Metadata Test Volume",
      publisher: "Testing House Press",
      province: "Manitoba",
      publicationYear: 1999,
      keywords: ["Full Metadata Test Volume"],
      summary: "A record authored purely to prove every Library metadata field renders.",
      extract: ["Extract paragraph for the full metadata test volume."],
      references: [
        "A Companion Volume, 1907",
        { label: "Cross reference", value: "Case File 12" },
      ],
      images: [],
      awardsEvidence: false,
      evidence: EMPTY_EVIDENCE,
    });
    await route.fulfill({ response, json: payload });
  });

  await startNewGame(page);
  await openNetscape(page);
  await openLibrary(page);

  await page.locator("input[aria-label='Library author']").fill("Testing Author");
  await page.locator("input[aria-label='Library title']").fill("Full Metadata Test Volume");
  await page.getByRole("button", { name: "Search Catalog" }).click();
  await page.locator(".browser-results-library tbody .browser-results-row").click();

  const detail = page.locator(".browser-record-layout-library");
  await expect(detail.locator(".browser-record-title")).toHaveText("Full Metadata Test Volume");
  await expect(metadataValue(detail, "Author")).toHaveText("Testing Author");
  await expect(metadataValue(detail, "Publisher")).toHaveText("Testing House Press");
  await expect(metadataValue(detail, "Province")).toHaveText("Manitoba");
  await expect(metadataValue(detail, "Publication Year")).toHaveText("1999");

  const referencesSection = detail.locator(".browser-detail-references");
  await expect(referencesSection.locator(".browser-detail-section-title")).toHaveText("References");
  const referenceItems = referencesSection.locator(".browser-detail-list-item");
  await expect(referenceItems).toHaveCount(2);
  await expect(referenceItems.nth(0)).toHaveText("A Companion Volume, 1907");
  await expect(referenceItems.nth(1)).toHaveText("Cross reference: Case File 12");
});

test("a fully-populated Police record renders Case Number, Province, Officer, Classification, Declassification, Date and its Attachments block", async ({ page }) => {
  await page.route("**/assets/en/police.json", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.records.push({
      id: "test-full-metadata-police",
      title: "Full Metadata Test File",
      keywords: ["full metadata test file"],
      summary: "A record authored purely to prove every Police metadata field renders.",
      report: ["Report body for the full metadata test file."],
      caseNumber: "TEST-0001",
      province: "Saskatchewan",
      officer: "Sergeant Test Officer",
      classification: "Restricted",
      declassificationStatus: "Declassified 2000",
      date: "1 January 1900",
      requiredPrivilegeLevel: 0,
      images: [],
      attachments: [
        "Evidence Bag #4",
        { label: "Cross reference", value: "Case File 12" },
      ],
      awardsEvidence: false,
      evidence: EMPTY_EVIDENCE,
    });
    await route.fulfill({ response, json: payload });
  });

  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const query = policeQuery(page);
  await query.fill("full metadata test file");
  await query.press("Enter");
  await page.locator(".browser-results-police tbody .browser-results-row").click();

  const detail = page.locator(".browser-record-layout-police");
  await expect(detail.locator(".browser-record-title")).toHaveText("Full Metadata Test File");
  await expect(metadataValue(detail, "Case Number")).toHaveText("TEST-0001");
  await expect(metadataValue(detail, "Province")).toHaveText("Saskatchewan");
  await expect(metadataValue(detail, "Officer")).toHaveText("Sergeant Test Officer");
  await expect(metadataValue(detail, "Classification")).toHaveText("Restricted");
  await expect(metadataValue(detail, "Declassification")).toHaveText("Declassified 2000");
  await expect(metadataValue(detail, "Date")).toHaveText("1 January 1900");

  const attachmentsSection = detail.locator(".browser-detail-attachments");
  await expect(attachmentsSection.locator(".browser-detail-section-title")).toHaveText("Attachments");
  const attachmentItems = attachmentsSection.locator(".browser-detail-list-item");
  await expect(attachmentItems).toHaveCount(2);
  await expect(attachmentItems.nth(0)).toHaveText("Evidence Bag #4");
  await expect(attachmentItems.nth(1)).toHaveText("Cross reference: Case File 12");
});

test("a fully-populated Archives record renders its Edition field", async ({ page }) => {
  await page.route("**/assets/en/archives.json", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.records.push({
      id: "test-full-metadata-archives",
      date: "1 January 1900",
      province: "Quebec",
      headline: "Full Metadata Test Headline",
      publication: "The Testing Gazette",
      edition: "Morning Edition",
      keywords: ["full metadata test headline"],
      summary: "A record authored purely to prove the Edition metadata field renders.",
      article: ["Article body for the full metadata test headline."],
      requiredAccessLevel: 0,
      images: [],
      awardsEvidence: false,
      evidence: EMPTY_EVIDENCE,
    });
    await route.fulfill({ response, json: payload });
  });

  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await page.locator("select[aria-label='Province selector']").selectOption("Quebec");
  await page.locator("input[aria-label='Archive keyword search']").fill("full metadata test headline");
  await page.locator("input[aria-label='Archive keyword search']").press("Enter");
  await page.locator(".browser-results-archives tbody .browser-results-row").click();

  const detail = page.locator(".browser-record-layout-archives");
  await expect(detail.locator(".browser-record-title-headline")).toHaveText("Full Metadata Test Headline");
  await expect(metadataValue(detail, "Publication")).toHaveText("The Testing Gazette");
  await expect(metadataValue(detail, "Edition")).toHaveText("Morning Edition");
  await expect(metadataValue(detail, "Province")).toHaveText("Quebec");
  await expect(metadataValue(detail, "Date")).toHaveText("1 January 1900");
});
