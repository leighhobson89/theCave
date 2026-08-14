// Pointer-drag panning: moving by the drag delta, clamping at the world
// edges, cancellation (pointer leaving the viewport, window blur, tab
// visibility change), and the table-leg perspective effect that follows pan
// position. Pan is read straight from constantsAndGlobalVars.js rather than
// parsed out of a CSS transform matrix.
//
// #desktopViewport covers the entire game area, so a drag has to stay well
// short of the screen edges to avoid also triggering the pointer-leaves-the-
// viewport cancellation exercised by its own test below -- the clamp test
// deliberately uses a moderate overshoot for this reason, not a huge one.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

function closeTo(actual, expected, tolerance = 2) {
  expect(Math.abs(actual - expected), `expected ${actual} to be within ${tolerance} of ${expected}`)
    .toBeLessThanOrEqual(tolerance);
}

function readPan(page) {
  return page.evaluate(async () => {
    const { getPanX, getPanY } = await import("/constantsAndGlobalVars.js");
    return { x: getPanX(), y: getPanY() };
  });
}

// Mirrors clampPan()'s own bounds formula, computed from the live viewport
// rect rather than a hardcoded pixel guess.
function readClampBounds(page) {
  return page.evaluate(async () => {
    const { getCurrentZoomIndex, ZOOM_LEVELS, WORLD_WIDTH, WORLD_HEIGHT } = await import("/constantsAndGlobalVars.js");
    const rect = document.getElementById("desktopViewport").getBoundingClientRect();
    const zoom = ZOOM_LEVELS[getCurrentZoomIndex()];
    return {
      minX: Math.min(0, rect.width - WORLD_WIDTH * zoom),
      minY: Math.min(0, rect.height - WORLD_HEIGHT * zoom),
    };
  });
}

function readLegVars(page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.getElementById("tableLegTopLeft"));
    return {
      extend: Number.parseFloat(style.getPropertyValue("--leg-extend")),
      squash: Number.parseFloat(style.getPropertyValue("--leg-squash")),
    };
  });
}

test("dragging the viewport pans by the drag delta", async ({ page }) => {
  await startNewGame(page);
  const before = await readPan(page);

  const box = await page.locator("#desktopViewport").boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 60, startY - 40, { steps: 6 });
  await page.mouse.up();

  const after = await readPan(page);
  closeTo(after.x, before.x - 60);
  closeTo(after.y, before.y - 40);
});

test("dragging past the world edge clamps to the viewport bounds", async ({ page }) => {
  await startNewGame(page);
  const box = await page.locator("#desktopViewport").boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const bounds = await readClampBounds(page);

  // A moderate overshoot -- well past the clamp bound (a few hundred px),
  // but far short of the ~700px needed to actually leave the viewport from
  // its center, so this exercises the clamp in isolation.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 400, startY - 400, { steps: 20 });
  await page.mouse.up();

  const afterMin = await readPan(page);
  closeTo(afterMin.x, bounds.minX);
  closeTo(afterMin.y, bounds.minY);

  // And the opposite direction clamps at 0 -- the world's top-left edge can
  // never be dragged past the viewport's own top-left.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 400, startY + 400, { steps: 20 });
  await page.mouse.up();

  const afterMax = await readPan(page);
  closeTo(afterMax.x, 0);
  closeTo(afterMax.y, 0);
});

test("dragging is cancelled the moment the pointer leaves the viewport", async ({ page }) => {
  await startNewGame(page);
  const viewport = page.locator("#desktopViewport");
  const box = await viewport.boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await expect(viewport).toHaveClass(/is-dragging/);

  // One continuous move that crosses the viewport's own top-left corner.
  await page.mouse.move(box.x - 50, box.y - 50, { steps: 20 });
  await expect(viewport).not.toHaveClass(/is-dragging/);
  const panAfterLeaving = await readPan(page);

  // Further movement well outside the viewport (the button is still
  // logically "down" as far as Playwright is concerned) must not resume
  // panning -- the drag already ended.
  await page.mouse.move(box.x - 400, box.y - 400, { steps: 10 });
  expect(await readPan(page)).toEqual(panAfterLeaving);

  await page.mouse.up();
});

test("dragging is cancelled by a window blur mid-drag", async ({ page }) => {
  await startNewGame(page);
  const viewport = page.locator("#desktopViewport");
  const box = await viewport.boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY + 30, { steps: 4 });
  await expect(viewport).toHaveClass(/is-dragging/);

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(viewport).not.toHaveClass(/is-dragging/);
  const panAfterBlur = await readPan(page);

  // No fresh pointerdown happened, so continued movement must not pan.
  await page.mouse.move(startX + 200, startY + 200, { steps: 5 });
  expect(await readPan(page)).toEqual(panAfterBlur);
  await page.mouse.up();
});

test("dragging is cancelled by a tab visibility change mid-drag", async ({ page }) => {
  await startNewGame(page);
  const viewport = page.locator("#desktopViewport");
  const box = await viewport.boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 20, startY - 10, { steps: 4 });
  await expect(viewport).toHaveClass(/is-dragging/);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(viewport).not.toHaveClass(/is-dragging/);
  const panAfterHidden = await readPan(page);

  await page.mouse.move(startX - 200, startY - 200, { steps: 5 });
  expect(await readPan(page)).toEqual(panAfterHidden);
  await page.mouse.up();
});

test("the table legs extend and lose their sheen as the view pans away from center", async ({ page }) => {
  await startNewGame(page);
  const centered = await readLegVars(page);
  // Freshly centered: at rest, full sheen.
  expect(centered.extend).toBeCloseTo(1, 1);
  expect(centered.squash).toBeCloseTo(1, 1);

  const box = await page.locator("#desktopViewport").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 - 150, { steps: 10 });
  await page.mouse.up();

  const panned = await readLegVars(page);
  expect(panned.extend).toBeGreaterThan(centered.extend);
  expect(panned.squash).toBeLessThan(centered.squash);
});
