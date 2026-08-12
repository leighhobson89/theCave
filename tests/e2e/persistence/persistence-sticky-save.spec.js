// The sticky save: an autosaved copy of the game held in localStorage so a
// browser refresh can offer "Resume Game". Covers the seed write, the 60s
// autosave timer, timer de-duplication, and defensive handling of a corrupt or
// foreign localStorage state.
const { test, expect } = require("@playwright/test");
const {
  STICKY_SAVE_KEY,
  clickNewGame,
  startNewGame,
  installStickyWriteCounter,
  readStickyWriteCount,
  readStickySave,
} = require("../support/game-helpers");

test("starting a game seeds a sticky save under a namespaced localStorage key", async ({ page }) => {
  await page.goto("/");
  expect(await readStickySave(page)).toBeNull();

  await clickNewGame(page);
  const stored = await readStickySave(page);
  expect(stored).toBeTruthy();

  // It is the same LZString format the copy/paste save uses.
  const parsed = await page.evaluate(
    (s) => JSON.parse(LZString.decompressFromEncodedURIComponent(s)),
    stored
  );
  expect(parsed).toHaveProperty("evidenceStore");
  expect(parsed).toHaveProperty("quickLoginState");
});

test("autosave rewrites the sticky save every 60 seconds with exactly one timer", async ({ page }) => {
  await installStickyWriteCounter(page);

  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  // The immediate seed on New Game.
  expect(await readStickyWriteCount(page)).toBe(1);

  await page.clock.runFor(60_000);
  expect(await readStickyWriteCount(page)).toBe(2);

  await page.clock.runFor(60_000);
  expect(await readStickyWriteCount(page)).toBe(3);

  // Exactly one write per interval proves a second timer was not stacked on
  // top of the first.
  await page.clock.runFor(180_000);
  expect(await readStickyWriteCount(page)).toBe(6);
});

test("restarting a game does not stack duplicate autosave timers", async ({ page }) => {
  await installStickyWriteCounter(page);

  await page.clock.install();
  await page.goto("/");

  // Three New Games in a row would stack three intervals without the guard.
  await clickNewGame(page);
  await page.keyboard.press("Escape");
  await clickNewGame(page);
  await page.keyboard.press("Escape");
  await clickNewGame(page);

  const seededWrites = await readStickyWriteCount(page);
  await page.clock.runFor(60_000);
  const afterOneMinute = await readStickyWriteCount(page);

  expect(afterOneMinute - seededWrites).toBe(1);
});

test("a malformed sticky save is discarded instead of breaking the menu", async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "this-is-not-a-valid-lzstring-save");
  }, STICKY_SAVE_KEY);

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto("/");

  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#resumeFromMenu")).toHaveClass(/disabled/);
  expect(pageErrors).toEqual([]);

  // The unusable entry is cleared rather than left to fail again next load.
  expect(await readStickySave(page)).toBeNull();

  // A fresh game still starts normally, with no confirmation prompt.
  await page.locator("#newGame").click();
  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#gameArea")).toBeVisible();
});

test("sticky save does not disturb unrelated localStorage entries", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("unrelated:key", "keep-me");
  });

  await startNewGame(page);
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  expect(await page.evaluate(() => window.localStorage.getItem("unrelated:key"))).toBe("keep-me");
});
