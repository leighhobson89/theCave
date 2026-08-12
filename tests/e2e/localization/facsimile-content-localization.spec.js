// The facsimile window's dynamic content -- transmission-monitor summary,
// the "next cached message" button's label/disabled state, and the empty
// inbox message -- re-localizes live on a mid-session language switch, via
// updateFacsimileWindowContent's refresh hook. Composed strings (queued
// count, cached-transmissions count) are built from the same
// localization.json keys the app itself reads.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openFacsimile, facsimileWindow } = require("../../support/game-helpers");

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

test("facsimile window content with two pending messages re-localizes live on a language switch", async ({ page }) => {
  await startNewGame(page);

  const queueResults = await page.evaluate(() => [
    window.receiveFacsimileReport({
      id: "loc-fax-1",
      title: "LOCALIZATION FIXTURE ONE",
      reportText: "Body one.",
      description: "Localization fixture one.",
      evidenceName: "facsimile-loc-1",
    }),
    window.receiveFacsimileReport({
      id: "loc-fax-2",
      title: "LOCALIZATION FIXTURE TWO",
      reportText: "Body two.",
      description: "Localization fixture two.",
      evidenceName: "facsimile-loc-2",
    }),
  ]);
  expect(queueResults).toEqual([true, true]);

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();

  for (const { code, buttonId } of LANGUAGES) {
    const strings = localization[code];
    await page.locator(`#${buttonId}`).click();

    await expect(facsimile.locator(".facsimile-summary"), `summary in ${code}`)
      .toHaveText(`${strings.facsimileIncomingTransmissionsCachedPrefix} (2).`);
    // The title is authored fixture data, not translated -- must not move.
    await expect(facsimile.locator(".facsimile-report-title"), `report title in ${code}`)
      .toHaveText("LOCALIZATION FIXTURE ONE");
    await expect(facsimile.locator(".facsimile-next-message-button"), `next button in ${code}`)
      .toHaveText(`${strings.facsimileNextShowNextCachedMessage} (1 ${strings.facsimileQueuedCountSuffix})`);
  }
});

test("facsimile's single-pending, then empty, states localize correctly in French", async ({ page }) => {
  await startNewGame(page);
  const strings = localization.fr;

  await page.evaluate(() => window.receiveFacsimileReport({
    id: "loc-fax-single",
    title: "SINGLE FIXTURE",
    reportText: "Only body.",
    description: "Single fixture.",
    evidenceName: "facsimile-loc-single",
  }));

  await page.keyboard.press("Escape");
  await page.locator("#btnFrench").click();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  await openFacsimile(page);
  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();

  // One pending message: the next button is disabled and reads the
  // no-more-messages string, not the "show next" string.
  const nextButton = facsimile.locator(".facsimile-next-message-button");
  await expect(facsimile.locator(".facsimile-summary")).toHaveText(strings.facsimileIncomingTransmissionCached);
  await expect(nextButton).toBeDisabled();
  await expect(nextButton).toHaveText(strings.facsimileNextNoAdditionalCachedMessages);
  await expect(nextButton).toHaveAttribute("aria-label", strings.facsimileNextButtonAriaLabel);

  // Reading and closing commits the fax, leaving the inbox empty.
  await facsimile.locator(".story-window-close").click();
  await openFacsimile(page);
  await expect(facsimile.locator(".facsimile-summary")).toHaveText(strings.facsimileTransmissionMonitorOnline);
  await expect(facsimile.locator(".facsimile-report-title")).toHaveText(strings.facsimileNoNewMessages);
  await expect(nextButton).toBeDisabled();
});
