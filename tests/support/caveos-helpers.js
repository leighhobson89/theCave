// Shared helpers for the CaveOS suite (tests/e2e/caveos/).
//
// These sit alongside game-helpers.js rather than inside the spec folder
// because Playwright collects every .js under tests/ that matches its testMatch
// pattern, and a helper module living next to the specs invites confusion about
// which files are tests. Everything here drives the OS the way a player does:
// folders open on a real double click, the icons inside on a real single click,
// because that difference in gesture is the feature.
const { expect } = require("@playwright/test");
const { openComputer, clickNewGame } = require("./game-helpers");

// Every language the game ships, with the flag button that selects it on the
// title menu. Specs loop this rather than hand-listing languages, so adding a
// sixth language surfaces as failing assertions instead of silent under-testing.
const CAVEOS_LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

// The flag buttons only exist on the title menu, so a language has to be chosen
// before the game starts rather than switched into mid-session.
async function startNewGameInLanguage(page, buttonId) {
  await page.goto("/");
  await page.locator(`#${buttonId}`).click();
  await clickNewGame(page);
}

// The pause menu is where a mid-session language switch actually happens.
async function switchLanguageMidGame(page, buttonId) {
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  await page.locator(`#${buttonId}`).click();
  await page.locator("#resumeFromMenu").click();
}

function desktopIcons(page) {
  return page.locator(".computer-desktop > .computer-icons-grid > .computer-icon");
}

function utilitiesFolderWindow(page) {
  return page.locator(".caveos-folder-utilities-window");
}

function gamesFolderWindow(page) {
  return page.locator(".caveos-folder-games-window");
}

async function openUtilitiesFolder(page) {
  await page.locator(".computer-icon-folder-utilities").dblclick();
  await expect(utilitiesFolderWindow(page)).toBeVisible();
}

async function openGamesFolder(page) {
  await page.locator(".computer-icon-folder-games").dblclick();
  await expect(gamesFolderWindow(page)).toBeVisible();
}

// The whole journey to an app that lives in a folder: open the computer, double
// click the folder, single click the icon. `folder` is "utilities" or "games".
async function openCaveOsApp(page, { folder, iconClassName, windowClassName }) {
  await openComputer(page);

  const isUtilities = folder === "utilities";
  const folderWindow = isUtilities ? utilitiesFolderWindow(page) : gamesFolderWindow(page);
  if (isUtilities) {
    await openUtilitiesFolder(page);
  } else {
    await openGamesFolder(page);
  }

  await folderWindow.locator(`.${iconClassName}`).click();
  await expect(page.locator(`.${windowClassName}`)).toBeVisible();
}

// An app window opens centred, over the icon that opened it, so it is closed
// from its own title-bar button rather than by clicking the icon again — the
// icon may well be underneath the window by then.
async function closeCaveOsWindow(page, windowClassName) {
  await page.locator(`.${windowClassName} .story-window-close`).click();
  await expect(page.locator(`.${windowClassName}`)).toHaveCount(0);
}

async function selectCaveOsTheme(page, themeId) {
  await page.locator("#caveOsThemeSelect").selectOption(themeId);
}

module.exports = {
  CAVEOS_LANGUAGES,
  utilitiesFolderWindow,
  closeCaveOsWindow,
  desktopIcons,
  gamesFolderWindow,
  openUtilitiesFolder,
  openCaveOsApp,
  openGamesFolder,
  selectCaveOsTheme,
  startNewGameInLanguage,
  switchLanguageMidGame,
};
