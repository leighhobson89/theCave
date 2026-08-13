// Progress evidence — the persistent record of which investigation milestones
// the player has reached, and which of those the developer has chosen to show
// on the noticeboard's manila EVIDENCE envelope.
//
// This is a *separate* system from the evidence store in evidenceManager.js.
// That one holds the Reports/Photos/Story items the player collects; this one
// holds nothing but a set of milestone ids, so the terminology is deliberately
// distinct throughout: `progressEvidence`, `progressEvidenceId`,
// `progressEvidenceActivated`, `progressEvidenceDeveloperEnabled`. The name
// `evidenceId` is *never* used here — it already means something else.
//
// Two independent flags decide whether an item appears in the envelope:
//
//   progressEvidenceActivated        player progress. Set true by
//                                    activateProgressEvidence(), which is what
//                                    opening a website / receiving a fax calls.
//   progressEvidenceDeveloperEnabled developer decision. Authored in
//                                    assets/progressEvidence.json. Player
//                                    progress never changes it.
//
// An item is eligible for the envelope only when BOTH are true.
//
// See docs/progress-evidence-system.md for the full developer guide.

// The registry: one definition per website and per received fax, for the whole
// game. It is a single language-neutral JSON file rather than five per-language
// copies, because a progressEvidenceId and its two flags are the same fact in
// every language — the web content JSON files hold only the localizable content.
//
// It is also the *only* place ids are allocated. Nothing is invented at
// runtime: an item without a definition here simply has no progress evidence.
export const PROGRESS_EVIDENCE_DEFINITIONS_PATH = "./assets/progressEvidence.json";

// The services a progress evidence item can come from. "facsimile" covers
// received faxes; "desktop" covers desktop items that are neither a website
// nor a fax (e.g. opening the background story); the rest are the in-game web
// services.
export const PROGRESS_EVIDENCE_SERVICES = {
  ZOOMSEARCH: "zoomsearch",
  LIBRARY: "library",
  POLICE: "police",
  ARCHIVES: "archives",
  STANDALONE: "standalone",
  FACSIMILE: "facsimile",
  DESKTOP: "desktop",
};

// A progressEvidenceId is five digits: a leading control digit naming the
// service, then a four-digit sequence within that service.
//
//   0 0001   ->  zoomsearch, first item
//   4 3222   ->  standalone
//   3 3333   ->  archives
//
// So the service an id belongs to is readable from the id itself, with no
// lookup. Four digits caps a service at 9999 items, which is far beyond
// anything this game will hold.
export const PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH = 4;
export const PROGRESS_EVIDENCE_ID_LENGTH = PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH + 1;

export const PROGRESS_EVIDENCE_CONTROL_DIGIT_BY_SERVICE = {
  [PROGRESS_EVIDENCE_SERVICES.ZOOMSEARCH]: "0",
  [PROGRESS_EVIDENCE_SERVICES.LIBRARY]: "1",
  [PROGRESS_EVIDENCE_SERVICES.POLICE]: "2",
  [PROGRESS_EVIDENCE_SERVICES.ARCHIVES]: "3",
  [PROGRESS_EVIDENCE_SERVICES.STANDALONE]: "4",
  [PROGRESS_EVIDENCE_SERVICES.FACSIMILE]: "5",
  [PROGRESS_EVIDENCE_SERVICES.DESKTOP]: "6",
};

const PROGRESS_EVIDENCE_SERVICE_BY_CONTROL_DIGIT = Object.fromEntries(
  Object.entries(PROGRESS_EVIDENCE_CONTROL_DIGIT_BY_SERVICE).map(([service, digit]) => [digit, service])
);

// The persistent record: every progressEvidenceId the player has activated, in
// activation order, without duplicates. This is the one thing that goes into
// the save file — the definitions are content, not save data.
let progressEvidence = [];

// progressEvidenceId -> live entry. Each entry carries the authored fields plus
// `progressEvidenceActivated`, kept in sync with `progressEvidence`.
const progressEvidenceEntriesById = new Map();

// "service:itemId" -> progressEvidenceId, so an opened website or a received
// fax can be resolved to its progress evidence in one lookup. Two services can
// legitimately hold a record with the same id (ZoomSearch and the Archives both
// have "henrywhitmore"), which is why the service is part of the key.
const progressEvidenceIdsByItemKey = new Map();

// progressEvidenceIds whose definition authored `progressEvidenceActivated:
// true` — "already activated, put it in the envelope immediately". Kept
// separately so they can be re-seeded after a save is restored or a new game
// resets the collection.
const authoredActivatedIds = new Set();

function normalizeProgressEvidenceId(value) {
  return String(value ?? "").trim();
}

function normalizeService(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildItemKey(service, itemId) {
  const normalizedService = normalizeService(service);
  const normalizedItemId = String(itemId ?? "").trim().toLowerCase();
  if (!normalizedService || !normalizedItemId) {
    return "";
  }

  return `${normalizedService}:${normalizedItemId}`;
}

export function getProgressEvidenceControlDigit(service) {
  return PROGRESS_EVIDENCE_CONTROL_DIGIT_BY_SERVICE[normalizeService(service)] || "";
}

// Which service an id belongs to, read straight off its leading digit.
export function getProgressEvidenceServiceById(progressEvidenceId) {
  const normalizedId = normalizeProgressEvidenceId(progressEvidenceId);
  return PROGRESS_EVIDENCE_SERVICE_BY_CONTROL_DIGIT[normalizedId.charAt(0)] || "";
}

export function isWellFormedProgressEvidenceId(progressEvidenceId) {
  const normalizedId = normalizeProgressEvidenceId(progressEvidenceId);
  return normalizedId.length === PROGRESS_EVIDENCE_ID_LENGTH
    && /^\d+$/.test(normalizedId)
    && Boolean(getProgressEvidenceServiceById(normalizedId));
}

// Registers one definition. Returns false when it is unusable or its
// progressEvidenceId is already taken.
function registerProgressEvidenceDefinition(definition) {
  const progressEvidenceId = normalizeProgressEvidenceId(definition?.progressEvidenceId);
  const service = normalizeService(definition?.service);

  if (!progressEvidenceId) {
    return false;
  }

  if (progressEvidenceEntriesById.has(progressEvidenceId)) {
    console.error(`Duplicate progressEvidenceId in the progress evidence registry: ${progressEvidenceId}`);
    return false;
  }

  // A mismatched control digit means the id would resolve to the wrong service
  // and, worse, that the allocator would hand the same id out again. Reported
  // rather than silently corrected, since only the author can say which of the
  // two is wrong.
  const expectedControlDigit = getProgressEvidenceControlDigit(service);
  if (expectedControlDigit && progressEvidenceId.charAt(0) !== expectedControlDigit) {
    console.error(
      `progressEvidenceId ${progressEvidenceId} does not start with the '${service}' control digit `
      + `${expectedControlDigit} (see PROGRESS_EVIDENCE_CONTROL_DIGIT_BY_SERVICE).`
    );
  }

  progressEvidenceEntriesById.set(progressEvidenceId, {
    progressEvidenceId,
    service,
    itemId: String(definition.itemId ?? "").trim(),
    label: String(definition.label ?? "").trim(),
    // Defaults for both flags are false.
    progressEvidenceActivated: false,
    progressEvidenceDeveloperEnabled: definition.progressEvidenceDeveloperEnabled === true,
  });

  if (definition.progressEvidenceActivated === true) {
    authoredActivatedIds.add(progressEvidenceId);
  }

  const itemKey = buildItemKey(service, definition.itemId);
  if (itemKey) {
    progressEvidenceIdsByItemKey.set(itemKey, progressEvidenceId);
  }

  return true;
}

// Loads assets/progressEvidence.json into the registry. Called once at startup
// by ui.js, before gameplay begins, and safe to call again (it rebuilds rather
// than appending).
//
// Any failure — missing file, bad JSON — leaves an empty registry rather than a
// half-populated one: no progress evidence resolves, which is visible and
// recoverable, instead of some items silently going missing.
export async function loadProgressEvidenceDefinitions() {
  progressEvidenceEntriesById.clear();
  progressEvidenceIdsByItemKey.clear();
  authoredActivatedIds.clear();

  let definitions = [];

  try {
    const response = await fetch(PROGRESS_EVIDENCE_DEFINITIONS_PATH);
    if (!response.ok) {
      console.error(`Unable to load ${PROGRESS_EVIDENCE_DEFINITIONS_PATH}: ${response.status}`);
      syncActivationFlags();
      return 0;
    }

    const payload = await response.json();
    definitions = Array.isArray(payload?.definitions) ? payload.definitions : [];
  } catch (error) {
    console.error(`Unable to load ${PROGRESS_EVIDENCE_DEFINITIONS_PATH}.`, error);
    syncActivationFlags();
    return 0;
  }

  let registeredCount = 0;
  definitions.forEach((definition) => {
    if (registerProgressEvidenceDefinition(definition)) {
      registeredCount += 1;
    }
  });

  syncActivationFlags();
  return registeredCount;
}

// Puts every authored-activated id into the collection. Run after any change to
// either the registry or the collection, so "in the envelope immediately"
// survives a save restore and a New Game alike.
function seedAuthoredActivations() {
  authoredActivatedIds.forEach((progressEvidenceId) => {
    if (!progressEvidence.includes(progressEvidenceId)) {
      progressEvidence.push(progressEvidenceId);
    }
  });
}

// Mirrors the persisted `progressEvidence` collection onto the per-entry
// `progressEvidenceActivated` flags. The array stays the single source of truth
// for what the player has done; the flag is the per-item view of it that the
// envelope reads.
function syncActivationFlags() {
  seedAuthoredActivations();

  const activatedIds = new Set(progressEvidence);
  progressEvidenceEntriesById.forEach((entry) => {
    entry.progressEvidenceActivated = activatedIds.has(entry.progressEvidenceId);
  });
}

// Records that the player has reached the milestone identified by
// `progressEvidenceId`. Safe to call repeatedly: a progressEvidenceId already
// in the collection is never added twice.
//
// Returns true only when this call actually added the id, so a caller can tell
// a first activation from a repeat.
//
//   activateProgressEvidence("00001");
export function activateProgressEvidence(progressEvidenceId) {
  const normalizedId = normalizeProgressEvidenceId(progressEvidenceId);
  if (!normalizedId) {
    return false;
  }

  if (progressEvidence.includes(normalizedId)) {
    return false;
  }

  progressEvidence.push(normalizedId);
  syncActivationFlags();
  return true;
}

// Convenience wrapper for the activation call sites: resolves a service +
// record/fax id to its progressEvidenceId and activates it. Items with no
// registry entry are ignored, so an unaudited record can never throw.
export function activateProgressEvidenceForItem(service, itemId) {
  const progressEvidenceId = getProgressEvidenceIdForItem(service, itemId);
  return progressEvidenceId ? activateProgressEvidence(progressEvidenceId) : false;
}

export function getProgressEvidenceIdForItem(service, itemId) {
  return progressEvidenceIdsByItemKey.get(buildItemKey(service, itemId)) || "";
}

export function isProgressEvidenceActivated(progressEvidenceId) {
  return progressEvidence.includes(normalizeProgressEvidenceId(progressEvidenceId));
}

// The activated ids, in activation order. A copy — callers cannot mutate the
// collection through it.
export function getProgressEvidence() {
  return [...progressEvidence];
}

export function getProgressEvidenceCount() {
  return progressEvidence.length;
}

// Every registered item with both of its flags, for the audit/debug views.
export function getProgressEvidenceEntries() {
  return Array.from(progressEvidenceEntriesById.values()).map((entry) => ({ ...entry }));
}

export function getProgressEvidenceEntry(progressEvidenceId) {
  const entry = progressEvidenceEntriesById.get(normalizeProgressEvidenceId(progressEvidenceId));
  return entry ? { ...entry } : null;
}

// The envelope's eligibility rule, in one place:
//   progressEvidenceActivated === true && progressEvidenceDeveloperEnabled === true
// Returned in registry order so the carousel is stable between openings.
export function getEligibleProgressEvidence() {
  return getProgressEvidenceEntries().filter((entry) => (
    entry.progressEvidenceActivated === true
    && entry.progressEvidenceDeveloperEnabled === true
  ));
}

// Developer-only switch. It is NOT player progress and is never called by
// gameplay code; it exists so a developer (or a test) can turn an item's
// display on or off for a session without editing the definitions file.
export function setProgressEvidenceDeveloperEnabled(progressEvidenceId, isEnabled) {
  const entry = progressEvidenceEntriesById.get(normalizeProgressEvidenceId(progressEvidenceId));
  if (!entry) {
    return false;
  }

  entry.progressEvidenceDeveloperEnabled = isEnabled === true;
  return true;
}

// --- Id allocation ---------------------------------------------------------

// The highest sequence number allocated within one service's block, as a
// number. Ids from other services are ignored, so each service counts up
// independently behind its own control digit.
export function getHighestProgressEvidenceSequence(service) {
  const controlDigit = getProgressEvidenceControlDigit(service);
  if (!controlDigit) {
    return 0;
  }

  let highest = 0;
  progressEvidenceEntriesById.forEach((entry) => {
    if (entry.progressEvidenceId.charAt(0) !== controlDigit) {
      return;
    }

    const sequence = Number.parseInt(entry.progressEvidenceId.slice(1), 10);
    if (Number.isFinite(sequence) && sequence > highest) {
      highest = sequence;
    }
  });

  return highest;
}

// One past the highest sequence in that service's block, behind its control
// digit. This is what the web content builder's read-only progressEvidenceId
// field shows. Returns "" for a service with no control digit, rather than
// inventing an id outside the scheme.
export function getNextProgressEvidenceId(service) {
  const controlDigit = getProgressEvidenceControlDigit(service);
  if (!controlDigit) {
    return "";
  }

  const nextSequence = getHighestProgressEvidenceSequence(service) + 1;
  return `${controlDigit}${String(nextSequence).padStart(PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH, "0")}`;
}

// --- Save / load -----------------------------------------------------------

// What goes into the save payload: just the activated ids.
export function getProgressEvidenceSnapshot() {
  return getProgressEvidence();
}

// Restores from a save payload. Anything that is not an array of usable ids
// resets the collection to empty and reports false, which is how a pre-progress
// evidence save (where the field is simply absent) is handled.
//
// De-duplicates on the way in, so a hand-edited or double-written save cannot
// introduce duplicate entries.
export function setProgressEvidenceSnapshot(snapshot) {
  if (!Array.isArray(snapshot)) {
    resetProgressEvidence();
    return false;
  }

  const restoredIds = [];
  snapshot.forEach((rawId) => {
    const normalizedId = normalizeProgressEvidenceId(rawId);
    if (normalizedId && !restoredIds.includes(normalizedId)) {
      restoredIds.push(normalizedId);
    }
  });

  progressEvidence = restoredIds;
  syncActivationFlags();
  return true;
}

// Clears player progress. Authored-activated items are re-seeded by
// syncActivationFlags(), because "in the envelope immediately" is a property of
// the item, not something a new game can undo.
export function resetProgressEvidence() {
  progressEvidence = [];
  syncActivationFlags();
}
