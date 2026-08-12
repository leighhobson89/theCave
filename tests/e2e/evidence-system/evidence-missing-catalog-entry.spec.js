// Error paths for a broken catalog lookup: `buildMissingCatalogEntryMessage`
// (the catalog has no entry at all for this evidence) and
// `buildMissingCatalogFieldMessage` (the entry exists but a specific field is
// blank). Every real authored record is well-formed, so both paths are
// exercised by deliberately injecting evidence directly into the live store
// via evidenceManager.js -- the same kind of store-level bypass
// `evidence-carousel-navigation.spec.js` uses for the empty-carousel case --
// and, for the missing-field case, by intercepting the catalog fetch to
// serve one deliberately incomplete entry alongside the real ones. A
// stale-path bug of exactly this shape was hit manually during development;
// see docs/test-coverage-analysis.md.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

async function injectPhotoEvidence(page, { name, photoPath }) {
  await page.evaluate(async ({ name, photoPath }) => {
    const { createPhotoEvidence, getEvidenceStorageKeys, getEvidenceCount, setEvidenceIndex } = await import("/evidenceManager.js");
    const keys = getEvidenceStorageKeys();
    createPhotoEvidence({ name, photoPath });
    setEvidenceIndex(keys.PHOTOS, getEvidenceCount(keys.PHOTOS) - 1);
  }, { name, photoPath });
}

async function injectReportEvidence(page, { reportName }) {
  await page.evaluate(async ({ reportName }) => {
    const { createReportEvidence, getEvidenceStorageKeys, getEvidenceCount, setEvidenceIndex } = await import("/evidenceManager.js");
    const keys = getEvidenceStorageKeys();
    createReportEvidence({ reportName });
    setEvidenceIndex(keys.REPORTS, getEvidenceCount(keys.REPORTS) - 1);
  }, { reportName });
}

test("a report with no matching catalog entry shows the missing-catalog-entry message as its content and description", async ({ page }) => {
  await startNewGame(page);
  await injectReportEvidence(page, { reportName: "nonexistent-catalog-report-id" });

  await page.locator("#reportsFolder").click();
  const window = page.locator(".reports-window");

  // The magnifier controller clones the report text node into its (hidden)
  // preview surface, so an unqualified match resolves to two elements --
  // .first() is the real, visible one.
  await expect(window.locator(".report-document-text").first()).toHaveText(
    "Report content unavailable for 'Nonexistent Catalog Report Id'. Missing catalog entry 'nonexistent-catalog-report-id' for language 'en'."
  );
  await expect(window.locator(".evidence-description-text")).toHaveText(
    "Report description unavailable for 'Nonexistent Catalog Report Id'. Missing catalog entry 'nonexistent-catalog-report-id' for language 'en'."
  );
});

test("a report whose catalog entry is missing its report text shows the missing-field message instead", async ({ page }) => {
  await page.route("**/assets/en/reports_evidences.json", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const entries = Array.isArray(payload) ? payload : payload.entries;
    entries.push({
      id: "test-blank-report-text",
      // The evidence itself carries no explicit defaultTitleString (see
      // injectReportEvidence below), so it auto-derives one from its name --
      // "Test Blank Report Text" -- which is what the error message actually
      // quotes (the message builder reads the raw evidence, not this catalog
      // entry's own defaultTitleString field).
      defaultTitleString: "Test Blank Report Text",
      paperStyle: "report-parchment",
      reportText: "",
      descriptionText: "A perfectly ordinary description.",
    });
    await route.fulfill({ response, json: payload });
  });

  await startNewGame(page);
  await injectReportEvidence(page, { reportName: "test-blank-report-text" });

  await page.locator("#reportsFolder").click();
  const window = page.locator(".reports-window");

  // The magnifier controller clones the report text node into its (hidden)
  // preview surface, so an unqualified match resolves to two elements --
  // .first() is the real, visible one.
  await expect(window.locator(".report-document-text").first()).toHaveText(
    "Report content unavailable for 'Test Blank Report Text'. Catalog entry 'test-blank-report-text' is missing 'reportText' for language 'en'."
  );
  // The description field is present in the same entry, so it renders normally.
  await expect(window.locator(".evidence-description-text")).toHaveText("A perfectly ordinary description.");
});

test("a photo with no matching catalog entry shows the missing-field message in its image slot and the missing-entry message in its description", async ({ page }) => {
  await startNewGame(page);
  await injectPhotoEvidence(page, {
    name: "nonexistent-catalog-photo-id",
    photoPath: "./assets/photos/askewAndrew.png",
  });

  await page.locator("#photosFolder").click();
  const window = page.locator(".photos-window");

  // The catalog lookup is what supplies photoPath, so a missing entry leaves
  // the image slot itself with nothing to show -- rendered as a missing
  // 'photoPath' field, the same message a present-but-incomplete entry would
  // produce, since the code that renders the image doesn't distinguish the two.
  await expect(window.locator(".photos-carousel-empty")).toBeVisible();
  await expect(window.locator(".photos-carousel-empty")).toHaveText(
    "Photo image unavailable for 'Nonexistent Catalog Photo Id'. Catalog entry 'nonexistent-catalog-photo-id' is missing 'photoPath' for language 'en'."
  );
  // The description panel asks a separate question -- "does an entry exist at
  // all?" -- and correctly reports the entry itself as missing.
  await expect(window.locator(".evidence-description-text")).toHaveText(
    "Photo description unavailable for 'Nonexistent Catalog Photo Id'. Missing catalog entry 'nonexistent-catalog-photo-id' for language 'en'."
  );
});
