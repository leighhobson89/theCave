# Test coverage analysis — theCave

## Folder status at a glance

One line per `tests/e2e/` folder (plus the API-only content authoring tool,
tested under `tests/tools/`), best to worst. Percentages are the
feature/behaviour coverage explained under Method below, not line coverage.

- 🟢 `quick-login` — 100%, complete: the model the rest of the suite should look like.
- 🟢 `desktop-window-chrome` — 100%, closed 2026-08-13: drag/resize/clamp/focus-stacking/carousel API, all driven directly.
- 🟢 `persistence` — 93%, the strongest area: save/load/sticky/resume, autosave, corrupt-save recovery.
- 🟢 `localization` — 92%, closed 2026-08-13: all 5 languages, 9 window kinds, found and fixed a real untranslated-button bug.
- 🟢 `web-content-authentication` — 91%: login/logout, privilege gating, session persistence.
- 🟢 `viewport-scene-navigation` — 91%, closed 2026-08-13: zoom, pan + clamping, drag cancellation, the noticeboard scene transition.
- 🟢 `facsimile-system` — 90%: queueing, multi-message stepping, milestone triggers.
- 🟢 `notifications` — 89%: routing, dismissal, keyboard access, the close-button overlap regression.
- 🟢 *(tools)* content authoring tool — 92%: all 4 sites, five-language fan-out, validation rejections.
- 🟢 `audio-settings` — 80%, closed 2026-08-13: every control, save/restore of all 3 preferences.
- 🟡 `notes-paint-documents` — 75%: strong paged-document coverage, Paint tools beyond `fill` untested.
- 🟠 `web-content-search-records` — 43%: only 4 of 25 authored records ever opened.
- 🔴 `evidence-system` — 38%: 6 of 9 evidence-awarding records, including the deepest gated content, never opened.

---

**Date:** 2026-08-12, revised 2026-08-13 (twice)
**Suite:** 126 Playwright tests across 30 spec files, 100% passing (~75s, 4 workers)
**Revision note (2026-08-13):** four of the areas called out below as the
highest-value gaps — audio & settings, localization, desktop window chrome,
and viewport/scene navigation — have since been closed (60 new tests across
12 new spec files, net of one superseded old localization spec that was
retired). The per-area sections and the recommended plan have been updated in
place; original wording is otherwise left intact so this still reads as the
honest history of the audit. One real bug was found and fixed along the way:
the noticeboard toggle button hardcoded English and bypassed localization
entirely (see §1.4).
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
state rather than just "element is visible". As of the original 2026-08-12
audit, roughly half the application surface had no automated test at all, and
the untested half was not random: it clustered in areas that were built
earlier and had not been touched recently (audio, localization, window chrome
mechanics, viewport navigation, the noticeboard scene). The 2026-08-13
revisions closed all five of those clusters. What remains untested now
clusters differently: authored *content* rather than app *mechanics* — most
evidence-awarding records and most web-content-search records are never
opened by any test, even though the machinery that renders them is
well-covered elsewhere.

| Area | Behaviours | Covered | Coverage | Risk if broken |
| --- | ---: | ---: | ---: | --- |
| Quick login | 8 | 8 | **100%** | High |
| Desktop window chrome | 13 | 13 | **100%** 🟢 *(was 23%)* | Medium |
| Persistence (save/load/sticky/resume) | 14 | 13 | **93%** | Critical — silent data loss |
| Localization | 12 | 11 | **92%** 🟢 *(was 25%)* | Medium |
| Content authoring tool (API) | 12 | 11 | **92%** | Medium |
| Web content: authentication & gating | 11 | 10 | **91%** | High |
| Viewport / scene navigation | 11 | 10 | **91%** 🟢 *(was 9%)* | Medium |
| Facsimile system | 10 | 9 | **90%** | High |
| Notifications | 9 | 8 | **89%** | Medium |
| Audio & settings | 10 | 8 | **80%** 🟢 *(was 0%)* | Low–Medium |
| Notes / Paint documents | 12 | 9 | **75%** | Medium |
| Web content: search & records | 14 | 6 | **43%** | High |
| Evidence system | 16 | 6 | **38%** | High |
| **Overall** | **152** | **122** | **≈80%** *(was ≈51%)* | |

*(The original 2026-08-12 row stated 77/152 covered, which does not sum from
its own per-area figures — those actually total 87. This revision's Overall
row is the correct sum of the per-area figures above: 87 + 35 newly covered
= 122.)*

**The three gaps I would close first**, as of the original 2026-08-12 audit:

1. ~~**Audio and settings panel — 0% covered.**~~ Closed 2026-08-13 — see §1.1.
2. **Evidence-awarding content — 3 of 9 records covered.** Six records that
   award evidence are never opened by any test, including the only Level 3
   police record (`goldenpendant`), which is the deepest gated content in the game.
   **Still open** — not addressed in either revision.
3. ~~**Localization — 2 of 5 languages, 3 of 191 keys.**~~ Closed 2026-08-13 — see
   §1.4. All 5 languages are now exercised, including the exact class of bug this
   line predicted: a real untranslated control (the noticeboard toggle button)
   was found and fixed in the process.

**The next gap I would close:** evidence-awarding content (item 2 above), followed
by web content search & records — both remain at the coverage level measured on
2026-08-12, and both are content gaps (authored records never opened) rather
than mechanics gaps. Every other area still has smaller, area-specific gaps of
its own (a clipboard button here, an untested timer there) — see each area's
own section below.

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

### 1.1 Audio & settings — 80% (10 behaviours, 8 covered) 🟢 *(closed 2026-08-13, was 0%)*

`tests/e2e/audio-settings/` now has two specs:
`settings-panel-controls.spec.js` and `audio-preferences-persistence.spec.js`
(11 tests total). Every control is driven and cross-checked against the live
`audioManager` singleton, not just DOM text:

| Control | Element | Persisted in save? | Covered? |
| --- | --- | --- | --- |
| Mute toggle | `#muteToggleButton` | Yes (`audioMuted`) | ✅ label + state + silences current track |
| Music play/pause | `#musicPlayPauseButton` | No | ✅ glyph/aria-label/title swap + `isMusicPlaying()` |
| Next track | `#musicNextButton` | No | ✅ track-index change, playback uninterrupted |
| Music volume | `#musicVolumeSlider` | Yes (`musicVolumePreference`) | ✅ readout + `audioManager` volume |
| SFX volume | `#sfxVolumeSlider` | Yes (`sfxVolumePreference`) | ✅ readout + `audioManager` volume, independent of music |
| Settings panel expand/collapse | `#settingsToggle` | No | ✅ `aria-expanded` + panel visibility |

Also covered: `syncFromSavedPreferences()` on load (a full copy/paste
save-string round trip and a real-browser-refresh sticky-save resume, both
proving restoration rather than just checking the manager wasn't reset);
manual-pause stickiness surviving mute/unmute; and the play/pause button's
localized aria-label/title swap.

**Still not covered:** `onUserGesture()`'s autoplay-unlock as a dedicated
pre-gesture-vs-post-gesture case (the existing tests only observe that music
is already playing after the New Game click, which is itself a gesture), and
SFX actually firing (as a real `Audio` object) on desk-object clicks — no test
asserts a sound was triggered by e.g. clicking the ashtray or a folder.

**Why this matters:** three of these write into the save payload. A bug that
fails to restore volume — or worse, restores it as `NaN` and mutes the game —
would now be caught: `audio-preferences-persistence.spec.js` asserts the
restored numeric values directly, not just that the sliders render something.

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

### 1.4 Localization — 92% (12 behaviours, 11 covered) 🟢 *(closed 2026-08-13, was 25%)*

`tests/e2e/localization/` now has 5 specs (23 tests) covering all 5 languages,
with expected strings read straight out of `localization.json` rather than
hand-copied so a translation edit cannot silently desync a test from the
source of truth it checks:

- **All 5 languages.** Every spec loops English, Spanish, German, Italian and
  French — not just Spanish/French.
- **Far more of the 191 keys.** Menu/desktop chrome, the settings panel, the
  computer desktop, all 9 open-window kinds' titles and close-button
  aria-labels, the facsimile window's dynamic content (including pluralized
  counts), the Netscape browser's generic chrome (address bar, nav buttons,
  ZoomSearch/Library/Police forms, the 404 page), and Paint's tool palette.
- **Mid-session re-localization of every window kind.** `refreshOpenWindow
  Localization()`'s 9 kinds (not 8 — the audit undercounted) are all exercised
  live in `window-titles-relocalize-on-language-switch.spec.js`, without
  closing and reopening anything.
- **The chrome localized in the prior sessions** — facsimile UI, Paint
  toolbar, CaveOS desktop, Netscape browser chrome, notes/paint default page
  titles, computer window title, month abbreviations — is now covered. Site
  *identity* (button labels like "ZoomSearch", "Police Records", the
  "Netscape Navigator" product name) remains deliberately untranslated by
  design and is left in English throughout, on purpose.

**A real bug was found and fixed in the process**, exactly the class this
section predicted: `updateNoticeboardButtonLabel()` in `game.js` hardcoded
English text ("Go To Noticeboard" / "Go To Desktop"), completely bypassing
`localize()` — so the noticeboard toggle button silently stayed in English in
every other language, and "Go To Desktop" had no translation key at all in any
language. Fixed by adding `goToDesktopLabel` to all 5 languages and routing
the button through `localize()`; a second, subtler bug (ui.js's static
localization map wrote the *desktop* label onto the button even while the
*noticeboard* scene was active) was fixed at the same time by making the
scene-aware function in `game.js` the single source of truth.

**Still not covered:** the autosave indicator's localized text
(`refreshAutosaveIndicatorLanguage()`) — the one item from the "recently
localized chrome" list this revision did not reach.

### 1.5 Desktop window chrome — 100% (13 behaviours, 13 covered) 🟢 *(closed 2026-08-13, was 23%)*

`tests/e2e/desktop-window-chrome/` now has two specs (12 tests). Every item
this section previously listed as uncovered is now driven directly:

- **Dragging and its viewport-margin clamp** (`beginDrag` / `handlePointerMove`
  / `setClampedPosition`) — a header drag moves the window by the exact pointer
  delta; a drag far past the viewport edge is clamped to the 5%-margin bound
  rather than allowed to leave the screen.
- **Resizing and its minimum-size clamp** (`beginResize`, `setResizable`) — a
  handle drag changes width/height by the pointer delta; a drastic shrink is
  clamped to the component's 540×360 minimum.
- **`setResizable()` toggled dynamically** after open, not just at
  construction — the handle's visibility and the `is-resizable` class both
  follow.
- **Click-to-focus z-index promotion** (`registerDesktopWindow()` in ui.js) —
  tested through real, fully-overlapping app windows (a real mouse click can't
  reach a buried window when another window totally covers it, so this
  dispatches `pointerdown` directly at the target the way a real click's event
  would still bubble from wherever the pointer actually lands): raising a
  buried window above one opened later, monotonic promotion across repeated
  clicks, and that closing the topmost window leaves the rest of the stack's
  z-order undisturbed.
- **`centerInViewport()`** — a freshly opened window's center matches the
  viewport's center.
- **Scrollbar visibility toggling** — both `open({ showScrollbar })` at
  construction and `setScrollbarVisibility()` afterward.
- **The carousel aria-label API** (`setCarouselAriaLabels()`) — including that
  passing only one of `previous`/`next` leaves the other untouched.
- **Close/destroy** — closing an owns-DOM window removes it from the DOM
  entirely and fires `onClose`.

These are tested against isolated `DesktopWindow` instances constructed
directly in-page (no game state needed) in `desktop-window-mechanics.spec.js`,
except click-to-focus, which is app-level wiring in `ui.js` rather than part
of the component itself and so is tested through real windows in
`desktop-window-focus-stacking.spec.js`.

### 1.6 Viewport / scene navigation — 91% (11 behaviours, 10 covered) 🟢 *(closed 2026-08-13, was 9%)*

`tests/e2e/viewport-scene-navigation/` now has 3 specs (14 tests):

- **Wheel zoom** through all 4 `ZOOM_LEVELS`, clamping at each end (a no-op
  zoom-in at the max, a no-op zoom-out at the min), and the transient zoom
  readout that appears on a change and fades on its own.
- **Pointer drag panning**, moving by the drag delta, and **pan clamping** at
  the world edges in both directions.
- **Drag cancellation**, proven three ways — the pointer leaving the
  viewport, a window blur, and a tab visibility change — each verified by
  showing that *further* pointer movement afterward does not resume the pan,
  not just that a CSS class briefly changed.
- **The table-leg perspective effect**, responding to pan position.
- **The entire noticeboard scene**: `transitionGameplayScene()`'s fade
  overlay, the desktop/noticeboard visibility swap, the noticeboard button's
  label swap, a re-entrancy guard against a rapid second click mid-transition,
  and the active scene surviving a save/load round trip, a real-browser-
  refresh sticky-save resume, and New Game always resetting to the desktop.

One real interaction was discovered while building this suite, documented in
the spec file and its README rather than treated as a defect: `#desktopViewport`
covers the entire game area, so a drag large enough to reach the pan-clamp
bound can *also* be large enough to cross the viewport's own screen edge and
trigger the separate pointer-leaves-the-viewport cancellation — the two
mechanisms compete unless a test deliberately keeps them apart, which is now
called out explicitly in the clamp test.

**Still not covered:** the exact wheel-zoom anchor math (that zooming keeps
the world point *currently at the viewport's center* fixed, rather than just
changing scale, is exercised indirectly through the zoom-level assertions but
never asserted directly against pan position); and `applySceneTransform`'s
`window.addEventListener("resize", ...)` re-layout on an actual viewport
resize.

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
| **English-locked selectors** | Locators are written against `localization.json`'s `en` values. Rewording any English string silently breaks tests. This has already caused two regressions, and hit a third form while building the 2026-08-13 localization suite: several `game-helpers.js` helpers (`browserAddress`/`visitBrowserUrl`, `openPaint`) locate elements by their English accessible name, so they silently hang rather than fail when driven in another language. Worked around locally in the new specs with language-independent CSS-class selectors; the helpers themselves are unchanged. Consider `data-testid` on high-traffic controls. |
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
2. ~~`settings-audio-controls.spec.js`~~ **Done 2026-08-13** — landed as
   `tests/e2e/audio-settings/settings-panel-controls.spec.js` +
   `audio-preferences-persistence.spec.js` (11 tests): all six controls plus
   save/restore of the three persisted preferences via both a copy/paste
   round trip and a real-refresh sticky-save resume.
3. ~~`localization-all-languages.spec.js`~~ **Done 2026-08-13** — landed as 5
   specs under `tests/e2e/localization/` (23 tests): all 5 languages × menu/
   desktop chrome, all 9 window kinds, facsimile content, Netscape chrome, and
   Paint/Notes defaults. Found and fixed a real bug along the way (see §1.4).
4. `evidence-carousel-navigation.spec.js` + `evidence-custom-names.spec.js`.
   **Still open.**
5. Extend `evidence-awards-from-web-content.spec.js` to walk all 9 awarding
   records, including `goldenpendant` behind a Level 3 login. **Still open.**

### Phase 3 — the untested subsystems (≈2 days)
6. ~~`viewport-zoom-and-pan.spec.js`~~ **Done 2026-08-13** — landed as
   `tests/e2e/viewport-scene-navigation/viewport-zoom.spec.js` +
   `viewport-panning.spec.js` (9 tests): wheel zoom + clamping, drag pan +
   clamping, three distinct drag-cancellation paths, the table-leg effect.
7. ~~`scene-noticeboard.spec.js`~~ **Done 2026-08-13** — landed as
   `tests/e2e/viewport-scene-navigation/scene-noticeboard-transition.spec.js`
   (5 tests): transition fade, label swap, the re-entrancy guard, and
   save/load + sticky-resume + New Game for the active scene.
8. ~~`desktop-window-chrome.spec.js`~~ **Done 2026-08-13** — landed as
   `tests/e2e/desktop-window-chrome/desktop-window-mechanics.spec.js` +
   `desktop-window-focus-stacking.spec.js` (12 tests): drag + margin clamp,
   resize + min-size clamp, dynamic `setResizable()`, click-to-focus z-index
   promotion, centering, scrollbar visibility, and the carousel aria-label API.

### Phase 4 — hardening (≈1.5 days)
9. Error paths: missing catalog entry/field, 404 asset, corrupt evidence store.
10. New-game intro fax timers via `page.clock`.
11. Add a Firefox project to the config; triage what breaks.
12. Root-cause the 8-worker instability rather than leaving it pinned at 4.

### Phase 5 — optional
13. axe accessibility sweep per screen.
14. Visual regression baselines for the magnifier and window chrome.
15. Tests for the browser-side content builder UI.

**Estimated total to reach ~85% behavioural coverage: 6 days.** *(Revision:
Phase 2's audio/localization items and all of Phase 3 are done as of
2026-08-13, overall coverage is already at ≈80%. What's left to reach 85% is
narrowly item 4/5 above — evidence-awarding content and web content search &
records — both content gaps, not mechanics gaps, and both isolated to Phase 2.)*

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
