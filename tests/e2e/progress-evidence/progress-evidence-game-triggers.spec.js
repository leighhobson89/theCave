// Progress evidence activated by real gameplay rather than by calling the API
// directly: opening a website record, visiting a standalone page, and receiving
// a fax. Each has to end up in the persistent collection with its two flags set
// correctly.
//
// What the envelope then *shows* is no longer asserted here: the envelope holds
// timeline photographs, not progressEvidence cards, and which photographs an
// activation unlocks is covered by tests/e2e/progress-timeline/.
const { test, expect } = require("@playwright/test");
const {
  openNetscape,
  openZoomSearch,
  readProgressEvidence,
  readProgressEvidenceEntry,
  setProgressEvidenceDeveloperEnabled,
  startNewGame,
  visitBrowserUrl,
} = require("../../support/game-helpers");

test("opening a website record activates its progress evidence", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openZoomSearch(page);

  // Searching alone is not the milestone; opening the record is.
  const zoomQuery = page.locator("input[aria-label='ZoomSearch query']");
  await zoomQuery.fill("john baxley");
  await zoomQuery.press("Enter");
  await expect(page.locator(".browser-results-zoom tbody .browser-results-row")).toHaveCount(1);
  expect(await readProgressEvidence(page)).toEqual([]);

  await page.locator(".browser-results-zoom tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-layout-zoom .browser-record-title")).toHaveText("John Baxley");

  // ZoomSearch's johnbaxley page is progress evidence 00002, and it ships
  // developer-enabled, so it needs nothing else to become visible.
  expect(await readProgressEvidence(page)).toEqual(["00002"]);
  expect(await readProgressEvidenceEntry(page, "00002")).toMatchObject({
    service: "zoomsearch",
    itemId: "johnbaxley",
    progressEvidenceActivated: true,
    progressEvidenceDeveloperEnabled: true,
  });
});

test("visiting a standalone page activates its progress evidence", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await visitBrowserUrl(page, "http://www.whitmore-sons-iron-machinery-co.com/mining");
  await expect(page.locator(".browser-page-standalone")).toBeVisible();

  expect(await readProgressEvidence(page)).toEqual(["40001"]);
  expect(await readProgressEvidenceEntry(page, "40001")).toMatchObject({
    service: "standalone",
    itemId: "whitmoresonsironmachineryco",
    progressEvidenceActivated: true,
    // Standalone pages ship developer-disabled, so this one stays hidden.
    progressEvidenceDeveloperEnabled: false,
  });

  // The developer switch is independent of player progress: flipping it changes
  // only the flag, never the activation.
  await setProgressEvidenceDeveloperEnabled(page, "40001", true);
  expect(await readProgressEvidenceEntry(page, "40001")).toMatchObject({
    progressEvidenceActivated: true,
    progressEvidenceDeveloperEnabled: true,
  });
});

test("receiving a fax activates its progress evidence", async ({ page }) => {
  await startNewGame(page);

  // The real milestone chain: the Honeydew Caving Club page awards the mine-map
  // photo, which fires the Whitmore police-credentials fax.
  await openNetscape(page);
  await visitBrowserUrl(page, "http://honeydewcavingclub.com");
  await expect(page.locator(".browser-page-standalone")).toBeVisible();

  // 40002 is the standalone page itself; 50003 is the fax it triggered.
  await expect.poll(() => readProgressEvidence(page)).toContain("50003");
  expect(await readProgressEvidence(page)).toContain("40002");
  expect(await readProgressEvidenceEntry(page, "50003")).toMatchObject({
    service: "facsimile",
    itemId: "fax-whitmore-police-credentials",
    progressEvidenceActivated: true,
    progressEvidenceDeveloperEnabled: false,
  });

  await setProgressEvidenceDeveloperEnabled(page, "50003", true);
  expect(await readProgressEvidenceEntry(page, "50003")).toMatchObject({
    progressEvidenceActivated: true,
    progressEvidenceDeveloperEnabled: true,
  });
});
