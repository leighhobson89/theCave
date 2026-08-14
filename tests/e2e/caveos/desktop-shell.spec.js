// The CaveOS shell itself: the header, the live analogue clock, the MENU panel,
// window stacking inside the OS, and what closing the computer takes with it.
//
// These are the parts of the OS that are not an app — the frame every app opens
// inside — and they had no spec of their own before.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openComputer, closeComputer } = require("../../support/game-helpers");
const {
  CAVEOS_LANGUAGES,
  openUtilitiesFolder,
  openGamesFolder,
  startNewGameInLanguage,
} = require("../../support/caveos-helpers");

test("the computer opens onto the CaveOS desktop with its header and clock", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await expect(page.locator(".computer-window")).toBeVisible();
  await expect(page.locator(".computer-desktop-header")).toHaveText("CAVE OS 1996");
  await expect(page.locator(".computer-desktop-subheader")).toHaveText("ui://desktop");
  await expect(page.locator(".computer-clock-panel")).toBeVisible();
  await expect(page.locator(".computer-analog-clock")).toBeVisible();
});

test("the clock runs: its second hand moves on its own", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const secondHandAngle = () => page.locator(".computer-clock-second").evaluate(
    (hand) => getComputedStyle(hand).transform
  );

  // A clock that rendered once and stopped would keep the same transform
  // forever, which is the failure this catches — the interval not being armed.
  const firstReading = await secondHandAngle();
  await expect.poll(secondHandAngle, { timeout: 4000 }).not.toBe(firstReading);
});

test("the clock panel returns to the main menu", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await page.locator(".computer-clock-panel").click();
  await expect(page.locator("#menu")).toBeVisible();
});

test("closing the computer closes the app windows open inside it", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  // Two windows from two different folders, so this proves the sweep covers
  // everything the OS is tracking rather than just the last one opened.
  await openUtilitiesFolder(page);
  await page.locator(".caveos-folder-utilities-window .computer-icon-calculator").click();
  await expect(page.locator(".caveos-calculator-window")).toBeVisible();

  await openGamesFolder(page);
  await expect(page.locator(".caveos-folder-games-window")).toBeVisible();

  await closeComputer(page);

  await expect(page.locator(".computer-window")).toHaveCount(0);
  await expect(page.locator(".caveos-calculator-window")).toHaveCount(0);
  await expect(page.locator(".caveos-folder-utilities-window")).toHaveCount(0);
  await expect(page.locator(".caveos-folder-games-window")).toHaveCount(0);
});

test("app windows are clipped to the OS screen rather than escaping onto the desk", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openUtilitiesFolder(page);

  // App windows are children of the CaveOS container, not the game area, so a
  // window can never be dragged out over the detective's desk.
  const isInsideDesktop = await page.locator(".caveos-folder-utilities-window").evaluate(
    (windowElement) => Boolean(windowElement.closest(".computer-desktop"))
  );
  expect(isInsideDesktop).toBe(true);
});

test("a second app window opens above the first", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openUtilitiesFolder(page);
  await openGamesFolder(page);

  const zIndexOf = (selector) => page.locator(selector).evaluate(
    (element) => Number(getComputedStyle(element).zIndex) || 0
  );

  // Games was opened second, so it sits on top of Apps.
  expect(await zIndexOf(".caveos-folder-games-window")).toBeGreaterThan(
    await zIndexOf(".caveos-folder-utilities-window")
  );

  // Click-to-focus promotion of a *buried* window is not retested here: both
  // folder windows open centred and so overlap exactly, which no real mouse
  // click can reach past. That behaviour is covered against deliberately
  // offset windows in desktop-window-chrome/focus-stacking.spec.js.
});

for (const language of CAVEOS_LANGUAGES) {
  test(`the CaveOS shell chrome is localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openComputer(page);

    await expect(page.locator(".computer-window > .desktop-window-header .desktop-window-title"))
      .toHaveText(strings.computerWindowTitle);
    await expect(page.locator(".computer-window > .desktop-window-header .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeComputerWindowAriaLabel);
    await expect(page.locator(".computer-clock-panel"))
      .toHaveAttribute("aria-label", strings.openMainMenuAriaLabel);
    await expect(page.locator(".computer-clock-hint")).toHaveText(strings.computerMenuHint);
    await expect(page.locator(".computer-icon-notes"))
      .toHaveAttribute("aria-label", strings.computerNotesIconLabel);

    // The folder icons carry their "double click to open" hint as a title, so
    // the tooltip layer can explain the gesture — that hint is localized too.
    await expect(page.locator(".computer-icon-folder-utilities"))
      .toHaveAttribute("title", strings.computerFolderOpenHint);

    // Netscape is a product name and stays in English on purpose, in every
    // language — asserted so a well-meaning translation would fail the suite.
    await expect(page.locator(".computer-icon-netscape .computer-icon-label"))
      .toHaveText("Netscape");
  });
}
