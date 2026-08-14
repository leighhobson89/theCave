// Scripted faxes fired by progress milestones rather than by the player
// opening the facsimile: one keyed off acquiring a specific photo evidence,
// one keyed off opening a specific police record. Both deliver working
// credentials, so the tests follow through and use them.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  openPolice,
  openFacsimile,
  facsimileWindow,
  closeFacsimile,
  policeLogin,
  policeStatus,
  policeQuery,
  visitBrowserUrl,
  captureConsoleEntries,
  dumpEvidenceStore,
  evidenceEntriesIn,
} = require("../../support/game-helpers");

async function closeNetscapeAndComputer(page) {
  await page.getByRole("button", { name: "Close Netscape Navigator 3.0 window" }).click();
  await page.getByRole("button", { name: "Close computer window" }).click();
}

test("minemap photo evidence milestone triggers Whitmore credentials fax", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);

  await visitBrowserUrl(page, "http://honeydewcavingclub.com");

  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);
  await closeNetscapeAndComputer(page);

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();
  await expect(facsimile.getByRole("heading", { name: "MESSAGE FROM BRIAN WHITMORE" })).toBeVisible();
  await expect(facsimile.getByText("WHITMORE & SONS IRON MACHINERY CO.")).toBeVisible();
  await expect(facsimile.getByText("I knew you were investigating the Arnie Spencer tragedy")).toBeVisible();
  await expect(facsimile.getByText("b.whitmore")).toBeVisible();
  await expect(facsimile.getByText("ironVeins15")).toBeVisible();
  await expect(facsimile.getByText("http://www.whitmore-sons-iron-machinery-co.com/mining")).toBeVisible();

  await closeFacsimile(page);
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const whitmoreFax = evidenceEntriesIn(rawStore, "reports")
    .find((entry) => entry.name === "facsimile-whitmore-police-credentials");
  expect(whitmoreFax).toBeTruthy();
  expect(whitmoreFax.source.kind).toBe("report-localized-catalog-entry");
  expect(whitmoreFax.source.entryId).toBe("fax-whitmore-police-credentials");
});

test("opening Arthur Whitmore's police record triggers a Level 3 credentials fax", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  // Arthur Whitmore's record requires Level 2, granted by the first
  // Whitmore fax's credentials.
  await policeLogin(page, "b.whitmore", "ironVeins15");
  await expect(policeStatus(page)).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");

  const query = policeQuery(page);
  await query.fill("arthur whitmore");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);

  // Merely returning the record must not fire the fax yet.
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  // Opening it (clicking through to the detail view) does.
  await page.locator(".browser-results-police tbody .browser-results-row").click();
  await expect(page.locator(".browser-record-layout-police .browser-record-title"))
    .toHaveText("The Iron magnate who chose Policing first!");
  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);

  await closeNetscapeAndComputer(page);

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();
  await expect(facsimile.getByRole("heading", { name: "MESSAGE FROM BRIAN WHITMORE" })).toBeVisible();
  await expect(facsimile.getByText("I probably shouldn't be doing this again")).toBeVisible();
  await expect(facsimile.getByText("t.fairchild")).toBeVisible();
  await expect(facsimile.getByText("mapleLaw91")).toBeVisible();

  await closeFacsimile(page);
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const level3Fax = evidenceEntriesIn(rawStore, "reports")
    .find((entry) => entry.name === "facsimile-whitmore-level3-credentials");
  expect(level3Fax).toBeTruthy();
  expect(level3Fax.source.kind).toBe("report-localized-catalog-entry");
  expect(level3Fax.source.entryId).toBe("fax-whitmore-level3-credentials");

  await page.locator(".debug-window .story-window-close").click();

  // The delivered credentials must actually work.
  await openNetscape(page);
  await openPolice(page);
  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");
});
