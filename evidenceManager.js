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
  REPORT_PARCHMENT_ASH: "report-parchment-ash",
  REPORT_PARCHMENT_SEPIA: "report-parchment-sepia",
  REPORT_PARCHMENT_MOSS: "report-parchment-moss",
  REPORT_PARCHMENT_CHAR: "report-parchment-char",
  REPORT_PARCHMENT_CRIMSON: "report-parchment-crimson",
  PHOTO_MOUNTED: "photo-mounted",
  PHOTO_MOUNTED_IVORY: "photo-mounted-ivory",
  PHOTO_MOUNTED_LINEN: "photo-mounted-linen",
  PHOTO_MOUNTED_CHALK: "photo-mounted-chalk",
  PHOTO_MOUNTED_AGED: "photo-mounted-aged",
};

const DEFAULT_EVIDENCE_BLUEPRINTS = [
  {
    kind: "story",
    storyName: "story",
    storageKey: STORAGE_KEYS.BACKGROUND_STORY,
    titleKey: "backgroundStory",
  },
  {
    kind: "photo",
    storageKey: STORAGE_KEYS.PHOTOS,
    photoPath: "./assets/photos/caveEntrance.png",
    name: "caveEntrance",
    titleKey: "photos",
    paperStyle: PAPER_STYLES.PHOTO_MOUNTED_IVORY,
  },
  {
    kind: "photo",
    storageKey: STORAGE_KEYS.PHOTOS,
    photoPath: "./assets/photos/insideCaveLookingBack.png",
    name: "insideCaveLookingBack",
    titleKey: "photos",
    paperStyle: PAPER_STYLES.PHOTO_MOUNTED_LINEN,
  },
  {
    kind: "report",
    reportName: "missingReport",
    storageKey: STORAGE_KEYS.REPORTS,
    titleKey: "reports",
  },
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

function parseReportNameFromPath(path) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) {
    return "";
  }

  const filename = normalizedPath.split("/").pop() || "";
  return filename
    .replace(/_[a-z]{2}\.md$/i, "")
    .replace(/\.md$/i, "");
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
      case "story":
        createStoryEvidence(blueprint);
        break;
      case "photo":
        createPhotoEvidence(blueprint);
        break;
      case "report":
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
} = {}) {
  const normalizedName = (storyName || "story").trim();

  return createEvidence({
    type: EVIDENCE_TYPES.STORY,
    storageKey,
    titleKey,
    name: normalizedName,
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
} = {}) {
  const normalizedName = (reportName || "missingReport").trim();

  return createEvidence({
    type: EVIDENCE_TYPES.REPORT,
    storageKey,
    titleKey,
    name: normalizedName,
    paperStyle,
    source: {
      kind: "markdown-template",
      languageAware: true,
      pathTemplate: `./assets/reports/${normalizedName}_{lang}.md`,
    },
  });
}

export function createPhotoEvidence({
  photoPath,
  name,
  storageKey = STORAGE_KEYS.PHOTOS,
  titleKey = "photos",
  paperStyle = PAPER_STYLES.PHOTO_MOUNTED,
} = {}) {
  const normalizedPath = String(photoPath || "").trim();

  if (!normalizedPath) {
    return null;
  }

  return createEvidence({
    type: EVIDENCE_TYPES.PHOTO,
    storageKey,
    titleKey,
    name: (name || normalizedPath).trim(),
    paperStyle,
    source: {
      kind: "photo",
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

  if (evidence.source.kind === "photo") {
    return evidence.source.photoPath || "";
  }

  if (evidence.source.kind === "markdown-template") {
    if (!evidence.source.languageAware) {
      return evidence.source.pathTemplate || "";
    }

    const language = String(languageCode || "en").trim() || "en";
    return String(evidence.source.pathTemplate || "").replaceAll("{lang}", language);
  }

  if (evidence.source.kind === "markdown-file") {
    return evidence.source.path || "";
  }

  return "";
}

function replaceCollection(storageKey, evidences) {
  ensureCollection(storageKey);

  const existingIds = [...evidenceStore.collections[storageKey]];
  existingIds.forEach((id) => {
    delete evidenceStore.evidencesById[String(id)];
  });

  evidenceStore.collections[storageKey] = [];

  evidences.forEach((evidence) => {
    addEvidenceToStore({
      ...evidence,
      storageKey,
    });
  });

  setEvidenceIndex(storageKey, evidenceStore.indices[storageKey]);
}

export function setPhotoCollectionFromPaths(paths) {
  const evidences = (Array.isArray(paths) ? paths : [])
    .filter((path) => typeof path === "string")
    .map((path) => path.trim())
    .filter((path) => path.length > 0)
    .map((path) => ({
      type: EVIDENCE_TYPES.PHOTO,
      storageKey: STORAGE_KEYS.PHOTOS,
      titleKey: "photos",
      name: path,
      paperStyle: PAPER_STYLES.PHOTO_MOUNTED,
      source: {
        kind: "photo",
        photoPath: path,
      },
    }));

  replaceCollection(STORAGE_KEYS.PHOTOS, evidences);
}

export function setReportCollectionFromPaths(paths) {
  const evidences = (Array.isArray(paths) ? paths : [])
    .filter((path) => typeof path === "string")
    .map((path) => path.trim())
    .filter((path) => path.length > 0)
    .map((path) => {
      const reportName = parseReportNameFromPath(path);
      if (!reportName) {
        return null;
      }

      return {
        type: EVIDENCE_TYPES.REPORT,
        storageKey: STORAGE_KEYS.REPORTS,
        titleKey: "reports",
        name: reportName,
        paperStyle: PAPER_STYLES.REPORT_PARCHMENT,
        source: {
          kind: "markdown-template",
          languageAware: true,
          pathTemplate: `./assets/reports/${reportName}_{lang}.md`,
        },
      };
    })
    .filter(Boolean);

  replaceCollection(STORAGE_KEYS.REPORTS, evidences);
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

    if (
      normalizedEvidence.type === EVIDENCE_TYPES.REPORT &&
      normalizedEvidence.source &&
      normalizedEvidence.source.kind === "markdown-file"
    ) {
      const reportName = parseReportNameFromPath(normalizedEvidence.source.path);
      if (reportName) {
        normalizedEvidence.name = reportName;
        normalizedEvidence.source = {
          kind: "markdown-template",
          languageAware: true,
          pathTemplate: `./assets/reports/${reportName}_{lang}.md`,
        };
      }
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

export function getEvidenceTypeKeys() {
  return { ...EVIDENCE_TYPES };
}

export function getEvidencePaperStyleKeys() {
  return { ...PAPER_STYLES };
}
