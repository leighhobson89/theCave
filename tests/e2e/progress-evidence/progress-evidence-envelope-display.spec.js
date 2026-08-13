// The manila EVIDENCE envelope on the noticeboard, and the rule that decides
// what it shows: progressEvidenceActivated === true AND
// progressEvidenceDeveloperEnabled === true. Anything else stays hidden.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  closeProgressEvidenceWindow,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  progressEvidenceEnvelope,
  progressEvidenceWindow,
  setProgressEvidenceDeveloperEnabled,
  startNewGame,
} = require("../../support/game-helpers");

function cardIds(page) {
  return progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => card.dataset.progressEvidenceId)
  );
}

test("the envelope is pinned to the noticeboard and opens the progress evidence window", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const envelope = progressEvidenceEnvelope(page);
  await expect(envelope).toBeVisible();
  await expect(envelope.locator(".progress-evidence-envelope-label")).toHaveText("EVIDENCE");
  await expect(envelope.locator(".progress-evidence-envelope-photo")).toBeVisible();

  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceWindow(page).locator(".desktop-window-title")).toHaveText("Progress Evidence");
});

test("progress evidence that is activated but not developer enabled stays hidden", async ({ page }) => {
  await startNewGame(page);
  // 20005 is a police record: activated by the player, but the developer has
  // not released it for display.
  await activateProgressEvidence(page, "20005");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  await expect(progressEvidenceCards(page)).toHaveCount(0);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-empty")).toBeVisible();
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("0/0");
});

test("progress evidence that is developer enabled but not activated stays hidden", async ({ page }) => {
  await startNewGame(page);
  // 00001 and 00002 ship developer-enabled; nothing has been activated yet.
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  await expect(progressEvidenceCards(page)).toHaveCount(0);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-empty")).toBeVisible();
});

test("progress evidence appears only when both flags are true", async ({ page }) => {
  await startNewGame(page);

  // One of each of the three hidden combinations, plus one that qualifies.
  await activateProgressEvidence(page, "00001");             // activated + developer enabled
  await activateProgressEvidence(page, "20005");             // activated, developer disabled
  await setProgressEvidenceDeveloperEnabled(page, "30002", true); // developer enabled, not activated
  // 10003 is left untouched: neither activated nor developer enabled.

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).toEqual(["00001"]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/1");
});

test("clicking the envelope refreshes the available progress evidence", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
  expect(await cardIds(page)).toEqual(["00001"]);

  // Close it, make progress, reopen: the second opening must show the newly
  // eligible item rather than the strip it was built with the first time.
  await closeProgressEvidenceWindow(page);

  await activateProgressEvidence(page, "00002");

  await openProgressEvidenceEnvelope(page);
  expect(await cardIds(page)).toEqual(["00001", "00002"]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/2");
});

test("the envelope shows three progress evidence items at once", async ({ page }) => {
  await startNewGame(page);

  for (const progressEvidenceId of ["00001", "00002", "00003", "00004"]) {
    await activateProgressEvidence(page, progressEvidenceId);
    await setProgressEvidenceDeveloperEnabled(page, progressEvidenceId, true);
  }

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // Four are eligible; exactly three are on screen.
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  expect(await cardIds(page)).toEqual(["00001", "00002", "00003"]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/4");

  for (const card of await progressEvidenceCards(page).all()) {
    await expect(card).toBeVisible();
  }
});
