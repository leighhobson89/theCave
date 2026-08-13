const INJECT_API_URL = "http://localhost:5058/api/web-content/upsert";
const NEXT_CASE_NUMBER_API_URL = "http://localhost:5058/api/web-content/next-police-case-number";
const NEXT_PROGRESS_EVIDENCE_ID_API_URL = "http://localhost:5058/api/web-content/next-progress-evidence-id";

// Where the Progress Evidence photo picker writes its paths. Must match
// PROGRESS_EVIDENCE_IMAGE_DIRECTORY in progressEvidenceManager.js.
const PROGRESS_EVIDENCE_IMAGE_DIRECTORY = "./assets/photos/progressEvidenceImages";

const contentTypeSelect = document.getElementById("contentTypeSelect");
const idInput = document.getElementById("idInput");
const bodyInput = document.getElementById("bodyInput");
const imagesInput = document.getElementById("imagesInput");
const chooseImagePathsButton = document.getElementById("chooseImagePathsButton");
const imagePathsPicker = document.getElementById("imagePathsPicker");

// Every field below this point lives in exactly one content type's panel --
// see the "Field rules" <details> in the HTML. `.service-panel` elements
// (each tagged with data-content-type) grey out and disable their own
// inputs whenever they don't match the selected Content Type; nothing here
// is read unless its panel is the active one, so there's nothing to
// conflict between panels the way a single shared field once could.
const servicePanels = Array.from(document.querySelectorAll(".service-panel"));

const websiteNameInput = document.getElementById("websiteNameInput");
const zoomTitleInput = document.getElementById("zoomTitleInput");
const zoomUrlInput = document.getElementById("zoomUrlInput");
const zoomSummaryInput = document.getElementById("zoomSummaryInput");
const zoomKeywordsInput = document.getElementById("zoomKeywordsInput");

const authorInput = document.getElementById("authorInput");
const libraryPublicationTitleInput = document.getElementById("libraryPublicationTitleInput");
const libraryPublisherInput = document.getElementById("libraryPublisherInput");
const libraryPublicationYearInput = document.getElementById("libraryPublicationYearInput");
const librarySummaryInput = document.getElementById("librarySummaryInput");

const policeTitleInput = document.getElementById("policeTitleInput");
const policeKeywordsInput = document.getElementById("policeKeywordsInput");
const requiredPrivilegeInput = document.getElementById("requiredPrivilegeInput");
const policeCaseNumberInput = document.getElementById("policeCaseNumberInput");
const policeDateInput = document.getElementById("policeDateInput");
const policeSummaryInput = document.getElementById("policeSummaryInput");
const policeGenerateCaseNumberButton = document.getElementById("policeGenerateCaseNumberButton");

const archivesHeadlineInput = document.getElementById("archivesHeadlineInput");
const archiveProvinceInput = document.getElementById("archiveProvinceInput");
const publicationInput = document.getElementById("publicationInput");
const archivesKeywordsInput = document.getElementById("archivesKeywordsInput");
const requiredAccessInput = document.getElementById("requiredAccessInput");
const archivesDateInput = document.getElementById("archivesDateInput");
const archivesSummaryInput = document.getElementById("archivesSummaryInput");

const standaloneTitleInput = document.getElementById("standaloneTitleInput");
const standaloneUrlInput = document.getElementById("standaloneUrlInput");

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
const addEvidenceButton = document.getElementById("addEvidenceButton");
const evidenceQueueStatus = document.getElementById("evidenceQueueStatus");
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

const progressEvidenceIdInput = document.getElementById("progressEvidenceIdInput");
const allocateProgressEvidenceIdButton = document.getElementById("allocateProgressEvidenceIdButton");
const progressEvidenceImageInput = document.getElementById("progressEvidenceImageInput");
const chooseProgressEvidenceImageButton = document.getElementById("chooseProgressEvidenceImageButton");
const progressEvidenceImagePicker = document.getElementById("progressEvidenceImagePicker");
const progressEvidenceActivatedInput = document.getElementById("progressEvidenceActivatedInput");
const progressEvidenceDeveloperEnabledInput = document.getElementById("progressEvidenceDeveloperEnabledInput");

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
      catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
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
      catalogPathTemplate: "./assets/{lang}/photos_evidences.json",
    },
  },
};

let lastEvidencePresetType = "report";
let queuedEvidenceEntries = [];

// Which service the progressEvidenceId currently in the field was allocated
// for, so switching Content Type re-allocates instead of keeping an id whose
// control digit names the wrong service.
let lastAllocatedProgressEvidenceService = "";

function setStatus(message) {
  status.textContent = message;
}

function getSelectedEvidenceType() {
  return String(evidenceTypeInput.value || "report").trim() || "report";
}

function getEvidencePreset() {
  return EVIDENCE_TYPE_PRESETS[getSelectedEvidenceType()] || EVIDENCE_TYPE_PRESETS.report;
}

function updateEvidenceQueueStatus() {
  if (!evidenceQueueStatus) {
    return;
  }

  const queuedCount = queuedEvidenceEntries.length;
  evidenceQueueStatus.textContent = queuedCount
    ? `${queuedCount} evidence${queuedCount === 1 ? "" : "s"} queued.`
    : "No evidence queued.";
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

// Only sets the key when the trimmed value is non-empty, matching how
// authored content omits a field entirely rather than storing it as "".
function addIfPresent(target, key, rawValue) {
  const value = String(rawValue || "").trim();
  if (value) {
    target[key] = value;
  }
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

// Content Type, Content ID, Main text and Images are the only fields every
// content type reads identically -- everything else (title, URL, summary,
// ...) is owned by exactly one type's own panel and read directly by that
// type's build*Entry function below, not from here.
function getCommonFields() {
  const contentType = getCurrentType();
  const id = slugifyId(idInput.value);
  if (!id) {
    throw new Error("Content ID is required.");
  }

  idInput.value = id;

  const bodyLines = parseParagraphs(bodyInput.value);
  const images = parseImages(imagesInput.value);

  return {
    contentType,
    id,
    bodyLines,
    images,
  };
}

// The title-equivalent field for whichever content type is currently
// selected, falling back to the Content ID -- used for the evidence
// "Default Title String" fallback and for each build*Entry's own title-ish
// field further down.
function getCurrentTitleOrId(common) {
  const titleInputByType = {
    zoomsearch: zoomTitleInput,
    library: libraryPublicationTitleInput,
    police: policeTitleInput,
    archives: archivesHeadlineInput,
    standalone: standaloneTitleInput,
  };

  const titleInputElement = titleInputByType[getCurrentType()];
  const title = titleInputElement ? String(titleInputElement.value || "").trim() : "";
  return title || common.id;
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

function clearEvidenceForm() {
  evidenceNameInput.value = "";
  evidenceDefaultTitleInput.value = "";
  evidenceDescriptionInput.value = "";
  evidencePhotoCaptionInput.value = "";
  syncEvidenceFieldPresets(true);
}

function queueCurrentEvidence(common) {
  if (!awardsEvidenceInput.checked) {
    throw new Error("Enable Awards Evidence before queueing another evidence.");
  }

  const evidenceFields = buildEvidence(getCurrentType(), common, getCurrentTitleOrId(common));
  if (!evidenceFields.evidence || typeof evidenceFields.evidence !== "object") {
    throw new Error("Fill in the evidence fields before queueing another evidence.");
  }

  queuedEvidenceEntries.push(evidenceFields.evidence);
  clearEvidenceForm();
  updateEvidenceQueueStatus();
}

function collectEvidenceEntries(siteId, common, fallbackTitle) {
  const current = buildEvidence(siteId, common, fallbackTitle);
  if (!current.awardsEvidence) {
    return current;
  }

  const evidenceEntries = [...queuedEvidenceEntries];
  const hasDraftValues = [
    evidenceNameInput.value,
    evidenceDefaultTitleInput.value,
    evidenceDescriptionInput.value,
    evidencePhotoCaptionInput.value,
  ].some((value) => String(value || "").trim());

  if (!evidenceEntries.length || hasDraftValues) {
    evidenceEntries.push(current.evidence);
  }

  if (!evidenceEntries.length) {
    throw new Error("Add at least one evidence entry before injecting.");
  }

  return {
    awardsEvidence: true,
    evidence: evidenceEntries.length === 1 ? evidenceEntries[0] : evidenceEntries,
  };
}

function buildStandaloneEntry(common) {
  const url = String(standaloneUrlInput.value || "").trim();
  if (!url) {
    throw new Error("URL is required for Standalone Page content type.");
  }

  const title = String(standaloneTitleInput.value || "").trim() || common.id;
  const evidenceFields = collectEvidenceEntries("standalone", common, title);
  const images = buildEntryImages(common.images);

  return {
    siteId: "standalone",
    bucket: "records",
    entry: {
      id: common.id,
      title,
      url,
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

  const pageTitle = String(zoomTitleInput.value || "").trim() || common.id;
  const evidenceFields = collectEvidenceEntries("zoomsearch", common, pageTitle);
  const images = buildEntryImages(common.images);

  return {
    siteId: "zoomsearch",
    bucket: "records",
    entry: {
      id: common.id,
      websiteName,
      pageTitle,
      url: String(zoomUrlInput.value || "").trim() || `http://www.zoomsearch.net/manual/${common.id}`,
      keywords,
      summary: String(zoomSummaryInput.value || "").trim(),
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

  const evidenceFields = collectEvidenceEntries("library", common, publicationTitle);
  const images = buildEntryImages(common.images);

  const entry = {
    id: common.id,
    author: String(authorInput.value || "").trim(),
    title: publicationTitle,
    keywords: [publicationTitle],
    summary: String(librarySummaryInput.value || "").trim(),
    extract: common.bodyLines,
    images,
    awardsEvidence: evidenceFields.awardsEvidence,
    evidence: evidenceFields.evidence,
  };

  addIfPresent(entry, "publisher", libraryPublisherInput.value);
  const rawPublicationYear = String(libraryPublicationYearInput.value || "").trim();
  if (rawPublicationYear) {
    entry.publicationYear = toNumberOrDefault(rawPublicationYear, rawPublicationYear);
  }

  return {
    siteId: "library",
    bucket: "records",
    entry,
  };
}

function buildPoliceEntry(common) {
  const keywords = parseCommaList(policeKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Police Records keywords are required.");
  }

  const title = String(policeTitleInput.value || "").trim() || common.id;
  const evidenceFields = collectEvidenceEntries("police", common, title);
  const images = buildEntryImages(common.images);

  const entry = {
    id: common.id,
    title,
    keywords,
    summary: String(policeSummaryInput.value || "").trim(),
    report: common.bodyLines,
    requiredPrivilegeLevel: toNumberOrDefault(requiredPrivilegeInput.value, 0),
    images,
    awardsEvidence: evidenceFields.awardsEvidence,
    evidence: evidenceFields.evidence,
  };

  addIfPresent(entry, "caseNumber", policeCaseNumberInput.value);
  addIfPresent(entry, "date", policeDateInput.value);

  return {
    siteId: "police",
    bucket: "records",
    entry,
  };
}

function buildArchivesEntry(common) {
  const keywords = parseCommaList(archivesKeywordsInput.value);
  if (!keywords.length) {
    throw new Error("Canada Newspaper Archive keywords are required.");
  }

  const headline = String(archivesHeadlineInput.value || "").trim() || common.id;
  const evidenceFields = collectEvidenceEntries("archives", common, headline);
  const images = buildEntryImages(common.images);

  const entry = {
    id: common.id,
    province: String(archiveProvinceInput.value || "").trim(),
    headline,
    publication: String(publicationInput.value || "").trim(),
    keywords,
    summary: String(archivesSummaryInput.value || "").trim(),
    article: common.bodyLines,
    requiredAccessLevel: toNumberOrDefault(requiredAccessInput.value, 0),
    images,
    awardsEvidence: evidenceFields.awardsEvidence,
    evidence: evidenceFields.evidence,
  };

  addIfPresent(entry, "date", archivesDateInput.value);

  return {
    siteId: "archives",
    bucket: "records",
    entry,
  };
}

// The Progress Evidence panel applies to every content type and is mandatory,
// so this throws rather than returning a partial result — which is what blocks
// Preview and Inject alike, since both go through buildPayload().
//
// The id is allocated by the server (one past the highest already registered)
// and is read-only in the form: a hand-typed one could collide with an id the
// game has already handed to another item.
function buildProgressEvidenceFields() {
  const progressEvidenceId = String(progressEvidenceIdInput.value || "").trim();
  if (!progressEvidenceId) {
    throw new Error(
      "Progress Evidence: no progressEvidenceId allocated yet. Start the inject API "
      + "(node tools/web_content_builder_server.js) and press Allocate."
    );
  }

  if (!/^\d{5}$/.test(progressEvidenceId)) {
    throw new Error(
      `Progress Evidence: '${progressEvidenceId}' is not a valid progressEvidenceId `
      + "(a service control digit followed by a four-digit sequence)."
    );
  }

  const progressEvidenceImage = String(progressEvidenceImageInput.value || "").trim();
  if (!progressEvidenceImage) {
    throw new Error("Progress Evidence: choose a progress evidence image before previewing or injecting.");
  }

  return {
    progressEvidenceId,
    progressEvidenceImage,
    // Player progress: true means "count this as already reached", so it shows
    // in the envelope straight away.
    progressEvidenceActivated: Boolean(progressEvidenceActivatedInput.checked),
    // Developer switch: with this off the item never appears, no matter what
    // the player has done.
    progressEvidenceDeveloperEnabled: Boolean(progressEvidenceDeveloperEnabledInput.checked),
  };
}

function buildPayload() {
  const common = getCommonFields();
  // Validated up front so a missing image or id is reported before any of the
  // per-type "X is required" errors, and always for every content type.
  const progressEvidenceFields = buildProgressEvidenceFields();
  const payload = buildTypedPayload(common);

  payload.entry = {
    ...payload.entry,
    ...progressEvidenceFields,
  };

  return payload;
}

function buildTypedPayload(common) {
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

// Asks the inject API for the next Police caseNumber ("NNNNN-A", a random
// 10-100 increment past the highest one currently in assets/en/police.json,
// plus a random letter -- see tools/police_case_number.js, which the server
// also uses). There's no local fallback generator: without the server there
// is no reliable "current highest" to increment from.
async function fetchNextPoliceCaseNumber() {
  let response;
  try {
    response = await fetch(NEXT_CASE_NUMBER_API_URL);
  } catch (error) {
    throw new Error("Inject API is offline. Start it with: node tools/web_content_builder_server.js");
  }

  if (!response.ok) {
    throw new Error(`Case number generation failed (${response.status})`);
  }

  const result = await response.json();
  return String(result.caseNumber || "").trim();
}

// Auto-fills the Case Number field the moment Police is selected, but only
// if the author hasn't already typed something in -- switching content type
// back and forth, or a value restored some other way, is never overwritten
// by this.
async function maybePrefillPoliceCaseNumber() {
  if (getCurrentType() !== "police" || String(policeCaseNumberInput.value || "").trim()) {
    return;
  }

  try {
    policeCaseNumberInput.value = await fetchNextPoliceCaseNumber();
  } catch (error) {
    // Silent: the field just stays blank, and the same error would show up
    // (and be visible) the moment the author tries Preview/Inject anyway.
  }
}

// Asks the inject API for the next progressEvidenceId for a service — its
// control digit followed by one past the highest sequence already registered
// for it in assets/progressEvidence.json (see tools/progress_evidence_id.js,
// which the server also uses). There is no local fallback: without the server
// there is no reliable "current highest" to increment, and a guessed id would
// collide with a real one.
async function fetchNextProgressEvidenceId(service) {
  let response;
  try {
    response = await fetch(`${NEXT_PROGRESS_EVIDENCE_ID_API_URL}?service=${encodeURIComponent(service)}`);
  } catch (error) {
    throw new Error("Inject API is offline. Start it with: node tools/web_content_builder_server.js");
  }

  if (!response.ok) {
    throw new Error(`Progress evidence id allocation failed (${response.status})`);
  }

  const result = await response.json();
  return String(result.progressEvidenceId || "").trim();
}

// Fills the read-only id field on load, after Clear, and whenever the Content
// Type changes -- an id carries its service in its leading digit, so one
// allocated for ZoomSearch is not a valid id for a Police record.
//
// Silent on failure: the field stays blank and the same error surfaces
// (visibly) the moment the author tries Preview or Inject, which a blank id
// blocks.
async function maybePrefillProgressEvidenceId() {
  const service = getCurrentType();
  const hasCurrentId = Boolean(String(progressEvidenceIdInput.value || "").trim());
  if (hasCurrentId && lastAllocatedProgressEvidenceService === service) {
    return;
  }

  try {
    progressEvidenceIdInput.value = await fetchNextProgressEvidenceId(service);
    lastAllocatedProgressEvidenceService = service;
  } catch (error) {
    // Intentionally silent — see above. Clear any id belonging to the previous
    // service rather than leaving a wrong one on screen.
    progressEvidenceIdInput.value = "";
    lastAllocatedProgressEvidenceService = "";
  }

  syncProgressEvidenceImageToId();
}

// A path this form filled in itself, rather than one the author chose with the
// photo picker or typed by hand.
function isConventionProgressEvidenceImagePath(value) {
  return new RegExp(`^${PROGRESS_EVIDENCE_IMAGE_DIRECTORY.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}/\\d+\\.png$`)
    .test(String(value || "").trim());
}

// Keeps the image path on the [progressEvidenceId].png convention as the id
// changes, so the common case needs no picking at all. An image the author
// actually chose is never overwritten — only a blank field, or a convention
// path left over from a previously allocated id.
function syncProgressEvidenceImageToId() {
  const progressEvidenceId = String(progressEvidenceIdInput.value || "").trim();
  const currentImagePath = String(progressEvidenceImageInput.value || "").trim();

  if (currentImagePath && !isConventionProgressEvidenceImagePath(currentImagePath)) {
    return;
  }

  progressEvidenceImageInput.value = progressEvidenceId
    ? `${PROGRESS_EVIDENCE_IMAGE_DIRECTORY}/${progressEvidenceId}.png`
    : "";
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

  const siteContentUpdates = Array.isArray(result.siteContentUpdates)
    ? result.siteContentUpdates
    : [];
  const otherLanguageCopies = siteContentUpdates.filter((update) => update.language !== "en");
  const siteContentSummary = otherLanguageCopies.length
    ? ` Copied to ${otherLanguageCopies.map((update) => update.language).join(", ")}.`
    : "";

  setStatus(
    `Injected ${result.action} entry '${result.id}' into ${result.targetFile} (${result.bucket}).${siteContentSummary}${catalogSummary}`
  );
}

function clearForm() {
  [
    idInput,
    bodyInput,
    imagesInput,
    websiteNameInput,
    zoomTitleInput,
    zoomUrlInput,
    zoomSummaryInput,
    zoomKeywordsInput,
    authorInput,
    libraryPublicationTitleInput,
    libraryPublisherInput,
    libraryPublicationYearInput,
    librarySummaryInput,
    policeTitleInput,
    policeKeywordsInput,
    policeCaseNumberInput,
    policeDateInput,
    policeSummaryInput,
    requiredPrivilegeInput,
    archivesHeadlineInput,
    archiveProvinceInput,
    archivesKeywordsInput,
    archivesDateInput,
    archivesSummaryInput,
    publicationInput,
    requiredAccessInput,
    standaloneTitleInput,
    standaloneUrlInput,
    standaloneImageCaptionAltInput,
    evidenceNameInput,
    evidenceDefaultTitleInput,
    evidenceDescriptionInput,
    evidencePhotoCaptionInput,
    progressEvidenceIdInput,
    progressEvidenceImageInput,
  ].forEach((element) => {
    element.value = "";
  });

  awardsEvidenceInput.checked = false;
  progressEvidenceActivatedInput.checked = false;
  progressEvidenceDeveloperEnabledInput.checked = false;
  lastAllocatedProgressEvidenceService = "";
  queuedEvidenceEntries = [];
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
  updateEvidenceQueueStatus();
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
  queuedEvidenceEntries = [];
  updateEvidenceQueueStatus();
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
  updateEvidenceQueueStatus();
}

// Every panel stays visible always (so an author can see what a type
// requires before switching to it), but only the panel matching the
// selected Content Type stays interactive -- every other service panel is
// dimmed and has its inputs disabled, so a value typed into a field that
// doesn't apply can't be mistaken for one that does. The Evidence panel has
// no data-content-type and is left out of this loop entirely: it applies to
// every content type and is never greyed out.
function updateServicePanelStates() {
  const contentType = getCurrentType();

  servicePanels.forEach((panel) => {
    const isActive = panel.dataset.contentType === contentType;
    panel.classList.toggle("is-inactive", !isActive);

    const badge = panel.querySelector(".inactive-badge");
    if (badge) {
      badge.hidden = isActive;
    }

    panel.querySelectorAll("input, select, textarea, button").forEach((element) => {
      element.disabled = !isActive;
    });
  });
}

function syncFieldStates() {
  updateServicePanelStates();

  const evidenceEnabled = awardsEvidenceInput.checked;
  if (evidenceEnabled) {
    prepareEvidenceFieldsForCheckedState();
  } else {
    clearEvidenceFieldsForUncheckedState();
  }

  setEvidenceFieldsDisabledState(!evidenceEnabled);

  void maybePrefillPoliceCaseNumber();
  // Progress evidence applies to every content type, so its id is allocated
  // regardless of which one is selected.
  void maybePrefillProgressEvidenceId();
}

previewButton.addEventListener("click", () => {
  try {
    renderPreview();
  } catch (error) {
    setStatus(error.message);
  }
});

if (addEvidenceButton) {
  addEvidenceButton.addEventListener("click", () => {
    try {
      queueCurrentEvidence(getCommonFields());
      setStatus("Queued evidence draft.");
    } catch (error) {
      setStatus(error.message);
    }
  });
}

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

if (policeGenerateCaseNumberButton) {
  policeGenerateCaseNumberButton.addEventListener("click", async () => {
    try {
      policeCaseNumberInput.value = await fetchNextPoliceCaseNumber();
      setStatus("Generated a new case number.");
    } catch (error) {
      setStatus(error.message);
    }
  });
}

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

if (allocateProgressEvidenceIdButton) {
  allocateProgressEvidenceIdButton.addEventListener("click", async () => {
    const service = getCurrentType();
    try {
      progressEvidenceIdInput.value = await fetchNextProgressEvidenceId(service);
      lastAllocatedProgressEvidenceService = service;
      syncProgressEvidenceImageToId();
      setStatus(`Allocated progressEvidenceId ${progressEvidenceIdInput.value} for ${service}.`);
    } catch (error) {
      setStatus(error.message);
    }
  });
}

chooseProgressEvidenceImageButton.addEventListener("click", () => {
  progressEvidenceImagePicker.click();
});

// One image per record, so this replaces rather than appends -- unlike the
// content Image paths picker, which merges into a list.
progressEvidenceImagePicker.addEventListener("change", () => {
  const [fileName] = Array.from(progressEvidenceImagePicker.files || [])
    .map((file) => String(file?.name || "").trim())
    .filter(Boolean);

  if (fileName) {
    progressEvidenceImageInput.value = `${PROGRESS_EVIDENCE_IMAGE_DIRECTORY}/${fileName}`;
  }

  progressEvidenceImagePicker.value = "";
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
updateEvidenceQueueStatus();
