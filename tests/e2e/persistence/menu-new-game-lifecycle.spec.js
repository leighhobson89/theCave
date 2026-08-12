// New Game from the main menu: the overwrite confirmation that guards an
// existing sticky save, and what cancelling versus confirming does to it.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNotes,
  closeNotes,
  readStickySave,
} = require("../support/game-helpers");

test("New Game starts immediately when there is no sticky save", async ({ page }) => {
  await page.goto("/");
  await page.locator("#newGame").click();

  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#gameArea")).toBeVisible();
});

test("New Game warns before overwriting an existing sticky save", async ({ page }) => {
  await startNewGame(page);
  await page.keyboard.press("Escape");

  await page.locator("#newGame").click();

  const confirmPopup = page.locator("#newGameConfirmPopup");
  await expect(confirmPopup).toBeVisible();
  await expect(confirmPopup).toContainText("Start a New Game?");
  await expect(confirmPopup).toContainText("overwrite your current saved game");
  // The game must not have restarted yet.
  await expect(page.locator("#menu")).toBeVisible();
});

test("cancelling New Game preserves the existing sticky save", async ({ page }) => {
  await startNewGame(page);

  await openNotes(page);
  await page.locator(".notes-editor-textarea").fill("do not lose this");
  await closeNotes(page);

  // Force the note into the sticky save rather than waiting for the timer.
  await page.evaluate(() => window.dispatchEvent(new Event("beforeunload")));
  const savedBefore = await readStickySave(page);

  await page.keyboard.press("Escape");
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmCancelButton").click();

  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#menu")).toBeVisible();
  expect(await readStickySave(page)).toBe(savedBefore);

  // The cancelled-away game is still resumable and still has the note.
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await openNotes(page);
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("do not lose this");
});

test("confirming New Game overwrites the sticky save and starts fresh", async ({ page }) => {
  await startNewGame(page);

  await openNotes(page);
  await page.locator(".notes-editor-textarea").fill("old game note");
  await closeNotes(page);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeunload")));

  await page.keyboard.press("Escape");
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();

  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#gameArea")).toBeVisible();

  // The new game replaced it: the note is gone here and after a refresh.
  await openNotes(page);
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("");
  await closeNotes(page);

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await openNotes(page);
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("");
});
