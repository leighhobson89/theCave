// The persistent progressEvidence collection: what a new game starts with, what
// activateProgressEvidence() does to it, and that it survives both routes out of
// and back into the game (the copy/paste save string and a browser refresh).
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
  readProgressEvidence,
  readProgressEvidenceEntry,
  startNewGame,
} = require("../../support/game-helpers");

// Read from the registry the game itself loads, rather than restating its
// contents here — the same technique record-catalog.spec.js uses
// against the site JSON. `progressEvidenceDeveloperEnabled` is an authoring
// decision a developer is expected to change; asserting a hard-coded list of
// enabled ids would turn every such change into a test failure.
const progressEvidenceDefinitions = require("../../../assets/progressEvidence.json").definitions;

test("a new game starts with no progress evidence activated", async ({ page }) => {
  await startNewGame(page);

  expect(await readProgressEvidence(page)).toEqual([]);

  // Every registered item starts with progressEvidenceActivated false —
  // including the developer-enabled ones, which is exactly the "developer
  // enabled, not activated" case.
  const entries = await page.evaluate(() => window.progressEvidenceDeveloperTools.getProgressEvidenceEntries());
  expect(entries).toHaveLength(progressEvidenceDefinitions.length);
  expect(entries.every((entry) => entry.progressEvidenceActivated === false)).toBe(true);

  // The developer-enabled set is whatever the definitions file says, and at
  // least one item must be enabled or nothing could ever reach the envelope.
  const enabledInGame = entries
    .filter((entry) => entry.progressEvidenceDeveloperEnabled === true)
    .map((entry) => entry.progressEvidenceId);
  const enabledInFile = progressEvidenceDefinitions
    .filter((definition) => definition.progressEvidenceDeveloperEnabled === true)
    .map((definition) => definition.progressEvidenceId);
  expect(enabledInGame).toEqual(enabledInFile);
  expect(enabledInFile.length).toBeGreaterThan(0);
});

test("activating progress evidence adds its progressEvidenceId to the collection", async ({ page }) => {
  await startNewGame(page);

  expect(await activateProgressEvidence(page, "20001")).toBe(true);
  expect(await readProgressEvidence(page)).toEqual(["20001"]);
  expect((await readProgressEvidenceEntry(page, "20001")).progressEvidenceActivated).toBe(true);

  // Activation is player progress only: it must not flip the developer switch.
  expect((await readProgressEvidenceEntry(page, "20001")).progressEvidenceDeveloperEnabled).toBe(false);

  expect(await activateProgressEvidence(page, "30002")).toBe(true);
  expect(await readProgressEvidence(page)).toEqual(["20001", "30002"]);
});

test("activating the same progress evidence twice does not create a duplicate entry", async ({ page }) => {
  await startNewGame(page);

  expect(await activateProgressEvidence(page, "10001")).toBe(true);
  // The repeat reports false and leaves the collection alone.
  expect(await activateProgressEvidence(page, "10001")).toBe(false);
  expect(await activateProgressEvidence(page, "10001")).toBe(false);

  expect(await readProgressEvidence(page)).toEqual(["10001"]);
});

test("the save string preserves activated progress evidence and loading restores it", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await activateProgressEvidence(page, "20005");

  const saveString = await captureSaveStringViaMenu(page);

  // Diverge from the save so a successful load is unambiguous: this extra id
  // must be gone afterwards, and the two saved ones must be back.
  await activateProgressEvidence(page, "40003");
  expect(await readProgressEvidence(page)).toEqual(["00001", "20005", "40003"]);

  await loadSaveStringViaMenu(page, saveString);

  expect(await readProgressEvidence(page)).toEqual(["00001", "20005"]);
  expect((await readProgressEvidenceEntry(page, "40003")).progressEvidenceActivated).toBe(false);
});

test("loading the same save twice cannot introduce duplicate progress evidence ids", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await activateProgressEvidence(page, "00002");

  const saveString = await captureSaveStringViaMenu(page);
  await loadSaveStringViaMenu(page, saveString);
  await loadSaveStringViaMenu(page, saveString);

  expect(await readProgressEvidence(page)).toEqual(["00001", "00002"]);
});

test("progress evidence survives a complete save and page reload cycle", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00002");
  await activateProgressEvidence(page, "30004");

  // The sticky save flushes on beforeunload, so a plain refresh is the whole
  // save-and-reload cycle a player would experience.
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  expect(await readProgressEvidence(page)).toEqual(["00002", "30004"]);
  expect((await readProgressEvidenceEntry(page, "30004")).progressEvidenceActivated).toBe(true);
});
