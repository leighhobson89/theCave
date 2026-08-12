// Netscape site search: query submission, result rendering, detail views and
// per-site empty states across ZoomSearch, Library and Canada Archives.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  openZoomSearch,
  openLibrary,
  openArchives,
  archivesStatus,
} = require("../../support/game-helpers");

test("zoomsearch and library searches return records and render detail", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await openZoomSearch(page);
  const zoomQuery = page.locator("input[aria-label='ZoomSearch query']");
  await zoomQuery.fill("john baxley");
  await zoomQuery.press("Enter");
  await expect(page.locator(".browser-results-zoom tbody .browser-results-row")).toHaveCount(1);
  await page.locator(".browser-results-zoom tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-layout-zoom .browser-record-title")).toHaveText("John Baxley");

  // A miss shows the site's own empty message, not a generic one.
  await zoomQuery.fill("nothing at all");
  await zoomQuery.press("Enter");
  await expect(page.locator(".browser-status-line").first())
    .toHaveText("Search brings up a lot of unrelated bumph. You move on.");

  await openLibrary(page);
  await page.locator("input[aria-label='Library author']").fill("Hannah Fletcher");
  await page.locator("input[aria-label='Library title']").fill("Mysteries of the Old North West");
  await page.getByRole("button", { name: "Search Catalog" }).click();
  await expect(page.locator(".browser-results-library tbody .browser-results-row")).toHaveCount(1);
  await page.locator(".browser-results-library tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-layout-library .browser-record-title"))
    .toHaveText("Mysteries of the Old North West");
});

test("archives site requires province plus keyword and remembers the province", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await openArchives(page);
  const status = archivesStatus(page);
  await expect(status).toHaveText("Logged in as: Free");

  const query = page.locator("input[aria-label='Archive keyword search']");

  // Right keyword, wrong province -> no match.
  await query.fill("hannah fletcher");
  await query.press("Enter");
  await expect(status).toHaveText("Nothing found.");

  await page.locator("select[aria-label='Province selector']").selectOption("Alberta");
  await query.press("Enter");
  await expect(page.locator(".browser-results-archives tbody .browser-results-row")).toHaveCount(1);
  await page.locator(".browser-results-archives tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-title-headline")).toBeVisible();

  // Province selection survives a re-render of the page.
  await openZoomSearch(page);
  await openArchives(page);
  await expect(page.locator("select[aria-label='Province selector']")).toHaveValue("Alberta");
});
