// Progress timeline events — the dated frames pinned to the noticeboard, the
// pool of photographs waiting in the EVIDENCE envelope, and the record of which
// photograph is currently sitting in which frame.
//
// This is a *third* system, deliberately kept distinct from both of its
// neighbours, and the terminology follows suit throughout:
//
//   evidenceManager.js            the Reports/Photos/Story items the player
//                                 collects and reads.
//   progressEvidenceManager.js    the milestone ids recorded when the player
//                                 opens a page or receives a fax.
//   progressTimeLineEventManager  (this file) the frames, the photographs, and
//                                 what has been placed where.
//
// --- Why a photograph is identified by its frame -------------------------
//
// One source can carry clues about several different dates: the John Baxley
// page (progressEvidenceId 00002) mentions both the August 1901 search party
// and his 1928 retirement. So a photograph cannot be identified by the
// progressEvidenceId it came from — that id is not unique per photograph.
//
// Because a photograph is designed to fit exactly one frame, the photograph and
// the frame share an identity: the progressTimeLineEventId. That is the id of
// the frame, the id of the photograph that belongs in it, and the name of the
// artwork file (0220.png). A source that reveals two photographs is simply
// named as the unlock trigger on two different events.
//
// `unlockedByProgressEvidenceId` is therefore a *trigger*, not an answer, and
// several events may share the same one.

import { isProgressEvidenceActivated } from "./progressEvidenceManager.js";

export const PROGRESS_TIMELINE_EVENT_DEFINITIONS_PATH = "./assets/progressTimeLineEvent.json";

// Artwork lives here, named after the progressTimeLineEventId it fits. A
// definition may name its own file instead; where it does not, the
// [progressTimeLineEventId].png convention applies.
export const PROGRESS_TIMELINE_EVENT_IMAGE_DIRECTORY = "./assets/progressEvidenceImages";
export const PROGRESS_TIMELINE_EVENT_IMAGE_PATH_TEMPLATE =
  `${PROGRESS_TIMELINE_EVENT_IMAGE_DIRECTORY}/{progressTimeLineEventId}.png`;

// A progressTimeLineEventId is four digits, allocated in steps of ten so a new
// event can always be inserted between two existing ones without renumbering.
// It is the authoritative ordering key: `year` is MMYYYY and is only safe to
// compare within a single year (see the developer guide).
export const PROGRESS_TIMELINE_EVENT_ID_LENGTH = 4;

// How many correct placements it takes to lock a batch in. They do NOT have to
// be consecutive on the board — any four correct, unlocked placements lock
// together as one validated batch.
export const PROGRESS_TIMELINE_LOCK_THRESHOLD = 4;

const DEFAULT_DESCRIPTION_LANGUAGE = "en";

// progressTimeLineEventId -> live entry.
const progressTimeLineEventEntriesById = new Map();

// Registry order, sorted by progressTimeLineEventId. Rebuilt on load so nothing
// has to sort at render time.
let orderedProgressTimeLineEventIds = [];

// The persistent record: frame id -> photograph id. A frame holds at most one
// photograph, and a photograph is in at most one frame — both directions are
// enforced by placePhotoOnProgressTimeLineFrame().
let progressTimeLineEventPlacements = {};

// Frames whose placement has been validated and locked. A locked frame cannot
// be emptied, replaced, or dragged out of.
let lockedProgressTimeLineFrameIds = [];

function normalizeProgressTimeLineEventId(value) {
  return String(value ?? "").trim();
}

function normalizeProgressEvidenceId(value) {
  return String(value ?? "").trim();
}

export function isWellFormedProgressTimeLineEventId(progressTimeLineEventId) {
  const normalizedId = normalizeProgressTimeLineEventId(progressTimeLineEventId);
  return normalizedId.length === PROGRESS_TIMELINE_EVENT_ID_LENGTH && /^\d+$/.test(normalizedId);
}

// Splits a MMYYYY code into its parts. A month of "00" means "month unknown",
// which is authored deliberately and is not an error. Returns null for anything
// that is not six digits, so a malformed value renders as nothing rather than
// as a misleading date.
export function parseProgressTimeLineEventYear(year) {
  const normalizedYear = String(year ?? "").trim();
  if (!/^\d{6}$/.test(normalizedYear)) {
    return null;
  }

  const month = Number.parseInt(normalizedYear.slice(0, 2), 10);
  const parsedYear = Number.parseInt(normalizedYear.slice(2), 10);

  return {
    month: month >= 1 && month <= 12 ? month : 0,
    year: parsedYear,
    hasKnownMonth: month >= 1 && month <= 12,
  };
}

function registerProgressTimeLineEventDefinition(definition) {
  const progressTimeLineEventId = normalizeProgressTimeLineEventId(definition?.progressTimeLineEventId);

  if (!progressTimeLineEventId) {
    return false;
  }

  if (progressTimeLineEventEntriesById.has(progressTimeLineEventId)) {
    console.error(
      `Duplicate progressTimeLineEventId in the progress timeline registry: ${progressTimeLineEventId}`
    );
    return false;
  }

  if (!isWellFormedProgressTimeLineEventId(progressTimeLineEventId)) {
    console.error(
      `progressTimeLineEventId ${progressTimeLineEventId} is not ${PROGRESS_TIMELINE_EVENT_ID_LENGTH} digits.`
    );
  }

  const description = definition?.description && typeof definition.description === "object"
    ? { ...definition.description }
    : {};

  progressTimeLineEventEntriesById.set(progressTimeLineEventId, {
    progressTimeLineEventId,
    year: String(definition.year ?? "").trim(),
    // The milestone that reveals this photograph. NOT the answer — several
    // events legitimately share one trigger when a single page carries clues
    // about more than one date.
    unlockedByProgressEvidenceId: normalizeProgressEvidenceId(definition.unlockedByProgressEvidenceId),
    // A "starter kit" photograph: in the player's hands from the very first
    // moment of a new game, no milestone required. Bypasses
    // unlockedByProgressEvidenceId entirely — see isProgressTimeLinePhotoUnlocked().
    availableFromStart: definition.availableFromStart === true,
    // An explicit image beats the [progressTimeLineEventId].png convention.
    imagePath: String(definition.imagePath ?? "").trim(),
    description,
    // Developer decision: whether this frame is on the board at all. Player
    // progress never changes it.
    progressTimeLineEventDeveloperEnabled: definition.progressTimeLineEventDeveloperEnabled === true,
  });

  return true;
}

export async function loadProgressTimeLineEventDefinitions() {
  progressTimeLineEventEntriesById.clear();
  orderedProgressTimeLineEventIds = [];

  let definitions = [];

  try {
    const response = await fetch(PROGRESS_TIMELINE_EVENT_DEFINITIONS_PATH);
    if (!response.ok) {
      console.error(`Unable to load ${PROGRESS_TIMELINE_EVENT_DEFINITIONS_PATH}: ${response.status}`);
      return 0;
    }

    const payload = await response.json();
    definitions = Array.isArray(payload?.definitions) ? payload.definitions : [];
  } catch (error) {
    console.error(`Unable to load ${PROGRESS_TIMELINE_EVENT_DEFINITIONS_PATH}.`, error);
    return 0;
  }

  let registeredCount = 0;
  definitions.forEach((definition) => {
    if (registerProgressTimeLineEventDefinition(definition)) {
      registeredCount += 1;
    }
  });

  // Sorted once, here, so every consumer gets chronological order for free.
  // String comparison is correct because every id is the same fixed length.
  orderedProgressTimeLineEventIds = Array.from(progressTimeLineEventEntriesById.keys()).sort();

  return registeredCount;
}

// The artwork for a photograph: the explicit `imagePath` its definition
// carries, otherwise the [progressTimeLineEventId].png convention. Missing
// files are the normal case while the art is still being drawn.
export function resolveProgressTimeLineEventImagePath(progressTimeLineEventId) {
  const normalizedId = normalizeProgressTimeLineEventId(progressTimeLineEventId);
  if (!normalizedId) {
    return "";
  }

  const authoredImagePath = progressTimeLineEventEntriesById.get(normalizedId)?.imagePath;
  if (authoredImagePath) {
    return authoredImagePath;
  }

  return PROGRESS_TIMELINE_EVENT_IMAGE_PATH_TEMPLATE.replaceAll(
    "{progressTimeLineEventId}",
    normalizedId
  );
}

export function getProgressTimeLineEventDescription(progressTimeLineEventId, language) {
  const entry = progressTimeLineEventEntriesById.get(normalizeProgressTimeLineEventId(progressTimeLineEventId));
  if (!entry) {
    return "";
  }

  const requested = String(entry.description?.[language] ?? "").trim();
  if (requested) {
    return requested;
  }

  return String(entry.description?.[DEFAULT_DESCRIPTION_LANGUAGE] ?? "").trim();
}

export function getProgressTimeLineEventEntries() {
  return orderedProgressTimeLineEventIds
    .map((progressTimeLineEventId) => progressTimeLineEventEntriesById.get(progressTimeLineEventId))
    .filter(Boolean)
    .map((entry) => ({ ...entry, description: { ...entry.description } }));
}

export function getProgressTimeLineEventEntry(progressTimeLineEventId) {
  const entry = progressTimeLineEventEntriesById.get(normalizeProgressTimeLineEventId(progressTimeLineEventId));
  return entry ? { ...entry, description: { ...entry.description } } : null;
}

// The frames the board draws: developer-enabled only, in chronological order.
export function getBoardProgressTimeLineEvents() {
  return getProgressTimeLineEventEntries().filter(
    (entry) => entry.progressTimeLineEventDeveloperEnabled === true
  );
}

// --- The photograph pool ---------------------------------------------------

// A photograph exists for the player once the milestone that reveals it has
// been reached — or immediately, for a handful marked `availableFromStart`
// ("starter kit" evidence the player is simply handed, nothing to unlock). The
// frame must also be developer-enabled either way: an unreleased frame must not
// leak its photograph into the envelope, or the player would hold a picture
// with nowhere to put it.
export function isProgressTimeLinePhotoUnlocked(progressTimeLineEventId) {
  const entry = progressTimeLineEventEntriesById.get(normalizeProgressTimeLineEventId(progressTimeLineEventId));
  if (!entry || entry.progressTimeLineEventDeveloperEnabled !== true) {
    return false;
  }

  if (entry.availableFromStart === true) {
    return true;
  }

  if (!entry.unlockedByProgressEvidenceId) {
    return false;
  }

  return isProgressEvidenceActivated(entry.unlockedByProgressEvidenceId);
}

// Which frame a photograph is currently sitting in, or "" when it is loose in
// the envelope.
export function getFrameHoldingProgressTimeLinePhoto(progressTimeLineEventId) {
  const normalizedId = normalizeProgressTimeLineEventId(progressTimeLineEventId);
  const found = Object.entries(progressTimeLineEventPlacements).find(
    ([, photoId]) => photoId === normalizedId
  );
  return found ? found[0] : "";
}

// The photographs waiting in the envelope: unlocked, and not currently in a
// frame. Chronological, so the carousel is stable between openings.
export function getEnvelopeProgressTimeLinePhotos() {
  return orderedProgressTimeLineEventIds
    .filter((progressTimeLineEventId) => isProgressTimeLinePhotoUnlocked(progressTimeLineEventId))
    .filter((progressTimeLineEventId) => !getFrameHoldingProgressTimeLinePhoto(progressTimeLineEventId))
    .map((progressTimeLineEventId) => ({
      ...progressTimeLineEventEntriesById.get(progressTimeLineEventId),
      description: { ...progressTimeLineEventEntriesById.get(progressTimeLineEventId).description },
    }));
}

// --- Placement -------------------------------------------------------------

export function isProgressTimeLineFrameLocked(progressTimeLineEventId) {
  return lockedProgressTimeLineFrameIds.includes(normalizeProgressTimeLineEventId(progressTimeLineEventId));
}

export function getLockedProgressTimeLineFrameIds() {
  return [...lockedProgressTimeLineFrameIds];
}

// A placement is correct when the photograph's own id matches the frame it is
// in — which is the same statement as "this photograph was drawn for this
// frame". Any photograph may be dropped in any frame; only a matching one
// counts towards validation.
export function isCorrectProgressTimeLinePlacement(progressTimeLineFrameId, progressTimeLinePhotoId) {
  const normalizedFrameId = normalizeProgressTimeLineEventId(progressTimeLineFrameId);
  const normalizedPhotoId = normalizeProgressTimeLineEventId(progressTimeLinePhotoId);
  if (!normalizedFrameId || !normalizedPhotoId) {
    return false;
  }

  return normalizedFrameId === normalizedPhotoId;
}

// Locks every correct-but-not-yet-locked placement once there are at least
// PROGRESS_TIMELINE_LOCK_THRESHOLD of them. They do not have to be adjacent on
// the board. Returns the ids locked by this call, so the view can announce a
// batch rather than re-deriving it.
function validateProgressTimeLinePlacements() {
  const unlockedCorrectFrameIds = orderedProgressTimeLineEventIds.filter((frameId) => {
    if (isProgressTimeLineFrameLocked(frameId)) {
      return false;
    }

    const photoId = progressTimeLineEventPlacements[frameId];
    return photoId !== undefined && isCorrectProgressTimeLinePlacement(frameId, photoId);
  });

  if (unlockedCorrectFrameIds.length < PROGRESS_TIMELINE_LOCK_THRESHOLD) {
    return [];
  }

  lockedProgressTimeLineFrameIds = [...lockedProgressTimeLineFrameIds, ...unlockedCorrectFrameIds].sort();
  return unlockedCorrectFrameIds;
}

// Puts a photograph into a frame, taking it out of the envelope — or out of
// whichever other frame was holding it, since a photograph exists only once.
// Anything already in the target frame is displaced back to the envelope.
//
// Returns { progressTimeLinePhotoId, isCorrect, displacedPhotoId, lockedFrameIds }
// or null when the move is not allowed.
export function placePhotoOnProgressTimeLineFrame(progressTimeLineFrameId, progressTimeLinePhotoId) {
  const normalizedFrameId = normalizeProgressTimeLineEventId(progressTimeLineFrameId);
  const normalizedPhotoId = normalizeProgressTimeLineEventId(progressTimeLinePhotoId);

  if (!normalizedFrameId || !normalizedPhotoId) {
    return null;
  }

  if (!progressTimeLineEventEntriesById.has(normalizedFrameId)) {
    return null;
  }

  if (!isProgressTimeLinePhotoUnlocked(normalizedPhotoId)) {
    return null;
  }

  // A locked frame is settled: it neither accepts a new photograph nor gives up
  // the one it holds.
  if (isProgressTimeLineFrameLocked(normalizedFrameId)) {
    return null;
  }

  const sourceFrameId = getFrameHoldingProgressTimeLinePhoto(normalizedPhotoId);
  if (sourceFrameId && isProgressTimeLineFrameLocked(sourceFrameId)) {
    return null;
  }

  if (sourceFrameId === normalizedFrameId) {
    return null;
  }

  if (sourceFrameId) {
    delete progressTimeLineEventPlacements[sourceFrameId];
  }

  const displacedPhotoId = progressTimeLineEventPlacements[normalizedFrameId] || "";
  progressTimeLineEventPlacements[normalizedFrameId] = normalizedPhotoId;

  const lockedFrameIds = validateProgressTimeLinePlacements();

  return {
    progressTimeLinePhotoId: normalizedPhotoId,
    isCorrect: isCorrectProgressTimeLinePlacement(normalizedFrameId, normalizedPhotoId),
    displacedPhotoId,
    lockedFrameIds,
  };
}

// Empties a frame, returning its photograph to the envelope. This is what the
// frame's cross button does. A locked frame refuses.
export function returnProgressTimeLinePhotoToEnvelope(progressTimeLineFrameId) {
  const normalizedFrameId = normalizeProgressTimeLineEventId(progressTimeLineFrameId);

  if (!Object.prototype.hasOwnProperty.call(progressTimeLineEventPlacements, normalizedFrameId)) {
    return false;
  }

  if (isProgressTimeLineFrameLocked(normalizedFrameId)) {
    return false;
  }

  delete progressTimeLineEventPlacements[normalizedFrameId];
  return true;
}

// The photograph in a frame, with whether it is right and whether it is
// settled. Null for an empty frame.
export function getProgressTimeLineFramePlacement(progressTimeLineFrameId) {
  const normalizedFrameId = normalizeProgressTimeLineEventId(progressTimeLineFrameId);
  const photoId = progressTimeLineEventPlacements[normalizedFrameId];
  if (photoId === undefined) {
    return null;
  }

  return {
    progressTimeLinePhotoId: photoId,
    isCorrect: isCorrectProgressTimeLinePlacement(normalizedFrameId, photoId),
    isLocked: isProgressTimeLineFrameLocked(normalizedFrameId),
  };
}

// Every placement, keyed by frame id. A copy — callers cannot mutate the record
// through it. Keys are in the order the placements were made, not chronological
// order; use getCorrectlyPlacedProgressTimeLineFrameIds() when order matters.
export function getProgressTimeLineEventPlacements() {
  return { ...progressTimeLineEventPlacements };
}

export function getCorrectlyPlacedProgressTimeLineFrameIds() {
  return orderedProgressTimeLineEventIds.filter((frameId) => {
    const photoId = progressTimeLineEventPlacements[frameId];
    return photoId !== undefined && isCorrectProgressTimeLinePlacement(frameId, photoId);
  });
}

// --- Save / load -----------------------------------------------------------

export function getProgressTimeLineEventSnapshot() {
  return {
    placements: getProgressTimeLineEventPlacements(),
    lockedFrameIds: getLockedProgressTimeLineFrameIds(),
  };
}

// Restores from a save payload. Anything unusable resets to empty and reports
// false, which is how a save written before this system existed (where the
// field is simply absent) is handled.
//
// Correctness is never read from the save — it is recomputed from the ids on
// every read — so re-authoring the registry cannot leave a stale "correct"
// baked into an old save file. A photograph appearing in two frames in a
// hand-edited save keeps only its first occurrence, preserving the
// one-photograph-one-place rule.
export function setProgressTimeLineEventSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    resetProgressTimeLineEventPlacements();
    return false;
  }

  const rawPlacements = snapshot.placements;
  if (!rawPlacements || typeof rawPlacements !== "object" || Array.isArray(rawPlacements)) {
    resetProgressTimeLineEventPlacements();
    return false;
  }

  const restored = {};
  const seenPhotoIds = [];
  Object.entries(rawPlacements).forEach(([rawFrameId, rawPhotoId]) => {
    const normalizedFrameId = normalizeProgressTimeLineEventId(rawFrameId);
    const normalizedPhotoId = normalizeProgressTimeLineEventId(rawPhotoId);

    if (!normalizedFrameId || !normalizedPhotoId || seenPhotoIds.includes(normalizedPhotoId)) {
      return;
    }

    seenPhotoIds.push(normalizedPhotoId);
    restored[normalizedFrameId] = normalizedPhotoId;
  });

  progressTimeLineEventPlacements = restored;

  const rawLocked = Array.isArray(snapshot.lockedFrameIds) ? snapshot.lockedFrameIds : [];
  lockedProgressTimeLineFrameIds = rawLocked
    .map((frameId) => normalizeProgressTimeLineEventId(frameId))
    // A locked frame that no longer holds a correct photograph is not locked:
    // the registry is the authority, not the save file.
    .filter((frameId) => frameId
      && isCorrectProgressTimeLinePlacement(frameId, progressTimeLineEventPlacements[frameId]))
    .filter((frameId, index, all) => all.indexOf(frameId) === index)
    .sort();

  return true;
}

// Clears player progress. The registry is untouched — it is content.
export function resetProgressTimeLineEventPlacements() {
  progressTimeLineEventPlacements = {};
  lockedProgressTimeLineFrameIds = [];
}
