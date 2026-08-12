// The floating settings panel: expand/collapse, mute toggle, music
// play/pause/next-track transport, and the two volume sliders. Drives the
// real controls and cross-checks against the live `audioManager` singleton
// (imported the same way persistence-save-load-round-trip.spec.js reaches
// into constantsAndGlobalVars.js) rather than just trusting DOM text.
const { test, expect } = require("@playwright/test");
const { startNewGame } = require("../../support/game-helpers");

function settingsToggle(page) {
  return page.locator("#settingsToggle");
}

function settingsItems(page) {
  return page.locator("#settingsItems");
}

// Reads the state the UI is supposed to be reflecting, straight from the
// module the real controls drive -- so a bug that updates the label but not
// the underlying manager (or vice versa) cannot pass.
function readAudioManagerState(page) {
  return page.evaluate(async () => {
    const { audioManager } = await import("/audioManager.js");
    return {
      muted: audioManager.getMuted(),
      musicVolume: audioManager.musicVolume,
      sfxVolume: audioManager.sfxVolume,
      isPlaying: audioManager.isMusicPlaying(),
      trackIndex: audioManager.currentTrackIndex,
      currentMusicVolumeAttr: audioManager.currentMusic ? audioManager.currentMusic.volume : null,
    };
  });
}

test("the settings panel is collapsed by default and expands/collapses on click", async ({ page }) => {
  await startNewGame(page);

  const toggle = settingsToggle(page);
  const items = settingsItems(page);

  await expect(items).toHaveClass(/d-none/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(items).not.toHaveClass(/d-none/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#muteToggleButton")).toBeVisible();

  await toggle.click();
  await expect(items).toHaveClass(/d-none/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("mute toggle flips both the button label and audioManager state, and silences music volume", async ({ page }) => {
  await startNewGame(page);
  await settingsToggle(page).click();

  const muteButton = page.locator("#muteToggleButton");
  await expect(muteButton).toHaveText("Mute: Off");
  expect((await readAudioManagerState(page)).muted).toBe(false);

  await muteButton.click();
  await expect(muteButton).toHaveText("Mute: On");
  let state = await readAudioManagerState(page);
  expect(state.muted).toBe(true);
  // Muting silences the currently playing track rather than stopping it.
  expect(state.isPlaying).toBe(true);
  expect(state.currentMusicVolumeAttr).toBe(0);

  await muteButton.click();
  await expect(muteButton).toHaveText("Mute: Off");
  state = await readAudioManagerState(page);
  expect(state.muted).toBe(false);
  expect(state.currentMusicVolumeAttr).toBeCloseTo(state.musicVolume, 5);
});

test("music volume slider updates the readout and audioManager.musicVolume", async ({ page }) => {
  await startNewGame(page);
  await settingsToggle(page).click();

  const slider = page.locator("#musicVolumeSlider");
  const readout = page.locator("#musicVolumeValue");

  await expect(slider).toHaveValue("10");
  await expect(readout).toHaveText("10%");
  expect((await readAudioManagerState(page)).musicVolume).toBeCloseTo(0.1, 5);

  await slider.fill("65");
  await expect(readout).toHaveText("65%");
  expect((await readAudioManagerState(page)).musicVolume).toBeCloseTo(0.65, 5);
});

test("SFX volume slider updates the readout and audioManager.sfxVolume, independently of music volume", async ({ page }) => {
  await startNewGame(page);
  await settingsToggle(page).click();

  const slider = page.locator("#sfxVolumeSlider");
  const readout = page.locator("#sfxVolumeValue");

  await expect(slider).toHaveValue("85");
  await expect(readout).toHaveText("85%");
  expect((await readAudioManagerState(page)).sfxVolume).toBeCloseTo(0.85, 5);

  await slider.fill("20");
  await expect(readout).toHaveText("20%");

  const state = await readAudioManagerState(page);
  expect(state.sfxVolume).toBeCloseTo(0.2, 5);
  // Untouched by the SFX slider.
  expect(state.musicVolume).toBeCloseTo(0.1, 5);
});

test("music play/pause button toggles playback and swaps its glyph, aria-label and title", async ({ page }) => {
  await startNewGame(page);
  await settingsToggle(page).click();

  const playPause = page.locator("#musicPlayPauseButton");

  // A new game starts music playing immediately (the New Game click is a
  // real user gesture), so the panel opens showing the pause affordance.
  await expect(playPause).toHaveText("⏸");
  await expect(playPause).toHaveAttribute("aria-label", "Pause music");
  await expect(playPause).toHaveAttribute("title", "Pause");
  expect((await readAudioManagerState(page)).isPlaying).toBe(true);

  await playPause.click();
  await expect(playPause).toHaveText("▶");
  await expect(playPause).toHaveAttribute("aria-label", "Play music");
  await expect(playPause).toHaveAttribute("title", "Play");
  expect((await readAudioManagerState(page)).isPlaying).toBe(false);

  await playPause.click();
  await expect(playPause).toHaveText("⏸");
  await expect(playPause).toHaveAttribute("aria-label", "Pause music");
  expect((await readAudioManagerState(page)).isPlaying).toBe(true);
});

test("next track button advances to a different track without interrupting playback", async ({ page }) => {
  await startNewGame(page);
  await settingsToggle(page).click();

  const before = await readAudioManagerState(page);
  expect(before.isPlaying).toBe(true);
  expect(before.trackIndex).toBeGreaterThanOrEqual(0);

  await page.locator("#musicNextButton").click();

  const after = await readAudioManagerState(page);
  expect(after.isPlaying).toBe(true);
  expect(after.trackIndex).toBeGreaterThanOrEqual(0);
  expect(after.trackIndex).not.toBe(before.trackIndex);

  // Still showing the pause affordance -- skipping a track is not the same
  // as pausing.
  await expect(page.locator("#musicPlayPauseButton")).toHaveText("⏸");
});

test("pausing manually is sticky: neither muting nor unmuting resumes playback on its own", async ({ page }) => {
  await startNewGame(page);
  await settingsToggle(page).click();

  await page.locator("#musicPlayPauseButton").click();
  expect((await readAudioManagerState(page)).isPlaying).toBe(false);

  await page.locator("#muteToggleButton").click();
  expect((await readAudioManagerState(page)).isPlaying).toBe(false);

  await page.locator("#muteToggleButton").click();
  expect((await readAudioManagerState(page)).isPlaying).toBe(false);
  await expect(page.locator("#musicPlayPauseButton")).toHaveText("▶");
});

test("the settings cog and mute label re-localize with the rest of the chrome", async ({ page }) => {
  await page.goto("/");
  await page.locator("#btnSpanish").click();
  await page.locator("#newGame").click();
  const confirmPopup = page.locator("#newGameConfirmPopup");
  if (!(await confirmPopup.evaluate((el) => el.classList.contains("d-none")))) {
    await page.locator("#newGameConfirmAcceptButton").click();
  }

  await expect(settingsToggle(page)).toHaveAttribute("aria-label", "Configuración de Música");
  await expect(settingsToggle(page)).toHaveAttribute("title", "Configuración de Música");

  await settingsToggle(page).click();
  await expect(page.locator("#muteToggleButton")).toHaveText("Silencio: Inactivo");
  await expect(page.locator("#musicVolumeLabel")).toHaveText("Volumen de Música");
  await expect(page.locator("#sfxVolumeLabel")).toHaveText("Volumen de Efectos");
});
