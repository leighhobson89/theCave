// The background story evidence: unlike Photos/Reports it isn't a carousel
// (there's only ever one), so it gets its own window opened straight off the
// desk via #backgroundFolder, rendering assets/{lang}/story.md as plain text.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

test("the Arnie Tragedy desk item opens the story window with the real story text", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#backgroundFolder").click();

  await expect(page.locator(".desktop-window-header:has-text('The Arnie Tragedy')")).toBeVisible();
  const storyText = page.locator(".story-document-text");
  await expect(storyText).toContainText("John Spencer");
  await expect(storyText).toContainText("Diane");
});

test("closing and reopening the story window reloads the same content", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#backgroundFolder").click();
  const closeButton = page.locator(".story-window .story-window-close");
  await expect(page.locator(".story-document-text")).toContainText("John Spencer");
  await closeButton.click();
  await expect(page.locator(".story-window")).toHaveCount(0);

  await page.locator("#backgroundFolder").click();
  await expect(page.locator(".story-document-text")).toContainText("John Spencer");
});

// Opening the story is progress evidence 60001 (service "desktop", itemId
// "theArnieTragedyStory" — see docs/progress-evidence-system.md), which is in
// turn the unlock trigger for timeline event 0180. A real click on the desk
// icon, not a direct call into progressEvidenceManager, so this also proves
// the wiring from the actual entry point a player uses.
test("opening the background story unlocks timeline event 0180", async ({ page }) => {
  await startNewGame(page);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked("0180")
  )).toBe(false);

  await page.locator("#backgroundFolder").click();
  await expect(page.locator(".desktop-window-header:has-text('The Arnie Tragedy')")).toBeVisible();

  expect(await page.evaluate(
    () => window.progressEvidenceDeveloperTools.isProgressEvidenceActivated("60001")
  )).toBe(true);
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked("0180")
  )).toBe(true);
});
