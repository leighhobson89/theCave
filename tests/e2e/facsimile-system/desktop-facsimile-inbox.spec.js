// The desk facsimile machine as a message inbox: the idle/pending alert light,
// queueing multiple reports, stepping through them with the "next message"
// button, and the open-then-close flow that commits a read fax to evidence
// exactly once.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openFacsimile,
  facsimileWindow,
  closeFacsimile,
  captureConsoleEntries,
  dumpEvidenceStore,
  evidenceEntriesIn,
} = require("../../support/game-helpers");

function readAlertLightAnimation(page) {
  return page.locator("#desktopFacsimile .facsimile-alert-light").evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return { animationName: computed.animationName };
  });
}

test("facsimile desktop object receives report and awards evidence once", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();
  await expect(facsimile.getByText("NO NEW MESSAGES")).toBeVisible();
  await closeFacsimile(page);
  await expect(facsimile).toBeHidden();

  const idleSignal = await readAlertLightAnimation(page);
  expect(idleSignal.animationName === "none" || idleSignal.animationName === "").toBe(true);

  const queued = await page.evaluate(() => window.receiveFacsimileReport({
    id: "fax-night-shift-001",
    title: "CAVERN DISPATCH // NIGHT SHIFT",
    reportText: "Timestamp 02:17\nGenerator room access attempted by unknown party.",
    description: "Fax received from security relay.",
    evidenceName: "facsimile-night-shift-001",
  }));
  expect(queued).toBe(true);

  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);
  const pendingSignal = await readAlertLightAnimation(page);
  expect(pendingSignal.animationName).toContain("facsimileSignalBlink");

  await openFacsimile(page);
  await expect(facsimile).toBeVisible();
  await expect(facsimile.getByText("CAVERN DISPATCH // NIGHT SHIFT")).toBeVisible();
  await expect(facsimile.getByText("Generator room access attempted by unknown party.")).toBeVisible();
  await closeFacsimile(page);

  await expect.poll(async () => page.locator(".notification-host .game-notification-reward").count()).toBe(1);
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);
  const consumedSignal = await readAlertLightAnimation(page);
  expect(consumedSignal.animationName === "none" || consumedSignal.animationName === "").toBe(true);

  // Re-opening an emptied inbox must not award the same fax a second time.
  await openFacsimile(page);
  await expect(facsimile.getByText("NO NEW MESSAGES")).toBeVisible();
  await closeFacsimile(page);
  await expect.poll(async () => page.locator(".notification-host .game-notification-reward").count()).toBe(1);

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const faxReports = evidenceEntriesIn(rawStore, "reports")
    .filter((entry) => entry.name === "facsimile-night-shift-001");
  expect(faxReports).toHaveLength(1);
  expect(faxReports[0].reportText).toContain("Generator room access attempted by unknown party.");
});

test("facsimile queues and transfers five unique reports", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);

  const faxPayloads = Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return {
      id: `fax-batch-${number}`,
      title: `BATCH FAX ${number}`,
      reportText: `Batch transmission ${number}\nTunnel marker ${number} logged.`,
      description: `Fax batch description ${number}`,
      evidenceName: `facsimile-batch-${number}`,
    };
  });

  const queueResults = await page.evaluate(
    (payloads) => payloads.map((payload) => window.receiveFacsimileReport(payload)),
    faxPayloads
  );
  expect(queueResults).toEqual([true, true, true, true, true]);

  await expect(page.locator("#desktopFacsimile")).toHaveClass(/has-pending-message/);

  for (const payload of faxPayloads) {
    await openFacsimile(page);
    const facsimile = facsimileWindow(page);
    await expect(facsimile).toBeVisible();
    await expect(facsimile.getByText(payload.title)).toBeVisible();
    await expect(facsimile.getByText(`Tunnel marker ${payload.id.split("-").at(-1)} logged.`)).toBeVisible();
    await closeFacsimile(page);
  }

  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const faxReports = evidenceEntriesIn(rawStore, "reports")
    .filter((entry) => String(entry?.name || "").startsWith("facsimile-batch-"));
  expect(faxReports).toHaveLength(5);

  faxPayloads.forEach((payload) => {
    const match = faxReports.find((entry) => entry.name === payload.evidenceName);
    expect(match).toBeTruthy();
    expect(match.reportText).toContain(payload.reportText.split("\n")[1]);
  });
});

test("facsimile next cached message button advances queue and transfers evidence", async ({ page }) => {
  const consoleEntries = captureConsoleEntries(page);
  await startNewGame(page);

  const faxPayloads = [
    {
      id: "fax-next-1",
      title: "NEXT BUTTON REPORT 1",
      reportText: "Line A1\nLine B1",
      description: "Next button flow one",
      evidenceName: "facsimile-next-1",
    },
    {
      id: "fax-next-2",
      title: "NEXT BUTTON REPORT 2",
      reportText: "Line A2\nLine B2",
      description: "Next button flow two",
      evidenceName: "facsimile-next-2",
    },
  ];

  const queueResults = await page.evaluate(
    (payloads) => payloads.map((payload) => window.receiveFacsimileReport(payload)),
    faxPayloads
  );
  expect(queueResults).toEqual([true, true]);

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();
  await expect(facsimile.getByText("NEXT BUTTON REPORT 1")).toBeVisible();

  const nextButton = facsimile.locator(".facsimile-next-message-button");
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(facsimile.getByText("NEXT BUTTON REPORT 2")).toBeVisible();
  await expect(nextButton).toBeDisabled();

  await closeFacsimile(page);
  await expect(page.locator("#desktopFacsimile")).not.toHaveClass(/has-pending-message/);

  const rawStore = await dumpEvidenceStore(page, consoleEntries);
  const transferred = evidenceEntriesIn(rawStore, "reports")
    .filter((entry) => String(entry?.name || "").startsWith("facsimile-next-"));
  expect(transferred).toHaveLength(2);
});
