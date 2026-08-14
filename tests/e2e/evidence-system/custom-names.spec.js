// The evidence title editor: committing a custom name (via Enter or the ✓
// button), the commit button's disabled state tracking whether the input
// actually differs from what's committed, an emptied input reverting rather
// than committing, custom names following their evidence across carousel
// navigation, and surviving a save/load round trip. `evidenceCustomNames` is
// its own save-persisted map (see `setEvidenceCustomNames`/
// `getEvidenceCustomName` in constantsAndGlobalVars.js), keyed by evidence id
// rather than name, so this is genuinely separate state from the evidence
// store itself.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  clickNewGame,
  openFacsimile,
  facsimileWindow,
  queueFacsimileReport,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

function photosWindow(page) {
  return page.locator(".photos-window");
}

test("renaming a photo commits on Enter, persists across carousel navigation, and survives a save/load round trip", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#photosFolder").click();

  const window = photosWindow(page);
  const titleInput = window.locator(".evidence-title-input");
  const commitButton = window.locator(".evidence-title-commit");

  await expect(titleInput).toHaveValue("Andrew and Arnie Spencer");
  await expect(commitButton).toBeDisabled();

  await titleInput.fill("The Spencer Boys");
  await expect(commitButton).toBeEnabled();
  await titleInput.press("Enter");
  await expect(commitButton).toBeDisabled();
  await expect(titleInput).toHaveValue("The Spencer Boys");

  // Moving to the other photo shows its own (still-default) title...
  await window.locator(".carousel-nav-next").click();
  await expect(titleInput).toHaveValue("Cave Entrance");
  await expect(commitButton).toBeDisabled();

  // ...and coming back shows the custom name is still attached to the right photo.
  await window.locator(".carousel-nav-prev").click();
  await expect(titleInput).toHaveValue("The Spencer Boys");

  await window.locator(".story-window-close").click();
  const saveString = await captureSaveStringViaMenu(page);

  // New Game must not leave the custom name behind.
  await clickNewGame(page);
  await page.locator("#photosFolder").click();
  await expect(photosWindow(page).locator(".evidence-title-input")).toHaveValue("Andrew and Arnie Spencer");
  await photosWindow(page).locator(".story-window-close").click();

  // Loading the earlier save restores it.
  await loadSaveStringViaMenu(page, saveString);
  await page.locator("#photosFolder").click();
  await expect(photosWindow(page).locator(".evidence-title-input")).toHaveValue("The Spencer Boys");
});

test("the commit button stays disabled for an unchanged title, and an emptied input reverts on Enter instead of committing", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#photosFolder").click();

  const window = photosWindow(page);
  const titleInput = window.locator(".evidence-title-input");
  const commitButton = window.locator(".evidence-title-commit");

  // Re-typing the same title (even with padding whitespace) is not a change.
  await titleInput.fill("  Andrew and Arnie Spencer  ");
  await expect(commitButton).toBeDisabled();

  // Clearing it and pressing Enter reverts to the committed title rather
  // than committing an empty name.
  await titleInput.fill("");
  await titleInput.press("Enter");
  await expect(titleInput).toHaveValue("Andrew and Arnie Spencer");
  await expect(commitButton).toBeDisabled();

  // A real change still commits normally afterwards.
  await titleInput.fill("Renamed After Clearing");
  await expect(commitButton).toBeEnabled();
  await titleInput.press("Enter");
  await expect(titleInput).toHaveValue("Renamed After Clearing");
});

test("renaming a report works the same way, committed by clicking the checkmark button instead of Enter", async ({ page }) => {
  await startNewGame(page);
  await queueFacsimileReport(page);
  await openFacsimile(page);
  const introFacsimile = facsimileWindow(page);
  await introFacsimile.locator(".story-window-close").click();
  await expect(introFacsimile).toBeHidden();

  await page.locator("#reportsFolder").click();
  const window = page.locator(".reports-window");
  const titleInput = window.locator(".evidence-title-input");
  const commitButton = window.locator(".evidence-title-commit");

  await expect(commitButton).toBeDisabled();
  await titleInput.fill("Case File: Missing Person");
  await expect(commitButton).toBeEnabled();
  await commitButton.click();

  await expect(commitButton).toBeDisabled();
  await expect(titleInput).toHaveValue("Case File: Missing Person");
});
