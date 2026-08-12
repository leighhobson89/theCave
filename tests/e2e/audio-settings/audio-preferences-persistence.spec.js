// The three audio preferences that ride along in every save payload:
// audioMuted, musicVolumePreference and sfxVolumePreference. Covers a new
// game's defaults, a full copy/paste save-string round trip, and resuming
// from the sticky save after a real browser refresh -- the same three
// mechanisms tests/e2e/persistence already covers for evidence and notes,
// applied here to audioManager.syncFromSavedPreferences().
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

function readAudioManagerState(page) {
  return page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    return {
      muted: audioManager.getMuted(),
      musicVolume: audioManager.musicVolume,
      sfxVolume: audioManager.sfxVolume,
    };
  });
}

// Volumes round-trip through a 0-100 slider and a 0-1 preference, so compare
// with a tolerance rather than risking float-literal drift.
function expectAudioState(actual, expected) {
  expect(actual.muted).toBe(expected.muted);
  expect(actual.musicVolume).toBeCloseTo(expected.musicVolume, 5);
  expect(actual.sfxVolume).toBeCloseTo(expected.sfxVolume, 5);
}

test("a new game starts with the documented default audio preferences", async ({ page }) => {
  await startNewGame(page);

  const state = await readAudioManagerState(page);
  expect(state.muted).toBe(false);
  expect(state.musicVolume).toBeCloseTo(0.1, 5);
  expect(state.sfxVolume).toBeCloseTo(0.85, 5);

  await page.locator("#settingsToggle").click();
  await expect(page.locator("#muteToggleButton")).toHaveText("Mute: Off");
  await expect(page.locator("#musicVolumeSlider")).toHaveValue("10");
  await expect(page.locator("#sfxVolumeSlider")).toHaveValue("85");
});

test("mute and both volumes survive a copy/paste save-string round trip", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#settingsToggle").click();

  await page.locator("#muteToggleButton").click();
  await page.locator("#musicVolumeSlider").fill("77");
  await page.locator("#sfxVolumeSlider").fill("33");

  expectAudioState(await readAudioManagerState(page), { muted: true, musicVolume: 0.77, sfxVolume: 0.33 });

  const saveString = await captureSaveStringViaMenu(page);
  // captureSaveStringViaMenu leaves the game parked at the main menu; back to
  // gameplay to reach the settings panel again.
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  // Change every preference again before loading, to distinct values, so a
  // pass here proves the load actually restored the saved values rather than
  // just leaving the current in-memory state untouched. (New Game is not a
  // reset point for these: audio preferences are a user setting that carries
  // across games, so they cannot be used to prove restoration.)
  await page.locator("#muteToggleButton").click();
  await page.locator("#musicVolumeSlider").fill("15");
  await page.locator("#sfxVolumeSlider").fill("60");
  expectAudioState(await readAudioManagerState(page), { muted: false, musicVolume: 0.15, sfxVolume: 0.6 });

  await loadSaveStringViaMenu(page, saveString);
  await expect(page.locator("#gameArea")).toBeVisible();

  expectAudioState(await readAudioManagerState(page), { muted: true, musicVolume: 0.77, sfxVolume: 0.33 });

  // The controls themselves were re-rendered from the restored state, not
  // just the underlying manager. These assertions read text/value directly
  // and do not require the settings panel to be expanded.
  await expect(page.locator("#muteToggleButton")).toHaveText("Mute: On");
  await expect(page.locator("#musicVolumeSlider")).toHaveValue("77");
  await expect(page.locator("#musicVolumeValue")).toHaveText("77%");
  await expect(page.locator("#sfxVolumeSlider")).toHaveValue("33");
  await expect(page.locator("#sfxVolumeValue")).toHaveText("33%");
});

test("mute and both volumes survive a real browser refresh via the sticky save", async ({ page }) => {
  await startNewGame(page);
  await page.locator("#settingsToggle").click();

  await page.locator("#muteToggleButton").click();
  await page.locator("#musicVolumeSlider").fill("42");
  await page.locator("#sfxVolumeSlider").fill("5");

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  expectAudioState(await readAudioManagerState(page), { muted: true, musicVolume: 0.42, sfxVolume: 0.05 });

  await page.locator("#settingsToggle").click();
  await expect(page.locator("#muteToggleButton")).toHaveText("Mute: On");
  await expect(page.locator("#musicVolumeSlider")).toHaveValue("42");
  await expect(page.locator("#sfxVolumeSlider")).toHaveValue("5");
});
