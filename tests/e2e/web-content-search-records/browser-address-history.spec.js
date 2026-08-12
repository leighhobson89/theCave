// Netscape address-history dropdown: recording visited pages, de-duplicating
// revisits, replaying a stored search, and surviving both a computer close and
// a save/load round trip.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  closeComputer,
  openZoomSearch,
  openLibrary,
  browserAddress,
} = require("../../support/game-helpers");

test("browser address history replays a previous search from the dropdown", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await openZoomSearch(page);
  const zoomQuery = page.locator("input[aria-label='ZoomSearch query']");
  await zoomQuery.fill("mine cart");
  await zoomQuery.press("Enter");
  await page.locator(".browser-results-zoom tbody .browser-results-row").click();

  const address = browserAddress(page);
  const openedUrl = await address.inputValue();
  expect(openedUrl).toBeTruthy();

  // Navigate away, then replay the record straight from address history.
  await openLibrary(page);
  await address.click();
  const historyItem = page.locator(".caveos-browser-address-history-item", { hasText: openedUrl }).first();
  await expect(historyItem).toBeVisible();
  await historyItem.click();

  await expect(page.locator(".browser-results-zoom tbody .browser-results-row.is-selected")).toHaveCount(1);
  await expect(zoomQuery).toHaveValue("mine cart");
});

test("address history survives closing the computer, de-duplicates, and round-trips a save", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  const readHistory = () => page.evaluate(async () => {
    const module = await import("/constantsAndGlobalVars.js");
    return module.getBrowserAddressHistory();
  });

  // Visit three distinct pages, revisiting one of them.
  const zoomQuery = page.locator("input[aria-label='ZoomSearch query']");
  await openZoomSearch(page);
  await zoomQuery.fill("john baxley");
  await zoomQuery.press("Enter");
  await page.locator(".browser-results-zoom tbody .browser-results-row").click();

  await openLibrary(page);
  await openZoomSearch(page);
  await openLibrary(page);

  const beforeClose = await readHistory();
  const urls = beforeClose.map((entry) => (typeof entry === "object" ? entry.url : entry));

  // The welcome page is never recorded, and no URL appears twice.
  expect(urls).not.toContain("about:welcome");
  expect(new Set(urls).size).toBe(urls.length);
  expect(urls).toContain("http://www.zoomsearch.net/members/johnbaxley");

  // Revisiting moved zoomsearch's front page earlier than library's.
  expect(urls[urls.length - 1]).toBe("http://library.intra");

  // Closing and reopening the computer keeps the history and the dropdown.
  await closeComputer(page);
  await openNetscape(page);
  expect(await readHistory()).toEqual(beforeClose);

  await browserAddress(page).click();
  const dropdown = await page.locator(".caveos-browser-address-history-item").allTextContents();
  expect(dropdown).not.toContain("about:welcome");
  expect(new Set(dropdown).size).toBe(dropdown.length);
  expect(dropdown[0]).toBe("http://library.intra");

  // And it round-trips through the save payload with its replay data intact.
  const roundTripped = await page.evaluate(async () => {
    const module = await import("/constantsAndGlobalVars.js");
    const wire = JSON.parse(JSON.stringify(module.captureGameStatusForSaving()));
    module.setBrowserAddressHistory([]);
    await module.restoreGameStatus(wire);
    return module.getBrowserAddressHistory();
  });

  expect(roundTripped).toEqual(beforeClose);
  const replayEntry = roundTripped.find((entry) => typeof entry === "object");
  expect(replayEntry.replay).toMatchObject({
    siteId: "zoomsearch",
    query: "john baxley",
    recordId: "johnbaxley",
  });
});
