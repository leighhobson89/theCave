// Mid-session re-localization of every open-window kind (refreshOpenWindowLocalization
// in ui.js), across all 5 languages. Opens one window of each of the 9 kinds
// while still in English, then switches language repeatedly and checks that
// every window's title bar and close-button aria-label follow along -- without
// needing to close and reopen anything. Values are read from localization.json
// directly rather than hand-copied.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame } = require("../../support/game-helpers");

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

// Selector, titleKey and closeAriaLabelKey per window kind, mirroring
// DESKTOP_WINDOW_LOCALIZATION_BY_KIND in ui.js. The plain "story" window
// shares its base ".story-window" class with several other kinds, so it is
// selected by excluding their more specific classes.
const WINDOW_KINDS = [
  {
    name: "story",
    selector: ".story-window:not(.photos-window):not(.reports-window):not(.facsimile-window):not(.computer-window):not(.notes-window)",
    titleKey: "theArnieTragedy",
    closeAriaLabelKey: "closeStoryWindowAriaLabel",
  },
  { name: "photos", selector: ".photos-window", titleKey: "photos", closeAriaLabelKey: "closePhotosWindowAriaLabel" },
  { name: "reports", selector: ".reports-window", titleKey: "reports", closeAriaLabelKey: "closeReportsWindowAriaLabel" },
  { name: "notes", selector: ".notes-window.story-window", titleKey: "notes", closeAriaLabelKey: "closeNotesWindowAriaLabel" },
  { name: "facsimile", selector: ".facsimile-window", titleKey: "facsimileWindowTitle", closeAriaLabelKey: "closeFacsimileWindowAriaLabel" },
  { name: "computer", selector: ".computer-window", titleKey: "computerWindowTitle", closeAriaLabelKey: "closeComputerWindowAriaLabel" },
  { name: "computer-notes", selector: ".caveos-notes-window", titleKey: "notes", closeAriaLabelKey: "closeNotesWindowAriaLabel" },
  { name: "computer-paint", selector: ".caveos-paint-window", titleKey: "computerPaintIconLabel", closeAriaLabelKey: "closePaintWindowAriaLabel" },
  // Netscape's product name is a fixed literal, never localized.
  { name: "computer-netscape", selector: ".caveos-browser-window", fixedTitle: "Netscape Navigator 3.0", closeAriaLabelKey: "closeNetscapeWindowAriaLabel" },
];

test("every open window kind re-titles and re-labels its close button on a mid-session language switch", async ({ page }) => {
  await startNewGame(page);

  // Each window is opened on top of the last, covering the desk hotspot for
  // the next one (and the computer window is full-screen, covering
  // everything beneath it). These are one-shot setup steps to get everything
  // open simultaneously, not a fidelity check of the open flow itself (that
  // is covered elsewhere), so dispatch a real click directly at each element
  // rather than fighting Playwright's overlap-aware mouse click.
  const clickDirectly = (selector) => page.locator(selector).evaluate((element) => element.click());

  await clickDirectly("#backgroundFolder");
  await clickDirectly("#photosFolder");
  await clickDirectly("#reportsFolder");
  await clickDirectly("#notesFolder");
  await clickDirectly("#desktopFacsimileHotspot");
  await clickDirectly("#desktopComputerHotspot");
  await clickDirectly(".computer-icon-notes");
  // Paint is inside the Utilities folder now, and a folder needs a genuine double
  // click — element.click() would not open it.
  await page.locator(".computer-icon-folder-utilities").dblclick();
  await expect(page.locator(".caveos-folder-utilities-window")).toBeVisible();
  await clickDirectly(".computer-icon-paint");
  await clickDirectly(".computer-icon-netscape");

  // One instance of each kind, confirmed before touching language at all.
  for (const kind of WINDOW_KINDS) {
    await expect(page.locator(kind.selector)).toHaveCount(1);
  }

  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();

  for (const { code, buttonId } of LANGUAGES) {
    const strings = localization[code];
    await page.locator(`#${buttonId}`).click();

    for (const kind of WINDOW_KINDS) {
      // The computer window hosts its own child app windows (computer-notes,
      // computer-paint, computer-netscape) inside its content area, so a
      // plain descendant selector for its title/close button would also
      // match theirs. Scoping to the direct-child header, as
      // closeComputer() in game-helpers.js already does, picks out only the
      // window's own chrome.
      const windowLocator = page.locator(kind.selector);
      const header = windowLocator.locator("> .desktop-window-header");
      const expectedTitle = kind.fixedTitle || strings[kind.titleKey];
      await expect(header.locator(".desktop-window-title"), `${kind.name} title in ${code}`)
        .toHaveText(expectedTitle);
      await expect(header.locator(".story-window-close"), `${kind.name} close aria-label in ${code}`)
        .toHaveAttribute("aria-label", strings[kind.closeAriaLabelKey]);
    }
  }
});
