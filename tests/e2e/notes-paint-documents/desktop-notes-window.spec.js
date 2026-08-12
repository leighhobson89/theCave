// Notes window: the ten-page paged-document model, per-page title commit and
// per-page body persistence.
const { test, expect } = require("@playwright/test");
const { startNewGame, openNotes } = require("../support/game-helpers");

test("notes window: tabs render, titles commit and content persists per page", async ({ page }) => {
  await startNewGame(page);
  await openNotes(page);

  const notesWindow = page.locator(".notes-window");
  await expect(notesWindow).toBeVisible();

  const rows = notesWindow.locator(".notes-page-tab-row");
  await expect(rows).toHaveCount(10);

  // Default titles and placeholders come from the shared page model.
  await expect(rows.nth(0).locator(".notes-page-title-input")).toHaveValue("Page 1");
  await expect(rows.nth(4).locator(".notes-page-title-input")).toHaveAttribute("placeholder", "Page 5");
  await expect(rows.nth(0)).toHaveClass(/is-active/);

  const textarea = notesWindow.locator(".notes-editor-textarea");
  await textarea.fill("first page body");

  // Switch to page 3, type, then switch back: both bodies must be retained.
  await rows.nth(2).locator(".notes-page-tab-activate").click();
  await expect(rows.nth(2)).toHaveClass(/is-active/);
  await expect(textarea).toHaveValue("");
  await textarea.fill("third page body");

  await rows.nth(0).locator(".notes-page-tab-activate").click();
  await expect(textarea).toHaveValue("first page body");
  await rows.nth(2).locator(".notes-page-tab-activate").click();
  await expect(textarea).toHaveValue("third page body");

  // Commit button stays disabled until the title actually changes.
  const titleInput = rows.nth(2).locator(".notes-page-title-input");
  const commitButton = rows.nth(2).locator(".notes-page-title-commit");
  await expect(commitButton).toBeDisabled();
  await titleInput.fill("Suspects");
  await expect(commitButton).toBeEnabled();
  await commitButton.click();
  await expect(commitButton).toBeDisabled();
  await expect(titleInput).toHaveValue("Suspects");
  // aria-label is only refreshed on the next full render, so switch pages.
  await rows.nth(0).locator(".notes-page-tab-activate").click();
  await expect(rows.nth(2).locator(".notes-page-tab-activate")).toHaveAttribute("aria-label", "Open Suspects");
  await rows.nth(2).locator(".notes-page-tab-activate").click();

  // Blank title reverts to the committed one.
  await titleInput.fill("");
  await titleInput.press("Enter");
  await expect(titleInput).toHaveValue("Suspects");
});
