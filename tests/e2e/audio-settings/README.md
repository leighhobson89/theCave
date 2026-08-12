# Audio & settings

Mute toggle, music play/pause/next-track, the music and SFX volume sliders, and
the settings panel expand/collapse. Covers `audioManager.js` and the three
audio preferences persisted in the save payload (`audioMuted`,
`musicVolumePreference`, `sfxVolumePreference`).

**No specs yet** — flagged in `docs/test-coverage-analysis.md` as the largest
coverage gap (0 of 10 behaviours). Add `*.spec.js` files here; Playwright picks
up any folder under `tests/e2e/` automatically, and
`node scripts/run-tests.cjs --category audio-settings` will run whatever lands
in this folder without any further wiring.
