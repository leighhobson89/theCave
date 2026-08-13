// Shared Police record caseNumber allocation logic: "NNNNN-A", where NNNNN
// is a zero-padded number that always increases by a random amount (never a
// fixed +1, so a sequence of case numbers can't be walked or guessed) and A
// is a random uppercase letter.
//
// There is no separate persisted counter. The "current highest" is derived
// by scanning assets/en/police.json's existing caseNumbers every time a new
// one is needed, so the JSON itself stays the single source of truth and
// nothing can drift out of sync with it (a persisted counter file could
// disagree with the content if ever edited by hand or lost).
const CASE_NUMBER_PATTERN = /^(\d+)-([A-Za-z])$/;
const MIN_INCREMENT = 10;
const MAX_INCREMENT = 100;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function parseCaseNumber(value) {
  const match = CASE_NUMBER_PATTERN.exec(String(value || "").trim());
  return match ? Number(match[1]) : null;
}

// Highest numeric part among every well-formed caseNumber in `records`, or 0
// if none are well-formed yet (the very first allocation ever).
function highestCaseNumber(records) {
  return (Array.isArray(records) ? records : []).reduce((highest, record) => {
    const parsed = parseCaseNumber(record?.caseNumber);
    return parsed !== null && parsed > highest ? parsed : highest;
  }, 0);
}

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

// Inclusive of both MIN_INCREMENT and MAX_INCREMENT.
function randomIncrement() {
  return MIN_INCREMENT + Math.floor(Math.random() * (MAX_INCREMENT - MIN_INCREMENT + 1));
}

function formatCaseNumber(number) {
  return `${String(number).padStart(5, "0")}-${randomLetter()}`;
}

// Accepts either the array of existing Police records (the normal case, used
// to derive the current highest by scanning) or a raw numeric highest
// (used internally when generating several numbers in a row without
// re-scanning between each one).
function nextCaseNumber(recordsOrHighest) {
  const currentHighest = Array.isArray(recordsOrHighest)
    ? highestCaseNumber(recordsOrHighest)
    : Number(recordsOrHighest) || 0;

  return formatCaseNumber(currentHighest + randomIncrement());
}

module.exports = {
  CASE_NUMBER_PATTERN,
  parseCaseNumber,
  highestCaseNumber,
  randomLetter,
  randomIncrement,
  formatCaseNumber,
  nextCaseNumber,
};
