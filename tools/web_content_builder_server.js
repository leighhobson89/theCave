const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5058;
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WEB_CONTENT_DIR = path.join(PROJECT_ROOT, "assets", "web-content");

const SITE_FILE_BY_ID = {
  zoomsearch: "zoomsearch.json",
  library: "library.json",
  police: "police.json",
  archives: "archives.json",
  standalone: "standalone-pages.json",
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

function handleUpsert(rawPayload) {
  const payload = normalizePayload(rawPayload);
  const fileName = SITE_FILE_BY_ID[payload.siteId];
  const filePath = path.join(WEB_CONTENT_DIR, fileName);

  const json = readJsonFile(filePath);
  ensureArrayBucket(json, payload.bucket);

  const action = upsertById(json[payload.bucket], payload.entry);
  writeJsonFile(filePath, json);

  return {
    ok: true,
    action,
    id: payload.entry.id,
    bucket: payload.bucket,
    targetFile: `assets/web-content/${fileName}`,
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
