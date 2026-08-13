// Progress evidence is a separate system from the evidence store. This spec
// guards the boundary: with progress evidence activated and on screen, the
// Reports and Photos folders must behave exactly as they did before.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  closeFacsimile,
  closeProgressEvidenceWindow,
  facsimileWindow,
  openFacsimile,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  queueFacsimileReport,
  readProgressEvidence,
  startNewGame,
} = require("../../support/game-helpers");

test("the Photos carousel still steps through both starting photos with progress evidence active", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await activateProgressEvidence(page, "00002");

  await page.locator("#photosFolder").click();
  const photosWindow = page.locator(".photos-window");
  const counter = photosWindow.locator(".photos-carousel-counter");
  const caption = photosWindow.locator(".photo-caption-text");

  await expect(counter).toHaveText("1/2");
  await expect(caption).toHaveText("Andrew and Arnie Spencer, Spencer Farm, Black Pine, summer 1901");

  await photosWindow.locator(".carousel-nav-next").click();
  await expect(counter).toHaveText("2/2");
  await expect(caption).toHaveText("Cave entrance, August 1901");

  // The photo evidence collection and the progress evidence collection are
  // independent: neither has leaked into the other.
  expect(await readProgressEvidence(page)).toEqual(["00001", "00002"]);
});

test("a fax still becomes Reports evidence while also recording progress evidence", async ({ page }) => {
  await startNewGame(page);

  // This helper queues the real missing-person-report catalog entry under a
  // test id, which has no progress evidence registry entry — an unregistered
  // fax must pass straight through without disturbing anything.
  await queueFacsimileReport(page);
  await openFacsimile(page);
  await expect(facsimileWindow(page)).toBeVisible();
  await closeFacsimile(page);
  expect(await readProgressEvidence(page)).toEqual([]);

  await page.locator("#reportsFolder").click();
  const reportsWindow = page.locator(".reports-window");
  await expect(reportsWindow.locator(".report-carousel-counter")).toHaveText("1/1");
  await expect(reportsWindow.locator(".report-document-text").first()).toContainText("MISSING PERSON INVESTIGATION");
});

test("the progress evidence window and the evidence folders coexist", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceCards(page)).toHaveCount(1);
  await closeProgressEvidenceWindow(page);

  // Back to the desk: the folders open normally afterwards, and the progress
  // evidence record is untouched.
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);

  await page.locator("#photosFolder").click();
  await expect(page.locator(".photos-window .photos-carousel-counter")).toHaveText("1/2");

  await page.locator("#reportsFolder").click();
  await expect(page.locator(".reports-window .report-carousel-empty")).toBeVisible();

  expect(await readProgressEvidence(page)).toEqual(["00001"]);
});
