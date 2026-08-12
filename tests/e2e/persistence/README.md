# Persistence — save, load, sticky save, resume

The strongest-covered area. Sticky (autosaved) game in localStorage, the 60s
autosave timer and its visual indicator, Resume-after-refresh, the New Game
overwrite confirmation, and a full save/load round trip.

| Spec | Covers |
| --- | --- |
| `autosave-indicator.spec.js` | Floppy-disk toast driven by the real 60s autosave: appearance, fade, single-instance reuse, visible from any scene |
| `menu-new-game-lifecycle.spec.js` | New Game overwrite confirmation; cancel preserves the sticky save; confirm replaces it |
| `persistence-resume-after-refresh.spec.js` | Resume Game after a refresh versus returning to an in-memory game |
| `persistence-save-load-round-trip.spec.js` | Full LZString save payload round trip: evidence, notes, new-game defaults |
| `persistence-sticky-save.spec.js` | localStorage seed write, autosave timer, timer de-duplication, corrupt-save recovery, no collateral damage to other keys |
