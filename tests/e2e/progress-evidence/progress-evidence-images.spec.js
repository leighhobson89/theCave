// Progress evidence artwork: [progressEvidenceId].png is loaded from
// assets/photos/progressEvidenceImages/ when it exists, and a missing file falls back to a
// placeholder card carrying the id rather than a broken image.
//
// 00001.png ships with the repo; 00002.png deliberately does not, so both paths
// are covered against real content rather than a fixture.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceWindow,
  startNewGame,
} = require("../../support/game-helpers");

function cardFor(page, progressEvidenceId) {
  return progressEvidenceWindow(page).locator(`.progress-evidence-card[data-progress-evidence-id="${progressEvidenceId}"]`);
}

test("a progress evidence item whose PNG exists displays that image", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = cardFor(page, "00001");
  const image = card.locator(".progress-evidence-card-image");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", "./assets/photos/progressEvidenceImages/00001.png");

  // Decoded, not just present: a 404 would leave naturalWidth at 0.
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  await expect(card.locator(".progress-evidence-placeholder")).toHaveCount(0);
});

test("a progress evidence item with no PNG falls back to a placeholder carrying its id", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00002");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = cardFor(page, "00002");
  const placeholder = card.locator(".progress-evidence-placeholder");
  await expect(placeholder).toBeVisible();
  await expect(placeholder.locator(".progress-evidence-placeholder-id")).toHaveText("00002");

  // The broken <img> is gone, replaced by the placeholder.
  await expect(card.locator(".progress-evidence-card-image")).toHaveCount(0);
  // ...and the card still reads as a temporary evidence card, not a failure.
  await expect(placeholder.locator(".progress-evidence-placeholder-caption")).toHaveText("Evidence pending");
});

test("a missing image does not stop the rest of the viewer rendering", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await activateProgressEvidence(page, "00002");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // Both cards render: the one with artwork and the one still waiting for it.
  await expect(cardFor(page, "00001").locator(".progress-evidence-card-image")).toBeVisible();
  await expect(cardFor(page, "00002").locator(".progress-evidence-placeholder")).toBeVisible();
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/2");
});
