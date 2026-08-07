const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5057;
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const EVIDENCE_MANAGER_PATH = path.join(PROJECT_ROOT, "evidenceManager.js");

const REPORT_FILE_BY_LANG = {
  en: "reportsEvidences_en.json",
  de: "reportsEvidences_de.json",
  es: "reportsEvidences_es.json",
  fr: "reportsEvidences_fr.json",
  it: "reportsEvidences_it.json",
};

const PHOTO_FILE_BY_LANG = {
  en: "photos_evidences_en.json",
  de: "photos_evidences_de.json",
  es: "photos_evidences_es.json",
  fr: "photos_evidences_fr.json",
  it: "photos_evidences_it.json",
};

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(message);
}

function ensureEntriesShape(data) {
  if (!data || typeof data !== "object") {
    return { entries: [] };
  }
  if (!Array.isArray(data.entries)) {
    data.entries = [];
  }
  return data;
}

function slugifyId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleFromId(idValue) {
  return String(idValue || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDefaultEntry(target, id, title, paperStyle, photoPath) {
  const defaultTitle = title || toTitleFromId(id);
  if (target === "photoDescription") {
    return {
      id,
      photoPath: photoPath || "./assets/photos/caveEntrance.png",
      defaultTitleString: defaultTitle,
      paperStyle: paperStyle || "photo-mounted-ivory",
      descriptionText: "",
    };
  }

  return {
    id,
    defaultTitleString: defaultTitle,
    paperStyle: paperStyle || "report-parchment",
    reportText: "",
    descriptionText: "",
  };
}

function applyTargetValue(entry, target, value, photoPath) {
  if (target === "reportText") {
    entry.reportText = value;
    return;
  }

  entry.descriptionText = value;
  if (target === "photoDescription" && photoPath) {
    entry.photoPath = photoPath;
  }
}

function upsertEvidenceJson(data, options) {
  const { target, evidenceId, title, paperStyle, photoPath, persistedValue } = options;

  const normalized = ensureEntriesShape(data);
  let entry = normalized.entries.find((candidate) => candidate && candidate.id === evidenceId);
  let created = false;

  if (!entry) {
    entry = buildDefaultEntry(target, evidenceId, title, paperStyle, photoPath);
    normalized.entries.push(entry);
    created = true;
  } else {
    if (!entry.defaultTitleString) {
      entry.defaultTitleString = title || toTitleFromId(evidenceId);
    }
    if (!entry.paperStyle) {
      entry.paperStyle = paperStyle || (target === "photoDescription" ? "photo-mounted-ivory" : "report-parchment");
    }
    if (target === "photoDescription" && !entry.photoPath) {
      entry.photoPath = photoPath || "./assets/photos/caveEntrance.png";
    }
    if (target !== "photoDescription" && typeof entry.reportText !== "string") {
      entry.reportText = "";
    }
    if (typeof entry.descriptionText !== "string") {
      entry.descriptionText = "";
    }
  }

  if (title) {
    entry.defaultTitleString = title;
  }
  if (paperStyle) {
    entry.paperStyle = paperStyle;
  }

  applyTargetValue(entry, target, persistedValue, photoPath);
  return { json: normalized, created };
}

function getAssetsFileName(language, target) {
  if (target === "photoDescription") {
    return PHOTO_FILE_BY_LANG[language];
  }
  return REPORT_FILE_BY_LANG[language];
}

function readJsonFileOrDefault(filePath) {
  if (!fs.existsSync(filePath)) {
    return { entries: [] };
  }

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!raw) {
    return { entries: [] };
  }
  return JSON.parse(raw);
}

function writePrettyJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function hasDefaultBlueprint(managerSource, target, evidenceId, photoPath) {
  const safeId = evidenceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (target === "photoDescription") {
    const safePath = String(photoPath || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byName = new RegExp(`name:\\s*"${safeId}"`);
    const byPath = safePath ? new RegExp(`photoPath:\\s*"${safePath}"`) : null;
    return byName.test(managerSource) || (byPath ? byPath.test(managerSource) : false);
  }

  const byReportName = new RegExp(`reportName:\\s*"${safeId}"`);
  return byReportName.test(managerSource);
}

function escapeJsString(value) {
  return JSON.stringify(String(value ?? ""));
}

function buildDefaultBlueprintSnippet(target, evidenceId, photoPath) {
  if (target === "photoDescription") {
    const resolvedPhotoPath = String(photoPath || "").trim() || `./assets/photos/${evidenceId}.png`;
    return [
      "  {",
      "    kind: EVIDENCE_TYPES.PHOTO,",
      `    photoPath: ${escapeJsString(resolvedPhotoPath)},`,
      `    name: ${escapeJsString(evidenceId)},`,
      "  },",
    ].join("\n");
  }

  return [
    "  {",
    "    kind: EVIDENCE_TYPES.REPORT,",
    `    reportName: ${escapeJsString(evidenceId)},`,
    "  },",
  ].join("\n");
}

function appendDefaultBlueprint(managerSource, snippet) {
  const marker = "const DEFAULT_EVIDENCE_BLUEPRINTS";
  const markerIndex = managerSource.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("Could not locate DEFAULT_EVIDENCE_BLUEPRINTS in evidenceManager.js");
  }

  const arrayStart = managerSource.indexOf("[", markerIndex);
  if (arrayStart < 0) {
    throw new Error("Could not find opening '[' for DEFAULT_EVIDENCE_BLUEPRINTS");
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let isEscaped = false;
  let arrayEnd = -1;

  for (let i = arrayStart; i < managerSource.length; i += 1) {
    const ch = managerSource[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (ch === "\\") {
      isEscaped = true;
      continue;
    }

    if (!inDouble && !inTemplate && ch === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && ch === "`") {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      continue;
    }

    if (ch === "[") {
      depth += 1;
      continue;
    }

    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }

  if (arrayEnd < 0) {
    throw new Error("Could not find closing ']' for DEFAULT_EVIDENCE_BLUEPRINTS");
  }

  const newline = managerSource.includes("\r\n") ? "\r\n" : "\n";
  const normalizedSnippet = snippet.replace(/\n/g, newline);
  const before = managerSource.slice(0, arrayEnd);
  const after = managerSource.slice(arrayEnd);
  const needsLeadingNewline = !before.endsWith(newline);
  const insertion = `${needsLeadingNewline ? newline : ""}${normalizedSnippet}${newline}`;

  return `${before}${insertion}${after}`;
}

function upsertDefaultStartupBlueprint(target, evidenceId, photoPath) {
  const source = fs.readFileSync(EVIDENCE_MANAGER_PATH, "utf8");

  if (hasDefaultBlueprint(source, target, evidenceId, photoPath)) {
    return "already-exists";
  }

  const snippet = buildDefaultBlueprintSnippet(target, evidenceId, photoPath);
  const updated = appendDefaultBlueprint(source, snippet);
  fs.writeFileSync(EVIDENCE_MANAGER_PATH, updated, "utf8");
  return "added";
}

function normalizePayload(payload) {
  const language = String(payload.language || "en").trim();
  const target = String(payload.target || "reportText").trim();
  const evidenceId = slugifyId(payload.evidenceId || "") || `evidence-${Date.now()}`;
  const title = String(payload.title || "").trim();
  const paperStyle = String(payload.paperStyle || "").trim();
  const photoPath = String(payload.photoPath || "").trim();
  const persistedValue = String(payload.persistedValue || "");
  const shouldAddDefaultStartup = payload.shouldAddDefaultStartup === true;

  if (!REPORT_FILE_BY_LANG[language] || !PHOTO_FILE_BY_LANG[language]) {
    throw new Error(`Unsupported language: ${language}`);
  }

  if (!["reportText", "reportDescription", "photoDescription"].includes(target)) {
    throw new Error(`Unsupported target: ${target}`);
  }

  if (!persistedValue.trim()) {
    throw new Error("persistedValue is empty");
  }

  return {
    language,
    target,
    evidenceId,
    title,
    paperStyle,
    photoPath,
    persistedValue,
    shouldAddDefaultStartup,
  };
}

function handleInject(payload) {
  const normalized = normalizePayload(payload);
  const targetFileName = getAssetsFileName(normalized.language, normalized.target);
  const targetPath = path.join(ASSETS_DIR, targetFileName);

  const currentJson = readJsonFileOrDefault(targetPath);
  const { json: nextJson, created } = upsertEvidenceJson(currentJson, normalized);
  writePrettyJson(targetPath, nextJson);

  let startupResult = "skipped";
  if (normalized.shouldAddDefaultStartup) {
    startupResult = upsertDefaultStartupBlueprint(
      normalized.target,
      normalized.evidenceId,
      normalized.photoPath
    );
  }

  return {
    ok: true,
    created,
    startupResult,
    evidenceId: normalized.evidenceId,
    targetFileName,
    projectRoot: PROJECT_ROOT,
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendText(res, 204, "");
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      projectRoot: PROJECT_ROOT,
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/inject") {
    sendText(res, 404, "Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 2 * 1024 * 1024) {
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      const payload = JSON.parse(body || "{}");
      const result = handleInject(payload);
      sendJson(res, 200, result);
    } catch (error) {
      sendText(res, 400, error.message || "Inject failed");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Evidence builder server running on http://localhost:${PORT}`);
  console.log(`Project root is fixed to: ${PROJECT_ROOT}`);
});
