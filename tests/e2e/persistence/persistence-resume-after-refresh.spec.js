// Resume Game: recovering a session after a browser refresh from the sticky
// save, versus simply returning to a game still held in memory.
const { test, expect } = require("@playwright/test");
const {
  clickNewGame,
  startNewGame,
  openNetscape,
  closeComputer,
  openNotes,
  closeNotes,
  openPolice,
  policeLogin,
  policeStatus,
  quickLoginButton,
} = require("../../support/game-helpers");

const POLICE = ".browser-page-police";

test("refreshing the browser offers a highlighted Resume Game", async ({ page }) => {
  await page.goto("/");

  const resume = page.locator("#resumeFromMenu");
  await expect(resume).toHaveClass(/disabled/);
  await expect(resume).not.toHaveClass(/has-sticky-save/);

  await clickNewGame(page);
  await page.reload();

  await expect(resume).not.toHaveClass(/disabled/);
  await expect(resume).toHaveClass(/has-sticky-save/);
  await expect(page.locator("#menu")).toBeVisible();
});

test("Resume Game after a refresh restores the full game state including quick login", async ({ page }) => {
  await startNewGame(page);

  // Build up some state worth restoring.
  await openNotes(page);
  await page.locator(".notes-editor-textarea").fill("pendant belongs to worthing");
  await closeNotes(page);

  await openNetscape(page);
  await openPolice(page);
  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");
  await closeComputer(page);

  await page.reload();
  await page.locator("#resumeFromMenu").click();

  // Back in the game, not the menu.
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#menu")).toBeHidden();

  // Notes survived.
  await openNotes(page);
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("pendant belongs to worthing");
  await closeNotes(page);

  // Quick login survived, and the police session it granted survived too.
  await openNetscape(page);
  await openPolice(page);
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");
});

test("Resume still returns to an in-memory game without touching the sticky save", async ({ page }) => {
  await startNewGame(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();

  const resume = page.locator("#resumeFromMenu");
  await expect(resume).not.toHaveClass(/disabled/);
  // No refresh happened, so this is the plain "go back to my game" path and
  // should not be advertised as a recovered save.
  await expect(resume).not.toHaveClass(/has-sticky-save/);

  await resume.click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#menu")).toBeHidden();
});
