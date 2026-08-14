// The CaveOS desktop's icon row and its Utilities/Games folder system.
//
// Folders open on a real double click and the icons inside open on a real
// single click, because that difference in gesture IS the feature — a test that
// called the openers directly would pass with the double-click wiring removed
// entirely.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openComputer } = require("../../support/game-helpers");
const {
  CAVEOS_LANGUAGES,
  utilitiesFolderWindow,
  desktopIcons,
  gamesFolderWindow,
  openUtilitiesFolder,
  openGamesFolder,
  startNewGameInLanguage,
} = require("../../support/caveos-helpers");

test("the desktop holds the two folders then Notes, ECHOTRAIL and Netscape, and nothing else", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const iconClasses = await desktopIcons(page).evaluateAll(
    (icons) => icons.map((icon) => icon.className)
  );

  expect(iconClasses).toHaveLength(5);
  expect(iconClasses[0]).toContain("computer-icon-folder-utilities");
  expect(iconClasses[1]).toContain("computer-icon-folder-games");
  expect(iconClasses[2]).toContain("computer-icon-notes");
  expect(iconClasses[3]).toContain("computer-icon-echotrail");
  expect(iconClasses[4]).toContain("computer-icon-netscape");

  // Paint, Calculator and the games have all moved off the desktop.
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-paint")).toHaveCount(0);
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-calculator")).toHaveCount(0);
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-snake")).toHaveCount(0);
});

test("all five desktop icons sit on one row, and only wrap when the screen is too narrow", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const iconRowTops = () => desktopIcons(page).evaluateAll(
    (icons) => icons.map((icon) => Math.round(icon.getBoundingClientRect().top))
  );

  // At the default viewport there is room, so every icon shares a row.
  const tops = await iconRowTops();
  expect(new Set(tops).size).toBe(1);

  // Narrow enough that five 110px columns no longer fit: the grid is expected
  // to wrap rather than crush the icons.
  await page.setViewportSize({ width: 700, height: 800 });
  await expect.poll(async () => new Set(await iconRowTops()).size).toBeGreaterThan(1);
});

test("icons inside a folder keep the square shape they have on the desktop", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  // The desktop icon is the reference: whatever shape it is, a folder's icons
  // must match it rather than stretching into a bar across the window.
  const desktopIconBox = await page.locator(".computer-icon-notes").boundingBox();

  // Both folders are checked, but Utilities is the one that matters: it holds two
  // icons, and it was a sparsely filled folder that exposed the bug. Stretchy
  // 1fr tracks look fine once a folder happens to hold enough icons to fill the
  // row, so a test that only opened the four-icon Games folder would pass with
  // the fix reverted.
  for (const openFolder of [openUtilitiesFolder, openGamesFolder]) {
    await openFolder(page);
    const folderWindow = openFolder === openUtilitiesFolder
      ? utilitiesFolderWindow(page)
      : gamesFolderWindow(page);

    const folderIconBoxes = await folderWindow
      .locator(".computer-icon")
      .evaluateAll((icons) => icons.map((icon) => {
        const { width, height } = icon.getBoundingClientRect();
        return { width: Math.round(width), height: Math.round(height) };
      }));

    expect(folderIconBoxes.length).toBeGreaterThan(0);
    folderIconBoxes.forEach((box) => {
      expect(box.width).toBeLessThanOrEqual(Math.round(desktopIconBox.width) + 12);
      // Roughly square. A stretched icon was well over twice as wide as tall,
      // which is exactly the failure this guards.
      expect(box.width / box.height).toBeLessThan(1.5);
    });
  }
});

test("a single click on a folder does not open it; a double click does", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await page.locator(".computer-icon-folder-utilities").click();
  // Given time to open if the wiring were wrong.
  await page.waitForTimeout(400);
  await expect(utilitiesFolderWindow(page)).toHaveCount(0);

  await openUtilitiesFolder(page);
});

test("the Utilities folder holds Paint and Calculator, each opening on a single click", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openUtilitiesFolder(page);

  await expect(utilitiesFolderWindow(page).locator(".desktop-window-title"))
    .toHaveText(localization.en.computerUtilitiesFolderLabel);

  const folderIcons = utilitiesFolderWindow(page).locator(".computer-icon");
  await expect(folderIcons).toHaveCount(2);

  await utilitiesFolderWindow(page).locator(".computer-icon-paint").click();
  await expect(page.locator(".caveos-paint-window")).toBeVisible();
  await page.locator(".caveos-paint-window .story-window-close").click();

  await utilitiesFolderWindow(page).locator(".computer-icon-calculator").click();
  await expect(page.locator(".caveos-calculator-window")).toBeVisible();
});

test("the Games folder holds the four games, opening on a single click", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openGamesFolder(page);

  await expect(gamesFolderWindow(page).locator(".desktop-window-title"))
    .toHaveText(localization.en.computerGamesFolderLabel);

  const folderIcons = gamesFolderWindow(page).locator(".computer-icon");
  await expect(folderIcons).toHaveCount(4);

  await gamesFolderWindow(page).locator(".computer-icon-snake").click();
  await expect(page.locator(".caveos-snake-window")).toBeVisible();
  await expect(page.locator(".caveos-snake-window .desktop-window-title"))
    .toHaveText(localization.en.computerSnakeWindowTitle);
});

test("a folder icon opens from the keyboard too, since a double click cannot be typed", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await page.locator(".computer-icon-folder-games").focus();
  await page.keyboard.press("Enter");
  await expect(gamesFolderWindow(page)).toBeVisible();
});

test("reopening a folder toggles it closed rather than stacking a second copy", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openUtilitiesFolder(page);

  await page.locator(".computer-icon-folder-utilities").dblclick();
  await expect(utilitiesFolderWindow(page)).toHaveCount(0);

  await openUtilitiesFolder(page);
  await expect(utilitiesFolderWindow(page)).toHaveCount(1);
});

for (const language of CAVEOS_LANGUAGES) {
  test(`folder names and titles are localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openComputer(page);

    await expect(page.locator(".computer-icon-folder-utilities .computer-icon-label"))
      .toHaveText(strings.computerUtilitiesFolderLabel);
    await expect(page.locator(".computer-icon-folder-games .computer-icon-label"))
      .toHaveText(strings.computerGamesFolderLabel);

    await openUtilitiesFolder(page);
    await expect(utilitiesFolderWindow(page).locator(".desktop-window-title"))
      .toHaveText(strings.computerUtilitiesFolderLabel);
    await expect(utilitiesFolderWindow(page).locator(".story-window-close"))
      .toHaveAttribute("aria-label", strings.closeUtilitiesFolderWindowAriaLabel);

    await openGamesFolder(page);
    await expect(gamesFolderWindow(page).locator(".desktop-window-title"))
      .toHaveText(strings.computerGamesFolderLabel);
    await expect(gamesFolderWindow(page).locator(".story-window-close"))
      .toHaveAttribute("aria-label", strings.closeGamesFolderWindowAriaLabel);
  });
}
