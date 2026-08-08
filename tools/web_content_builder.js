const INJECT_API_URL = "http://localhost:5058/api/web-content/upsert";

const contentTypeSelect = document.getElementById("contentTypeSelect");
const idInput = document.getElementById("idInput");
const urlInput = document.getElementById("urlInput");
const websiteNameInput = document.getElementById("websiteNameInput");
const titleInput = document.getElementById("titleInput");
const summaryInput = document.getElementById("summaryInput");
const bodyInput = document.getElementById("bodyInput");
const imagesInput = document.getElementById("imagesInput");
const chooseImagePathsButton = document.getElementById("chooseImagePathsButton");
const imagePathsPicker = document.getElementById("imagePathsPicker");

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

const awardsEvidenceInput = document.getElementById("awardsEvidenceInput");
const evidenceTypeInput = document.getElementById("evidenceTypeInput");
const evidenceStorageKeyInput = document.getElementById("evidenceStorageKeyInput");
const evidenceTitleKeyInput = document.getElementById("evidenceTitleKeyInput");
const evidenceNameInput = document.getElementById("evidenceNameInput");
const evidenceDefaultTitleInput = document.getElementById("evidenceDefaultTitleInput");
const evidencePaperStyleInput = document.getElementById("evidencePaperStyleInput");
const evidenceDescriptionInput = document.getElementById("evidenceDescriptionInput");
const evidencePhotoCaptionInput = document.getElementById("evidencePhotoCaptionInput");
const evidenceFieldsGrid = document.getElementById("evidenceFieldsGrid");
const standaloneBgColorPickButton = document.getElementById("standaloneBgColorPickButton");
const standaloneBgColorPicker = document.getElementById("standaloneBgColorPicker");
const standaloneTextColorPickButton = document.getElementById("standaloneTextColorPickButton");
const standaloneTextColorPicker = document.getElementById("standaloneTextColorPicker");

const standaloneBgColorInput = document.getElementById("standaloneBgColorInput");
const standaloneTextColorInput = document.getElementById("standaloneTextColorInput");
const standaloneFontSelect = document.getElementById("standaloneFontSelect");
const standaloneImageCaptionAltInput = document.getElementById("standaloneImageCaptionAltInput");
const standaloneApplyCaptionInput = document.getElementById("standaloneApplyCaptionInput");
const standaloneApplyAltInput = document.getElementById("standaloneApplyAltInput");

const previewButton = document.getElementById("previewButton");
const injectButton = document.getElementById("injectButton");
const clearButton = document.getElementById("clearButton");
const previewOutput = document.getElementById("previewOutput");
const status = document.getElementById("status");

const EVIDENCE_TYPE_PRESETS = {
  report: {
    storageKey: "reports",
    titleKey: "reports",
    paperStyles: [
      "report-parchment",
      "report-parchment-ash",
      "report-parchment-sepia",
      "report-parchment-moss",
      "report-parchment-char",
      "report-parchment-crimson",
    ],
    source: {
      kind: "report-localized-catalog-entry",
      catalogPathTemplate: "./assets/reportsEvidences_{lang}.json",
    },
  },
  photo: {
    storageKey: "photos",
    titleKey: "photos",
    paperStyles: [
      "photo-mounted",
      "photo-mounted-ivory",
      "photo-mounted-linen",
      "photo-mounted-chalk",
      "photo-mounted-aged",
    ],
    source: {
      kind: "photo-localized-catalog-entry",
      catalogPathTemplate: "./assets/photos_evidences_{lang}.json",
    },
  },
};

let lastEvidencePresetType = "report";

function setStatus(message) {
  status.textContent = message;
}

function getSelectedEvidenceType() {
  return String(evidenceTypeInput.value || "report").trim() || "report";
}

function getEvidencePreset() {
  return EVIDENCE_TYPE_PRESETS[getSelectedEvidenceType()] || EVIDENCE_TYPE_PRESETS.report;
}

function fillSelectOptions(selectElement, values, selectedValue) {
  if (!selectElement) {
    return;
  }

  selectElement.replaceChildren();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === selectedValue) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

function syncEvidenceFieldPresets(forcePresetSelection = false) {
  const selectedType = getSelectedEvidenceType();
  const preset = getEvidencePreset();
  const currentStorageKey = String(evidenceStorageKeyInput.value || "").trim();
  const currentTitleKey = String(evidenceTitleKeyInput.value || "").trim();
  const currentPaperStyle = String(evidencePaperStyleInput.value || "").trim();
  const presetChanged = selectedType !== lastEvidencePresetType;
  const usePresetDefaults = forcePresetSelection || presetChanged;

  const storageOptions = Array.from(new Set([preset.storageKey, "reports", "photos"]));
  const titleOptions = Array.from(new Set([preset.titleKey, "reports", "photos"]));
  const paperStyleOptions = preset.paperStyles;

  fillSelectOptions(
    evidenceStorageKeyInput,
    storageOptions,
    usePresetDefaults
      ? preset.storageKey
      : storageOptions.includes(currentStorageKey) ? currentStorageKey : preset.storageKey
  );
  fillSelectOptions(
    evidenceTitleKeyInput,
    titleOptions,
    usePresetDefaults
      ? preset.titleKey
      : titleOptions.includes(currentTitleKey) ? currentTitleKey : preset.titleKey
  );
  fillSelectOptions(
    evidencePaperStyleInput,
    paperStyleOptions,
    usePresetDefaults
      ? paperStyleOptions[0]
      : paperStyleOptions.includes(currentPaperStyle) ? currentPaperStyle : paperStyleOptions[0]
  );

  lastEvidencePresetType = selectedType;
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
  return parseLineList(value).map((src) => ({
    src,
    alt: "",
    caption: "",
  }));
}

function buildImagePathsFromFiles(fileList) {
  return Array.from(fileList || [])
    .map((file) => String(file?.name || "").trim())
    .filter(Boolean)
    .map((fileName) => `./assets/photos/${fileName}`);
}

function buildEntryImages(images) {
  const normalizedImages = Array.isArray(images)
    ? images.map((image) => ({ ...image }))
    : [];

  const sharedText = String(standaloneImageCaptionAltInput.value || "").trim();
  const applyCaption = Boolean(standaloneApplyCaptionInput.checked && sharedText);
  const applyAlt = Boolean(standaloneApplyAltInput.checked && sharedText);

  return normalizedImages.map((image) => ({
    ...image,
    caption: applyCaption ? sharedText : "",
    alt: applyAlt ? sharedText : "",
  }));
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

function buildEvidence(siteId, common, fallbackTitle) {
  const awardsEvidence = Boolean(awardsEvidenceInput.checked);
  if (!awardsEvidence) {
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
        source: {
          kind: "",
          languageAware: false,
          catalogPathTemplate: "",
          entryId: "",
        },
      },
    };
  }

  const preset = getEvidencePreset();
  const selectedEvidenceType = getSelectedEvidenceType();
  const evidenceName = String(evidenceNameInput.value || "").trim() || `${siteId}-${common.id}`;
  const defaultTitleString = String(evidenceDefaultTitleInput.value || "").trim() || fallbackTitle || common.id;
  const evidenceDescription = String(evidenceDescriptionInput.value || "")
    .replace(/\r\n/g, "\n")
    .trim();
  const evidencePhotoCaption = String(evidencePhotoCaptionInput.value || "").trim();

  const evidence = {
    type: selectedEvidenceType,
    storageKey: String(evidenceStorageKeyInput.value || "").trim() || preset.storageKey,
    titleKey: String(evidenceTitleKeyInput.value || "").trim() || preset.titleKey,
    name: evidenceName,
    defaultTitleString,
    paperStyle: String(evidencePaperStyleInput.value || "").trim() || preset.paperStyles[0],
    source: {
      kind: preset.source.kind,
      languageAware: true,
      catalogPathTemplate: preset.source.catalogPathTemplate,
      entryId: evidenceName,
    },
  };

  if (evidenceDescription) {
    evidence.description = evidenceDescription;
  }

  if (selectedEvidenceType === "photo" && evidencePhotoCaption) {
    evidence.photoCaption = evidencePhotoCaption;
  }

  return {
    awardsEvidence,
    evidence,
  };
}

function buildStandaloneEntry(common) {
  const evidenceFields = buildEvidence("standalone", common, common.title || common.id);
  const images = buildEntryImages(common.images);

  return {
    siteId: "standalone",
    bucket: "records",
    entry: {
      id: common.id,
      title: common.title || common.id,
      url: common.url,
      content: common.bodyLines.length ? common.bodyLines : [""],
      images,
      style: {
        backgroundColor: String(standaloneBgColorInput.value || "").trim() || "#eceff3",
        textColor: String(standaloneTextColorInput.value || "").trim() || "#0f1b2a",
        fontFamily: String(standaloneFontSelect.value || "").trim() || "Arial, Helvetica, sans-serif",
      },
      awardsEvidence: evidenceFields.awardsEvidence,
      evidence: evidenceFields.evidence,
    },
  };
}

function buildZoomsearchEntry(common) {
  const keywords = parseCommaList(zoomKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Zoom Search keywords are required.");
  }

  const websiteName = String(websiteNameInput.value || "").trim();
  if (!websiteName) {
    throw new Error("Zoom Search website name is required.");
  }

  const pageTitle = common.title || common.id;
  const evidenceFields = buildEvidence("zoomsearch", common, pageTitle);
  const images = buildEntryImages(common.images);

  return {
    siteId: "zoomsearch",
    bucket: "records",
    entry: {
      id: common.id,
      websiteName,
      pageTitle,
      url: common.url || `http://www.zoomsearch.net/manual/${common.id}`,
      keywords,
      summary: common.summary || "",
      pageContent: common.bodyLines,
      images,
      awardsEvidence: evidenceFields.awardsEvidence,
      evidence: evidenceFields.evidence,
    },
  };
}

function buildLibraryEntry(common) {
  const publicationTitle = String(libraryPublicationTitleInput.value || "").trim();
  if (!String(authorInput.value || "").trim() || !publicationTitle) {
    throw new Error("Library Archive requires Author and Publication Title.");
  }

  const evidenceFields = buildEvidence("library", common, publicationTitle);
  const images = buildEntryImages(common.images);

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
      images,
      awardsEvidence: evidenceFields.awardsEvidence,
      evidence: evidenceFields.evidence,
    },
  };
}

function buildPoliceEntry(common) {
  const keywords = parseCommaList(policeKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Police Records keywords are required.");
  }

  const evidenceFields = buildEvidence("police", common, common.title || common.id);
  const images = buildEntryImages(common.images);

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
      images,
      awardsEvidence: evidenceFields.awardsEvidence,
      evidence: evidenceFields.evidence,
    },
  };
}

function buildArchivesEntry(common) {
  const keywords = parseCommaList(archivesKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Canada Newspaper Archive keywords are required.");
  }

  const headline = common.title || common.id;
  const evidenceFields = buildEvidence("archives", common, headline);
  const images = buildEntryImages(common.images);

  return {
    siteId: "archives",
    bucket: "records",
    entry: {
      id: common.id,
      province: String(archiveProvinceInput.value || "").trim(),
      headline,
      publication: String(publicationInput.value || "").trim(),
      keywords,
      summary: common.summary || "",
      article: common.bodyLines,
      requiredAccessLevel: toNumberOrDefault(requiredAccessInput.value, 0),
      images,
      awardsEvidence: evidenceFields.awardsEvidence,
      evidence: evidenceFields.evidence,
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
  const catalogUpdates = Array.isArray(result.evidenceCatalogUpdates)
    ? result.evidenceCatalogUpdates
    : [];
  const catalogSummary = catalogUpdates.length
    ? ` Evidence catalogs: ${catalogUpdates.map((update) => `${update.language}:${update.action}`).join(", ")}.`
    : "";

  setStatus(
    `Injected ${result.action} entry '${result.id}' into ${result.targetFile} (${result.bucket}).${catalogSummary}`
  );
}

function clearForm() {
  [
    idInput,
    urlInput,
    websiteNameInput,
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
    standaloneImageCaptionAltInput,
    evidenceNameInput,
    evidenceDefaultTitleInput,
    evidenceDescriptionInput,
    evidencePhotoCaptionInput,
  ].forEach((element) => {
    element.value = "";
  });

  awardsEvidenceInput.checked = false;
  standaloneBgColorInput.value = "#eceff3";
  standaloneBgColorPicker.value = "#eceff3";
  standaloneTextColorInput.value = "#0f1b2a";
  standaloneTextColorPicker.value = "#0f1b2a";
  standaloneApplyCaptionInput.checked = false;
  standaloneApplyAltInput.checked = false;
  standaloneFontSelect.selectedIndex = 0;
  contentTypeSelect.selectedIndex = 0;
  previewOutput.textContent = "{}";
  setStatus("Cleared.");
  syncFieldStates();
}

function setEvidenceFieldsDisabledState(disabled) {
  evidenceFieldsGrid.querySelectorAll("input, select, textarea").forEach((element) => {
    element.disabled = disabled;
  });
}

function setSelectEmptyValue(selectElement) {
  if (!selectElement) {
    return;
  }

  let emptyOption = selectElement.querySelector('option[value=""]');
  if (!emptyOption) {
    emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "";
    selectElement.insertBefore(emptyOption, selectElement.firstChild);
  }

  selectElement.value = "";
}

function clearEvidenceFieldsForUncheckedState() {
  setSelectEmptyValue(evidenceTypeInput);
  fillSelectOptions(evidenceStorageKeyInput, [""], "");
  fillSelectOptions(evidenceTitleKeyInput, [""], "");
  fillSelectOptions(evidencePaperStyleInput, [""], "");
  evidenceNameInput.value = "";
  evidenceDefaultTitleInput.value = "";
  evidenceDescriptionInput.value = "";
  evidencePhotoCaptionInput.value = "";
}

function prepareEvidenceFieldsForCheckedState() {
  const typeEmptyOption = evidenceTypeInput.querySelector('option[value=""]');
  if (typeEmptyOption) {
    typeEmptyOption.remove();
  }

  if (!String(evidenceTypeInput.value || "").trim()) {
    evidenceTypeInput.value = "report";
  }

  syncEvidenceFieldPresets(true);
}

function syncFieldStates() {
  const contentType = getCurrentType();
  const isStandalone = contentType === "standalone";
  const isZoomsearch = contentType === "zoomsearch";
  urlInput.required = isStandalone;
  websiteNameInput.required = isZoomsearch;

  // Keep all sections visible so authors can reference field requirements while switching types.
  zoomsearchFieldsPanel.classList.remove("is-hidden");
  libraryFieldsPanel.classList.remove("is-hidden");
  policeFieldsPanel.classList.remove("is-hidden");
  archivesFieldsPanel.classList.remove("is-hidden");
  standaloneStylePanel.classList.remove("is-hidden");

  const evidenceEnabled = awardsEvidenceInput.checked;
  if (evidenceEnabled) {
    prepareEvidenceFieldsForCheckedState();
  } else {
    clearEvidenceFieldsForUncheckedState();
  }

  setEvidenceFieldsDisabledState(!evidenceEnabled);
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

awardsEvidenceInput.addEventListener("change", () => {
  syncFieldStates();
});

evidenceTypeInput.addEventListener("change", () => {
  if (!awardsEvidenceInput.checked) {
    return;
  }

  syncEvidenceFieldPresets(true);
});

standaloneBgColorPickButton.addEventListener("click", () => {
  if (typeof standaloneBgColorPicker.showPicker === "function") {
    standaloneBgColorPicker.showPicker();
    return;
  }

  standaloneBgColorPicker.click();
});

standaloneBgColorPicker.addEventListener("input", () => {
  standaloneBgColorInput.value = standaloneBgColorPicker.value;
});

standaloneBgColorInput.addEventListener("input", () => {
  const value = String(standaloneBgColorInput.value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    standaloneBgColorPicker.value = value;
  }
});

standaloneTextColorPickButton.addEventListener("click", () => {
  if (typeof standaloneTextColorPicker.showPicker === "function") {
    standaloneTextColorPicker.showPicker();
    return;
  }

  standaloneTextColorPicker.click();
});

standaloneTextColorPicker.addEventListener("input", () => {
  standaloneTextColorInput.value = standaloneTextColorPicker.value;
});

standaloneTextColorInput.addEventListener("input", () => {
  const value = String(standaloneTextColorInput.value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    standaloneTextColorPicker.value = value;
  }
});

chooseImagePathsButton.addEventListener("click", () => {
  imagePathsPicker.click();
});

imagePathsPicker.addEventListener("change", () => {
  const nextPaths = buildImagePathsFromFiles(imagePathsPicker.files);
  if (!nextPaths.length) {
    return;
  }

  const existingPaths = parseLineList(imagesInput.value);
  const mergedPaths = Array.from(new Set([...existingPaths, ...nextPaths]));
  imagesInput.value = mergedPaths.join("\n");
  imagePathsPicker.value = "";
});

syncFieldStates();
