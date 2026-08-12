# Audio & settings

Mute toggle, music play/pause/next-track, the music and SFX volume sliders, and
the settings panel expand/collapse. Covers `audioManager.js` and the three
audio preferences persisted in the save payload (`audioMuted`,
`musicVolumePreference`, `sfxVolumePreference`).

| Spec | Covers |
| --- | --- |
| `settings-panel-controls.spec.js` | Panel expand/collapse and `aria-expanded`; mute toggle (label + `audioManager` state + silences the current track without stopping it); music/SFX volume sliders (readout + `audioManager` volume, independently of each other); play/pause and next-track transport (glyph/aria-label/title swap, `isMusicPlaying()`, track index change); manual pause staying sticky across mute/unmute; the settings cog and mute/volume labels re-localizing with the rest of the chrome |
| `audio-preferences-persistence.spec.js` | New game's default preferences (10% music, 85% SFX, unmuted); mute + both volumes surviving a copy/paste save-string round trip; the same surviving a real browser refresh via the sticky save, including the controls re-rendering from the restored state |

Both specs cross-check the real controls against the live `audioManager`
singleton (imported directly in-page, the same way
`persistence-save-load-round-trip.spec.js` reaches into
`constantsAndGlobalVars.js`) rather than trusting DOM text alone.

**Not covered:** `onUserGesture()` autoplay unlocking on the very first
pre-game interaction, SFX actually firing on desk-object clicks (`playSfx`
calls are exercised as a side effect throughout the suite but never asserted
directly), and the noticeboard button's own settings-toggle styling.
