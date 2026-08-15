// Scripted faxes fired by progress milestones rather than by the player
// opening the facsimile: one keyed off acquiring a specific photo evidence,
// one keyed off opening a specific police record, one keyed off opening a
// specific newspaper archive record. All three deliver something the player
// can act on, so the tests follow through and use it.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openComputer,
  openNetscape,
  openPolice,
  openArchives,
  archivesLogin,
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

// Unlike the two faxes above, this one delivers a track into ECHOTRAIL rather
// than case evidence or credentials -- see echotrailUnlock on
// ECHOTRAIL_UNKNOWN_SENDER_FAX_CONFIG. awardsEvidence is deliberately false:
// an anonymous, off-the-record transmission has no business in the Reports
// folder next to the player's actual casework.
test("opening the Anthony Worthing archive record triggers an unknown-sender fax that unlocks an ECHOTRAIL track", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  // The record requires Subscriber access.
  await archivesLogin(page, "t.mcleod", "apple1");
  await page.locator("select[aria-label='Province selector']").selectOption("Saskatchewan");

  const query = page.locator("input[aria-label='Archive keyword search']");
  await query.fill("anthony worthing");
  await query.press("Enter");
  await expect(page.locator(".browser-results-archives tbody .browser-results-row")).toHaveCount(1);

  // Merely returning the record must not fire the fax yet.
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  // Opening it (clicking through to the detail view) does.
  await page.locator(".browser-results-archives tbody .browser-results-row").click();
  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);

  await page.getByRole("button", { name: "Close Netscape Navigator 3.0 window" }).click();

  // The track is not in ECHOTRAIL yet -- the fax has arrived but not been read.
  // Netscape covers the whole computer window, so its own icon has to close
  // before the desktop underneath (and ECHOTRAIL's icon on it) is reachable.
  await page.locator(".computer-icon-echotrail").click();
  await expect(page.locator(".caveos-echotrail-row")).toHaveCount(6);
  await page.locator(".caveos-echotrail-window .story-window-close").click();
  await page.getByRole("button", { name: "Close computer window" }).click();

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();
  await expect(facsimile.getByRole("heading", { name: "UNKNOWN SENDER" })).toBeVisible();
  await expect(facsimile.getByText("UNSOLICITED TRANSMISSION")).toBeVisible();
  await expect(facsimile.getByText("I've added a track to your ECHOTRAIL library")).toBeVisible();

  // Reading and closing is what commits it -- same milestone point as the
  // other two faxes above.
  await closeFacsimile(page);
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  // Deliberately not case evidence.
  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const filedAsEvidence = evidenceEntriesIn(rawStore, "reports")
    .find((entry) => entry.name === "facsimile-echotrail-unknown-sender");
  expect(filedAsEvidence).toBeFalsy();

  await page.locator(".debug-window .story-window-close").click();

  // The track is unlocked immediately, without needing a save/reload.
  await openComputer(page);
  await page.locator(".computer-icon-echotrail").click();
  await expect(page.locator(".caveos-echotrail-row")).toHaveCount(7);

  const addedRow = page.locator('.caveos-echotrail-row[data-file-name="boyWentForSilver.mp3"]');
  await expect(addedRow).toHaveCount(1);
  // Shown under its own filename and credited to nobody -- the filename rule
  // applies here exactly as it does to any other file a trigger unlocks.
  await expect(addedRow.locator(".caveos-echotrail-row-name")).toHaveText("boyWentForSilver.mp3");
  await expect(addedRow.locator(".caveos-echotrail-cell-author")).toHaveText("Unknown");

  // And it is still never selected by the in-game rotation.
  const tracks = await page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    return [...audioManager.musicTracks];
  });
  expect(tracks.join(" ")).not.toContain("boyWentForSilver");
});
