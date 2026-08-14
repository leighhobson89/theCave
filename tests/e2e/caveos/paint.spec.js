// CaveOS Paint window: the ten-sketch paged model, per-sketch canvas
// persistence, freehand drawing and the flood-fill tool.
const { test, expect } = require("@playwright/test");
const { startNewGame, openPaint } = require("../../support/game-helpers");

test("paint window: tabs, title commit, drawing and flood fill persist per sketch", async ({ page }) => {
  await startNewGame(page);
  await openPaint(page);

  const paintWindow = page.locator(".caveos-paint-window");
  await expect(paintWindow).toBeVisible();

  const rows = paintWindow.locator(".caveos-paint-page-row");
  await expect(rows).toHaveCount(10);
  await expect(rows.nth(0).locator(".notes-page-title-input")).toHaveValue("Sketch 1");
  await expect(rows.nth(3).locator(".notes-page-title-input")).toHaveAttribute("placeholder", "Sketch 4");
  await expect(rows.nth(1).locator(".notes-page-title-input")).toHaveAttribute("aria-label", "Title for sketch 2");

  const canvas = paintWindow.locator(".caveos-paint-canvas");
  const box = await canvas.boundingBox();

  // Draw a stroke on sketch 1.
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 140, { steps: 8 });
  await page.mouse.up();

  const readPixels = () => canvas.evaluate((element) => {
    const context = element.getContext("2d");
    const { data } = context.getImageData(0, 0, element.width, element.height);
    let nonBackground = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 4 || data[i + 1] !== 18 || data[i + 2] !== 4) nonBackground += 1;
    }
    return nonBackground;
  });

  const drawnPixels = await readPixels();
  expect(drawnPixels).toBeGreaterThan(0);

  // Sketch 2 starts blank, then sketch 1 restores its stroke.
  await rows.nth(1).locator(".caveos-paint-page-activate").click();
  await expect.poll(readPixels).toBe(0);
  await rows.nth(0).locator(".caveos-paint-page-activate").click();
  await expect.poll(readPixels).toBeGreaterThan(0);

  // Flood fill the whole canvas from a background pixel in the bottom-right.
  await paintWindow.locator('.caveos-paint-tool[data-tool="fill"]').click();
  await page.mouse.click(box.x + box.width - 12, box.y + box.height - 12);
  await expect.poll(readPixels).toBeGreaterThan(drawnPixels * 5);

  // Sketch titles commit through the same shared helper as notes.
  const titleInput = rows.nth(0).locator(".notes-page-title-input");
  await titleInput.fill("Cave Map");
  await titleInput.press("Enter");
  await expect(titleInput).toHaveValue("Cave Map");
  // aria-label is only refreshed on the next full render, so switch sketches.
  await rows.nth(1).locator(".caveos-paint-page-activate").click();
  await expect(rows.nth(0).locator(".caveos-paint-page-activate")).toHaveAttribute("aria-label", "Open Cave Map");
});
