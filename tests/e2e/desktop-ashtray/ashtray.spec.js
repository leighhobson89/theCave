// The desk ashtray: one click stubs out the lit cigarette, the next relights
// it. See the "Stubbing-out and relighting" comment block in styles.css and
// the desktopAshtrayHotspot handler in ui.js.
//
// Every click here is a real click on the real hotspot button — never a
// synthetic class toggle — because the thing worth proving is that clicking
// the ashtray actually reaches the handler, not just that the CSS looks right
// once a class is present.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

function ashtray(page) {
  return page.locator("#desktopAshtray");
}

function hotspot(page) {
  return page.locator("#desktopAshtrayHotspot");
}

// Matches --ashtray-stub-duration / --ashtray-relight-duration in styles.css
// and ASHTRAY_STUB_ANIMATION_MS / ASHTRAY_RELIGHT_ANIMATION_MS in ui.js.
const STUB_ANIMATION_MS = 720;
const RELIGHT_ANIMATION_MS = 760;

test("a new game starts with the cigarette lit", async ({ page }) => {
  await startNewGame(page);
  await expect(ashtray(page)).toHaveClass(/has-lit-cig/);
  await expect(ashtray(page)).not.toHaveClass(/has-extra-butt/);
});

test("clicking stubs the cigarette out: the animation class appears, then clears into has-extra-butt", async ({ page }) => {
  await startNewGame(page);

  await hotspot(page).click();
  await expect(ashtray(page)).toHaveClass(/is-extinguishing/);
  await expect(ashtray(page)).toHaveClass(/has-lit-cig/);

  // The animation class clears and the static extra butt takes over once the
  // CSS animation has actually had time to finish.
  await expect(ashtray(page)).not.toHaveClass(/is-extinguishing/, { timeout: STUB_ANIMATION_MS + 500 });
  await expect(ashtray(page)).not.toHaveClass(/has-lit-cig/);
  await expect(ashtray(page)).toHaveClass(/has-extra-butt/);
});

test("clicking again relights it: the animation class appears, then clears with the cigarette lit", async ({ page }) => {
  await startNewGame(page);
  await hotspot(page).click();
  await expect(ashtray(page)).not.toHaveClass(/is-extinguishing/, { timeout: STUB_ANIMATION_MS + 500 });

  await hotspot(page).click();
  await expect(ashtray(page)).toHaveClass(/is-relighting/);
  await expect(ashtray(page)).toHaveClass(/has-lit-cig/);

  await expect(ashtray(page)).not.toHaveClass(/is-relighting/, { timeout: RELIGHT_ANIMATION_MS + 500 });
  await expect(ashtray(page)).toHaveClass(/has-lit-cig/);
});

test("a click mid-animation is ignored: it does not restart or reverse the animation in progress", async ({ page }) => {
  await startNewGame(page);

  await hotspot(page).click();
  await expect(ashtray(page)).toHaveClass(/is-extinguishing/);

  // Fired mid-animation -- must be a no-op, not a second queued toggle.
  await hotspot(page).click({ force: true });
  await expect(ashtray(page)).toHaveClass(/is-extinguishing/);
  await expect(ashtray(page)).not.toHaveClass(/is-relighting/);

  // The original stub-out still runs to completion on its own schedule.
  await expect(ashtray(page)).not.toHaveClass(/is-extinguishing/, { timeout: STUB_ANIMATION_MS + 500 });
  await expect(ashtray(page)).toHaveClass(/has-extra-butt/);
  await expect(ashtray(page)).not.toHaveClass(/has-lit-cig/);
});

test("the extinguished state survives a save/load round trip", async ({ page }) => {
  await startNewGame(page);
  await hotspot(page).click();
  await expect(ashtray(page)).not.toHaveClass(/is-extinguishing/, { timeout: STUB_ANIMATION_MS + 500 });
  await expect(ashtray(page)).toHaveClass(/has-extra-butt/);

  const saveString = await captureSaveStringViaMenu(page);

  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();
  await expect(ashtray(page)).toHaveClass(/has-lit-cig/);

  await loadSaveStringViaMenu(page, saveString);
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(ashtray(page)).toHaveClass(/has-extra-butt/);
  await expect(ashtray(page)).not.toHaveClass(/has-lit-cig/);
  // No animation class carries over from the session that was saved.
  await expect(ashtray(page)).not.toHaveClass(/is-extinguishing|is-relighting/);
});

test("the extinguished state survives a real browser refresh via the sticky save", async ({ page }) => {
  await startNewGame(page);
  await hotspot(page).click();
  await expect(ashtray(page)).not.toHaveClass(/is-extinguishing/, { timeout: STUB_ANIMATION_MS + 500 });

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(ashtray(page)).toHaveClass(/has-extra-butt/);
  await expect(ashtray(page)).not.toHaveClass(/has-lit-cig/);
});
