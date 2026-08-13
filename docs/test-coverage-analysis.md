# Test coverage analysis — theCave

## Folder status at a glance

One line per `tests/e2e/` folder (plus the API-only content authoring tool,
tested under `tests/tools/`), best to worst. Percentages are the
feature/behaviour coverage explained under Method below, not line coverage.

- 🟢 `quick-login` — 100%, complete: the model the rest of the suite should look like.
- 🟢 `desktop-window-chrome` — 100%, closed 2026-08-13: drag/resize/clamp/focus-stacking/carousel API, all driven directly.
- 🟢 `web-content-search-records` — 100%, closed 2026-08-13: all 25 authored records opened, detail-view fields, References/Attachments and image galleries (the last two via synthetic data — see §1.3), the Whitmore standalone page.
- 🟢 `persistence` — 93%, the strongest area: save/load/sticky/resume, autosave, corrupt-save recovery.
- 🟢 `localization` — 92%, closed 2026-08-13: all 5 languages, 9 window kinds, found and fixed a real untranslated-button bug.
- 🟢 `web-content-authentication` — 91%: login/logout, privilege gating, session persistence.
- 🟢 `viewport-scene-navigation` — 91%, closed 2026-08-13: zoom, pan + clamping, drag cancellation, the noticeboard scene transition.
- 🟢 `facsimile-system` — 90%: queueing, multi-message stepping, milestone triggers.
- 🟢 `notifications` — 89%: routing, dismissal, keyboard access, the close-button overlap regression.
- 🟢 `evidence-system` — 89%, closed 2026-08-13: all 9 awarding records including the Level 3 `goldenpendant`, carousel navigation, custom names, catalog error paths.
- 🟢 *(tools)* content authoring tool — 92%: all 4 sites, five-language fan-out, validation rejections, the Police Case Number generator.
- 🟢 `audio-settings` — 80%, closed 2026-08-13: every control, save/restore of all 3 preferences.
- 🟡 `notes-paint-documents` — 75%: strong paged-document coverage, Paint tools beyond `fill` untested.

---

**Date:** 2026-08-12, revised 2026-08-13 (six times)
**Suite:** 156 Playwright tests across 38 spec files, 100% passing (~1m45s, 4 workers)
**Revision note (2026-08-13, 6th pass):** the 5th pass's last 6 Police Date
placeholders are now real content too, filled in directly (all `"1988"` —
the same year as the "Guardians of the North" book that several of these
officers' records already reference). **Every `TODONOW` placeholder in the
project is now resolved** — `assets/*/{police,library,archives}.json` have
none left in any of the 5 languages. `caseNumber`/`date` were also moved up
to sit right after `title` on every Police record (ahead of `keywords`) for
readability, in English and copied structurally to the other 4 languages
along with their values, so all 5 stay identical in both content and field
order. The still-useful synthetic-data coverage in
`browser-detail-synthetic-fields.spec.js` remains (it proves fields no real
record populates *on purpose* — Province/Officer/Classification/
Declassification Status/References/Edition, see §1.3's second pass — not a
temporary gap), but every "still `TODONOW`" note elsewhere in this document
is now historical.
**Revision note (2026-08-13, 5th pass):** follow-up to the 4th pass's §1.3
finding. Library's Publisher/Publication Year and Archives' one missing Date
were hand-authored in English and propagated to the other 4 languages;
Police's Case Number — which can't safely be hand-authored, since the format
requires an always-increasing, randomly-spaced number — now has a generator
(`tools/police_case_number.js`, 2 new tests in
`web-content-builder-server.spec.js`) that derives the next value by
scanning `assets/en/police.json` rather than trusting a separate counter,
and the tool auto-fills it the moment Police is selected. Police's Date got
the same "scan the codebase for a real date" treatment as Archives': 3 of
its 9 `TODONOW` records had an unambiguous date embedded in their own
report text and were filled in; the other 6 stay `TODONOW` on purpose — see
§1.3's third pass for why. 30 `TODONOW` placeholders remain, down from 385
after the first pass and 115 after the second.
**Revision note (2026-08-13, 4th pass):** web content search & records — the
last area still sitting at its original 2026-08-12 level after the first
three revision passes — is now closed too (12 new tests across 3 new spec
files). All 25 authored records across ZoomSearch, Library, Police and
Archives are now opened by some test, alongside detail-view metadata field
rendering, section headings, image galleries, and the one standalone page
(`whitmoresonsironmachineryco`) nothing else in the suite reached. See §1.3
for a real finding along the way: several metadata fields and the
References/Attachments blocks are wired-up, working code with no authored
record that ever populates them — a content gap, not a test gap, proven by
injecting synthetic data over the same catalog-fetch interception
`evidence-missing-catalog-entry.spec.js` established.
**Revision note (2026-08-13, earlier passes):** five of the areas called out
below as the highest-value gaps — audio & settings, localization, desktop
window chrome, viewport/scene navigation, and the evidence system — were
closed first (76 new tests across 17 new spec files, net of one superseded
old localization spec that was retired). The per-area sections and the
recommended plan have been updated in place; original wording is otherwise
left intact so this still reads as the honest history of the audit. One real
bug was found and fixed along the way: the noticeboard toggle button
hardcoded English and bypassed localization entirely (see §1.4).
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
mechanics, viewport navigation, the noticeboard scene). The first three
2026-08-13 revision passes closed all five of those mechanics clusters, and a
sixth, different kind of gap along with them: most evidence-awarding
*content* was never opened by any test even though the machinery that
renders it was already well-covered. All 9 awarding records (including the
Level 3 `goldenpendant` police record) are now exercised, alongside the
carousel navigation, custom naming and catalog-error-message behaviours that
content sits inside of. The fourth pass closed the one area that same shape
of gap had left behind: web content search & records, where most ZoomSearch,
Library, Police and Archives entries award nothing and so had no path in
through the evidence-system work — all 25 authored records are now opened by
some test, and that pass surfaced a real, distinct finding of its own: several
detail-view fields (Case Number, Officer, Classification, Declassification,
Edition, Publisher/Province on Library) and the References/Attachments blocks
are working, wired-up rendering code with no authored record that has ever
populated them, in production or in any prior test. That code path is now
proven correct against synthetic data (see §1.3), but the underlying content
gap remains — it's a content-authoring backlog item, not a test gap.

| Area | Behaviours | Covered | Coverage | Risk if broken |
| --- | ---: | ---: | ---: | --- |
| Quick login | 8 | 8 | **100%** | High |
| Desktop window chrome | 13 | 13 | **100%** 🟢 *(was 23%)* | Medium |
| Web content: search & records | 14 | 14 | **100%** 🟢 *(was 43%)* | High |
| Persistence (save/load/sticky/resume) | 14 | 13 | **93%** | Critical — silent data loss |
| Localization | 12 | 11 | **92%** 🟢 *(was 25%)* | Medium |
| Content authoring tool (API) | 13 | 12 | **92%** | Medium |
| Web content: authentication & gating | 11 | 10 | **91%** | High |
| Viewport / scene navigation | 11 | 10 | **91%** 🟢 *(was 9%)* | Medium |
| Facsimile system | 10 | 9 | **90%** | High |
| Notifications | 9 | 8 | **89%** | Medium |
| Evidence system | 18 | 16 | **89%** 🟢 *(was 38%)* | High |
| Audio & settings | 10 | 8 | **80%** 🟢 *(was 0%)* | Low–Medium |
| Notes / Paint documents | 12 | 9 | **75%** | Medium |
| **Overall** | **155** | **141** | **≈91%** *(was ≈51%)* | |

*(The original 2026-08-12 row stated 77/152 covered, which does not sum from
its own per-area figures — those actually total 87. The first three
2026-08-13 revision passes brought the sum to 87 + 45 newly covered = 132,
against a total behaviour count of 154 — two higher than the original 152
because the evidence-system work found a real behaviour the original audit
never enumerated: the background-story window, which is not part of the
Photos/Reports carousels and had no line of its own. The fourth pass added
the remaining 8 web-content-search-records behaviours (140/154), and its
own follow-up work (§1.3's third pass, §1.12) added one more real,
newly-covered behaviour of its own — the Police Case Number generator — for
a new total of 141/155 ≈ 91%.)*

**The three gaps I would close first**, as of the original 2026-08-12 audit:

1. ~~**Audio and settings panel — 0% covered.**~~ Closed 2026-08-13 — see §1.1.
2. ~~**Evidence-awarding content — 3 of 9 records covered.**~~ Closed 2026-08-13
   — see §1.2. All 9 records are now exercised, including the only Level 3
   police record (`goldenpendant`), the deepest gated content in the game.
3. ~~**Localization — 2 of 5 languages, 3 of 191 keys.**~~ Closed 2026-08-13 — see
   §1.4. All 5 languages are now exercised, including the exact class of bug this
   line predicted: a real untranslated control (the noticeboard toggle button)
   was found and fixed in the process.

**The next gap I would close:** ~~web content search & records — the last
area still at the coverage level measured on 2026-08-12.~~ Closed 2026-08-13
— see §1.3. All 25 authored records are now opened by some test. Every other
area still has smaller, area-specific gaps of its own (a clipboard button
here, an untested timer there) — see each area's own section below.

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

### 1.2 Evidence system — 89% (18 behaviours, 16 covered) 🟢 *(closed 2026-08-13, was 38%)*

`tests/e2e/evidence-system/` now has 7 specs (19 tests). Every item this
section previously listed as uncovered is now driven directly:

- **All 9 evidence-awarding records are exercised**, split across two specs:
  `evidence-awards-from-web-content.spec.js` (the pre-existing
  `honeydewcavingclub` standalone page) and the new
  `evidence-awards-full-catalog.spec.js`, which reaches the other 6 —
  `silvermineentrance` (ZoomSearch), `mysteryoldnw`, `guardiansofthenorth`
  and `strangethingsfoundinevenstrangerplaces` (Library),
  `fairchildsinsurancerecordscodes` (a standalone page), and `goldenpendant`
  — the Level 3 police record and the game's deepest gated content, proven
  both ways: refused at Level 2 and awarded once logged in at Level 3.
  (`johnbaxley` and `fairchilds` were already covered elsewhere, in the
  notifications suite.) Along the way this confirmed a detail the original
  audit didn't call out: ZoomSearch/Library/Police/Archives all award their
  evidence the moment a matching record appears in a *search result* —
  `webContentManager`'s `searchWebsite()` walks every returned record and
  awards on the spot — not on a click into the record's detail view.
- **Carousel navigation.** `evidence-carousel-navigation.spec.js` drives the
  prev/next buttons in both the Photos and Reports windows, including
  wraparound at both ends in both directions.
- **Empty states.** `.photos-carousel-empty` and `.report-carousel-empty` are
  both rendered by a test — Reports starts empty on every new game, and
  Photos never naturally empties in play, so that case resets the live
  evidence store directly via `evidenceManager.js`'s `resetEvidenceStore()`
  to reach the rendering path.
- **Custom evidence names.** `evidence-custom-names.spec.js` covers the whole
  title editor: committing via Enter or the ✓ button, the commit button's
  disabled state tracking whether the input actually changed, an emptied
  input reverting instead of committing, a custom name following its
  evidence across carousel navigation, surviving a save/load round trip, and
  New Game clearing `evidenceCustomNames` (its own save-persisted map).
- **Error paths.** `evidence-missing-catalog-entry.spec.js` drives both
  `buildMissingCatalogEntryMessage` and `buildMissingCatalogFieldMessage` for
  both photos and reports — real authored content is always well-formed, so
  this injects evidence with a bogus catalog reference directly via
  `evidenceManager.js`, and intercepts one catalog fetch to serve a
  deliberately incomplete entry, exactly the stale-path shape that produced a
  real bug during manual play.

One extra gap surfaced that the original 16-behaviour count had missed
entirely: the single background-story evidence (`#backgroundFolder`, "The
Arnie Tragedy") isn't part of either carousel — it's its own window with its
own markdown content — and had no coverage at all. `evidence-background-
story.spec.js` now opens it and asserts its real story text, and that
closing and reopening reloads the same content.

**Still not covered:** `addEvidenceTrigger`'s predicate/action API (currently
unused by any registered trigger in the game, so nothing exercises it); SFX
firing on an evidence award (the same shape of gap as audio-settings' desk-
object SFX gap, see §1.1).

### 1.3 Web content: search & records — 100% (14 behaviours, 14 covered) 🟢 *(closed 2026-08-13, was 43%)*

`tests/e2e/web-content-search-records/` now has 6 specs (18 tests). Every
item this section previously listed as uncovered is now driven directly:

- **All 25 authored records are opened.** `browser-record-catalog.spec.js`
  loops every record in `zoomsearch.json` (8), `library.json` (3),
  `police.json` (9, behind an Administrator login that clears every
  authored `requiredPrivilegeLevel`) and `archives.json` (3, behind a
  Subscriber login that clears every authored `requiredAccessLevel`),
  reading the query terms straight from the same JSON the app fetches —
  the same "read the source of truth, don't hand-copy it" technique the
  localization suite established — so a content edit can't silently
  desync the test from what it's checking. Police/Archives privilege
  *gating* itself stays out of scope here; it's already covered by
  `web-content-authentication/` and, for the one Level 3 record
  (`goldenpendant`), by `evidence-system/evidence-awards-full-catalog.spec.js`.
- **Detail-view field rendering.** The same spec asserts every metadata
  label that feeds a search-results table column on every record: Author,
  Publisher, Publication Year and Summary on Library; Case Number, Date and
  Summary on Police; Publication, Province, Date and Summary on Archives —
  plus the section headings (Extract, Report, Article, and that "Page
  Content" — a deliberately suppressed heading — never renders as one).
- **References / Attachments blocks and the fields no authored record
  populates on purpose.** `webContentRegistry.js` can also render Province/
  Officer/Classification/Declassification Status (Police), Province/
  References (Library) and Edition (Archives) — none of which feed a table
  column, so they were deliberately left out of both the content backfill
  and the authoring tool (see the finding below).
  `browser-detail-synthetic-fields.spec.js` intercepts each site's catalog
  fetch (the same `page.route` technique
  `evidence-missing-catalog-entry.spec.js` uses) to inject one fully-formed
  synthetic record per site, proving all of them still render correctly —
  the only place they're tested at all, now that no real record ever
  supplies them — along with a 2-item References list and a 2-item
  Attachments list built from both a plain string entry and a
  `{ label, value }` entry.
- **`createImageGallery`.** Proven from real content throughout
  `browser-record-catalog.spec.js` — every record with authored images gets
  its figure count asserted, and records with none are asserted to render
  no gallery at all.
- **Library, Police and Archives empty states.** Each now has its own test
  asserting both the status line and the `.browser-results-empty` row
  inside the results table for a genuine no-match search (not just an
  empty query).
- **The `whitmoresonsironmachineryco` standalone page.**
  `browser-standalone-whitmore-page.spec.js` reaches it two ways: through
  the mine-cart ZoomSearch article's real in-page `*-*delimited*-*` link
  (proving `appendDelimitedLinkText` and the `caveos-browser-navigate`
  event wiring, not just a direct URL visit), and directly by address bar.
  Both confirm it awards no evidence, unlike the other two standalone pages.

**A real finding, not a bug — since fixed at the content and tooling level,
scoped down, then fully resolved:** while writing real-data assertions for
the metadata grid, several fields turned out to have no authored record that
had ever populated them — `webContentRegistry.js`'s Case Number, Officer,
Classification, Declassification and Edition fields, and Publisher/Province
on Library records, were all working rendering code that had been dead in
production content since it was written. Same story for `references` and
`attachments`: `createKeyValueList` was fully wired up with nothing in the
game's authored JSON that ever supplied it. That was never a coverage gap —
`browser-detail-synthetic-fields.spec.js` already proved the rendering was
correct using synthetic data — but it was a genuine content-authoring
backlog item, and it went through four rounds of action rather than staying
just logged:

1. **First pass:** every record missing *any* of these fields, in every one
   of the 5 language files, was backfilled with a literal `"TODONOW"`
   placeholder, and `tools/web_content_builder.js`/`.html` gained a form
   field for every one of them.
2. **Second pass, after review:** on reflection, only the fields that
   actually feed a search-results table column earn their authoring
   overhead — a blank one of *those* means an empty column in the results
   table for every player who finds the record, a sharper failure mode than
   a blank detail-view field nobody may ever scroll to. The rest (Province/
   Officer/Classification/Declassification Status on Police, Province/
   References on Library, Edition on Archives) were removed again: the
   `"TODONOW"` placeholder, the JSON key entirely, and the form field all
   came back out, across all 5 languages. What remains backfilled is just
   Case Number and Date (Police), Publisher and Publication Year (Library) —
   Archives' Date/Province/Headline/Summary were already real content except
   for one record's Date, now real content too (see next). 115 placeholders
   remained at this point, down from the first pass's 385.
   `tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md`'s "Service-Specific Fields"
   section has the current, narrower list; the fields that were tried and
   removed are called out there too, with a pointer back to
   `browser-detail-synthetic-fields.spec.js` as the only place their
   rendering is still checked.
3. **Third pass: real content, and a generator for the one field that
   can't be authored by hand.** Library's Publisher/Publication Year and
   Archives' one missing Date were hand-authored in English and propagated
   to the other 4 languages (they're facts, not prose, so they don't need
   independent translation) — Archives' `henrywhitmore` date in particular
   came from the record's *own* image caption, which already said "in 1907"
   ("scan the codebase for any dates that point to these topics" surfaced it
   directly). Police's Case Number can't be hand-authored the same way — the
   format (`NNNNN-A`, a number that must always jump by a random 10-100, not
   a fixed +1, so the sequence can't be walked or guessed) means picking one
   by hand risks a collision or breaking the increasing sequence. Instead,
   `tools/police_case_number.js` — a shared module used by both the server
   and `tests/tools/web-content-builder-server.spec.js` — generates it by
   scanning `assets/en/police.json` for the current highest, with no
   separate counter file to drift out of sync. All 9 originally-authored
   records were backfilled this way (starting from a highest of 0) and
   propagated to the other languages; the tool now auto-fills the Case
   Number field the moment Police is selected, with a "New" button to
   regenerate. Police's Date got the same "scan the codebase" treatment as
   Archives: of the 6 police records still missing one, 3 turned out to have
   an explicit, unambiguous date embedded in their own report text
   ("Date Recovered: 15/11/1901", two "Date of Valuation: …" lines) and were
   filled in; the other 6 only have narrative dates (birth/career/death,
   several per record) with no single one that clearly *is* "the record's
   date", so they were deliberately left as `"TODONOW"` rather than guessed.
4. **Fourth pass: the last 6.** Those 6 Police records got a real Date too
   (all `"1988"`), filled in directly rather than scanned for. `caseNumber`
   and `date` were also moved to sit right after `title` on every Police
   record, ahead of `keywords`, in all 5 languages, purely for readability —
   no value changed. Zero `TODONOW` placeholders remain anywhere in the
   project.

**Still not covered:** nothing specific to this area — every `TODONOW`
placeholder this section ever tracked is now real content. The synthetic-data
coverage in `browser-detail-synthetic-fields.spec.js` isn't a residual gap:
it deliberately covers fields (Province/Officer/Classification/
Declassification Status/References on Police and Library, Edition on
Archives) that no real record populates *on purpose*, per the second pass
above, so no authored content will ever reach that rendering path.

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

### 1.12 Content authoring tool — 92% (13 behaviours, 12 covered) 🟢

All four sites plus standalone, with and without evidence, multi-evidence,
update-in-place, five-language fan-out, and three validation rejections. Teardown
is verified by re-reading every file rather than assumed. The server API's
regression suite (`tests/tools/web-content-builder-server.spec.js`) still
passes unchanged after the 2026-08-13 §1.3 follow-up's first two passes —
adding, then partly removing again, form fields for Library/Police/Archives
metadata (see §1.3) — because the server accepts whatever shape of `entry`
the client sends it; neither pass needed a server-side change. What the
form exposes today: Library gained Publisher and Publication Year; Police
gained Case Number (auto-generated, see below) and Date; Archives already
had every field it needed (Province, Publication) except Date, which it
also gained. Every field that feeds a search-results table column is marked
with a `†` in the form, with a legend at the bottom of the Content Form panel.

The third pass added a genuinely new behaviour, and this one *is* covered by
a committed test: `GET /api/web-content/next-police-case-number` generates
Police's `NNNNN-A` case number by scanning `assets/en/police.json` for the
current highest (via the shared `tools/police_case_number.js`) rather than
trusting a separate counter. Two new tests in
`web-content-builder-server.spec.js` cover it — that a freshly-generated
number is well-formed and strictly within the current-highest-plus-10-to-100
range, and that injecting a real record with a generated number is picked
up by the *next* generation call (proving the scan actually reads live
content, not a stale snapshot) — using the same self-cleaning
`RUN_ID`-prefixed pattern as the rest of the suite.

A fourth pass then removed a real conflict rather than just documenting it.
The Content Form panel used to hold a single shared "Title / Headline"
field that Zoom Search, Police, Archives and Standalone all read from — but
Library never did (it always had its own separate Publication Title field),
so filling in the shared field while Library was selected silently did
nothing, and nothing in the UI signalled that. Tracing every panel's field
usage in `web_content_builder.js` turned up two more of the same shape:
URL is required for Standalone, optional for Zoom Search, and silently
unused by Library/Police/Archives; Summary is used by all four searchable
sites but not Standalone. The fix was structural, not cosmetic: every field
that isn't identical across all five content types now lives inside that
one type's own panel (Zoom Search gained its own Page Title/URL/Summary;
Police gained its own Title/Summary; Archives' shared Title became its own
Headline plus its own Summary; a new Standalone Page Fields panel holds
Title/URL) rather than in a shared field a different type could silently
ignore. Every panel but Evidence Fields (which every type can use) now
greys out and disables its own inputs the instant a different Content Type
is selected, so a field that doesn't apply is never just quietly wrong —
it's visibly inert. A collapsible "Field rules" section at the top of the
Content Form panel spells out the full field-to-panel-to-type mapping for
quick reference.

**Gap:** the browser-side builder UI (`tools/web_content_builder.js`) has no
tests in the committed suite — only its server API does. This is unchanged
by any of the four passes above, including the field-ownership redesign;
all were checked with ad hoc Playwright scripts against the real running
server — form-filling every field for one record per content type and
asserting the resulting Preview JSON (including that panel greying disables
the right inputs and that Standalone's required-URL validation still fires)
— not committed tests, all with zero browser console errors. Promoting
those scripts into a real `tests/tools/` spec is still open work, same as
the rest of this gap.

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
4. ~~`evidence-carousel-navigation.spec.js` + `evidence-custom-names.spec.js`.~~
   **Done 2026-08-13** — landed as written (4 + 3 tests), plus
   `evidence-missing-catalog-entry.spec.js` (3 tests, item 10's catalog-entry/
   field portion below) and `evidence-background-story.spec.js` (2 tests, a
   gap the original audit hadn't enumerated) for good measure — 12 tests
   across the four files.
5. ~~Extend `evidence-awards-from-web-content.spec.js` to walk all 9 awarding
   records, including `goldenpendant` behind a Level 3 login.~~ **Done
   2026-08-13** — landed as `evidence-awards-full-catalog.spec.js` (4 tests):
   ZoomSearch, all 3 Library books, the Fairchild standalone page, and
   `goldenpendant`, refused below Level 3 and awarded once logged in.

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
9. ~~Web content search & records: full record catalog, detail-view field
   rendering, References/Attachments, and the `whitmoresonsironmachineryco`
   standalone page.~~ **Done 2026-08-13 (4th pass)** — landed as
   `tests/e2e/web-content-search-records/browser-record-catalog.spec.js`,
   `browser-detail-synthetic-fields.spec.js` and
   `browser-standalone-whitmore-page.spec.js` (12 tests): all 25 authored
   records opened, real-content metadata/heading/gallery assertions, and a
   synthetic-data proof (via the same catalog-fetch interception item 10
   uses) that the fields no authored record populates still render
   correctly. See §1.3 for the content-authoring-backlog finding this
   surfaced.

### Phase 4 — hardening (≈1.5 days)
10. Error paths: ~~missing catalog entry/field~~ (**Done 2026-08-13**, see item 4
    above), 404 asset, corrupt evidence store.
11. New-game intro fax timers via `page.clock`.
12. Add a Firefox project to the config; triage what breaks.
13. Root-cause the 8-worker instability rather than leaving it pinned at 4.

### Phase 5 — optional
14. axe accessibility sweep per screen.
15. Visual regression baselines for the magnifier and window chrome.
16. Tests for the browser-side content builder UI.

**Estimated total to reach ~85% behavioural coverage: 6 days.** *(Revision:
all of Phase 2 and Phase 3 are done as of 2026-08-13, including the 4th-pass
addition of item 9, and overall coverage has already passed the original
target, at ≈91%. What's left is only the smaller Phase 4/5 hardening items —
every area identified in the original audit now has a spec folder of its
own.)*

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
