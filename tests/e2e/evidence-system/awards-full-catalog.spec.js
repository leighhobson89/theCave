// Walks every one of the 6 awarding web-content records that
// `awards-from-web-content.spec.js` doesn't reach (that spec only
// covers the honeydewcavingclub standalone page). Together the two specs
// cover all 9 evidence-awarding records in the game, including
// `goldenpendant` -- the only Level 3 police record and the deepest gated
// content in the game.
//
// ZoomSearch, Library, Archives and Police all award evidence the moment a
// matching record appears in a *search result* (webContentManager's
// searchWebsite() walks every returned record and awards on the spot) --
// no click into the detail view is required. Only standalone pages award on
// navigation instead (see the other spec).
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  openZoomSearch,
  openLibrary,
  openPolice,
  policeLogin,
  policeQuery,
  policeStatus,
  visitBrowserUrl,
  browserAddress,
  closeComputer,
  captureConsoleEntries,
  dumpEvidenceStore,
  evidenceEntriesIn,
} = require("../../support/game-helpers");

async function rewardToastTexts(page, expectedCount) {
  await expect
    .poll(async () => page.locator(".notification-host .game-notification-reward").count())
    .toBe(expectedCount);
  return page.locator(".notification-host .game-notification-reward").allTextContents();
}

test("ZoomSearch's exhausted-mine article awards a photo evidence", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);
  await openZoomSearch(page);

  const query = page.locator("input[aria-label='ZoomSearch query']");
  await query.fill("silver mine");
  await query.press("Enter");
  await query.evaluate((element) => element.blur());

  const rewardTexts = await rewardToastTexts(page, 1);
  expect(rewardTexts[0]).toContain("Evidence unlocked in your Evidence folder!");

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const photoNames = evidenceEntriesIn(rawStore, "photos").map((entry) => entry.name);
  expect(photoNames).toContain("No More!");
});

test("the Library catalog awards a photo evidence for each of its three books", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);
  await openLibrary(page);

  const books = [
    { author: "Hannah Fletcher", title: "Mysteries of the Old North West", evidenceName: "mysteriesOfTheOldNorthWest" },
    { author: "Cat J Roman", title: "Guardians Of The North", evidenceName: "library-guardiansofthenorth" },
    { author: "Henry Whitmore", title: "Strange Things Found In Even Stranger Places", evidenceName: "Strange Things Found In Even Stranger Places" },
  ];

  for (const book of books) {
    await page.locator("input[aria-label='Library author']").fill(book.author);
    await page.locator("input[aria-label='Library title']").fill(book.title);
    await page.getByRole("button", { name: "Search Catalog" }).click();
    // A toast appears per award, but earlier toasts can have already faded by
    // the time a later search runs, so this checks "at least one is up right
    // now" rather than an accumulating count -- the store dump below is what
    // proves all three actually landed.
    await expect(page.locator(".notification-host .game-notification-reward").first()).toBeVisible();
  }

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const photoNames = evidenceEntriesIn(rawStore, "photos").map((entry) => entry.name);
  books.forEach((book) => expect(photoNames).toContain(book.evidenceName));
});

test("the Fairchild insurance decode book standalone page awards a report evidence", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);

  await visitBrowserUrl(page, "http://fairchilds-valuations-and-insurance.com/insRecordsCodes");
  await browserAddress(page).evaluate((element) => element.blur());

  const rewardTexts = await rewardToastTexts(page, 1);
  expect(rewardTexts[0]).toContain("Evidence unlocked in your Evidence folder!");

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const reportNames = evidenceEntriesIn(rawStore, "reports").map((entry) => entry.name);
  expect(reportNames).toContain("Insurance Decode Book");

  await closeComputer(page);
  await page.locator("#reportsFolder").click();
  await expect(page.locator(".reports-window .report-document-text").first())
    .toContainText("DECODE BOOK FOR INSURANCE RECORDS");
});

test("the Level 3 golden pendant police record is refused below Level 3 and awards a photo evidence once logged in", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const status = policeStatus(page);
  const query = policeQuery(page);

  // A logged-in-but-not-high-enough account still gets refused, same as the
  // Level 1 record in the authentication spec -- Level 3 content genuinely
  // needs Level 3, not just "some" login.
  await policeLogin(page, "b.whitmore", "ironVeins15");
  await expect(status).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");
  await query.fill("golden pendant");
  await query.press("Enter");
  await expect(status).toHaveText("One or more matching records were hidden by privilege restrictions.");
  await expect(page.locator(".notification-host .game-notification-reward")).toHaveCount(0);

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(status).toHaveText("Logged in as: T. Fairchild (Level 3)");
  await query.fill("golden pendant");
  await query.press("Enter");
  await query.evaluate((element) => element.blur());
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);

  const rewardTexts = await rewardToastTexts(page, 1);
  expect(rewardTexts[0]).toContain("Evidence unlocked in your Evidence folder!");

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const photoNames = evidenceEntriesIn(rawStore, "photos").map((entry) => entry.name);
  expect(photoNames).toContain("GOLD PENDANT");

  // The photo genuinely rendered its real content, not just landed in the
  // store: the two starting photos are ahead of it in the carousel, so step
  // forward twice to reach it.
  await closeComputer(page);
  await page.locator("#photosFolder").click();
  await expect(page.locator(".photos-window .photos-carousel-counter")).toHaveText("1/3");
  await page.locator(".photos-window .carousel-nav-next").click();
  await page.locator(".photos-window .carousel-nav-next").click();
  await expect(page.locator(".photos-window .photos-carousel-counter")).toHaveText("3/3");
  await expect(page.locator(".photos-window .photo-caption-text"))
    .toHaveText("Golden Pendant with inscription P A WORTHING on its rear side connected to a broken section of fine gold chain");
});
