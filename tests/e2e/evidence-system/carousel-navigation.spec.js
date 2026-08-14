// The Photos and Reports carousels: stepping with the prev/next buttons
// (including wraparound at each end), and the empty-carousel state with
// navigation disabled when a collection has nothing in it yet.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openFacsimile,
  facsimileWindow,
  queueFacsimileReport,
  openNetscape,
  visitBrowserUrl,
  browserAddress,
  closeComputer,
} = require("../../support/game-helpers");

function photosWindow(page) {
  return page.locator(".photos-window");
}

function reportsWindow(page) {
  return page.locator(".reports-window");
}

// Commits the queued facsimile report to evidence: opening then closing the
// facsimile window is what actually files it, same as a player reading it.
async function commitFacsimileReportToEvidence(page) {
  await queueFacsimileReport(page);
  await openFacsimile(page);
  const introFacsimile = facsimileWindow(page);
  await expect(introFacsimile).toBeVisible();
  await introFacsimile.locator(".story-window-close").click();
  await expect(introFacsimile).toBeHidden();
}

test("the Photos carousel steps forward and back through both starting photos, wrapping at each end", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#photosFolder").click();

  const window = photosWindow(page);
  const counter = window.locator(".photos-carousel-counter");
  const caption = window.locator(".photo-caption-text");
  const previousButton = window.locator(".carousel-nav-prev");
  const nextButton = window.locator(".carousel-nav-next");

  await expect(counter).toHaveText("1/2");
  await expect(caption).toHaveText("Andrew and Arnie Spencer, Spencer Farm, Black Pine, summer 1901");
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(counter).toHaveText("2/2");
  await expect(caption).toHaveText("Cave entrance, August 1901");

  // One more "next" from the last photo wraps back to the first.
  await nextButton.click();
  await expect(counter).toHaveText("1/2");
  await expect(caption).toHaveText("Andrew and Arnie Spencer, Spencer Farm, Black Pine, summer 1901");

  // And "previous" from the first wraps to the last.
  await previousButton.click();
  await expect(counter).toHaveText("2/2");
  await expect(caption).toHaveText("Cave entrance, August 1901");
});

test("the Reports carousel steps between two awarded reports and wraps at each end", async ({ page }) => {
  await startNewGame(page);
  await commitFacsimileReportToEvidence(page);

  await openNetscape(page);
  await visitBrowserUrl(page, "http://fairchilds-valuations-and-insurance.com/insRecordsCodes");
  await browserAddress(page).evaluate((element) => element.blur());
  await expect(page.locator(".notification-host .game-notification-reward")).toHaveCount(1);

  await closeComputer(page);
  await page.locator("#reportsFolder").click();
  const window = reportsWindow(page);
  const counter = window.locator(".report-carousel-counter");
  // The magnifier controller clones the report text node into its (hidden)
  // preview surface, so an unqualified match resolves to two elements --
  // .first() is the real, visible one.
  const content = window.locator(".report-document-text").first();
  const previousButton = window.locator(".carousel-nav-prev");
  const nextButton = window.locator(".carousel-nav-next");

  // The missing-person report was awarded first, so it's first in the carousel.
  await expect(counter).toHaveText("1/2");
  await expect(content).toContainText("MISSING PERSON INVESTIGATION");

  await nextButton.click();
  await expect(counter).toHaveText("2/2");
  await expect(content).toContainText("DECODE BOOK FOR INSURANCE RECORDS");

  // Wraps back to the first report.
  await nextButton.click();
  await expect(counter).toHaveText("1/2");
  await expect(content).toContainText("MISSING PERSON INVESTIGATION");

  // And "previous" from the first wraps to the last.
  await previousButton.click();
  await expect(counter).toHaveText("2/2");
  await expect(content).toContainText("DECODE BOOK FOR INSURANCE RECORDS");
});

test("the Reports carousel shows its empty state with navigation disabled before any report is awarded", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#reportsFolder").click();

  const window = reportsWindow(page);
  await expect(window.locator(".report-carousel-empty")).toBeVisible();
  await expect(window.locator(".report-carousel-empty")).toHaveText("Reports: 0/0");
  await expect(window.locator(".report-carousel-counter")).toHaveText("0/0");
  await expect(window.locator(".carousel-nav-prev")).toBeDisabled();
  await expect(window.locator(".carousel-nav-next")).toBeDisabled();
});

test("the Photos carousel shows its empty state with navigation disabled when its collection is empty", async ({ page }) => {
  await startNewGame(page);

  // The game never actually empties the Photos collection during play (New
  // Game always reseeds the two starting photos) -- this resets the live
  // evidence store directly to reach the empty-carousel rendering path that
  // would otherwise be unreachable, the same way other specs bypass the UI
  // for setup that has no in-game trigger.
  await page.evaluate(async () => {
    const { resetEvidenceStore } = await import("/evidenceManager.js");
    resetEvidenceStore();
  });

  await page.locator("#photosFolder").click();
  const window = photosWindow(page);
  await expect(window.locator(".photos-carousel-empty")).toBeVisible();
  await expect(window.locator(".photos-carousel-empty")).toHaveText("Photos: 0/0");
  await expect(window.locator(".photos-carousel-counter")).toHaveText("0/0");
  await expect(window.locator(".carousel-nav-prev")).toBeDisabled();
  await expect(window.locator(".carousel-nav-next")).toBeDisabled();
});
