// Wheel zoom through game.js's 4 ZOOM_LEVELS: stepping and clamping at each
// end, and the transient zoom readout that appears on a change and fades on
// its own.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

function readZoomIndex(page) {
  return page.evaluate(async () => {
    const { getCurrentZoomIndex } = await import("/constantsAndGlobalVars.js");
    return getCurrentZoomIndex();
  });
}

test("wheel zoom steps through all 4 zoom levels and clamps at each end", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#desktopViewport").hover();

  // A new game always resets to the minimum zoom level.
  expect(await readZoomIndex(page)).toBe(0);
  await expect(page.locator("#zoomReadout")).toContainText("1/4");

  // Scrolling up (negative deltaY) zooms in, one level per notch.
  for (let level = 1; level <= 3; level += 1) {
    await page.mouse.wheel(0, -100);
    expect(await readZoomIndex(page)).toBe(level);
    await expect(page.locator("#zoomReadout")).toContainText(`${level + 1}/4`);
  }

  // Already at the max: one more zoom-in attempt is a no-op, not an overflow.
  await page.mouse.wheel(0, -100);
  expect(await readZoomIndex(page)).toBe(3);

  // Scrolling down zooms back out, one level per notch, to the minimum.
  for (let level = 2; level >= 0; level -= 1) {
    await page.mouse.wheel(0, 100);
    expect(await readZoomIndex(page)).toBe(level);
  }

  // Already at the minimum: clamps rather than going negative.
  await page.mouse.wheel(0, 100);
  expect(await readZoomIndex(page)).toBe(0);
});

test("the zoom readout appears transiently on a zoom change and fades on its own", async ({ page }) => {
  await startNewGame(page);
  const readout = page.locator("#zoomReadout");
  await page.locator("#desktopViewport").hover();

  await expect(readout).not.toHaveClass(/is-visible/);

  await page.mouse.wheel(0, -100);
  await expect(readout).toHaveClass(/is-visible/);
  // Fades on its own (1.5s) without any further interaction.
  await expect(readout).not.toHaveClass(/is-visible/);
});

test("a no-op zoom attempt at the clamp does not re-trigger the transient readout", async ({ page }) => {
  await startNewGame(page);
  const readout = page.locator("#zoomReadout");
  await page.locator("#desktopViewport").hover();

  // Already at the minimum zoom level -- scrolling down further changes
  // nothing, so the readout must stay exactly as it was (hidden).
  await page.mouse.wheel(0, 100);
  expect(await readZoomIndex(page)).toBe(0);
  await expect(readout).not.toHaveClass(/is-visible/);
});
