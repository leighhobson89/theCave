// The one authored web-content page nothing else in the suite ever reaches:
// the `whitmoresonsironmachineryco` standalone page. Unlike the other two
// standalone pages (honeydewcavingclub, fairchildsinsurancerecordscodes -
// both covered under tests/e2e/evidence-system/, since both award evidence),
// this one awards nothing, which is exactly why it had fallen through every
// other spec's net.
const { test, expect } = require("@playwright/test");
const { startNewGame, openNetscape, openZoomSearch, visitBrowserUrl, browserAddress } = require("../../support/game-helpers");

const WHITMORE_URL = "http://www.whitmore-sons-iron-machinery-co.com/mining";

test("the Whitmore & Sons standalone page is reachable from the mine-cart article's in-page link", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openZoomSearch(page);

  const query = page.locator("input[aria-label='ZoomSearch query']");
  await query.fill("mine cart");
  await query.press("Enter");
  await page.locator(".browser-results-zoom tbody .browser-results-row").click();

  // The article's body text embeds the URL as a *-*delimited*-* in-page link
  // rather than a bare href, so following it has to be a real click through
  // appendDelimitedLinkText's caveos-browser-navigate event, not a direct URL visit.
  const inlineLink = page.locator(".browser-record-layout-zoom .browser-inline-content-link", { hasText: WHITMORE_URL });
  await expect(inlineLink).toBeVisible();
  await inlineLink.click();

  await expect(browserAddress(page)).toHaveValue(WHITMORE_URL);
  const standalonePage = page.locator(".browser-page-standalone");
  await expect(standalonePage.locator(".browser-page-title")).toHaveText("Buy your Mining Machinery from Whitmore & Sons");
  await expect(standalonePage.locator(".browser-standalone-paragraph").first())
    .toContainText("Welcome to the Whitmore & Sons Mining Machinery information page!");
  await expect(standalonePage.locator(".browser-image-figure")).toHaveCount(1);

  // It awards nothing -- awardsEvidence is false for this record, unlike the
  // other two standalone pages, so navigating here must never raise a reward
  // toast.
  await expect(page.locator(".notification-host .game-notification-reward")).toHaveCount(0);
});

test("the Whitmore & Sons standalone page is reachable directly and survives re-navigation away and back", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  await visitBrowserUrl(page, WHITMORE_URL);
  await browserAddress(page).evaluate((element) => element.blur());

  const standalonePage = page.locator(".browser-page-standalone");
  await expect(standalonePage.locator(".browser-page-title")).toHaveText("Buy your Mining Machinery from Whitmore & Sons");

  // Navigating away and back re-fetches the same authored content, not a
  // stale or empty page.
  await openZoomSearch(page);
  await visitBrowserUrl(page, WHITMORE_URL);
  await expect(standalonePage.locator(".browser-page-title")).toHaveText("Buy your Mining Machinery from Whitmore & Sons");
});
