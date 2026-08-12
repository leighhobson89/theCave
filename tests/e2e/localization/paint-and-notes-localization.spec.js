// Paint's tool palette and the default per-page titles New Game seeds into
// Notes and Paint, across all 5 languages. Both are localized only at
// construction time (the Paint toolbar has no live-refresh hook, and default
// titles are baked in by beginNewGame()), so each case switches language
// before opening/starting, rather than mid-session.
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

// game-helpers.js's openPaint() finds the computer's Paint icon by its
// (localized) accessible name "Paint", so it only works in English. Drive it
// here by the language-independent ".computer-icon-paint" class instead.
async function openPaintInAnyLanguage(page) {
  await page.locator("#desktopComputerHotspot").click();
  await page.locator(".computer-icon-paint").click();
}

for (const { code, buttonId } of LANGUAGES) {
  const strings = localization[code];

  test(`Paint toolbar localizes to ${code} on open`, async ({ page }) => {
    await page.goto("/");
    await page.locator(`#${buttonId}`).click();
    await clickNewGame(page);
    await openPaintInAnyLanguage(page);

    const paintWindow = page.locator(".caveos-paint-window");
    await expect(paintWindow).toBeVisible();

    await expect(paintWindow.locator('.caveos-paint-tool[data-tool="pen"]')).toHaveText(strings.paintToolPen);
    await expect(paintWindow.locator('.caveos-paint-tool[data-tool="line"]')).toHaveText(strings.paintToolLine);
    await expect(paintWindow.locator('.caveos-paint-tool[data-tool="rect"]')).toHaveText(strings.paintToolRect);
    await expect(paintWindow.locator('.caveos-paint-tool[data-tool="eraser"]')).toHaveText(strings.paintToolEraser);
    await expect(paintWindow.locator('.caveos-paint-tool[data-tool="fill"]')).toHaveText(strings.paintToolFill);
    await expect(paintWindow.locator(".caveos-paint-clear")).toHaveText(strings.paintClearButton);
    await expect(paintWindow.locator(".caveos-paint-size")).toHaveAttribute("aria-label", strings.paintBrushSizeAriaLabel);
    await expect(paintWindow.locator(".caveos-paint-color")).toHaveAttribute("aria-label", strings.paintColorAriaLabel);
  });

  test(`New Game seeds default Notes and Paint page titles in ${code}`, async ({ page }) => {
    await page.goto("/");
    await page.locator(`#${buttonId}`).click();
    await clickNewGame(page);

    await page.locator("#notesFolder").click();
    await expect(page.locator(".notes-window .notes-page-title-input").first())
      .toHaveValue(`${strings.notesPageDefaultTitlePrefix} 1`);
    await page.locator(".notes-window .story-window-close").click();

    await openPaintInAnyLanguage(page);
    await expect(page.locator(".caveos-paint-window .notes-page-title-input").first())
      .toHaveValue(`${strings.paintPageDefaultTitlePrefix} 1`);
  });
}
