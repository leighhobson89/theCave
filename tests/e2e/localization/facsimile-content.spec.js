// The facsimile window's dynamic content -- transmission-monitor summary,
// the "next cached message" button's label/disabled state, and the empty
// inbox message -- re-localizes live on a mid-session language switch, via
// updateFacsimileWindowContent's refresh hook. Composed strings (queued
// count, cached-transmissions count) are built from the same
// localization.json keys the app itself reads.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openFacsimile, facsimileWindow } = require("../../support/game-helpers");

// The catalog behind the scripted story faxes and the two Fairchild insurance
// standalone pages -- one JSON file per language, each entry keyed by id.
// Unlike a fixture handed to receiveFacsimileReport() (see the tests below,
// where the title is the caller's own literal text and must NOT move), a
// title read from here is authored per-language content, exactly like the
// reportText and descriptionText fields beside it, and must actually differ
// language to language.
const REPORTS_CATALOG_BY_LANGUAGE = {
  en: require("../../../assets/en/reports_evidences.json"),
  es: require("../../../assets/es/reports_evidences.json"),
  de: require("../../../assets/de/reports_evidences.json"),
  it: require("../../../assets/it/reports_evidences.json"),
  fr: require("../../../assets/fr/reports_evidences.json"),
};

function catalogTitle(languageCode, entryId) {
  const entry = REPORTS_CATALOG_BY_LANGUAGE[languageCode].entries.find(({ id }) => id === entryId);
  return entry?.defaultTitleString;
}

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

// Regression coverage for a real bug: every title in reports_evidences.json
// had been shipped as a straight copy of the English file into es/de/it/fr,
// while the reportText and descriptionText beside each one had genuinely been
// translated. The mismatch was invisible to the localize()-call-site audit
// (see docs/test-coverage-analysis.md, section 3.3) because these titles are
// authored content, not a localize() key -- a check confined to keys and
// key-shaped literals cannot see a plain English string sitting inside a
// per-language content file.
//
// This does not open the facsimile UI: the two scripted intro faxes fire only
// off real timers the suite does not let run (see persistence's README), and
// the credential faxes fire only off real milestones (a specific photo, a
// specific police record) that facsimile-system/milestone-triggers.spec.js
// already exercises, in English. Reading the catalog directly is what is
// actually practical here, and it is enough to catch the failure that
// happened: a title identical to English.
test("every scripted fax's title is translated in all four non-English languages", async () => {
  const entryIds = REPORTS_CATALOG_BY_LANGUAGE.en.entries.map(({ id }) => id);
  expect(entryIds.length).toBeGreaterThan(0);

  for (const entryId of entryIds) {
    const englishTitle = catalogTitle("en", entryId);
    expect(englishTitle, `${entryId} has an English title to compare against`).toBeTruthy();

    for (const languageCode of ["es", "de", "it", "fr"]) {
      const translatedTitle = catalogTitle(languageCode, entryId);
      expect(translatedTitle, `${entryId} exists in ${languageCode}`).toBeTruthy();
      expect(translatedTitle, `${entryId}'s ${languageCode} title must not just be the English one`)
        .not.toBe(englishTitle);
    }
  }
});

// The two Whitmore faxes intentionally reuse one title in every language they
// arrive with credentials in, which the loop above would treat as passing for
// the wrong reason if the two ever quietly drifted apart. Pinned by exact
// string so a future edit to either has to touch both consciously.
test("both Whitmore credential faxes share the same title in every language", () => {
  for (const languageCode of ["en", "es", "de", "it", "fr"]) {
    expect(catalogTitle(languageCode, "fax-whitmore-police-credentials"))
      .toBe(catalogTitle(languageCode, "fax-whitmore-level3-credentials"));
  }
});
