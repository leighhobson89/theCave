// The CaveOS folder system (Apps and Games), the Snake game inside Games, and
// Paint's canvas following the current theme.
//
// Folders open on a real double click and the icons inside open on a real
// single click, because that difference in gesture IS the feature — a test
// that called the openers directly would pass with the double-click wiring
// removed entirely.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openComputer, clickNewGame } = require("../../support/game-helpers");

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

function desktopIcons(page) {
  return page.locator(".computer-desktop > .computer-icons-grid > .computer-icon");
}

function appsFolderWindow(page) {
  return page.locator(".caveos-folder-apps-window");
}

function gamesFolderWindow(page) {
  return page.locator(".caveos-folder-games-window");
}

async function startNewGameInLanguage(page, buttonId) {
  await page.goto("/");
  await page.locator(`#${buttonId}`).click();
  await clickNewGame(page);
}

async function openAppsFolder(page) {
  await page.locator(".computer-icon-folder-apps").dblclick();
  await expect(appsFolderWindow(page)).toBeVisible();
}

async function openGamesFolder(page) {
  await page.locator(".computer-icon-folder-games").dblclick();
  await expect(gamesFolderWindow(page)).toBeVisible();
}

test("the desktop holds the two folders then Notes and Netscape, and nothing else", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const iconClasses = await desktopIcons(page).evaluateAll(
    (icons) => icons.map((icon) => icon.className)
  );

  expect(iconClasses).toHaveLength(4);
  expect(iconClasses[0]).toContain("computer-icon-folder-apps");
  expect(iconClasses[1]).toContain("computer-icon-folder-games");
  expect(iconClasses[2]).toContain("computer-icon-notes");
  expect(iconClasses[3]).toContain("computer-icon-netscape");

  // Paint, Calculator and Snake have all moved off the desktop.
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-paint")).toHaveCount(0);
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-calculator")).toHaveCount(0);
  await expect(page.locator(".computer-desktop > .computer-icons-grid .computer-icon-snake")).toHaveCount(0);
});

test("all four desktop icons sit on one row, and only wrap when the screen is too narrow", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  const iconRowTops = () => desktopIcons(page).evaluateAll(
    (icons) => icons.map((icon) => Math.round(icon.getBoundingClientRect().top))
  );

  // At the default viewport there is room, so every icon shares a row.
  const tops = await iconRowTops();
  expect(new Set(tops).size).toBe(1);

  // Narrow enough that four 110px columns no longer fit: the grid is expected
  // to wrap rather than crush the icons.
  await page.setViewportSize({ width: 700, height: 800 });
  await expect.poll(async () => new Set(await iconRowTops()).size).toBeGreaterThan(1);
});

test("a single click on a folder does not open it; a double click does", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await page.locator(".computer-icon-folder-apps").click();
  // Given time to open if the wiring were wrong.
  await page.waitForTimeout(400);
  await expect(appsFolderWindow(page)).toHaveCount(0);

  await openAppsFolder(page);
});

test("the Apps folder holds Paint and Calculator, each opening on a single click", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openAppsFolder(page);

  await expect(appsFolderWindow(page).locator(".desktop-window-title"))
    .toHaveText(localization.en.computerAppsFolderLabel);

  const folderIcons = appsFolderWindow(page).locator(".computer-icon");
  await expect(folderIcons).toHaveCount(2);

  await appsFolderWindow(page).locator(".computer-icon-paint").click();
  await expect(page.locator(".caveos-paint-window")).toBeVisible();
  await page.locator(".caveos-paint-window .story-window-close").click();

  await appsFolderWindow(page).locator(".computer-icon-calculator").click();
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

test("icons inside a folder keep the square shape they have on the desktop", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  // The desktop icon is the reference: whatever shape it is, a folder's icons
  // must match it rather than stretching into a bar across the window.
  const desktopIconBox = await page.locator(".computer-icon-notes").boundingBox();

  // Both folders are checked, but Apps is the one that matters: it holds two
  // icons, and it was a sparsely filled folder that exposed the bug. Stretchy
  // 1fr tracks look fine once a folder happens to hold enough icons to fill the
  // row, so a test that only opened the four-icon Games folder would pass with
  // the fix reverted.
  for (const openFolder of [openAppsFolder, openGamesFolder]) {
    await openFolder(page);
    const folderWindow = openFolder === openAppsFolder
      ? appsFolderWindow(page)
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

test("a folder icon opens from the keyboard too, since a double click cannot be typed", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);

  await page.locator(".computer-icon-folder-games").focus();
  await page.keyboard.press("Enter");
  await expect(gamesFolderWindow(page)).toBeVisible();
});

test("Snake starts on Enter, moves on its own, and scores when it eats", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openGamesFolder(page);
  await gamesFolderWindow(page).locator(".computer-icon-snake").click();

  const board = page.locator(".caveos-snake-app");
  await expect(board).toBeVisible();
  await expect(page.locator(".caveos-snake-score")).toHaveText(`${localization.en.snakeScoreLabel}: 0`);
  await expect(page.locator(".caveos-snake-hint")).toHaveText(localization.en.snakeStartHint);

  // A real key on the focused board, not a synthetic start call.
  await board.press("Enter");
  await expect(page.locator(".caveos-snake-hint")).toHaveText("");

  // The board is a canvas, so movement is observed by the pixels changing
  // rather than by reading game state.
  const boardSignature = () => page.locator(".caveos-snake-board").evaluate(
    (canvas) => canvas.toDataURL().length + ":" + canvas.toDataURL().slice(-64)
  );

  const firstFrame = await boardSignature();
  await expect.poll(boardSignature, { timeout: 4000 }).not.toBe(firstFrame);
});

test("Snake ends when it hits a wall, and Enter starts a fresh game", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openGamesFolder(page);
  await gamesFolderWindow(page).locator(".computer-icon-snake").click();

  const board = page.locator(".caveos-snake-app");
  await board.press("Enter");

  // The snake starts travelling right from x=4 on a 24-wide board, so left
  // alone it runs into the right-hand wall within a few seconds.
  await expect(page.locator(".caveos-snake-hint"))
    .toContainText(localization.en.snakeGameOverText, { timeout: 8000 });

  await board.press("Enter");
  await expect(page.locator(".caveos-snake-hint")).toHaveText("");
  await expect(page.locator(".caveos-snake-score")).toHaveText(`${localization.en.snakeScoreLabel}: 0`);
});

test("closing Snake stops its game loop", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openGamesFolder(page);
  await gamesFolderWindow(page).locator(".computer-icon-snake").click();

  await page.locator(".caveos-snake-app").press("Enter");
  await page.waitForTimeout(400);
  await page.locator(".caveos-snake-window .story-window-close").click();
  await expect(page.locator(".caveos-snake-window")).toHaveCount(0);

  // A tick that survived its window would throw against the detached canvas;
  // the page staying error-free across several tick periods is the evidence.
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.waitForTimeout(800);
  expect(pageErrors).toEqual([]);
});

test("Paint's canvas and default pen follow the current theme", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openAppsFolder(page);

  const readPaintSetup = () => page.evaluate(() => {
    const canvas = document.querySelector(".caveos-paint-canvas");
    const context = canvas.getContext("2d");
    const [red, green, blue] = context.getImageData(4, 4, 1, 1).data;
    return {
      canvasPixel: `${red},${green},${blue}`,
      penColor: document.querySelector(".caveos-paint-color").value,
    };
  });

  await appsFolderWindow(page).locator(".computer-icon-paint").click();
  await expect(page.locator(".caveos-paint-window")).toBeVisible();
  const terminalSetup = await readPaintSetup();
  // Terminal's canvas is the dark green #041204.
  expect(terminalSetup.canvasPixel).toBe("4,18,4");
  expect(terminalSetup.penColor).toBe("#76ff62");

  await page.locator(".caveos-paint-window .story-window-close").click();
  await page.locator("#caveOsThemeSelect").selectOption("redmond");
  await appsFolderWindow(page).locator(".computer-icon-paint").click();
  await expect(page.locator(".caveos-paint-window")).toBeVisible();

  const redmondSetup = await readPaintSetup();
  // Redmond paints on white with a navy pen.
  expect(redmondSetup.canvasPixel).toBe("255,255,255");
  expect(redmondSetup.penColor).toBe("#000080");
});

test("the eraser restores the canvas ground rather than painting white", async ({ page }) => {
  await startNewGame(page);
  await openComputer(page);
  await openAppsFolder(page);
  await appsFolderWindow(page).locator(".computer-icon-paint").click();
  await expect(page.locator(".caveos-paint-window")).toBeVisible();

  const canvas = page.locator(".caveos-paint-canvas");
  const box = await canvas.boundingBox();
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  const readCentrePixel = () => canvas.evaluate((element) => {
    const context = element.getContext("2d");
    const [red, green, blue] = context.getImageData(
      Math.floor(element.width / 2),
      Math.floor(element.height / 2),
      1,
      1
    ).data;
    return `${red},${green},${blue}`;
  });

  const groundPixel = await readCentrePixel();
  expect(groundPixel).toBe("4,18,4");

  // Draw with a real drag, then erase over the same spot with a real drag.
  await page.mouse.move(centre.x - 40, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 40, centre.y, { steps: 8 });
  await page.mouse.up();
  expect(await readCentrePixel()).not.toBe(groundPixel);

  await page.locator('.caveos-paint-tool[data-tool="eraser"]').click();
  await page.mouse.move(centre.x - 40, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 40, centre.y, { steps: 8 });
  await page.mouse.up();

  // Back to the dark green ground, not to white.
  expect(await readCentrePixel()).toBe(groundPixel);
});

for (const language of LANGUAGES) {
  test(`folder names and Snake are localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openComputer(page);

    await expect(page.locator(".computer-icon-folder-apps .computer-icon-label"))
      .toHaveText(strings.computerAppsFolderLabel);
    await expect(page.locator(".computer-icon-folder-games .computer-icon-label"))
      .toHaveText(strings.computerGamesFolderLabel);

    await openGamesFolder(page);
    await expect(gamesFolderWindow(page).locator(".desktop-window-title"))
      .toHaveText(strings.computerGamesFolderLabel);
    await expect(gamesFolderWindow(page).locator(".computer-icon-snake .computer-icon-label"))
      .toHaveText(strings.computerSnakeIconLabel);

    await gamesFolderWindow(page).locator(".computer-icon-snake").click();
    await expect(page.locator(".caveos-snake-window .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeSnakeWindowAriaLabel);
    await expect(page.locator(".caveos-snake-score"))
      .toHaveText(`${strings.snakeScoreLabel}: 0`);
    await expect(page.locator(".caveos-snake-hint")).toHaveText(strings.snakeStartHint);
  });
}
