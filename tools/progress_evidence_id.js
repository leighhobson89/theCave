// Shared progressEvidenceId allocation logic.
//
// An id is five digits: a leading control digit naming the service, then a
// four-digit sequence within that service.
//
//   0 0001   ->  zoomsearch, first item
//   4 3222   ->  standalone
//   3 3333   ->  archives
//
// So the service an id belongs to is readable from the id itself, and each
// service counts up independently behind its own control digit.
//
// There is no persisted counter. The allocated set is derived by scanning
// assets/progressEvidence.json — the single registry of every progress evidence
// item in the game — every time a new id is needed, so nothing can drift out of
// sync with it the way a counter file could if it were hand-edited or lost.
//
// This mirrors getNextProgressEvidenceId() in progressEvidenceManager.js, which
// is the in-game half of the same scheme. The two tables below must agree with
// PROGRESS_EVIDENCE_CONTROL_DIGIT_BY_SERVICE there.
const PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH = 4;
const PROGRESS_EVIDENCE_ID_LENGTH = PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH + 1;

const CONTROL_DIGIT_BY_SERVICE = {
  zoomsearch: "0",
  library: "1",
  police: "2",
  archives: "3",
  standalone: "4",
  facsimile: "5",
};

const SERVICE_BY_CONTROL_DIGIT = Object.fromEntries(
  Object.entries(CONTROL_DIGIT_BY_SERVICE).map(([service, digit]) => [digit, service])
);

function normalizeService(value) {
  return String(value ?? "").trim().toLowerCase();
}

function controlDigitForService(service) {
  return CONTROL_DIGIT_BY_SERVICE[normalizeService(service)] || "";
}

function serviceForProgressEvidenceId(progressEvidenceId) {
  return SERVICE_BY_CONTROL_DIGIT[String(progressEvidenceId ?? "").trim().charAt(0)] || "";
}

function isWellFormedProgressEvidenceId(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length === PROGRESS_EVIDENCE_ID_LENGTH
    && /^\d+$/.test(normalized)
    && Boolean(serviceForProgressEvidenceId(normalized));
}

// The sequence part of an id, ignoring its control digit. Null when the id is
// not well formed.
function parseProgressEvidenceSequence(value) {
  if (!isWellFormedProgressEvidenceId(value)) {
    return null;
  }

  const sequence = Number.parseInt(String(value).trim().slice(1), 10);
  return Number.isFinite(sequence) ? sequence : null;
}

function readDefinitions(definitionsJson) {
  return Array.isArray(definitionsJson?.definitions) ? definitionsJson.definitions : [];
}

// Highest sequence allocated inside one service's block. Ids belonging to other
// services are ignored, so the blocks never interfere with each other.
function highestProgressEvidenceSequence(definitionsJson, service) {
  const controlDigit = controlDigitForService(service);
  if (!controlDigit) {
    return 0;
  }

  return readDefinitions(definitionsJson).reduce((highest, definition) => {
    const progressEvidenceId = String(definition?.progressEvidenceId ?? "").trim();
    if (progressEvidenceId.charAt(0) !== controlDigit) {
      return highest;
    }

    const sequence = parseProgressEvidenceSequence(progressEvidenceId);
    return sequence !== null && sequence > highest ? sequence : highest;
  }, 0);
}

function formatProgressEvidenceId(service, sequence) {
  const controlDigit = controlDigitForService(service);
  if (!controlDigit) {
    return "";
  }

  return `${controlDigit}${String(sequence).padStart(PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH, "0")}`;
}

// One past the highest sequence in that service's block. The first ever
// allocation for a service is its control digit followed by 0001. Returns ""
// for an unknown service rather than inventing an id outside the scheme.
function nextProgressEvidenceId(definitionsJson, service) {
  if (!controlDigitForService(service)) {
    return "";
  }

  return formatProgressEvidenceId(service, highestProgressEvidenceSequence(definitionsJson, service) + 1);
}

module.exports = {
  CONTROL_DIGIT_BY_SERVICE,
  PROGRESS_EVIDENCE_ID_LENGTH,
  PROGRESS_EVIDENCE_ID_SEQUENCE_LENGTH,
  controlDigitForService,
  formatProgressEvidenceId,
  highestProgressEvidenceSequence,
  isWellFormedProgressEvidenceId,
  nextProgressEvidenceId,
  parseProgressEvidenceSequence,
  serviceForProgressEvidenceId,
};
