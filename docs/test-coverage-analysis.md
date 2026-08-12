# Test coverage analysis — theCave

**Date:** 2026-08-12
**Suite:** 68 Playwright tests across 19 spec files, 100% passing (45s, 4 workers)
**Method:** manual traceability audit — every app module, every UI control, and
every piece of authored content was enumerated from source and matched against
the assertions that touch it. There is no instrumented line-coverage number
(see [Instrumentation gap](#0-instrumentation-gap)); the percentages below are
**feature/behaviour coverage**, counted as "distinct user-facing behaviours with
at least one assertion" over "distinct user-facing behaviours identified".

---

## Executive summary

The suite is **strong where it exists and narrow in span**. The tested areas are
tested well — real user flows, real persistence, meaningful assertions about
state rather than just "element is visible". But roughly **half the application
surface has no automated test at all**, and the untested half is not random: it
clusters in areas that were built earlier and have not been touched recently
(audio, viewport navigation, the noticeboard scene, window chrome mechanics).

| Area | Behaviours | Covered | Coverage | Risk if broken |
| --- | ---: | ---: | ---: | --- |
| Persistence (save/load/sticky/resume) | 14 | 13 | **93%** | Critical — silent data loss |
| Quick login | 8 | 8 | **100%** | High |
| Web content: authentication & gating | 11 | 10 | **91%** | High |
| Facsimile system | 10 | 9 | **90%** | High |
| Notifications | 9 | 8 | **89%** | Medium |
| Content authoring tool (API) | 12 | 11 | **92%** | Medium |
| Notes / Paint documents | 12 | 9 | **75%** | Medium |
| Web content: search & records | 14 | 6 | **43%** | High |
| Evidence system | 16 | 6 | **38%** | High |
| Localization | 12 | 3 | **25%** | Medium |
| Desktop window chrome | 13 | 3 | **23%** | Medium |
| Viewport / scene navigation | 11 | 1 | **9%** | Medium |
| Audio & settings | 10 | 0 | **0%** | Low–Medium |
| **Overall** | **152** | **77** | **≈51%** | |

**The three gaps I would close first**, in order:

1. **Audio and settings panel — 0% covered.** Nine interactive controls
   (`muteToggleButton`, `musicPlayPauseButton`, `musicNextButton`, two volume
   sliders, `settingsToggle`) have never been clicked by a test, and mute/volume
   preferences are written into every save file. A regression here ships silently.
2. **Evidence-awarding content — 3 of 9 records covered.** Six records that
   award evidence are never opened by any test, including the only Level 3
   police record (`goldenpendant`), which is the deepest gated content in the game.
3. **Localization — 2 of 5 languages, 3 of 191 keys.** German, Italian and
   French are never exercised. The suite would not have caught the untranslated
   Computer window title or the untranslated month abbreviations found by manual
   inspection this week.

---

## 0. Instrumentation gap

There is **no code-coverage instrumentation** in this project. The numbers in
this report are a manual behavioural audit, which is honest about *features* but
cannot see dead code, unreachable branches, or error paths that no test drives.

`ui.js` is 5,520 lines — 55% of the application — and is the single largest
blind spot in that regard. Without line coverage there is no way to tell which
of its branches have never executed.

**Recommendation:** add V8 coverage collection via Playwright
(`page.coverage.startJSCoverage()`) behind a flag, or run the suite under
`c8`/`nyc`. This is a half-day of work and converts every number below from an
estimate into a measurement. **I would do this before acting on anything else in
this report**, because it will almost certainly reveal gaps this manual audit
missed.

---

## 1. Detailed findings by area

### 1.1 Audio & settings — 0% (10 behaviours, 0 covered) 🔴

Nothing in `audioManager.js` (210 lines) is tested. Not one of these is clicked
by any spec:

| Control | Element | Persisted in save? |
| --- | --- | --- |
| Mute toggle | `#muteToggleButton` | Yes (`audioMuted`) |
| Music play/pause | `#musicPlayPauseButton` | No |
| Next track | `#musicNextButton` | No |
| Music volume | `#musicVolumeSlider` | Yes (`musicVolumePreference`) |
| SFX volume | `#sfxVolumeSlider` | Yes (`sfxVolumePreference`) |
| Settings panel expand/collapse | `#settingsToggle` | No |

Untested behaviours also include: `syncFromSavedPreferences()` on load,
`onUserGesture()` autoplay unlocking, SFX firing on desk-object clicks, and the
play/pause button's aria-label and title swapping with playback state (which
*is* localized, so it is doubly unverified).

**Why this matters:** three of these write into the save payload. A bug that
fails to restore volume — or worse, restores it as `NaN` and mutes the game —
would pass the entire current suite.

**Suggested specs:** `settings-audio-controls.spec.js` (toggle each control,
assert `audioManager` state and aria-labels), plus one persistence case folded
into the existing save/load round trip.

### 1.2 Evidence system — 38% (16 behaviours, 6 covered) 🔴

Well covered: awarding via facsimile, awarding via standalone page, the
award-exactly-once guard, evidence surviving a save round trip, new-game
defaults (2 photos + 1 story), and the magnifier over both reports and photos.

**Not covered:**

- **6 of 9 evidence-awarding records are never opened.** Only `johnbaxley`,
  `fairchilds` and `honeydewcavingclub` are exercised. Untouched:
  `silvermineentrance`, `mysteryoldnw`, `guardiansofthenorth`,
  `strangethingsfoundinevenstrangerplaces`, `fairchildsinsurancerecordscodes`,
  and `goldenpendant` — the Level 3 police record, the game's deepest gated content.
- **Carousel navigation.** `photos-carousel-counter` is asserted once
  (`"1/3"`), but the prev/next buttons that move between evidences are never
  clicked, in either the Photos or Reports window.
- **Empty states.** `.photos-carousel-empty` and `.report-carousel-empty` are
  never rendered by a test.
- **Custom evidence names.** The whole title editor (`evidence-title-input`,
  `evidence-title-commit`) is untested, despite `evidenceCustomNames` being
  save-persisted state with its own getter/setter pair.
- **Error paths.** `buildMissingCatalogEntryMessage` and
  `buildMissingCatalogFieldMessage` exist precisely because catalog lookups can
  fail — and a stale-path bug of exactly this kind was hit manually this week —
  but no test drives a missing entry or a missing field.

**Suggested specs:** `evidence-carousel-navigation.spec.js`,
`evidence-custom-names.spec.js`, `evidence-missing-catalog-entry.spec.js`, and
extend the awards spec to walk every awarding record.

### 1.3 Web content: search & records — 43% (14 behaviours, 6 covered) 🟠

Covered: ZoomSearch and Library happy-path search + detail, ZoomSearch empty
state, Archives province+keyword requirement and province stickiness.

**Not covered:**

- **Only 4 of 25 authored records are ever opened.** ZoomSearch has 8 records,
  Library 3, Police 9, Archives 3, standalone 3.
- **Detail-view field rendering.** The metadata labels localized last week
  (Author, Publisher, Case Number, Officer, Classification, Declassification,
  Publication, Edition, Province, Date, Summary) and the section headings (Page
  Content, Extract, Report, Article) are never asserted.
- **References / Attachments blocks** and `createImageGallery` — untested.
- **Library and Archives empty states** — only ZoomSearch's is asserted.
- **The `whitmoresonsironmachineryco` standalone page** — reachable, has no
  evidence, never visited by a test.

### 1.4 Localization — 25% (12 behaviours, 3 covered) 🟠

Covered: Spanish menu strings, active-flag class toggling, and an open story
window re-titling after a switch.

**Not covered:**

- **3 of 5 languages.** German, Italian and French are never rendered beyond a
  click on `#btnFrench` asserting only that the button becomes active. No French,
  German or Italian *string* is ever asserted.
- **188 of 191 keys.** Only `newGame`, `reportsFolderLabel` and `zoomLabel` are
  asserted against a localized value.
- **Mid-session re-localization of every other window kind.** `refreshOpenWindow
  Localization()` handles 8 window kinds; only `story` is tested.
- **The chrome localized in the last two sessions** — facsimile UI, Paint
  toolbar, CaveOS desktop, Netscape browser chrome, autosave indicator text,
  notes/paint default page titles, computer window title, month abbreviations —
  has **no** coverage. Every one of those was verified by hand only.

**Why this matters:** this suite would not have caught any of the three bugs
found by manual inspection this week. A single parametrised spec that switches
to each language and snapshots key chrome strings would have caught all three.

**Suggested spec:** `localization-all-languages.spec.js`, looping the 5
languages × the main window kinds.

### 1.5 Desktop window chrome — 23% (13 behaviours, 3 covered) 🟠

`desktopWindow.js` is a 470-line shared component behind every window. Covered:
opening, closing via the title-bar X, and z-index stacking *only* as an
incidental assertion inside the autosave-indicator test.

**Not covered:** window dragging (`beginDrag` / `handlePointerMove` /
`clampToViewport`), resizing (`beginResize`, `setResizable`), click-to-focus
z-index promotion, `centerInViewport`, scrollbar visibility toggling, the
carousel aria-label API added last week (`setCarouselAriaLabels`), and viewport
clamping when a window is dragged off-screen.

### 1.6 Viewport / scene navigation — 9% (11 behaviours, 1 covered) 🟠

`game.js` is 512 lines and almost entirely untested. The only assertion is that
`#zoomReadout` contains the word "Zoom".

**Not covered:** wheel zoom through all 4 `ZOOM_LEVELS`, pan clamping at each
zoom level, pointer drag panning, drag cancellation on blur/visibilitychange,
the table-leg perspective effect, and — most significantly — **the entire
noticeboard scene**: `transitionGameplayScene()`, the fade overlay, the
noticeboard button's label swap, and the fact that the active scene is saved and
restored.

**Note:** the noticeboard is a whole *scene* of the game with zero coverage.
If it is still work-in-progress that is fine, but it should be a conscious call.

### 1.7 Notes / Paint — 75% (12 behaviours, 9 covered) 🟡

Strong coverage of the paged-document model. Missing: the Paint tool palette
beyond `fill` (brush, eraser, and the brush-size and colour inputs are never
changed), Paint canvas persistence across a *save/load* (only across tab
switches), and the notes tab colour rotation.

### 1.8 Persistence — 93% (14 behaviours, 13 covered) 🟢

The strongest area. Sticky save seeding, the 60s autosave timer, timer
de-duplication across restarts, corrupt-save recovery, isolation from unrelated
localStorage keys, resume-after-refresh vs in-memory resume, the New Game
overwrite confirmation in all three outcomes, and a full LZString round trip.

**Only gap:** the clipboard buttons `#copyButtonSavePopup` and
`#pasteButtonLoadPopup` are never clicked — the save string is read straight
from the textarea instead.

### 1.9 Quick login — 100% (8 behaviours, 8 covered) 🟢

Complete. Visibility rules, replay at the stored level, the high-water-mark
guarantee in both directions, both sites, save/load round trip, and New Game
clearing. This is the model the rest of the suite should look like.

### 1.10 Facsimile — 90% (10 behaviours, 9 covered) 🟢

Alert-light states, queueing, multi-message stepping, award-exactly-once, and
both milestone triggers including following the delivered credentials through to
a working login.

**Gap:** the two scripted new-game intro faxes (`NEW_GAME_WELCOME_FAX_CONFIG` at
10s, `MISSING_REPORT_FAX_CONFIG` at 40s) are never allowed to fire — tests inject
the catalog entry directly instead. Their timers, and the cancellation logic that
stops a restart from stacking them, are untested. `page.clock` would make this
cheap, as it already does for autosave.

### 1.11 Notifications — 89% (9 behaviours, 8 covered) 🟢

Routing to all three targets, computer-closing behaviour, dismissal, the
already-open case, keyboard access, and the close-button overlap regression.

**Gap:** the 3-second release interval that queues notifications when several
arrive at once (`NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS`) is never asserted as a
*sequence* — the honeydew test only counts the final total.

### 1.12 Content authoring tool — 92% (12 behaviours, 11 covered) 🟢

All four sites plus standalone, with and without evidence, multi-evidence,
update-in-place, five-language fan-out, and three validation rejections. Teardown
is verified by re-reading every file rather than assumed.

**Gap:** the browser-side builder UI (`tools/web_content_builder.js`) has no
tests — only its server API does.

---

## 2. Cross-cutting risks

| Risk | Detail |
| --- | --- |
| **Single browser** | Everything runs in Chromium only. No Firefox or WebKit project is configured. Canvas (Paint), `getComputedStyle` assertions and the magnifier's transform maths are all engine-sensitive. |
| **Single viewport** | 1400×900 for everything except one narrow-viewport archives layout test. No mobile/tablet, no very large screens. |
| **Suite stability under parallelism** | At Playwright's default 8 workers this suite produces browser-target crashes and heap-corruption worker exits — failures unrelated to assertions. Now pinned to 4 workers in `playwright.config.js`. This is a *masked* problem, not a solved one: something in the app or the harness does not tolerate high concurrency, and that is worth a root-cause investigation. |
| **English-locked selectors** | Locators are written against `localization.json`'s `en` values. Rewording any English string silently breaks tests. This has already caused two regressions. Consider `data-testid` on high-traffic controls. |
| **No accessibility sweep** | Individual aria-labels are asserted, but there is no axe/a11y scan of any screen. |
| **No visual regression** | One screenshot is captured as evidence (`tests/artifacts/`) but nothing compares it against a baseline. |
| **`ui.js` at 5,520 lines** | 55% of the app in one file, with no line coverage to show which parts execute. Highest-value target for instrumentation. |

---

## 3. Recommended plan

Ordered by value per unit of effort.

### Phase 1 — measure before building (≈0.5 day)
1. Add V8/`c8` coverage instrumentation and publish a real line-coverage number.
   Every estimate above becomes a measurement, and it will likely surface gaps
   this audit missed.

### Phase 2 — close the silent-failure gaps (≈2 days)
2. `settings-audio-controls.spec.js` — all six controls + save/restore of the
   three persisted preferences.
3. `localization-all-languages.spec.js` — 5 languages × main window kinds,
   asserting the chrome localized in the last two sessions.
4. `evidence-carousel-navigation.spec.js` + `evidence-custom-names.spec.js`.
5. Extend `evidence-awards-from-web-content.spec.js` to walk all 9 awarding
   records, including `goldenpendant` behind a Level 3 login.

### Phase 3 — the untested subsystems (≈2 days)
6. `viewport-zoom-and-pan.spec.js` — wheel zoom, drag pan, clamping.
7. `scene-noticeboard.spec.js` — transition, fade, label swap, save/restore of
   the active scene.
8. `desktop-window-chrome.spec.js` — drag, resize, focus stacking, clamping.

### Phase 4 — hardening (≈1.5 days)
9. Error paths: missing catalog entry/field, 404 asset, corrupt evidence store.
10. New-game intro fax timers via `page.clock`.
11. Add a Firefox project to the config; triage what breaks.
12. Root-cause the 8-worker instability rather than leaving it pinned at 4.

### Phase 5 — optional
13. axe accessibility sweep per screen.
14. Visual regression baselines for the magnifier and window chrome.
15. Tests for the browser-side content builder UI.

**Estimated total to reach ~85% behavioural coverage: 6 days.**

---

## Appendix: how to reproduce these numbers

```bash
npm run test:e2e                      # full suite -> test-reports/runs/<stamp>/
cat test-reports/history.md           # rolling index of the last 10 runs
cat test-reports/runs/<stamp>/summary.md
```

Behaviour counts were derived by enumerating: exported functions per module,
interactive element IDs in `index.html`, records per content file under
`assets/en/`, keys in `localization.json`, and window kinds registered in
`ui.js` — then grepping `tests/` for each. The commands are reproducible from
the audit; no counts were estimated by eye.
