// Walks every authored record across the four searchable sites (ZoomSearch,
// Library, Police, Archives -- 23 records between them, plus the 2 standalone
// pages covered by their own specs) so none of them silently rot. Record data
// is read straight from the same JSON the app fetches, the same technique the
// localization suite uses against localization.json, so a content edit cannot
// desync a test from the source it's checking. Real metadata fields, section
// headings and image galleries are asserted along the way from real content;
// the fields no authored record currently populates (Case Number, Officer,
// Classification, Declassification, Publisher, Edition) are proven separately
// against synthetic data in browser-detail-synthetic-fields.spec.js.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  openZoomSearch,
  openLibrary,
  openPolice,
  openArchives,
  policeLogin,
  policeQuery,
  policeStatus,
  archivesLogin,
  archivesStatus,
} = require("../../support/game-helpers");

const zoomsearchData = require("../../../assets/en/zoomsearch.json");
const libraryData = require("../../../assets/en/library.json");
const policeData = require("../../../assets/en/police.json");
const archivesData = require("../../../assets/en/archives.json");

function metadataItem(scope, label) {
  return scope.locator(".browser-detail-meta-item").filter({
    has: scope.page().locator(".browser-detail-meta-label", { hasText: new RegExp(`^${label}$`) }),
  });
}

async function expectMetadataValue(scope, label, value) {
  await expect(metadataItem(scope, label).locator(".browser-detail-meta-value")).toHaveText(value);
}

async function expectNoMetadataItem(scope, label) {
  await expect(metadataItem(scope, label)).toHaveCount(0);
}

test.describe("ZoomSearch", () => {
  test("every ZoomSearch record opens, renders its content unheaded, and shows its gallery", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openZoomSearch(page);

    const query = page.locator("input[aria-label='ZoomSearch query']");
    const detail = page.locator(".browser-record-layout-zoom");

    for (const record of zoomsearchData.records) {
      await query.fill(record.keywords[0]);
      await query.press("Enter");
      await page.locator(".browser-results-zoom tbody .browser-results-row").click();

      await expect(detail.locator(".browser-record-title")).toHaveText(record.pageTitle);

      // "Page Content" is a suppressed heading -- the paragraphs render but the
      // h3 itself never does, for every record, not just one.
      await expect(detail.locator(".browser-detail-section-title", { hasText: "Page Content" })).toHaveCount(0);
      const firstParagraph = Array.isArray(record.pageContent) ? record.pageContent[0] : record.pageContent;
      await expect(detail.locator(".browser-record-main")).toContainText(firstParagraph.slice(0, 40));

      if (record.images.length) {
        await expect(detail.locator(".browser-image-gallery-zoom .browser-image-figure")).toHaveCount(record.images.length);
      } else {
        await expect(detail.locator(".browser-image-gallery-zoom")).toHaveCount(0);
      }
    }
  });
});

test.describe("Library", () => {
  test("every Library record opens by exact author + title and renders its metadata and extract", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openLibrary(page);

    const authorInput = page.locator("input[aria-label='Library author']");
    const titleInput = page.locator("input[aria-label='Library title']");
    const detail = page.locator(".browser-record-layout-library");

    for (const record of libraryData.records) {
      await authorInput.fill(record.author);
      await titleInput.fill(record.title);
      await page.getByRole("button", { name: "Search Catalog" }).click();
      await page.locator(".browser-results-library tbody .browser-results-row").click();

      await expect(detail.locator(".browser-record-title")).toHaveText(record.title);
      await expectMetadataValue(detail, "Author", record.author);
      await expectMetadataValue(detail, "Summary", record.summary);
      if (record.publicationYear) {
        await expectMetadataValue(detail, "Publication Year", String(record.publicationYear));
      } else {
        await expectNoMetadataItem(detail, "Publication Year");
      }
      // Publisher and Province are never authored on any Library record --
      // see browser-detail-synthetic-fields.spec.js for proof the field
      // itself renders correctly once populated.
      await expectNoMetadataItem(detail, "Publisher");
      await expectNoMetadataItem(detail, "Province");

      await expect(detail.locator(".browser-detail-section-title", { hasText: "Extract" })).toBeVisible();

      if (record.images.length) {
        await expect(detail.locator(".browser-image-gallery-library .browser-image-figure")).toHaveCount(record.images.length);
      }
    }
  });

  test("Library shows its own empty message when author and title don't both match the same entry", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openLibrary(page);

    const authorInput = page.locator("input[aria-label='Library author']");
    const titleInput = page.locator("input[aria-label='Library title']");
    const status = page.locator(".browser-page-library .browser-status-line").first();

    // Right author, wrong title -- a real mismatch, not just an empty query.
    await authorInput.fill("Hannah Fletcher");
    await titleInput.fill("Not A Real Title");
    await page.getByRole("button", { name: "Search Catalog" }).click();

    await expect(status).toHaveText("Nothing found.");
    const emptyCell = page.locator(".browser-results-library tbody .browser-results-empty");
    await expect(emptyCell).toBeVisible();
    await expect(emptyCell).toHaveText("Nothing found.");
  });
});

test.describe("Police Records", () => {
  test("every Police record opens once logged in high enough, and renders its report content", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openPolice(page);

    // Administrator (Level 5) clears every requiredPrivilegeLevel authored
    // (the highest is 3, on goldenpendant) so this test is purely about
    // record content, not privilege gating -- that's already covered by
    // web-content-authentication/ and the goldenpendant case specifically by
    // evidence-system/evidence-awards-full-catalog.spec.js.
    await policeLogin(page, "administrator", "atlas");
    await expect(policeStatus(page)).toHaveText("Logged in as: Administrator (Level 5)");

    const query = policeQuery(page);
    const detail = page.locator(".browser-record-layout-police");

    for (const record of policeData.records) {
      await query.fill(record.keywords[0]);
      await query.press("Enter");
      await page.locator(".browser-results-police tbody .browser-results-row").click();

      await expect(detail.locator(".browser-record-title")).toHaveText(record.title);
      await expectMetadataValue(detail, "Summary", record.summary);
      // None of the real police records carry caseNumber, province, officer,
      // classification, declassificationStatus or date -- see
      // browser-detail-synthetic-fields.spec.js for proof those labels
      // render correctly once a record actually supplies them.
      await expectNoMetadataItem(detail, "Case Number");
      await expectNoMetadataItem(detail, "Province");
      await expectNoMetadataItem(detail, "Officer");
      await expectNoMetadataItem(detail, "Classification");
      await expectNoMetadataItem(detail, "Declassification");
      await expectNoMetadataItem(detail, "Date");

      await expect(detail.locator(".browser-detail-section-title", { hasText: "Report" })).toBeVisible();

      if (record.images.length) {
        await expect(detail.locator(".browser-image-gallery-police .browser-image-figure")).toHaveCount(record.images.length);
      }
    }
  });

  test("Police shows its own empty message for a keyword that matches nothing", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openPolice(page);

    const status = policeStatus(page);
    const query = policeQuery(page);
    await query.fill("no such keyword anywhere");
    await query.press("Enter");

    await expect(status).toHaveText("Nothing found.");
    const emptyCell = page.locator(".browser-results-police tbody .browser-results-empty");
    await expect(emptyCell).toBeVisible();
    await expect(emptyCell).toHaveText("Nothing found.");
  });
});

test.describe("Canada Newspaper Archive", () => {
  test("every Archives record opens for its own province once subscribed, and renders its article", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openArchives(page);

    // Subscriber (Level 1) clears every requiredAccessLevel authored (the
    // highest is 1). Privilege gating itself is covered elsewhere, same
    // reasoning as the Police loop above.
    await archivesLogin(page, "t.mcleod", "apple1");
    await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");

    const query = page.locator("input[aria-label='Archive keyword search']");
    const provinceSelect = page.locator("select[aria-label='Province selector']");
    const detail = page.locator(".browser-record-layout-archives");

    for (const record of archivesData.records) {
      await provinceSelect.selectOption(record.province);
      await query.fill(record.keywords[0]);
      await query.press("Enter");
      await page.locator(".browser-results-archives tbody .browser-results-row").click();

      await expect(detail.locator(".browser-record-title-headline")).toHaveText(record.headline);
      await expectMetadataValue(detail, "Publication", record.publication);
      await expectMetadataValue(detail, "Province", record.province);
      // Not every Archives record carries a date (henrywhitmore doesn't).
      if (record.date) {
        await expectMetadataValue(detail, "Date", record.date);
      } else {
        await expectNoMetadataItem(detail, "Date");
      }
      await expectMetadataValue(detail, "Summary", record.summary);
      // No Archives record carries an edition -- see
      // browser-detail-synthetic-fields.spec.js.
      await expectNoMetadataItem(detail, "Edition");

      await expect(detail.locator(".browser-detail-section-title", { hasText: "Article" })).toBeVisible();

      if (record.images.length) {
        await expect(detail.locator(".browser-image-gallery-archives .browser-image-figure")).toHaveCount(record.images.length);
      }
    }
  });

  test("Archives shows its own empty message when the province and keyword don't both match the same entry", async ({ page }) => {
    await startNewGame(page);
    await openNetscape(page);
    await openArchives(page);

    const status = page.locator(".browser-page-archives .browser-status-line").first();
    const query = page.locator("input[aria-label='Archive keyword search']");

    // Right keyword, but no province selected yet matches nothing either --
    // exercised in browser-site-search.spec.js. This covers the distinct
    // case of a real, deliberate mismatch: right query, wrong province.
    await page.locator("select[aria-label='Province selector']").selectOption("Ontario");
    await query.fill("hannah fletcher");
    await query.press("Enter");

    await expect(status).toHaveText("Nothing found.");
    const emptyCell = page.locator(".browser-results-archives tbody .browser-results-empty");
    await expect(emptyCell).toBeVisible();
    await expect(emptyCell).toHaveText("Nothing found.");
  });
});
