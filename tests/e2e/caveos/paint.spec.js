// CaveOS Paint window: the ten-sketch paged model, per-sketch canvas
// persistence, every tool in the palette, the brush-size and colour inputs, and
// the canvas ground following the current theme.
//
// Drawing is always done with a real mouse drag and read back off the canvas
// pixels, never by calling the drawing code — a stroke that never reaches the
// canvas is exactly the failure worth catching.
const { test, expect } = require("@playwright/test");
const {
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
  openPaint,
  startNewGame,
} = require("../../support/game-helpers");
const { selectCaveOsTheme } = require("../../support/caveos-helpers");

// Terminal, the default theme, paints on #041204.
const TERMINAL_GROUND = "4,18,4";

function paintCanvas(page) {
  return page.locator(".caveos-paint-canvas");
}

// The colour of the canvas at its own centre, as "r,g,b".
const readCentrePixel = (page) => paintCanvas(page).evaluate((element) => {
  const [red, green, blue] = element.getContext("2d").getImageData(
    Math.floor(element.width / 2),
    Math.floor(element.height / 2),
    1,
    1
  ).data;
  return `${red},${green},${blue}`;
});

// How many pixels are not the given ground colour — the simplest honest measure
// of "something was drawn".
const countInkedPixels = (page, ground) => paintCanvas(page).evaluate((element, groundColor) => {
  const [groundRed, groundGreen, groundBlue] = groundColor.split(",").map(Number);
  const { data } = element.getContext("2d").getImageData(0, 0, element.width, element.height);

  let inked = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (
      data[index] !== groundRed
      || data[index + 1] !== groundGreen
      || data[index + 2] !== groundBlue
    ) {
      inked += 1;
    }
  }
  return inked;
}, ground);

async function dragAcrossCanvas(page, { fromOffsetX = -40, toOffsetX = 40 } = {}) {
  const box = await paintCanvas(page).boundingBox();
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await page.mouse.move(centre.x + fromOffsetX, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + toOffsetX, centre.y, { steps: 8 });
  await page.mouse.up();
}

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

test("every tool in the palette draws, and the selected one is the active one", async ({ page }) => {
  await startNewGame(page);
  await openPaint(page);

  // Pen is selected on open; each of the others is selected in turn and proven
  // to put ink on the canvas, which is the only thing a player can see.
  for (const tool of ["pen", "line", "rect"]) {
    await page.locator(".caveos-paint-clear").click();
    await expect.poll(() => countInkedPixels(page, TERMINAL_GROUND)).toBe(0);

    const toolButton = page.locator(`.caveos-paint-tool[data-tool="${tool}"]`);
    await toolButton.click();
    await expect(toolButton).toHaveClass(/is-active/);

    await dragAcrossCanvas(page);
    expect(await countInkedPixels(page, TERMINAL_GROUND)).toBeGreaterThan(0);
  }
});

test("the brush size and colour inputs change what the pen lays down", async ({ page }) => {
  await startNewGame(page);
  await openPaint(page);

  const sizeInput = page.locator(".caveos-paint-size");
  const colorInput = page.locator(".caveos-paint-color");

  // Brush size is a range slider and colour is a native colour well, and
  // neither takes a real click or a fill(). Both are driven with keyboard and
  // `selectOption`-style value setting instead: the slider by arrow keys, which
  // is a genuine user gesture, and the colour by setting the value and firing
  // the input event the picker itself would fire.
  await sizeInput.focus();
  for (let step = 0; step < 40; step += 1) {
    await sizeInput.press("ArrowLeft");
  }
  const thinSize = Number(await sizeInput.inputValue());

  await page.locator(".caveos-paint-clear").click();
  await dragAcrossCanvas(page);
  const thinStrokePixels = await countInkedPixels(page, TERMINAL_GROUND);
  expect(thinStrokePixels).toBeGreaterThan(0);

  // The same drag with a far larger brush must cover materially more canvas.
  await sizeInput.focus();
  for (let step = 0; step < 40; step += 1) {
    await sizeInput.press("ArrowRight");
  }
  expect(Number(await sizeInput.inputValue())).toBeGreaterThan(thinSize);

  await page.locator(".caveos-paint-clear").click();
  await dragAcrossCanvas(page);
  expect(await countInkedPixels(page, TERMINAL_GROUND)).toBeGreaterThan(thinStrokePixels * 2);

  // A colour change reaches the canvas: the stroke is that exact colour.
  await colorInput.evaluate((input) => {
    input.value = "#ff0000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator(".caveos-paint-clear").click();
  await dragAcrossCanvas(page);
  expect(await readCentrePixel(page)).toBe("255,0,0");
});

test("Paint's canvas and default pen follow the current theme", async ({ page }) => {
  await startNewGame(page);
  await openPaint(page);

  const readPaintSetup = () => page.evaluate(() => {
    const canvas = document.querySelector(".caveos-paint-canvas");
    const [red, green, blue] = canvas.getContext("2d").getImageData(4, 4, 1, 1).data;
    return {
      canvasPixel: `${red},${green},${blue}`,
      penColor: document.querySelector(".caveos-paint-color").value,
    };
  });

  const terminalSetup = await readPaintSetup();
  expect(terminalSetup.canvasPixel).toBe(TERMINAL_GROUND);
  expect(terminalSetup.penColor).toBe("#76ff62");

  // A page is stored as a flat image, so its pixels cannot follow a later theme
  // change — the theme is resolved when the window opens. Reopening is what
  // picks up the new palette.
  await page.locator(".caveos-paint-window .story-window-close").click();
  await selectCaveOsTheme(page, "redmond");
  await page.locator(".caveos-folder-apps-window .computer-icon-paint").click();
  await expect(page.locator(".caveos-paint-window")).toBeVisible();

  const redmondSetup = await readPaintSetup();
  // Redmond paints on white with a navy pen.
  expect(redmondSetup.canvasPixel).toBe("255,255,255");
  expect(redmondSetup.penColor).toBe("#000080");
});

test("the eraser restores the canvas ground rather than painting white", async ({ page }) => {
  await startNewGame(page);
  await openPaint(page);

  const groundPixel = await readCentrePixel(page);
  expect(groundPixel).toBe(TERMINAL_GROUND);

  // Draw with a real drag, then erase over the same spot with a real drag.
  await dragAcrossCanvas(page);
  expect(await readCentrePixel(page)).not.toBe(groundPixel);

  await page.locator('.caveos-paint-tool[data-tool="eraser"]').click();
  await dragAcrossCanvas(page);

  // Back to the dark green ground, not to white.
  expect(await readCentrePixel(page)).toBe(groundPixel);
});

test("a sketch survives a save and load round trip", async ({ page }) => {
  await startNewGame(page);
  await openPaint(page);

  await dragAcrossCanvas(page);
  const drawnPixels = await countInkedPixels(page, TERMINAL_GROUND);
  expect(drawnPixels).toBeGreaterThan(0);

  // Round-trip the save string through the real menu popups, then reopen Paint
  // and confirm the stroke came back with it.
  const saveString = await captureSaveStringViaMenu(page);
  await page.goto("/");
  await loadSaveStringViaMenu(page, saveString);

  await openPaint(page);
  await expect.poll(() => countInkedPixels(page, TERMINAL_GROUND)).toBeGreaterThan(0);
});
