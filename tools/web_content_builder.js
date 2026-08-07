const INJECT_API_URL = "http://localhost:5058/api/web-content/upsert";

const contentTypeSelect = document.getElementById("contentTypeSelect");
const idInput = document.getElementById("idInput");
const urlInput = document.getElementById("urlInput");
const titleInput = document.getElementById("titleInput");
const summaryInput = document.getElementById("summaryInput");
const bodyInput = document.getElementById("bodyInput");
const imagesInput = document.getElementById("imagesInput");

const zoomsearchFieldsPanel = document.getElementById("zoomsearchFieldsPanel");
const libraryFieldsPanel = document.getElementById("libraryFieldsPanel");
const policeFieldsPanel = document.getElementById("policeFieldsPanel");
const archivesFieldsPanel = document.getElementById("archivesFieldsPanel");
const standaloneStylePanel = document.getElementById("standaloneStylePanel");

const zoomKeywordsInput = document.getElementById("zoomKeywordsInput");
const authorInput = document.getElementById("authorInput");
const libraryPublicationTitleInput = document.getElementById("libraryPublicationTitleInput");

const policeKeywordsInput = document.getElementById("policeKeywordsInput");
const requiredPrivilegeInput = document.getElementById("requiredPrivilegeInput");

const archiveProvinceInput = document.getElementById("archiveProvinceInput");
const publicationInput = document.getElementById("publicationInput");
const archivesKeywordsInput = document.getElementById("archivesKeywordsInput");
const requiredAccessInput = document.getElementById("requiredAccessInput");

const standaloneBgColorInput = document.getElementById("standaloneBgColorInput");
const standaloneFontSelect = document.getElementById("standaloneFontSelect");

const previewButton = document.getElementById("previewButton");
const injectButton = document.getElementById("injectButton");
const clearButton = document.getElementById("clearButton");
const previewOutput = document.getElementById("previewOutput");
const status = document.getElementById("status");

function setStatus(message) {
  status.textContent = message;
}

function slugifyId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCommaList(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseParagraphs(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseLineList(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseImages(value) {
  return parseLineList(value).map((src) => ({ src }));
}

function toNumberOrDefault(value, fallback = 0) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCurrentType() {
  return String(contentTypeSelect.value || "zoomsearch").trim();
}

function getCommonFields() {
  const contentType = getCurrentType();
  const id = slugifyId(idInput.value);
  if (!id) {
    throw new Error("Content ID is required.");
  }

  idInput.value = id;

  const url = String(urlInput.value || "").trim();
  const title = String(titleInput.value || "").trim();
  const summary = String(summaryInput.value || "").trim();
  const bodyLines = parseParagraphs(bodyInput.value);
  const images = parseImages(imagesInput.value);

  if (contentType === "standalone" && !url) {
    throw new Error("URL is required for Standalone Page content type.");
  }

  return {
    contentType,
    id,
    url,
    title,
    summary,
    bodyLines,
    images,
  };
}

function buildStandaloneEntry(common) {
  return {
    siteId: "standalone",
    bucket: "records",
    entry: {
      id: common.id,
      title: common.title || common.id,
      url: common.url,
      source: "Standalone route",
      content: common.bodyLines.length ? common.bodyLines : [""],
      style: {
        backgroundColor: String(standaloneBgColorInput.value || "").trim() || "#eceff3",
        fontFamily: String(standaloneFontSelect.value || "").trim() || "Arial, Helvetica, sans-serif",
      },
    },
  };
}

function buildZoomsearchEntry(common) {
  const keywords = parseCommaList(zoomKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Zoom Search keywords are required.");
  }

  return {
    siteId: "zoomsearch",
    bucket: "records",
    entry: {
      id: common.id,
      websiteName: "Manual Builder Import",
      pageTitle: common.title || common.id,
      url: common.url || `http://www.zoomsearch.net/manual/${common.id}`,
      keywords,
      summary: common.summary || "",
      pageContent: common.bodyLines,
      images: common.images,
    },
  };
}

function buildLibraryEntry(common) {
  const publicationTitle = String(libraryPublicationTitleInput.value || "").trim();
  if (!String(authorInput.value || "").trim() || !publicationTitle) {
    throw new Error("Library Archive requires Author and Publication Title.");
  }

  return {
    siteId: "library",
    bucket: "records",
    entry: {
      id: common.id,
      author: String(authorInput.value || "").trim(),
      title: publicationTitle,
      keywords: [publicationTitle],
      summary: common.summary || "",
      extract: common.bodyLines,
      images: common.images,
    },
  };
}

function buildPoliceEntry(common) {
  const keywords = parseCommaList(policeKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Police Records keywords are required.");
  }

  return {
    siteId: "police",
    bucket: "records",
    entry: {
      id: common.id,
      title: common.title || common.id,
      keywords,
      summary: common.summary || "",
      report: common.bodyLines,
      requiredPrivilegeLevel: toNumberOrDefault(requiredPrivilegeInput.value, 0),
      images: common.images,
    },
  };
}

function buildArchivesEntry(common) {
  const keywords = parseCommaList(archivesKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Canada Newspaper Archive keywords are required.");
  }

  return {
    siteId: "archives",
    bucket: "records",
    entry: {
      id: common.id,
      province: String(archiveProvinceInput.value || "").trim(),
      headline: common.title || common.id,
      publication: String(publicationInput.value || "").trim(),
      keywords,
      summary: common.summary || "",
      article: common.bodyLines,
      requiredAccessLevel: toNumberOrDefault(requiredAccessInput.value, 0),
      images: common.images,
    },
  };
}

function buildPayload() {
  const common = getCommonFields();

  if (common.contentType === "standalone") {
    return buildStandaloneEntry(common);
  }

  if (common.contentType === "zoomsearch") {
    return buildZoomsearchEntry(common);
  }

  if (common.contentType === "library") {
    return buildLibraryEntry(common);
  }

  if (common.contentType === "police") {
    return buildPoliceEntry(common);
  }

  if (common.contentType === "archives") {
    return buildArchivesEntry(common);
  }

  throw new Error(`Unsupported content type: ${common.contentType}`);
}

function renderPreview() {
  const payload = buildPayload();
  previewOutput.textContent = JSON.stringify(payload, null, 2);
  setStatus("Preview generated.");
  return payload;
}

async function injectPayload() {
  const payload = renderPreview();

  let response;
  try {
    response = await fetch(INJECT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error("Inject API is offline. Start it with: node tools/web_content_builder_server.js");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Inject failed (${response.status})`);
  }

  const result = await response.json();
  setStatus(`Injected ${result.action} entry '${result.id}' into ${result.targetFile} (${result.bucket}).`);
}

function clearForm() {
  [
    idInput,
    urlInput,
    titleInput,
    summaryInput,
    bodyInput,
    imagesInput,
    zoomKeywordsInput,
    authorInput,
    libraryPublicationTitleInput,
    policeKeywordsInput,
    archiveProvinceInput,
    archivesKeywordsInput,
    publicationInput,
    requiredAccessInput,
  ].forEach((element) => {
    element.value = "";
  });

  standaloneBgColorInput.value = "#eceff3";
  standaloneFontSelect.selectedIndex = 0;
  contentTypeSelect.selectedIndex = 0;
  previewOutput.textContent = "{}";
  setStatus("Cleared.");
  syncFieldStates();
}

function syncFieldStates() {
  const contentType = getCurrentType();
  const isStandalone = contentType === "standalone";
  urlInput.required = isStandalone;

  // Keep all sections visible so authors can reference field requirements while switching types.
  zoomsearchFieldsPanel.classList.remove("is-hidden");
  libraryFieldsPanel.classList.remove("is-hidden");
  policeFieldsPanel.classList.remove("is-hidden");
  archivesFieldsPanel.classList.remove("is-hidden");
  standaloneStylePanel.classList.remove("is-hidden");
}

previewButton.addEventListener("click", () => {
  try {
    renderPreview();
  } catch (error) {
    setStatus(error.message);
  }
});

injectButton.addEventListener("click", async () => {
  try {
    await injectPayload();
  } catch (error) {
    setStatus(error.message);
  }
});

clearButton.addEventListener("click", () => {
  clearForm();
});

contentTypeSelect.addEventListener("change", () => {
  syncFieldStates();
});

syncFieldStates();
