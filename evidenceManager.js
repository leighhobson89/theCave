// Storage keys for the three evidence collections.
//
// KNOWN DEFECT (documented, deliberately not changed): the rest of this module
// and ui.js address the story collection as `STORAGE_KEYS.BACKGROUND_STORY`,
// which is not a member of this object. It therefore evaluates to `undefined`
// and the story collection is keyed by the literal string "undefined" both in
// memory and in every save file ever written. Behaviour is self-consistent, so
// the only visible symptom is that the debug window's per-collection view
// (which iterates Object.values(STORAGE_KEYS)) shows an empty "theArnieTragedy"
// bucket. Defining BACKGROUND_STORY would orphan the story evidence in existing
// saves, so a fix needs a save migration. See docs/architecture.md.
const STORAGE_KEYS = {
  THE_ARNIE_TRAGEDY: "theArnieTragedy",
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

// Exported so ui.js's catalog loaders can always resolve against the
// currently-live path rather than trusting whatever catalogPathTemplate a
// given evidence object happens to carry. Evidence objects are long-lived -
// they're cloned verbatim into save files and web-content JSON records - so a
// literal path baked into one at creation time survives untouched across a
// file rename. Re-deriving from these constants on every read means a rename
// here is the only place that ever needs to change; existing saves and
// web-content records don't need a migration.
export const REPORTS_CATALOG_PATH_TEMPLATE = "./assets/{lang}/reports_evidences.json";
export const PHOTOS_CATALOG_PATH_TEMPLATE = "./assets/{lang}/photos_evidences.json";

const DEFAULT_EVIDENCE_BLUEPRINTS = [
  {
    kind: EVIDENCE_TYPES.STORY,
    storyName: "story",
    defaultTitleString: "The Arnie Tragedy",
  },
  {
    kind: EVIDENCE_TYPES.PHOTO,
    photoPath: "./assets/photos/askewAndrew.png",
    name: "askewAndrew",
    paperStyle: PAPER_STYLES.PHOTO_MOUNTED_IVORY,
  },
  {
    kind: EVIDENCE_TYPES.PHOTO,
    photoPath: "./assets/photos/caveEntrance.png",
    name: "caveEntrance",
    paperStyle: PAPER_STYLES.PHOTO_MOUNTED_IVORY,
  },
];
// The missing person report is no longer seeded at new-game time. It now
// arrives via a scripted facsimile ~40s into a new game — see
// scheduleNewGameIntroFacsimiles() and MISSING_REPORT_FAX_CONFIG in ui.js.

let evidenceStore = createEmptyEvidenceStore();
const evidenceTriggers = new Map();
let nextEvidenceTriggerId = 1;

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

  const clonedEvidence = cloneJson(storedEvidence);
  runEvidenceTriggers(clonedEvidence);
  return clonedEvidence;
}

function runEvidenceTriggers(evidence) {
  if (!evidence || typeof evidence !== "object") {
    return;
  }

  evidenceTriggers.forEach((trigger, triggerId) => {
    if (!trigger || typeof trigger !== "object") {
      return;
    }

    const predicate = trigger.predicate;
    if (typeof predicate !== "function") {
      return;
    }

    let matches = false;
    try {
      matches = predicate(cloneJson(evidence)) === true;
    } catch (error) {
      console.error("Evidence trigger predicate failed:", error);
      return;
    }

    if (!matches) {
      return;
    }

    try {
      if (typeof trigger.action === "function") {
        trigger.action(cloneJson(evidence));
      }
    } catch (error) {
      console.error("Evidence trigger action failed:", error);
    }

    if (trigger.once !== false) {
      evidenceTriggers.delete(triggerId);
    }
  });
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

// Same rationale as the two catalog constants above: derived from the
// evidence's own `name` on every call (in createStoryEvidence AND in
// resolveEvidenceContentPath below) rather than trusted as a stored literal,
// so a markdown-template evidence created under an older path convention
// still resolves correctly after that convention changes.
function buildMarkdownTemplatePath(name) {
  const normalizedName = String(name || "story").trim() || "story";
  return `./assets/{lang}/${normalizedName}.md`;
}

export function createStoryEvidence({
  storyName,
  storageKey = STORAGE_KEYS.BACKGROUND_STORY,
  titleKey = "theArnieTragedy",
  paperStyle = PAPER_STYLES.STORY_LINED,
  defaultTitleString,
} = {}) {
  const normalizedName = (storyName || "story").trim();

  return createEvidence({
    type: EVIDENCE_TYPES.STORY,
    storageKey,
    titleKey,
    name: normalizedName,
    defaultTitleString:
      defaultTitleString || buildDefaultTitleString(normalizedName),
    paperStyle,
    source: {
      kind: "markdown-template",
      languageAware: true,
      pathTemplate: buildMarkdownTemplatePath(normalizedName),
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
    .map(cloneJson);
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
  ensureCollection(storageKey);

  // Resolve the single active id rather than cloning the whole collection.
  const ids = evidenceStore.collections[storageKey];
  if (!ids.length) {
    return null;
  }

  const activeId = ids[normalizeIndex(getEvidenceIndex(storageKey), ids.length)];
  const evidence = evidenceStore.evidencesById[String(activeId)];
  return evidence ? cloneJson(evidence) : null;
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
    // Regenerated from the evidence's own `name`, not read from
    // evidence.source.pathTemplate - see buildMarkdownTemplatePath().
    const canonicalTemplate = buildMarkdownTemplatePath(evidence.name);
    if (!evidence.source.languageAware) {
      return canonicalTemplate;
    }

    const language = String(languageCode || "en").trim() || "en";
    return canonicalTemplate.replaceAll("{lang}", language);
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

export function addEvidenceTrigger({ predicate, action, once = true } = {}) {
  if (typeof predicate !== "function" || typeof action !== "function") {
    return null;
  }

  const triggerId = `evidence-trigger-${nextEvidenceTriggerId}`;
  nextEvidenceTriggerId += 1;

  evidenceTriggers.set(triggerId, {
    predicate,
    action,
    once: once !== false,
  });

  return triggerId;
}
