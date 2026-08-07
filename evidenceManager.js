const STORAGE_KEYS = {
  BACKGROUND_STORY: "backgroundStory",
  PHOTOS: "photos",
  REPORTS: "reports",
};

const EVIDENCE_TYPES = {
  REPORT: "report",
  PHOTO: "photo",
  STORY: "story",
};

const PAPER_STYLES = {
  STORY_LINED: "story-lined",
  REPORT_PARCHMENT: "report-parchment",
  PHOTO_MOUNTED: "photo-mounted",
  PHOTO_MOUNTED_IVORY: "photo-mounted-ivory",
  PHOTO_MOUNTED_LINEN: "photo-mounted-linen",
};

const REPORTS_CATALOG_PATH_TEMPLATE = "./assets/reportsEvidences_{lang}.json";
const PHOTOS_CATALOG_PATH_TEMPLATE = "./assets/photos_evidences_{lang}.json";

const DEFAULT_EVIDENCE_BLUEPRINTS = [
  {
    kind: EVIDENCE_TYPES.STORY,
    storyName: "story",
    defaultTitleString: "Background Story",
  },
  {
    kind: EVIDENCE_TYPES.PHOTO,
    photoPath: "./assets/photos/caveEntrance.png",
    name: "caveEntrance",
    paperStyle: PAPER_STYLES.PHOTO_MOUNTED_IVORY,
  },
  {
    kind: EVIDENCE_TYPES.REPORT,
    reportName: "missingReport",
  }
];

let evidenceStore = createEmptyEvidenceStore();

function createEmptyEvidenceStore() {
  return {
    nextEvidenceId: 1,
    evidencesById: {},
    collections: {
      [STORAGE_KEYS.BACKGROUND_STORY]: [],
      [STORAGE_KEYS.PHOTOS]: [],
      [STORAGE_KEYS.REPORTS]: [],
    },
    indices: {
      [STORAGE_KEYS.BACKGROUND_STORY]: 0,
      [STORAGE_KEYS.PHOTOS]: 0,
      [STORAGE_KEYS.REPORTS]: 0,
    },
  };
}

function ensureCollection(storageKey) {
  if (!evidenceStore.collections[storageKey]) {
    evidenceStore.collections[storageKey] = [];
  }

  if (!Number.isFinite(evidenceStore.indices[storageKey])) {
    evidenceStore.indices[storageKey] = 0;
  }
}

function normalizeIndex(index, length) {
  if (!length) {
    return 0;
  }

  const parsed = Number.parseInt(index, 10);
  const safeIndex = Number.isFinite(parsed) ? parsed : 0;
  return ((safeIndex % length) + length) % length;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function parsePhotoNameFromPath(path) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) {
    return "";
  }

  const filename = normalizedPath.split("/").pop() || "";
  return filename.replace(/\.(png|jpe?g|webp|gif)$/i, "");
}

function buildDefaultTitleString(rawName) {
  const normalized = String(rawName || "").trim();
  if (!normalized) {
    return "Untitled Evidence";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function addEvidenceToStore(evidence) {
  ensureCollection(evidence.storageKey);

  const id = evidenceStore.nextEvidenceId;
  evidenceStore.nextEvidenceId += 1;

  const storedEvidence = {
    id,
    ...evidence,
  };

  evidenceStore.evidencesById[String(id)] = storedEvidence;
  evidenceStore.collections[evidence.storageKey].push(id);
  evidenceStore.indices[evidence.storageKey] = normalizeIndex(
    evidenceStore.indices[evidence.storageKey],
    evidenceStore.collections[evidence.storageKey].length
  );

  return cloneJson(storedEvidence);
}

export function resetEvidenceStore() {
  evidenceStore = createEmptyEvidenceStore();
}

export function initializeEvidenceStoreForNewGame() {
  resetEvidenceStore();

  DEFAULT_EVIDENCE_BLUEPRINTS.forEach((blueprint) => {
    switch (blueprint.kind) {
      case EVIDENCE_TYPES.STORY:
        createStoryEvidence(blueprint);
        break;
      case EVIDENCE_TYPES.PHOTO:
        createPhotoEvidence(blueprint);
        break;
      case EVIDENCE_TYPES.REPORT:
        createReportEvidence(blueprint);
        break;
    }
  });

  setEvidenceIndex(STORAGE_KEYS.BACKGROUND_STORY, 0);
  setEvidenceIndex(STORAGE_KEYS.PHOTOS, 0);
  setEvidenceIndex(STORAGE_KEYS.REPORTS, 0);
}

export function createEvidence(evidence) {
  return addEvidenceToStore(evidence);
}

export function createStoryEvidence({
  storyName,
  storageKey = STORAGE_KEYS.BACKGROUND_STORY,
  titleKey = "backgroundStory",
  paperStyle = PAPER_STYLES.STORY_LINED,
  defaultTitleString,
} = {}) {
  const normalizedName = (storyName || "story").trim();

  return createEvidence({
    type: EVIDENCE_TYPES.STORY,
    storageKey,
    titleKey,
    name: normalizedName,
    defaultTitleString: defaultTitleString || buildDefaultTitleString(normalizedName),
    paperStyle,
    source: {
      kind: "markdown-template",
      languageAware: true,
      pathTemplate: `./assets/${normalizedName}_{lang}.md`,
    },
  });
}

export function createReportEvidence({
  reportName,
  storageKey = STORAGE_KEYS.REPORTS,
  titleKey = "reports",
  paperStyle = PAPER_STYLES.REPORT_PARCHMENT,
  defaultTitleString,
} = {}) {
  const normalizedName = (reportName || "missingReport").trim();

  return createEvidence({
    type: EVIDENCE_TYPES.REPORT,
    storageKey,
    titleKey,
    name: normalizedName,
    defaultTitleString: defaultTitleString || buildDefaultTitleString(normalizedName),
    paperStyle,
    source: {
      kind: "report-localized-catalog-entry",
      languageAware: true,
      catalogPathTemplate: REPORTS_CATALOG_PATH_TEMPLATE,
      entryId: normalizedName,
    },
  });
}

export function createPhotoEvidence({
  photoPath,
  name,
  storageKey = STORAGE_KEYS.PHOTOS,
  titleKey = "photos",
  paperStyle = PAPER_STYLES.PHOTO_MOUNTED,
  defaultTitleString,
} = {}) {
  const normalizedPath = String(photoPath || "").trim();

  if (!normalizedPath) {
    return null;
  }

  const normalizedName = (name || parsePhotoNameFromPath(normalizedPath) || normalizedPath).trim();

  return createEvidence({
    type: EVIDENCE_TYPES.PHOTO,
    storageKey,
    titleKey,
    name: normalizedName,
    defaultTitleString: defaultTitleString || buildDefaultTitleString(normalizedName),
    paperStyle,
    source: {
      kind: "photo-localized-catalog-entry",
      languageAware: true,
      catalogPathTemplate: PHOTOS_CATALOG_PATH_TEMPLATE,
      entryId: normalizedName,
      photoPath: normalizedPath,
    },
  });
}

export function getEvidenceCollection(storageKey) {
  ensureCollection(storageKey);

  return evidenceStore.collections[storageKey]
    .map((id) => evidenceStore.evidencesById[String(id)])
    .filter(Boolean)
    .map((evidence) => cloneJson(evidence));
}

export function getEvidenceById(id) {
  const evidence = evidenceStore.evidencesById[String(id)];
  return evidence ? cloneJson(evidence) : null;
}

export function getEvidenceCount(storageKey) {
  ensureCollection(storageKey);
  return evidenceStore.collections[storageKey].length;
}

export function getEvidenceIndex(storageKey) {
  ensureCollection(storageKey);
  return evidenceStore.indices[storageKey] || 0;
}

export function setEvidenceIndex(storageKey, index) {
  ensureCollection(storageKey);
  evidenceStore.indices[storageKey] = normalizeIndex(index, getEvidenceCount(storageKey));
}

export function stepEvidenceIndex(storageKey, delta) {
  setEvidenceIndex(storageKey, getEvidenceIndex(storageKey) + delta);
}

export function getCurrentEvidence(storageKey) {
  const collection = getEvidenceCollection(storageKey);
  if (!collection.length) {
    return null;
  }

  const index = normalizeIndex(getEvidenceIndex(storageKey), collection.length);
  return collection[index];
}

export function resolveEvidenceContentPath(evidence, languageCode = "en") {
  if (!evidence || !evidence.source) {
    return "";
  }

  if (evidence.source.kind === "photo-localized-catalog-entry") {
    return evidence.source.photoPath || "";
  }

  if (evidence.source.kind === "report-localized-catalog-entry") {
    return "";
  }

  if (evidence.source.kind === "markdown-template") {
    if (!evidence.source.languageAware) {
      return evidence.source.pathTemplate || "";
    }

    const language = String(languageCode || "en").trim() || "en";
    return String(evidence.source.pathTemplate || "").replaceAll("{lang}", language);
  }

  return "";
}

export function getEvidenceStoreSnapshot() {
  return cloneJson(evidenceStore);
}

export function setEvidenceStoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }

  if (!snapshot.collections || !snapshot.evidencesById || !snapshot.indices) {
    return false;
  }

  const nextEvidenceId = Number.parseInt(snapshot.nextEvidenceId, 10);
  const incomingStore = {
    nextEvidenceId: Number.isFinite(nextEvidenceId) ? Math.max(1, nextEvidenceId) : 1,
    evidencesById: {},
    collections: {},
    indices: {},
  };

  Object.keys(snapshot.evidencesById).forEach((key) => {
    const evidence = snapshot.evidencesById[key];
    if (!evidence || typeof evidence !== "object") {
      return;
    }

    const normalizedEvidence = cloneJson(evidence);

    if (!normalizedEvidence.defaultTitleString) {
      normalizedEvidence.defaultTitleString = buildDefaultTitleString(normalizedEvidence.name);
    }

    incomingStore.evidencesById[String(key)] = normalizedEvidence;
  });

  Object.keys(snapshot.collections).forEach((storageKey) => {
    const ids = Array.isArray(snapshot.collections[storageKey])
      ? snapshot.collections[storageKey]
      : [];

    incomingStore.collections[storageKey] = ids
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isFinite(id) && incomingStore.evidencesById[String(id)]);
  });

  Object.keys(incomingStore.collections).forEach((storageKey) => {
    const rawIndex = snapshot.indices[storageKey] ?? 0;
    incomingStore.indices[storageKey] = normalizeIndex(rawIndex, incomingStore.collections[storageKey].length);
  });

  [STORAGE_KEYS.BACKGROUND_STORY, STORAGE_KEYS.PHOTOS, STORAGE_KEYS.REPORTS].forEach((storageKey) => {
    if (!incomingStore.collections[storageKey]) {
      incomingStore.collections[storageKey] = [];
    }

    if (!Number.isFinite(incomingStore.indices[storageKey])) {
      incomingStore.indices[storageKey] = 0;
    }
  });

  evidenceStore = incomingStore;
  return true;
}

export function getEvidenceStorageKeys() {
  return { ...STORAGE_KEYS };
}
