// Language switching: the menu flag buttons re-render menu and desktop chrome
// from localization.json, and windows already open at the time of the switch
// are re-titled rather than left showing a raw key.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

test("language buttons localize menu and desktop chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#newGame")).toHaveText("New Game");

  await page.locator("#btnSpanish").click();
  await expect(page.locator("#newGame")).toHaveText("Nuevo Juego");
  await expect(page.locator("#btnSpanish")).toHaveClass(/active/);
  await expect(page.locator("#btnEnglish")).not.toHaveClass(/active/);

  await page.locator("#btnFrench").click();
  await expect(page.locator("#btnFrench")).toHaveClass(/active/);

  await page.locator("#btnEnglish").click();
  await expect(page.locator("#newGame")).toHaveText("New Game");

  // Desktop labels are localized from the same table.
  await page.locator("#newGame").click();
  await expect(page.locator("#reportsFolderLabel")).toHaveText("Reports");
  await expect(page.locator("#zoomReadout")).toContainText("Zoom");
});

test("open story window retitles correctly after a language change", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#backgroundFolder").click();

  const storyWindow = page.locator(".story-window").first();
  await expect(storyWindow).toBeVisible();
  const initialTitle = await storyWindow.locator(".desktop-window-title").textContent();
  expect(initialTitle).toBe("The Arnie Tragedy");

  // Reach the menu, switch language, resume: the title must stay a real title.
  await page.keyboard.press("Escape");
  await page.locator("#btnSpanish").click();
  const retitled = await storyWindow.locator(".desktop-window-title").textContent();
  expect(retitled).not.toContain("backgro");
  expect(retitled.length).toBeGreaterThan(0);
});
