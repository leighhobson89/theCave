// The CaveOS Calculator app: its desktop icon, the window it opens, the
// arithmetic behind the keys, and its localization.
//
// Every sum here is worked out by clicking the real keys, never by calling
// into the window's internals — the display is the only thing a player can
// read, so it is the only thing worth asserting against.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openComputer } = require("../../support/game-helpers");
const {
  CAVEOS_LANGUAGES,
  appsFolderWindow,
  closeCaveOsWindow,
  openAppsFolder,
  startNewGameInLanguage,
} = require("../../support/caveos-helpers");

const LANGUAGES = CAVEOS_LANGUAGES;

function calculatorWindow(page) {
  return page.locator(".caveos-calculator-window");
}

function display(page) {
  return page.locator(".caveos-calculator-display");
}

function key(page, symbol) {
  return page.locator(`.caveos-calculator-key[data-calculator-key="${symbol}"]`);
}

// Clicks a run of keys in order, the way a player taps out a sum.
async function press(page, symbols) {
  for (const symbol of symbols) {
    await key(page, symbol).click();
  }
}

// The calculator lives in the Apps folder, so reaching it means a real double
// click on the folder and then a real single click on the icon inside it — the
// same journey a player makes.
async function openCalculator(page, languageCode = "en") {
  await openComputer(page);
  await openAppsFolder(page);
  await appsFolderWindow(page).locator(".computer-icon-calculator").click();
  await expect(calculatorWindow(page)).toBeVisible();
  await expect(display(page)).toHaveText("0");
  return localization[languageCode];
}

// The window opens centred, over the icon that opened it, so it is closed from
// its own title-bar button — the same reason closeProgressEvidenceWindow()
// exists, and what a player covered by the window would actually do.
async function closeCalculator(page) {
  await closeCaveOsWindow(page, "caveos-calculator-window");
}

test("the calculator icon sits after Paint inside the Apps folder", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  // Paint and the calculator moved off the desktop and into Apps when the
  // folders arrived; Netscape is the one that stayed outside.
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-calculator"))
    .toHaveCount(0);
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-netscape"))
    .toHaveCount(1);

  await openAppsFolder(page);

  const iconLabels = await appsFolderWindow(page).locator(".computer-icon").evaluateAll(
    (icons) => icons.map((icon) => icon.className)
  );

  const paintIndex = iconLabels.findIndex((name) => name.includes("computer-icon-paint"));
  const calculatorIndex = iconLabels.findIndex((name) => name.includes("computer-icon-calculator"));

  expect(paintIndex).toBe(0);
  expect(calculatorIndex).toBe(paintIndex + 1);
});

test("the calculator icon opens a titled window that closes again", async ({ page }) => {
  await startNewGame(page);
  await openCalculator(page);

  await expect(calculatorWindow(page).locator(".desktop-window-title"))
    .toHaveText(localization.en.computerCalculatorWindowTitle);

  await closeCalculator(page);

  // And the icon opens a fresh one, so closing did not tear anything down that
  // reopening needs.
  await page.locator(".computer-icon-calculator").click();
  await expect(calculatorWindow(page)).toBeVisible();
});

test("digits type into the display and the four operators work", async ({ page }) => {
  await startNewGame(page);
  await openCalculator(page);

  await press(page, ["1", "2", "3"]);
  await expect(display(page)).toHaveText("123");

  await press(page, ["C"]);
  await expect(display(page)).toHaveText("0");

  await press(page, ["1", "2", "+", "3", "="]);
  await expect(display(page)).toHaveText("15");

  await press(page, ["C", "9", "−", "4", "="]);
  await expect(display(page)).toHaveText("5");

  await press(page, ["C", "6", "×", "7", "="]);
  await expect(display(page)).toHaveText("42");

  await press(page, ["C", "8", "÷", "2", "="]);
  await expect(display(page)).toHaveText("4");
});

test("chained operators resolve left to right, the way a desk calculator does", async ({ page }) => {
  await startNewGame(page);
  await openCalculator(page);

  // Deliberately NOT 14: an immediate-execution calculator resolves the
  // pending 2 + 3 the moment × is pressed, so this is 5 × 4.
  await press(page, ["2", "+", "3", "×", "4", "="]);
  await expect(display(page)).toHaveText("20");
});

test("the decimal point and sign keys behave", async ({ page }) => {
  await startNewGame(page);
  await openCalculator(page);

  await press(page, ["1", ".", "5", "+", "2", ".", "2", "5", "="]);
  await expect(display(page)).toHaveText("3.75");

  // A second decimal point in the same number is ignored rather than accepted.
  await press(page, ["C", "1", ".", "2", ".", "3"]);
  await expect(display(page)).toHaveText("1.23");

  await press(page, ["C", "5", "±"]);
  await expect(display(page)).toHaveText("-5");
  await press(page, ["±"]);
  await expect(display(page)).toHaveText("5");
});

test("dividing by zero shows the localized error, and Clear recovers from it", async ({ page }) => {
  await startNewGame(page);
  await openCalculator(page);

  await press(page, ["8", "÷", "0", "="]);
  await expect(display(page)).toHaveText(localization.en.calculatorErrorText);

  await press(page, ["C"]);
  await expect(display(page)).toHaveText("0");
  await press(page, ["7"]);
  await expect(display(page)).toHaveText("7");
});

test("a reopened calculator starts fresh at zero", async ({ page }) => {
  await startNewGame(page);
  await openCalculator(page);

  await press(page, ["4", "2"]);
  await expect(display(page)).toHaveText("42");

  await closeCalculator(page);
  await page.locator(".computer-icon-calculator").click();
  await expect(display(page)).toHaveText("0");
});

for (const language of LANGUAGES) {
  test(`the calculator icon, window title and error text are localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openComputer(page);
    await openAppsFolder(page);

    await expect(page.locator(".computer-icon-calculator .computer-icon-label"))
      .toHaveText(strings.computerCalculatorIconLabel);

    await page.locator(".computer-icon-calculator").click();
    await expect(calculatorWindow(page).locator(".desktop-window-title"))
      .toHaveText(strings.computerCalculatorWindowTitle);
    await expect(calculatorWindow(page).locator(".story-window-close"))
      .toHaveAttribute("aria-label", strings.closeCalculatorWindowAriaLabel);
    await expect(display(page)).toHaveAttribute("aria-label", strings.calculatorDisplayAriaLabel);
    await expect(key(page, "+")).toHaveAttribute("aria-label", strings.calculatorAddAriaLabel);
    await expect(key(page, "C")).toHaveAttribute("aria-label", strings.calculatorClearAriaLabel);

    await press(page, ["8", "÷", "0", "="]);
    await expect(display(page)).toHaveText(strings.calculatorErrorText);
  });
}
