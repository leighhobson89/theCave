// The shared DesktopWindow component (desktopWindow.js), tested in isolation
// rather than through a specific app window: centering on first open,
// dragging and its viewport-margin clamp, resizing and its min-size clamp,
// dynamically toggling resizability, scrollbar visibility, the carousel
// aria-label API, and close/destroy. A fresh instance is constructed per
// test directly against the already-loaded page (no game state needed), the
// same way audio-settings specs reach into audioManager.js.
const { test, expect } = require("@playwright/test");

const TEST_WINDOW_SELECTOR = ".test-desktop-window";
// Mirrors DesktopWindow's own marginRatio/minWidth/minHeight constants.
const MARGIN_RATIO = 0.05;
const MIN_WIDTH = 540;
const MIN_HEIGHT = 360;

function closeTo(actual, expected, tolerance = 2) {
  expect(Math.abs(actual - expected), `expected ${actual} to be within ${tolerance} of ${expected}`)
    .toBeLessThanOrEqual(tolerance);
}

// Constructs a fresh DesktopWindow with a stable class hook, attached to
// document.body (so getParentMetrics() takes the simple window.innerWidth/
// innerHeight branch), and opens it with the given options.
async function createTestWindow(page, { resizable = false, showScrollbar = true, showCarouselNavigation = false } = {}) {
  await page.evaluate(async ({ resizable, showScrollbar, showCarouselNavigation }) => {
    const { DesktopWindow } = await import("/desktopWindow.js");
    window.__testWindow?.destroy?.();
    window.__testWindowClosed = false;
    const win = new DesktopWindow({
      classNames: ["test-desktop-window"],
      title: "Test Window",
      closeButtonAriaLabel: "Close test window",
      showCarouselNavigation,
      onClose: () => {
        window.__testWindowClosed = true;
      },
    });
    win.open({ resizable, showScrollbar });
    window.__testWindow = win;
  }, { resizable, showScrollbar, showCarouselNavigation });

  return page.locator(TEST_WINDOW_SELECTOR);
}

test.afterEach(async ({ page }) => {
  // Isolated instances are never registered with the app's window tracking,
  // so nothing else will clean them up between tests.
  await page.evaluate(() => window.__testWindow?.destroy?.());
});

test("a freshly opened window is centered in the viewport", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize();
  const testWindow = await createTestWindow(page);

  const box = await testWindow.boundingBox();
  closeTo(box.x + box.width / 2, viewport.width / 2);
  closeTo(box.y + box.height / 2, viewport.height / 2);
});

test("dragging the header by the title moves the window by the drag delta", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page);
  const before = await testWindow.boundingBox();

  const header = testWindow.locator(".desktop-window-title");
  const headerBox = await header.boundingBox();
  const startX = headerBox.x + headerBox.width / 2;
  const startY = headerBox.y + headerBox.height / 2;

  // Small enough that neither axis brushes the viewport-margin clamp -- the
  // default window is tall enough (76vh) that a larger vertical delta would
  // clip against the bottom margin, which is exercised deliberately by the
  // next test instead.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 20, { steps: 10 });
  await page.mouse.up();

  const after = await testWindow.boundingBox();
  closeTo(after.x, before.x + 120);
  closeTo(after.y, before.y + 20);

  // The dragging-state class comes off again once the pointer is released.
  await expect(testWindow).not.toHaveClass(/is-dragging-window/);
});

test("dragging cannot push the window past the viewport margin", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize();
  const testWindow = await createTestWindow(page);

  const header = testWindow.locator(".desktop-window-title");
  const headerBox = await header.boundingBox();
  const startX = headerBox.x + headerBox.width / 2;
  const startY = headerBox.y + headerBox.height / 2;

  // A drag far larger than the viewport, towards the top-left corner.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 5000, startY - 5000, { steps: 10 });
  await page.mouse.up();

  const after = await testWindow.boundingBox();
  const marginX = viewport.width * MARGIN_RATIO;
  const marginY = viewport.height * MARGIN_RATIO;
  expect(after.x).toBeGreaterThanOrEqual(marginX - 2);
  expect(after.y).toBeGreaterThanOrEqual(marginY - 2);
});

test("resizing via the handle changes width and height, only when resizable", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page, { resizable: true });
  await expect(testWindow).toHaveClass(/is-resizable/);

  const handle = testWindow.locator(".desktop-window-resize-handle");
  await expect(handle).toBeVisible();

  const before = await testWindow.boundingBox();
  const handleBox = await handle.boundingBox();
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 80, startY + 40, { steps: 10 });
  await page.mouse.up();

  const after = await testWindow.boundingBox();
  closeTo(after.width, before.width + 80);
  closeTo(after.height, before.height + 40);
  await expect(testWindow).not.toHaveClass(/is-resizing-window/);
});

test("resizing is clamped to the component's minimum width and height", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page, { resizable: true });
  const handle = testWindow.locator(".desktop-window-resize-handle");
  const handleBox = await handle.boundingBox();

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  // A shrink far larger than the window itself.
  await page.mouse.move(handleBox.x - 3000, handleBox.y - 3000, { steps: 10 });
  await page.mouse.up();

  const after = await testWindow.boundingBox();
  expect(Math.round(after.width)).toBe(MIN_WIDTH);
  expect(Math.round(after.height)).toBe(MIN_HEIGHT);
});

test("a non-resizable window hides its resize handle and ignores drags on it", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page, { resizable: false });
  await expect(testWindow).not.toHaveClass(/is-resizable/);

  const handle = testWindow.locator(".desktop-window-resize-handle");
  await expect(handle).toHaveClass(/d-none/);
  await expect(handle).toBeHidden();
});

test("setResizable() toggles the resize handle dynamically after opening", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page, { resizable: false });
  const handle = testWindow.locator(".desktop-window-resize-handle");
  await expect(handle).toBeHidden();

  await page.evaluate(() => window.__testWindow.setResizable(true));
  await expect(testWindow).toHaveClass(/is-resizable/);
  await expect(handle).toBeVisible();

  await page.evaluate(() => window.__testWindow.setResizable(false));
  await expect(testWindow).not.toHaveClass(/is-resizable/);
  await expect(handle).toBeHidden();
});

test("scrollbar visibility follows open({ showScrollbar }) and setScrollbarVisibility()", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page, { showScrollbar: false });
  const scrollHost = testWindow.locator(".desktop-window-content-host");
  await expect(scrollHost).toHaveClass(/scrollbars-hidden/);

  await page.evaluate(() => window.__testWindow.setScrollbarVisibility(true));
  await expect(scrollHost).not.toHaveClass(/scrollbars-hidden/);

  await page.evaluate(() => window.__testWindow.setScrollbarVisibility(false));
  await expect(scrollHost).toHaveClass(/scrollbars-hidden/);
});

test("setCarouselAriaLabels() updates the prev/next buttons independently, over the constructor defaults", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page, { showCarouselNavigation: true });
  const prev = testWindow.locator(".carousel-nav-prev");
  const next = testWindow.locator(".carousel-nav-next");

  await expect(prev).toHaveAttribute("aria-label", "Previous image");
  await expect(next).toHaveAttribute("aria-label", "Next image");

  await page.evaluate(() => window.__testWindow.setCarouselAriaLabels({ previous: "Previous evidence" }));
  await expect(prev).toHaveAttribute("aria-label", "Previous evidence");
  // Omitted key is left untouched.
  await expect(next).toHaveAttribute("aria-label", "Next image");

  await page.evaluate(() => window.__testWindow.setCarouselAriaLabels({ next: "Next evidence" }));
  await expect(next).toHaveAttribute("aria-label", "Next evidence");
});

test("closing an owns-DOM window removes it entirely and fires onClose", async ({ page }) => {
  await page.goto("/");
  const testWindow = await createTestWindow(page);
  await expect(testWindow).toHaveCount(1);

  await testWindow.locator(".story-window-close").click();

  await expect(testWindow).toHaveCount(0);
  expect(await page.evaluate(() => window.__testWindowClosed)).toBe(true);
});
