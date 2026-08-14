// Evidence awarded by visiting web content: a standalone page that carries
// more than one attached evidence must award every one of them, each with its
// own reward notification.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  visitBrowserUrl,
  browserAddress,
  captureConsoleEntries,
  dumpEvidenceStore,
  evidenceEntriesIn,
} = require("../../support/game-helpers");

test("honey dew standalone page awards two photo evidences", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);

  await startNewGame(page);
  await openNetscape(page);

  await visitBrowserUrl(page, "http://honeydewcavingclub.com");
  await browserAddress(page).evaluate((element) => element.blur());

  await expect
    .poll(async () => page.locator(".notification-host .game-notification-reward").count())
    .toBe(2);

  const rewardTexts = await page.locator(".notification-host .game-notification-reward").allTextContents();
  expect(rewardTexts.every((text) => text.includes("Evidence unlocked in your Evidence folder!"))).toBe(true);

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const photoEntries = evidenceEntriesIn(rawStore, "photos");

  expect(photoEntries.map((entry) => entry.name)).toEqual(
    expect.arrayContaining([
      "standalone-honeydewcavingclub-team",
      "standalone-honeydewcavingclub",
    ])
  );
});
