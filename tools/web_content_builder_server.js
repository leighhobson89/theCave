const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5058;
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");

const LANGUAGE_CODES = ["en", "de", "es", "fr", "it"];

// Every language-aware asset lives under assets/<lang>/ now - site JSON,
// evidence catalogs, and story markdown alike. The builder only edits the
// English source copy of site content for now, since translated copies are
// populated separately.
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(text);
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function safeNormalizeId(idValue) {
  return String(idValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function ensureArrayBucket(data, bucket) {
  if (!Array.isArray(data[bucket])) {
    data[bucket] = [];
  }
}

function upsertById(entries, entry) {
  const existingIndex = entries.findIndex((candidate) => candidate && candidate.id === entry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
    return "updated";
  }

  entries.push(entry);
  return "created";
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function normalizeDefaultTitleString(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.length % 2 === 0) {
    const halfLength = raw.length / 2;
    const left = raw.slice(0, halfLength);
    const right = raw.slice(halfLength);
    if (left === right) {
      return left.trim();
    }
  }

  return raw;
}

function inferPhotoPathFromRecord(record) {
  const directSourcePath = firstNonEmptyString(record?.evidence?.source?.photoPath);
  if (directSourcePath) {
    return directSourcePath;
  }

  const firstImageSrc = Array.isArray(record?.images)
    ? firstNonEmptyString(record.images[0]?.src, record.images[0])
    : "";

  return firstImageSrc;
}

function inferPhotoCaptionFromRecord(record, evidence) {
  return firstNonEmptyString(
    evidence?.photoCaption,
    record?.images?.[0]?.alt,
    record?.images?.[0]?.caption
  );
}

function coerceEvidenceText(value) {
  if (Array.isArray(value)) {
    return value
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  return String(value || "").trim();
}

function inferReportTextFromRecord(record) {
  return firstNonEmptyString(
    coerceEvidenceText(record?.evidence?.reportText),
    coerceEvidenceText(record?.report),
    coerceEvidenceText(record?.article),
    coerceEvidenceText(record?.extract),
    coerceEvidenceText(record?.pageContent),
    coerceEvidenceText(record?.content),
    coerceEvidenceText(record?.body)
  );
}

function resolveEvidenceCatalogFilePath(evidenceType, languageCode) {
  const normalizedType = String(evidenceType || "").trim().toLowerCase();
  const normalizedLanguage = String(languageCode || "").trim().toLowerCase();
  const fileName = EVIDENCE_CATALOG_FILE_BY_TYPE[normalizedType];
  if (!fileName || !LANGUAGE_CODES.includes(normalizedLanguage)) {
    return "";
  }

  return path.join(ASSETS_DIR, normalizedLanguage, fileName);
}

function ensureEntriesBucket(payload) {
  if (!payload || typeof payload !== "object") {
    return { entries: [] };
  }

  if (!Array.isArray(payload.entries)) {
    payload.entries = [];
  }

  return payload;
}

function buildPhotoCatalogEntry(record, evidence) {
  const entryId = firstNonEmptyString(evidence?.source?.entryId, evidence?.name);
  if (!entryId) {
    throw new Error("Evidence source.entryId or evidence name is required for photo evidence.");
  }

  const photoPath = firstNonEmptyString(evidence?.source?.photoPath, inferPhotoPathFromRecord(record));
  if (!photoPath) {
    throw new Error(`Photo evidence '${entryId}' is missing a usable image path. Add an image path in the form or set evidence.source.photoPath.`);
  }

  return {
    id: entryId,
    photoPath,
    defaultTitleString: firstNonEmptyString(
      normalizeDefaultTitleString(evidence?.defaultTitleString),
      evidence?.name,
      entryId
    ),
    paperStyle: firstNonEmptyString(evidence?.paperStyle, "photo-mounted"),
    descriptionText: coerceEvidenceText(evidence?.description),
    captionText: inferPhotoCaptionFromRecord(record, evidence),
  };
}

function buildReportCatalogEntry(record, evidence) {
  const entryId = firstNonEmptyString(evidence?.source?.entryId, evidence?.name);
  if (!entryId) {
    throw new Error("Evidence source.entryId or evidence name is required for report evidence.");
  }

  return {
    id: entryId,
    defaultTitleString: firstNonEmptyString(
      normalizeDefaultTitleString(evidence?.defaultTitleString),
      evidence?.name,
      entryId
    ),
    paperStyle: firstNonEmptyString(evidence?.paperStyle, "report-parchment"),
    reportText: inferReportTextFromRecord(record),
    descriptionText: coerceEvidenceText(evidence?.description),
  };
}

function mergeCatalogEntriesForLanguage(existingEntry, incomingEntry, evidenceType) {
  const merged = {
    ...(existingEntry || {}),
    id: incomingEntry.id,
    defaultTitleString: firstNonEmptyString(incomingEntry.defaultTitleString, existingEntry?.defaultTitleString),
    paperStyle: firstNonEmptyString(incomingEntry.paperStyle, existingEntry?.paperStyle),
  };

  if (evidenceType === "photo") {
    merged.photoPath = firstNonEmptyString(incomingEntry.photoPath, existingEntry?.photoPath);
    merged.captionText = firstNonEmptyString(incomingEntry.captionText, existingEntry?.captionText);
  }

  if (evidenceType === "report") {
    merged.reportText = firstNonEmptyString(incomingEntry.reportText, existingEntry?.reportText);
  }

  const incomingDescription = String(incomingEntry.descriptionText || "").trim();
  const existingDescription = String(existingEntry?.descriptionText || "").trim();
  merged.descriptionText = incomingDescription || existingDescription;

  return merged;
}

function sanitizeEvidenceForWebContentStorage(entry) {
  if (!entry || typeof entry !== "object" || !entry.evidence) {
    return entry;
  }

  const sanitizeEntry = (evidenceEntry) => {
    if (!evidenceEntry || typeof evidenceEntry !== "object") {
      return evidenceEntry;
    }

    const sanitizedEvidence = {
      ...evidenceEntry,
      source: evidenceEntry?.source ? { ...evidenceEntry.source } : evidenceEntry?.source,
    };

    const isCatalogBackedPhoto = String(sanitizedEvidence?.type || "").trim() === "photo"
      && String(sanitizedEvidence?.source?.kind || "").trim() === "photo-localized-catalog-entry";

    if (isCatalogBackedPhoto) {
      delete sanitizedEvidence.description;
      delete sanitizedEvidence.photoCaption;
    }

    return sanitizedEvidence;
  };

  const sanitizedEntry = {
    ...entry,
    evidence: Array.isArray(entry.evidence) ? entry.evidence.map(sanitizeEntry) : sanitizeEntry(entry.evidence),
  };

  return sanitizedEntry;
}

function upsertEvidenceCatalogEntries(normalizedEntry) {
  const shouldAwardEvidence = Boolean(normalizedEntry?.awardsEvidence);
  if (!shouldAwardEvidence || !normalizedEntry?.evidence) {
    return [];
  }

  const evidenceEntries = Array.isArray(normalizedEntry.evidence)
    ? normalizedEntry.evidence
    : [normalizedEntry.evidence];

  const updates = [];

  evidenceEntries.forEach((evidence) => {
    if (!evidence || typeof evidence !== "object") {
      return;
    }

    const evidenceType = String(evidence.type || "").trim().toLowerCase();
    if (evidenceType !== "photo" && evidenceType !== "report") {
      return;
    }

    const incomingCatalogEntry = evidenceType === "photo"
      ? buildPhotoCatalogEntry(normalizedEntry, evidence)
      : buildReportCatalogEntry(normalizedEntry, evidence);

    LANGUAGE_CODES.forEach((languageCode) => {
      const catalogFilePath = resolveEvidenceCatalogFilePath(evidenceType, languageCode);
      if (!catalogFilePath) {
        return;
      }

      const catalogJson = ensureEntriesBucket(readJsonFile(catalogFilePath));
      const existingIndex = catalogJson.entries.findIndex((candidate) => candidate && candidate.id === incomingCatalogEntry.id);
      const existingEntry = existingIndex >= 0 ? catalogJson.entries[existingIndex] : null;

      const mergedEntry = mergeCatalogEntriesForLanguage(
        existingEntry,
        incomingCatalogEntry,
        evidenceType
      );

      if (existingIndex >= 0) {
        catalogJson.entries[existingIndex] = mergedEntry;
      } else {
        catalogJson.entries.push(mergedEntry);
      }

      writeJsonFile(catalogFilePath, catalogJson);
      updates.push({
        language: languageCode,
        file: `assets/${languageCode}/${path.basename(catalogFilePath)}`,
        action: existingIndex >= 0 ? "updated" : "created",
        entryId: incomingCatalogEntry.id,
        evidenceType,
      });
    });
  });

  return updates;
}

function normalizePayload(rawPayload) {
  const siteId = String(rawPayload.siteId || "").trim();
  const bucket = String(rawPayload.bucket || "").trim();
  const entry = rawPayload.entry;

  if (!Object.prototype.hasOwnProperty.call(SITE_FILE_BY_ID, siteId)) {
    throw new Error(`Unsupported siteId: ${siteId}`);
  }

  if (bucket !== "records" && bucket !== "standalonePages") {
    throw new Error(`Unsupported bucket: ${bucket}`);
  }

  if (!entry || typeof entry !== "object") {
    throw new Error("entry must be an object.");
  }

  const id = safeNormalizeId(entry.id);
  if (!id) {
    throw new Error("entry.id is required.");
  }

  const normalizedEntry = {
    ...entry,
    id,
  };

  return {
    siteId,
    bucket,
    entry: normalizedEntry,
  };
}

// Writes the same (English) entry into every language's copy of the site
// file, not just assets/en/. Translations aren't authored by this tool yet,
// so every language gets the identical English content - the point is that
// all five files stay structurally in sync (same ids, same bucket shape) the
// moment content is created, ready for a translator to edit in place later.
function upsertSiteContentAcrossLanguages(payload, persistedEntry) {
  const fileName = SITE_FILE_BY_ID[payload.siteId];

  return LANGUAGE_CODES.map((languageCode) => {
    const filePath = path.join(ASSETS_DIR, languageCode, fileName);
    const json = readJsonFile(filePath);
    ensureArrayBucket(json, payload.bucket);
    const action = upsertById(json[payload.bucket], persistedEntry);
    writeJsonFile(filePath, json);

    return {
      language: languageCode,
      file: `assets/${languageCode}/${fileName}`,
      action,
    };
  });
}

function handleUpsert(rawPayload) {
  const payload = normalizePayload(rawPayload);

  const evidenceCatalogUpdates = upsertEvidenceCatalogEntries(payload.entry);
  const persistedEntry = sanitizeEvidenceForWebContentStorage(payload.entry);
  const siteContentUpdates = upsertSiteContentAcrossLanguages(payload, persistedEntry);
  const primaryUpdate = siteContentUpdates.find((update) => update.language === "en") || siteContentUpdates[0];

  return {
    ok: true,
    action: primaryUpdate.action,
    id: payload.entry.id,
    bucket: payload.bucket,
    targetFile: primaryUpdate.file,
    siteContentUpdates,
    evidenceCatalogUpdates,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendText(res, 204, "");
    return;
  }

  if (req.method === "POST" && req.url === "/api/web-content/upsert") {
    try {
      const body = await parseRequestBody(req);
      const result = handleUpsert(body);
      sendJson(res, 200, result);
    } catch (error) {
      sendText(res, 400, error.message || "Failed to process request.");
    }
    return;
  }

  sendText(res, 404, "Not Found");
});

server.listen(PORT, () => {
  console.log(`Web content builder API listening on http://localhost:${PORT}`);
  console.log(`Project root: ${PROJECT_ROOT}`);
});
