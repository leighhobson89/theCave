// The manila EVIDENCE envelope on the noticeboard, now that it holds the
// draggable timeline photographs rather than progressEvidence cards, and the
// rule that decides what is in it:
//
//   the photograph's frame is progressTimeLineEventDeveloperEnabled  AND
//   the milestone named by unlockedByProgressEvidenceId is activated AND
//   the photograph is not already sitting in a frame
//
// Ported from the progress-evidence envelope-display suite.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  closeProgressEvidenceWindow,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  progressEvidenceEnvelope,
  progressEvidenceWindow,
  startNewGame,
} = require("../../support/game-helpers");

const progressTimeLineEventDefinitions = require("../../../assets/progressTimeLineEvent.json").definitions;

function cardIds(page) {
  return progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => card.dataset.progressTimeLinePhotoId)
  );
}

test("the envelope is pinned to the noticeboard and opens the photograph carousel", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const envelope = progressEvidenceEnvelope(page);
  await expect(envelope).toBeVisible();
  await expect(envelope.locator(".progress-evidence-envelope-label")).toHaveText("EVIDENCE");
  await expect(envelope.locator(".progress-evidence-envelope-photo")).toBeVisible();

  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceWindow(page).locator(".desktop-window-title")).toHaveText("Progress Evidence");
});

test("a photograph whose frame is not developer enabled never reaches the envelope", async ({ page }) => {
  await startNewGame(page);

  // 0290 is a registered timeline event that has not been released to the
  // board. Its trigger being activated must not put a photograph in the
  // player's hands, or they would hold one with nowhere to put it.
  const unreleased = progressTimeLineEventDefinitions.find(
    (definition) => definition.progressTimeLineEventId === "0290"
  );
  expect(unreleased.progressTimeLineEventDeveloperEnabled).toBe(false);

  await activateProgressEvidence(page, unreleased.unlockedByProgressEvidenceId);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).not.toContain("0290");
});

test("a photograph appears only once its milestone has been reached", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  await expect(progressEvidenceCards(page)).toHaveCount(0);

  // 00001 is the Black Pine mine closure article, which reveals the 1851
  // photograph for frame 0130.
  await activateProgressEvidence(page, "00001");

  await expect(progressEvidenceCards(page)).toHaveCount(1);
  expect(await cardIds(page)).toEqual(["0130"]);
});

test("reopening the envelope picks up photographs unlocked while it was closed", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceCards(page)).toHaveCount(0);

  await closeProgressEvidenceWindow(page);
  await activateProgressEvidence(page, "00001");
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).toEqual(["0130"]);
});

test("the envelope shows three photographs at once", async ({ page }) => {
  await startNewGame(page);

  // 00002 and 40002 are the two pages that each reveal a pair of photographs.
  await activateProgressEvidence(page, "00002");
  await activateProgressEvidence(page, "40002");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // Four unlocked, three on screen, in chronological order.
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  expect(await cardIds(page)).toEqual(["0220", "0250", "0360"]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/4");
});

test("an unlocked photograph carries its event description as its accessible name", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const expectedDescription = progressTimeLineEventDefinitions
    .find((definition) => definition.progressTimeLineEventId === "0130").description.en;

  await expect(progressEvidenceCards(page).first()).toHaveAttribute("aria-label", expectedDescription);
});
