// Every route that "arrives" at a gameplay scene -- the noticeboard toggle,
// Resume Game, and Load Game -- resets the camera to that scene's default
// (minimum zoom, and its own anchor: the noticeboard opens at the bottom of
// its board, the desk opens centred) rather than reappearing wherever an
// earlier session happened to leave the pan and zoom. See
// resetGameplayCameraToDefault() in game.js.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

function closeTo(actual, expected, tolerance = 2) {
  expect(Math.abs(actual - expected), `expected ${actual} to be within ${tolerance} of ${expected}`)
    .toBeLessThanOrEqual(tolerance);
}

function readCamera(page) {
  return page.evaluate(async () => {
    const { getCurrentZoomIndex, getPanX, getPanY } = await import("/constantsAndGlobalVars.js");
    return { zoomIndex: getCurrentZoomIndex(), x: getPanX(), y: getPanY() };
  });
}

// The pan a freshly-arrived desktop scene should show: minimum zoom, world
// centred in the viewport.
function expectedDesktopCamera(page) {
  return page.evaluate(async () => {
    const { ZOOM_LEVELS, WORLD_WIDTH, WORLD_HEIGHT } = await import("/constantsAndGlobalVars.js");
    const rect = document.getElementById("desktopViewport").getBoundingClientRect();
    const zoom = ZOOM_LEVELS[0];
    return {
      zoomIndex: 0,
      x: (rect.width - WORLD_WIDTH * zoom) / 2,
      y: (rect.height - WORLD_HEIGHT * zoom) / 2,
    };
  });
}

// The pan a freshly-arrived noticeboard scene should show: minimum zoom,
// horizontally centred, bottom edge of the (much taller) board on the bottom
// of the viewport.
function expectedNoticeboardCamera(page) {
  return page.evaluate(async () => {
    const { ZOOM_LEVELS, WORLD_WIDTH, NOTICEBOARD_WORLD_HEIGHT } = await import("/constantsAndGlobalVars.js");
    const rect = document.getElementById("desktopViewport").getBoundingClientRect();
    const zoom = ZOOM_LEVELS[0];
    return {
      zoomIndex: 0,
      x: (rect.width - WORLD_WIDTH * zoom) / 2,
      y: rect.height - NOTICEBOARD_WORLD_HEIGHT * zoom,
    };
  });
}

// Moves the camera well away from any scene's default, as test setup rather
// than as the thing under test — this suite is about what a *scene entry*
// resets the camera to, not about the drag/wheel gestures that move it, so
// setting the state directly (as other suites set up preconditions like
// activated progress evidence) is the right tool here. A real drag risks
// starting on top of a desk object and clicking it instead of panning.
async function zoomAndPanAwayFromDefault(page) {
  await page.evaluate(async () => {
    const { setCurrentZoomIndex, setPanX, setPanY } = await import("/constantsAndGlobalVars.js");
    setCurrentZoomIndex(2);
    setPanX(-450);
    setPanY(-350);
  });
}

test("the noticeboard toggle arrives at minimum zoom and the bottom of the board", async ({ page }) => {
  await startNewGame(page);
  await zoomAndPanAwayFromDefault(page);

  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);

  const camera = await readCamera(page);
  const expected = await expectedNoticeboardCamera(page);
  expect(camera.zoomIndex).toBe(0);
  closeTo(camera.x, expected.x);
  closeTo(camera.y, expected.y);
});

test("the noticeboard toggle back to the desk arrives at minimum zoom, centred", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);
  await zoomAndPanAwayFromDefault(page);

  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);

  const camera = await readCamera(page);
  const expected = await expectedDesktopCamera(page);
  expect(camera.zoomIndex).toBe(0);
  closeTo(camera.x, expected.x);
  closeTo(camera.y, expected.y);
});

test("Resume Game arrives at the noticeboard, at minimum zoom and the bottom of the board", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);
  await zoomAndPanAwayFromDefault(page);

  await page.keyboard.press("Escape");
  await page.locator("#resumeFromMenu").click();

  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);
  const camera = await readCamera(page);
  const expected = await expectedNoticeboardCamera(page);
  expect(camera.zoomIndex).toBe(0);
  closeTo(camera.x, expected.x);
  closeTo(camera.y, expected.y);
});

test("Resume Game arrives at the desk, at minimum zoom and centred", async ({ page }) => {
  await startNewGame(page);
  await zoomAndPanAwayFromDefault(page);

  await page.keyboard.press("Escape");
  await page.locator("#resumeFromMenu").click();

  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);
  const camera = await readCamera(page);
  const expected = await expectedDesktopCamera(page);
  expect(camera.zoomIndex).toBe(0);
  closeTo(camera.x, expected.x);
  closeTo(camera.y, expected.y);
});

test("Load Game arrives at the desk, at minimum zoom and centred, regardless of the live camera it replaces", async ({ page }) => {
  await startNewGame(page);
  const saveString = await captureSaveStringViaMenu(page);

  // Start a second game and move its camera well away from centre, so loading
  // over it can only pass by actually resetting the camera.
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();
  await zoomAndPanAwayFromDefault(page);

  await loadSaveStringViaMenu(page, saveString);
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);

  const camera = await readCamera(page);
  const expected = await expectedDesktopCamera(page);
  expect(camera.zoomIndex).toBe(0);
  closeTo(camera.x, expected.x);
  closeTo(camera.y, expected.y);
});

test("Load Game arrives at the noticeboard, at minimum zoom and the bottom of the board", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);
  const saveString = await captureSaveStringViaMenu(page);

  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();
  await zoomAndPanAwayFromDefault(page);

  await loadSaveStringViaMenu(page, saveString);
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#noticeboardScene")).not.toHaveClass(/is-scene-hidden/);

  const camera = await readCamera(page);
  const expected = await expectedNoticeboardCamera(page);
  expect(camera.zoomIndex).toBe(0);
  closeTo(camera.x, expected.x);
  closeTo(camera.y, expected.y);
});
