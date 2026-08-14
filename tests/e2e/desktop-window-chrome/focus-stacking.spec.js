// Click-to-focus z-index promotion: registerDesktopWindow() in ui.js gives
// every real app window a pointerdown listener that raises it above whatever
// else is open (bringDesktopWindowToFront -> getNextDesktopWindowZIndex()).
// This is app-level wiring, not part of DesktopWindow itself, so it is
// exercised through real windows rather than the isolated instances in
// mechanics.spec.js.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

function readZIndex(locator) {
  return locator.evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10));
}

// These windows are all centered at open and so fully overlap one another --
// there is no exposed pixel a real mouse click could land on to promote a
// window buried underneath another. Dispatching pointerdown straight at the
// element (rather than Playwright's coordinate-based, hit-tested click)
// reaches the buried window's own listener directly, the same way a real
// pointerdown bubbles from wherever the pointer actually lands. The generic
// ".desktop-window-body" is used (present on every window kind) rather than
// the header, so this cannot also be mistaken by beginDrag()'s own
// pointerdown listener for the start of a window drag.
async function focusWindowViaBodyPointerDown(windowLocator) {
  await windowLocator.locator(".desktop-window-body").dispatchEvent("pointerdown", { bubbles: true, button: 0 });
}

test("clicking a background window raises it above a window opened after it", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#backgroundFolder").click();
  const storyWindow = page.locator(".story-window:not(.photos-window)");
  await expect(storyWindow).toBeVisible();

  await page.locator("#photosFolder").click();
  const photosWindow = page.locator(".photos-window");
  await expect(photosWindow).toBeVisible();

  // Opened later, so photos starts on top.
  const storyZBeforeClick = await readZIndex(storyWindow);
  const photosZBeforeClick = await readZIndex(photosWindow);
  expect(photosZBeforeClick).toBeGreaterThan(storyZBeforeClick);

  await focusWindowViaBodyPointerDown(storyWindow);

  const storyZAfterClick = await readZIndex(storyWindow);
  const photosZAfterClick = await readZIndex(photosWindow);
  expect(storyZAfterClick).toBeGreaterThan(photosZAfterClick);
  // Genuinely promoted, not just left alone.
  expect(storyZAfterClick).toBeGreaterThan(storyZBeforeClick);
});

test("z-index promotion is monotonic across many windows, and closing does not disturb the others", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#backgroundFolder").click();
  await page.locator("#photosFolder").click();
  await page.locator("#reportsFolder").click();

  const story = page.locator(".story-window:not(.photos-window):not(.reports-window)");
  const photos = page.locator(".photos-window");
  const reports = page.locator(".reports-window");

  // Opened in this order, so z-index should already climb in this order.
  const [storyZ, photosZ, reportsZ] = await Promise.all([readZIndex(story), readZIndex(photos), readZIndex(reports)]);
  expect(photosZ).toBeGreaterThan(storyZ);
  expect(reportsZ).toBeGreaterThan(photosZ);

  // Bring the first-opened window forward twice; each click must promote it
  // further, not just tie the previous top.
  await focusWindowViaBodyPointerDown(story);
  const storyZOnceRaised = await readZIndex(story);
  expect(storyZOnceRaised).toBeGreaterThan(reportsZ);

  await focusWindowViaBodyPointerDown(photos);
  const photosZRaised = await readZIndex(photos);
  expect(photosZRaised).toBeGreaterThan(storyZOnceRaised);

  // Closing the now-topmost window leaves the stacking order of the rest
  // exactly as it was.
  await photos.locator(".story-window-close").dispatchEvent("click");
  await expect(photos).toHaveCount(0);
  expect(await readZIndex(story)).toBe(storyZOnceRaised);
  expect(await readZIndex(reports)).toBe(reportsZ);
});
