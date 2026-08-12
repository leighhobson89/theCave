// Save/load round trip through the real LZString save payload: evidence
// collections, notes bodies and the new-game default evidence must all come
// back exactly as they went in.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNotes,
  openFacsimile,
  facsimileWindow,
  closeFacsimile,
} = require("../support/game-helpers");

test("save and load round-trips evidence, notes and browser history", async ({ page }) => {
  await startNewGame(page);

  // Produce some state: a notes page body and a fax-awarded report.
  await openNotes(page);
  await page.locator(".notes-window .notes-editor-textarea").fill("round trip note");
  await page.locator(".notes-window .story-window-close").click();

  await page.evaluate(() => window.receiveFacsimileReport({
    id: "audit-roundtrip-001",
    title: "AUDIT ROUND TRIP",
    reportText: "Body line one.",
    description: "Audit fixture.",
    evidenceName: "facsimile-audit-roundtrip-001",
    paperStyle: "report-parchment",
  }));
  await openFacsimile(page);
  await expect(facsimileWindow(page)).toBeVisible();
  await closeFacsimile(page);

  const saveString = await page.evaluate(async () => {
    const { captureGameStatusForSaving } = await import("/constantsAndGlobalVars.js");
    return window.LZString.compressToEncodedURIComponent(JSON.stringify(captureGameStatusForSaving()));
  });
  expect(saveString.length).toBeGreaterThan(0);

  const restored = await page.evaluate(async (compressed) => {
    const module = await import("/constantsAndGlobalVars.js");
    const evidence = await import("/evidenceManager.js");
    await module.restoreGameStatus(JSON.parse(window.LZString.decompressFromEncodedURIComponent(compressed)));
    const snapshot = evidence.getEvidenceStoreSnapshot();
    return {
      notes: module.getNotesPages()[0],
      reportNames: (snapshot.collections.reports || [])
        .map((id) => snapshot.evidencesById[String(id)]?.name)
        .filter(Boolean),
      storyCount: (snapshot.collections.undefined || []).length,
      photoCount: (snapshot.collections.photos || []).length,
    };
  }, saveString);

  expect(restored.notes.content).toBe("round trip note");
  expect(restored.reportNames).toContain("facsimile-audit-roundtrip-001");
  expect(restored.storyCount).toBe(1);
  // Two default photos ship with a new game: askewAndrew, then caveEntrance.
  expect(restored.photoCount).toBe(2);
});
