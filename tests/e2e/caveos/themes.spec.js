// The CaveOS theme picker: the five reskins, what they reach, what they must
// NOT touch, and the theme surviving a save/load cycle.
//
// A theme is asserted through computed styles rather than screenshots: the
// point is that the OS chrome actually re-reads the theme's tokens, which a
// pixel comparison would confirm far more brittly.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const {
  startNewGame,
  openComputer,
  closeComputer,
  openZoomSearch,
  clickNewGame,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

const THEME_IDS = ["terminal", "amber", "redmond", "platinum", "hotdog"];
const THEME_LABEL_KEY_BY_ID = {
  terminal: "caveOsThemeTerminal",
  amber: "caveOsThemeAmber",
  redmond: "caveOsThemeRedmond",
  platinum: "caveOsThemePlatinum",
  hotdog: "caveOsThemeHotdog",
};

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

function computerWindow(page) {
  return page.locator(".computer-window");
}

function themeSelect(page) {
  return page.locator("#caveOsThemeSelect");
}

// The theme's own tokens, read off the live computer window.
function readThemeTokens(page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.querySelector(".computer-window"));
    return {
      fg: style.getPropertyValue("--caveos-fg").trim(),
      surface: style.getPropertyValue("--caveos-surface").trim(),
      accent: style.getPropertyValue("--caveos-accent").trim(),
      font: style.getPropertyValue("--caveos-font").trim(),
    };
  });
}

async function selectTheme(page, themeId) {
  await themeSelect(page).selectOption(themeId);
  await expect(computerWindow(page)).toHaveClass(new RegExp(`caveos-theme-${themeId}`));
}

async function startNewGameInLanguage(page, buttonId) {
  await page.goto("/");
  await page.locator(`#${buttonId}`).click();
  await clickNewGame(page);
}

test("the theme picker sits in the computer window's title bar, after the title", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const picker = page.locator(".computer-window > .desktop-window-header .caveos-theme-picker");
  await expect(picker).toBeVisible();

  // Title on the left, picker and close button to its right.
  const titleBox = await page.locator(".computer-window > .desktop-window-header > .desktop-window-title").boundingBox();
  const pickerBox = await picker.boundingBox();
  const closeBox = await page.locator(".computer-window > .desktop-window-header > .story-window-close").boundingBox();

  expect(pickerBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
  expect(closeBox.x).toBeGreaterThan(pickerBox.x + pickerBox.width - 1);
});

test("Terminal is the default, and every theme is offered in order", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await expect(themeSelect(page)).toHaveValue("terminal");
  await expect(computerWindow(page)).toHaveClass(/caveos-theme-terminal/);

  const optionValues = await themeSelect(page).locator("option").evaluateAll(
    (options) => options.map((option) => option.value)
  );
  expect(optionValues).toEqual(THEME_IDS);
});

test("each theme actually changes the OS palette, and only one theme class is ever applied", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const seenPalettes = new Set();

  for (const themeId of THEME_IDS) {
    await selectTheme(page, themeId);

    const classList = await computerWindow(page).evaluate((el) => Array.from(el.classList));
    const themeClasses = classList.filter((name) => name.startsWith("caveos-theme-"));
    expect(themeClasses).toEqual([`caveos-theme-${themeId}`]);

    const tokens = await readThemeTokens(page);
    // Every theme must be visibly distinct from the others, not just named so.
    const fingerprint = `${tokens.fg}|${tokens.surface}|${tokens.accent}`;
    expect(seenPalettes.has(fingerprint)).toBe(false);
    seenPalettes.add(fingerprint);
  }

  expect(seenPalettes.size).toBe(THEME_IDS.length);
});

test("a theme reaches the app windows inside the OS, not just the desktop", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  // The calculator lives in the Apps folder, so it is reached through a real
  // double click on the folder first.
  await page.locator(".computer-icon-folder-apps").dblclick();
  await expect(page.locator(".caveos-folder-apps-window")).toBeVisible();
  await page.locator(".computer-icon-calculator").click();
  await expect(page.locator(".caveos-calculator-window")).toBeVisible();

  const readCalculatorChrome = () => page.evaluate(() => {
    const header = document.querySelector(".caveos-calculator-window .desktop-window-header");
    const key = document.querySelector(".caveos-calculator-key.is-operator");
    return {
      headerBackground: getComputedStyle(header).backgroundImage,
      keyBackground: getComputedStyle(key).backgroundColor,
    };
  });

  const terminalChrome = await readCalculatorChrome();

  await selectTheme(page, "redmond");
  // The button background transition (see the global `button` rule) means the
  // key colour arrives a moment after the class does.
  await expect
    .poll(async () => (await readCalculatorChrome()).keyBackground)
    .not.toBe(terminalChrome.keyBackground);

  const redmondChrome = await readCalculatorChrome();
  expect(redmondChrome.headerBackground).not.toBe(terminalChrome.headerBackground);
});

test("a theme reskins Netscape's own chrome but not the websites inside it", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await page.getByRole("button", { name: "Netscape" }).click();
  await expect(page.locator(".caveos-browser-app")).toBeVisible();

  // An actual 1996 website, not the welcome page: this is the thing that must
  // survive a theme change untouched.
  await openZoomSearch(page);
  const shell = page.locator(".browser-page-shell-zoom");
  await expect(shell).toBeVisible();

  const readStyles = () => page.evaluate(() => {
    const zoomShell = document.querySelector(".browser-page-shell-zoom");
    const addressBar = document.querySelector(".caveos-browser-address");
    return {
      shellColor: getComputedStyle(zoomShell).color,
      shellBackground: getComputedStyle(zoomShell).backgroundImage,
      addressColor: getComputedStyle(addressBar).color,
      addressBackground: getComputedStyle(addressBar).backgroundColor,
    };
  });

  const before = await readStyles();

  await selectTheme(page, "hotdog");
  await expect
    .poll(async () => (await readStyles()).addressColor)
    .not.toBe(before.addressColor);

  const after = await readStyles();
  // Netscape's own chrome followed the theme...
  expect(after.addressBackground).not.toBe(before.addressBackground);
  // ...and the website it is showing did not.
  expect(after.shellColor).toBe(before.shellColor);
  expect(after.shellBackground).toBe(before.shellBackground);
});

test("switching theme does not move or resize an open window", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  // The calculator lives in the Apps folder, so it is reached through a real
  // double click on the folder first.
  await page.locator(".computer-icon-folder-apps").dblclick();
  await expect(page.locator(".caveos-folder-apps-window")).toBeVisible();
  await page.locator(".computer-icon-calculator").click();
  const calculator = page.locator(".caveos-calculator-window");
  await expect(calculator).toBeVisible();

  const before = await calculator.boundingBox();

  for (const themeId of THEME_IDS) {
    await selectTheme(page, themeId);
    const after = await calculator.boundingBox();
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
    expect(Math.abs(after.width - before.width)).toBeLessThan(2);
    expect(Math.abs(after.height - before.height)).toBeLessThan(2);
  }
});

test("the chosen theme survives closing and reopening the computer", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await selectTheme(page, "platinum");

  await closeComputer(page);
  await openComputer(page);

  await expect(computerWindow(page)).toHaveClass(/caveos-theme-platinum/);
  await expect(themeSelect(page)).toHaveValue("platinum");
});

test("the chosen theme survives a save/load round trip", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await selectTheme(page, "hotdog");
  await closeComputer(page);

  const saveString = await captureSaveStringViaMenu(page);

  // A fresh game resets to Terminal, so loading can only pass by restoring.
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();
  await openComputer(page);
  await expect(computerWindow(page)).toHaveClass(/caveos-theme-terminal/);
  await closeComputer(page);

  await loadSaveStringViaMenu(page, saveString);
  await expect(page.locator("#gameArea")).toBeVisible();
  await openComputer(page);
  await expect(computerWindow(page)).toHaveClass(/caveos-theme-hotdog/);
  await expect(themeSelect(page)).toHaveValue("hotdog");
});

test("the chosen theme survives a real browser refresh via the sticky save", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await selectTheme(page, "amber");
  await closeComputer(page);

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  await openComputer(page);
  await expect(computerWindow(page)).toHaveClass(/caveos-theme-amber/);
});

test("a New Game resets the OS back to the default Terminal theme", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await selectTheme(page, "redmond");
  await closeComputer(page);

  await page.keyboard.press("Escape");
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();

  await openComputer(page);
  await expect(computerWindow(page)).toHaveClass(/caveos-theme-terminal/);
  await expect(themeSelect(page)).toHaveValue("terminal");
});

for (const language of LANGUAGES) {
  test(`the theme picker label and option names are localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openComputer(page);

    await expect(page.locator(".caveos-theme-picker-label"))
      .toHaveText(strings.caveOsThemeSelectLabel);

    for (const themeId of THEME_IDS) {
      await expect(themeSelect(page).locator(`option[value="${themeId}"]`))
        .toHaveText(strings[THEME_LABEL_KEY_BY_ID[themeId]]);
    }
  });
}
