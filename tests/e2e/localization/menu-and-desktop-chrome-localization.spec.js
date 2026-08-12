// Menu and desktop chrome across all 5 languages: the flag buttons'
// active-state exclusivity, the main-menu button labels, the desk folder
// labels and aria-labels, the settings panel, the desktop calendar's
// language-following month abbreviation, and the CaveOS computer desktop
// (window title, icon labels, clock hint). Values are read straight out of
// localization.json rather than hand-copied, so a translation edit cannot
// silently desync the test from the source of truth it is checking.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { clickNewGame } = require("../../support/game-helpers");

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

for (const { code, buttonId } of LANGUAGES) {
  const strings = localization[code];

  test(`menu and desktop chrome localize to ${code}`, async ({ page }) => {
    await page.goto("/");

    const flagButton = page.locator(`#${buttonId}`);
    await flagButton.click();
    await expect(flagButton).toHaveClass(/active/);
    for (const other of LANGUAGES) {
      if (other.code === code) {
        continue;
      }
      await expect(page.locator(`#${other.buttonId}`)).not.toHaveClass(/active/);
    }

    await expect(page.locator("#newGame")).toHaveText(strings.newGame);
    await expect(page.locator("#resumeFromMenu")).toHaveText(strings.resumeGame);
    await expect(page.locator("#loadGame")).toHaveText(strings.loadGame);
    await expect(page.locator("#saveGame")).toHaveText(strings.saveGame);

    await clickNewGame(page);

    // Desk folders.
    await expect(page.locator("#reportsFolderLabel")).toHaveText(strings.reports);
    await expect(page.locator("#photosFolderLabel")).toHaveText(strings.photos);
    await expect(page.locator("#notesLabel")).toHaveText(strings.notes);
    await expect(page.locator("#backgroundFolder")).toHaveAttribute("aria-label", strings.theArnieTragedy);
    await expect(page.locator("#zoomReadout")).toContainText(strings.zoomLabel);

    // Settings panel and noticeboard toggle.
    await expect(page.locator("#settingsToggle")).toHaveAttribute("aria-label", strings.musicSettingsLabel);
    await expect(page.locator("#settingsToggle")).toHaveAttribute("title", strings.musicSettingsLabel);
    await expect(page.locator("#noticeboardButton")).toHaveAttribute("aria-label", strings.goToNoticeboardLabel);
    await expect(page.locator("#noticeboardButton")).toHaveAttribute("title", strings.goToNoticeboardLabel);

    await page.locator("#settingsToggle").click();
    await expect(page.locator("#muteToggleButton")).toHaveText(`${strings.mute}: ${strings.muteOff}`);
    await expect(page.locator("#musicVolumeLabel")).toHaveText(strings.musicVolume);
    await expect(page.locator("#sfxVolumeLabel")).toHaveText(strings.sfxVolume);

    // Desktop calendar's month abbreviation follows the selected language,
    // not whatever locale the system happens to be in -- the exact bug this
    // suite would previously not have caught.
    const expectedMonth = new Intl.DateTimeFormat(code, { month: "short" })
      .format(new Date())
      .replace(/\./g, "")
      .toUpperCase();
    await expect(page.locator("#desktopCalendar .calendar-month")).toHaveText(expectedMonth);

    // The CaveOS computer desktop.
    await page.locator("#desktopComputerHotspot").click();
    await expect(page.locator(".computer-window .desktop-window-title")).toHaveText(strings.computerWindowTitle);
    await expect(page.locator(".computer-icon-notes")).toHaveAttribute("aria-label", strings.computerNotesIconLabel);
    await expect(page.locator(".computer-icon-paint")).toHaveAttribute("aria-label", strings.computerPaintIconLabel);
    await expect(page.locator(".computer-clock-panel")).toHaveAttribute("aria-label", strings.openMainMenuAriaLabel);
    await expect(page.locator(".computer-clock-hint")).toHaveText(strings.computerMenuHint);
  });
}
