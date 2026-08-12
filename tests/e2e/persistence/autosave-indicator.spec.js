// The autosave indicator: a floppy-disk toast driven by the real 60s sticky
// autosave. Uses Playwright's clock control to advance the autosave timer
// rather than waiting in real time.
const { test, expect } = require("@playwright/test");
const { clickNewGame, openComputer } = require("../../support/game-helpers");

test("the autosave indicator appears on a real autosave and fades away", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  const indicator = page.locator(".autosave-indicator");
  // Not present before any autosave has run.
  await expect(indicator).toHaveCount(0);

  await page.clock.runFor(60_000);
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveClass(/is-visible/);

  // Stays up, then fades out on its own.
  await page.clock.runFor(1_000);
  await expect(indicator).toHaveClass(/is-visible/);

  await page.clock.runFor(2_000);
  await expect(indicator).not.toHaveClass(/is-visible/);
  await expect(indicator).toBeHidden();
});

test("the autosave indicator is a floppy disk with a spinner, bottom-left, above everything", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);
  await page.clock.runFor(60_000);

  const indicator = page.locator(".autosave-indicator");
  await expect(indicator).toBeVisible();

  // Floppy disk drawn as SVG, plus a spinner element that is actually animating.
  await expect(page.locator(".autosave-indicator-disk")).toHaveCount(1);
  await expect(page.locator(".autosave-indicator-disk-shutter")).toHaveCount(1);
  await expect(page.locator(".autosave-indicator-spinner")).toHaveCount(1);

  const info = await page.evaluate(() => {
    const el = document.querySelector(".autosave-indicator");
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const spinner = getComputedStyle(document.querySelector(".autosave-indicator-spinner"));
    const highestOtherZIndex = Math.max(
      ...Array.from(document.querySelectorAll("*"))
        .filter((node) => !node.closest(".autosave-indicator"))
        .map((node) => Number.parseInt(getComputedStyle(node).zIndex, 10))
        .filter((value) => Number.isFinite(value))
    );

    return {
      left: Math.round(box.left),
      bottomGap: Math.round(window.innerHeight - box.bottom),
      zIndex: Number.parseInt(style.zIndex, 10),
      highestOtherZIndex,
      fade: style.transitionDuration,
      spinnerAnimation: spinner.animationName,
      // Anchored to the viewport, not to a game window.
      parentTag: el.parentElement.tagName,
      position: style.position,
    };
  });

  expect(info.left).toBe(40);
  expect(info.bottomGap).toBe(40);
  expect(info.position).toBe("fixed");
  expect(info.parentTag).toBe("BODY");
  expect(info.zIndex).toBeGreaterThan(info.highestOtherZIndex);
  expect(info.fade.startsWith("0.75s")).toBe(true);
  expect(info.spinnerAnimation).toBe("autosave-spin");
});

test("rapid autosaves reuse the single indicator instead of stacking", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  // Several autosave ticks back to back.
  await page.clock.runFor(60_000);
  await expect(page.locator(".autosave-indicator")).toHaveCount(1);

  await page.clock.runFor(60_000);
  await page.clock.runFor(60_000);
  await page.clock.runFor(60_000);

  await expect(page.locator(".autosave-indicator")).toHaveCount(1);
  // Still showing, because each save restarted the visible window.
  await expect(page.locator(".autosave-indicator")).toHaveClass(/is-visible/);
});

test("the autosave indicator shows regardless of which window is open", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  // With the full-screen computer open.
  await openComputer(page);
  await expect(page.locator(".computer-window")).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(page.locator(".autosave-indicator")).toBeVisible();
  await page.clock.runFor(3_000);

  // And from the menu, which hides #gameArea entirely.
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(page.locator(".autosave-indicator")).toBeVisible();
});
