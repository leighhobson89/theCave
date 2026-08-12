// The noticeboard scene: transitionGameplayScene()'s fade overlay, the
// desktop/noticeboard visibility swap, the noticeboard button's label swap,
// the re-entrancy guard against a rapid second click, and the active scene
// surviving a save/load round trip, a sticky-save resume after refresh, and
// New Game.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

test("clicking the noticeboard button transitions scenes with a fade, and swaps the button's label", async ({ page }) => {
  await startNewGame(page);

  const button = page.locator("#noticeboardButton");
  const deskWorld = page.locator("#deskWorld");
  const noticeboardScene = page.locator("#noticeboardScene");
  const overlay = page.locator("#sceneFadeOverlay");

  await expect(deskWorld).not.toHaveClass(/is-scene-hidden/);
  await expect(noticeboardScene).toHaveClass(/is-scene-hidden/);
  await expect(button).toHaveAttribute("aria-label", "Go To Noticeboard");
  await expect(overlay).not.toHaveClass(/is-active/);

  await button.click();

  // The fade overlay activates for the transition...
  await expect(overlay).toHaveClass(/is-active/);
  // ...the scenes swap partway through...
  await expect(noticeboardScene).not.toHaveClass(/is-scene-hidden/);
  await expect(deskWorld).toHaveClass(/is-scene-hidden/);
  await expect(button).toHaveAttribute("aria-label", "Go To Desktop");
  await expect(button).toHaveAttribute("title", "Go To Desktop");
  // ...and the overlay fades back out and deactivates on its own.
  await expect(overlay).not.toHaveClass(/is-active/);

  // And back again.
  await button.click();
  await expect(deskWorld).not.toHaveClass(/is-scene-hidden/);
  await expect(noticeboardScene).toHaveClass(/is-scene-hidden/);
  await expect(button).toHaveAttribute("aria-label", "Go To Noticeboard");
});

test("a rapid second click during a transition is guarded: only one transition happens", async ({ page }) => {
  await startNewGame(page);
  const button = page.locator("#noticeboardButton");
  const noticeboardScene = page.locator("#noticeboardScene");

  await button.click();
  // Immediately click again while the fade is still in progress -- must be
  // a no-op, not a second queued transition back to the desktop.
  await button.click({ force: true });

  await expect(noticeboardScene).not.toHaveClass(/is-scene-hidden/);
  // Give the guarded second click's worth of time to prove nothing toggled
  // back once the (single) transition finishes.
  await page.waitForTimeout(2000);
  await expect(noticeboardScene).not.toHaveClass(/is-scene-hidden/);
  await expect(page.locator("#noticeboardButton")).toHaveAttribute("aria-label", "Go To Desktop");
});

test("the active scene survives a save/load round trip", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);

  const saveString = await captureSaveStringViaMenu(page);
  // captureSaveStringViaMenu leaves the game parked at the main menu.

  // Prove restoration, not just "never left": start a fresh game (always
  // resets to the desktop) and then load the earlier save back over it.
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();
  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);

  await loadSaveStringViaMenu(page, saveString);
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);
  await expect(page.locator("#noticeboardButton")).toHaveAttribute("aria-label", "Go To Desktop");
});

test("the active scene survives a real browser refresh via the sticky save", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);
  await expect(page.locator("#deskWorld")).toHaveClass(/is-scene-hidden/);
});

test("New Game always resets the active scene back to the desktop", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);

  await page.keyboard.press("Escape");
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();

  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);
  await expect(page.locator("#noticeboardScene")).toHaveClass(/is-scene-hidden/);
  await expect(page.locator("#noticeboardButton")).toHaveAttribute("aria-label", "Go To Noticeboard");
});
