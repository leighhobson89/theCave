# Test coverage analysis — theCave

**Date:** 2026-08-14 (full re-audit; supersedes the 2026-08-12/13 edition)
**Suite:** 414 Playwright tests across 54 spec files — **412 passing, 2 skipped,
0 failing** (3m 48s, 4 workers). Up from 156 tests across 38 files at the
2026-08-12 audit. Two changes in this pass: `snake.spec.js` was folded into
`games.spec.js` (see [§2](#2-organisation-and-naming)), merging its own
per-language localization loop into the one the other three games already
shared and dropping 5 redundant invocations with no loss of coverage; and
`caveos/echotrail.spec.js` arrived with the new media library, adding 52; and
`localization/facsimile-content.spec.js` gained 2 tests closing the gap found in
§3.3; and `facsimile-system/milestone-triggers.spec.js` gained 1, for a third
record-open fax trigger whose payload unlocks an ECHOTRAIL track rather than
awarding evidence or credentials, plus 4 more covering a genuine progression
bug this pass found and fixed (§3.6). Both skips are conditional and correct: they stand down when
the current content registry has no event without artwork, and none whose
unlock trigger is permanently unreachable — they will run again the moment
either case exists.
**Method:** manual traceability audit — every app module, every UI control and
every piece of authored content enumerated from source and matched against the
assertions that touch it. There is still no instrumented line-coverage number
(see [§0](#0-instrumentation-gap)); the percentages below are **feature/behaviour
coverage**, counted as "distinct user-facing behaviours with at least one
assertion" over "distinct user-facing behaviours identified".

---

## Folder status at a glance

One line per `tests/e2e/` folder, plus the API-only content authoring tool under
`tests/tools/`. Best to worst.

| | Area | Coverage | Note |
| --- | --- | ---: | --- |
| 🟢 | `quick-login` | **100%** | Complete. Still the model the rest of the suite looks like. |
| 🟢 | `desktop-window-chrome` | **100%** | Drag/resize/clamp/focus-stacking/carousel API, all driven directly. |
| 🟢 | `web-content-search-records` | **100%** | All 25 authored records opened; detail fields, galleries, empty states. |
| 🟢 | `caveos` | **95%** | The whole computer in one folder, 9 specs — now including ECHOTRAIL. |
| 🟢 | `progress-timeline` | **93%** | New since the last audit. The corkboard, the envelope, real drag-and-drop. |
| 🟢 | `persistence` | **93%** | Save/load/sticky/resume, autosave, corrupt-save recovery. |
| 🟢 | `localization` | **93%** | 282 keys × 5 languages, zero missing keys. One hardcoded English string found and fixed. |
| 🟢 | `viewport-scene-navigation` | **92%** | Zoom, pan, clamping, the noticeboard scene, and camera reset on entry. |
| 🟢 | `progress-evidence` | **92%** | New since the last audit. Activation, triggers, generated definitions. |
| 🟢 | `web-content-authentication` | **91%** | Login/logout, privilege gating, session persistence. |
| 🟢 | `tooltips` | **90%** | New since the last audit. Real pointer throughout. |
| 🟢 | `facsimile-system` | **92%** | Queueing, stepping, milestone triggers, and trigger re-arming across New Game/load. |
| 🟢 | *(tools)* content authoring | **92%** | All 4 sites, five-language fan-out, validation, both id generators. |
| 🟢 | `notifications` | **89%** | Routing, dismissal, keyboard access, the close-button overlap regression. |
| 🟢 | `evidence-system` | **89%** | All 9 awarding records, carousels, custom names, catalog error paths. |
| 🟡 | `desktop-ashtray` | **83%** | New since the last audit. State and wiring covered; animation is not. |
| 🟡 | `audio-settings` | **80%** | Every control and all 3 persisted preferences; SFX firing is not asserted. |

**Overall: ≈93%** (see the behaviour table in the executive summary).

---

## Executive summary

The suite is now **broad as well as deep**. The 2026-08-12 audit found roughly
half the application surface untested; the 2026-08-13 passes closed those
clusters; this pass audits a codebase that has grown substantially since — the
noticeboard corkboard timeline, the progress evidence milestone system, the
tooltip layer, the CaveOS folder system, the theme picker, and six apps inside
the OS (Calculator, ECHOTRAIL and four games) all post-date the previous
report. Every one of them arrived with tests, so the headline number moved very little while the
surface underneath it grew by more than half.

Four things are worth flagging above the detail:

1. **`ui.js` has grown from 5,520 to 9,784 lines** — now 61% of the application
   in one file. It was called out as the single largest blind spot last time and
   it has got larger, not smaller. Nothing here is *evidence* of a problem; the
   point is that no one can tell, because there is still no line coverage.
2. **The test suite was reorganised in this pass**, not just measured. The
   CaveOS specs were scattered across three folders under three naming schemes;
   they are now one `tests/e2e/caveos/` folder with subject-only spec names, and
   the same naming rule was applied to every other folder (see
   [§2](#2-organisation-and-naming)).
3. **The `Apps` folder is now `Utilities`**, renamed through the label, the five
   translations, the window kind, the CSS classes and the test helpers rather
   than only on screen — the codebase's naming discipline is the reason the
   rename was worth doing properly rather than leaving `computer-folder-apps`
   behind a label that says something else.
4. **Five specs were found stale** during the reorganisation — they still
   reached for Paint and Calculator icons on the CaveOS desktop after those
   icons moved into the Utilities folder (named Apps at the time). They were failing, not skipping. Fixed in
   this pass; see [§3](#3-what-this-audit-found).

| Area | Behaviours | Covered | Coverage | Risk if broken |
| --- | ---: | ---: | ---: | --- |
| Quick login | 8 | 8 | **100%** | High |
| Desktop window chrome | 13 | 13 | **100%** | Medium |
| Web content: search & records | 14 | 14 | **100%** | High |
| CaveOS (shell, folders, 7 apps, themes) | 60 | 57 | **95%** | Medium |
| Progress timeline (corkboard) | 28 | 26 | **93%** | High — core mechanic |
| Persistence | 14 | 13 | **93%** | Critical — silent data loss |
| Localization | 14 | 13 | **93%** | Medium |
| Viewport / scene navigation | 13 | 12 | **92%** | Medium |
| Progress evidence (milestones) | 12 | 11 | **92%** | High |
| Web content: authentication | 11 | 10 | **91%** | High |
| Tooltips | 10 | 9 | **90%** | Low–Medium |
| Facsimile system | 12 | 11 | **92%** | High |
| Content authoring tool (API) | 13 | 12 | **92%** | Medium |
| Notifications | 9 | 8 | **89%** | Medium |
| Evidence system | 18 | 16 | **89%** | High |
| Desktop ashtray | 6 | 5 | **83%** | Low |
| Audio & settings | 10 | 8 | **80%** | Low–Medium |
| **Overall** | **266** | **247** | **≈93%** | |

*(The previous edition counted 155 behaviours. The 89 added here are almost all
genuinely new surface — the corkboard timeline alone accounts for 28 — rather
than a recount of the same ground.)*

---

## 0. Instrumentation gap

🔴 **Unchanged from the last audit, and now more pressing.**

There is still no code-coverage instrumentation. Every number in this report is
a manual behavioural audit, which is honest about *features* but blind to dead
code, unreachable branches and error paths no test drives.

`ui.js` is now **9,784 lines — 61% of the application**, up from 5,520 (55%) at
the last audit. That growth is mostly legitimate new features, but it means the
proportion of the app whose branch execution nobody can see has increased.

**Recommendation, unchanged and now the top item:** add V8 coverage collection
via Playwright (`page.coverage.startJSCoverage()`) behind a flag, or run under
`c8`/`nyc`. Half a day of work; converts every estimate in this document into a
measurement.

---

## 1. Localization audit

🟡 **Nearly clean on keys; a real gap in content.** This pass ran a full
cross-check of `localization.json` against every `localize()` call site and
every key-shaped string literal in the app source. That method is blind to two
things it separately turned up — one hardcoded literal and, far bigger, an
untranslated content file — both in
[§3.3](#33--a-hardcoded-english-string-in-the-facsimile-notification--and-every-fax-title-fixed).

| Check | Result |
| --- | --- |
| Languages | 5 (en, es, de, it, fr) |
| Keys per language | 282 — **identical in all five**, no missing, no extra |
| Empty values | 0 |
| Keys referenced by `localize()` but absent from the file | **0** |
| Hardcoded user-facing English strings in the app | **1 found and fixed** — see §3.3. |
| Fax/report titles in `reports_evidences.json` translated | **6 found untranslated, all 6 fixed** — see §3.3. |
| Other web content (`archives`/`library`/`police`/`standalone-pages`/`zoomsearch`) translated | 🔴 **No — left out of scope, see §3.3.** Nearly all prose in these five files is still English in `es`/`de`/`it`/`fr`. |

### CaveOS specifically

Every user-visible string in the computer is localized: window titles, close
aria-labels, icon labels, folder names and their double-click hint, the theme
picker's label and all five option names, every calculator key aria-label and
its error text, Paint's whole toolbar, and all four games' status bars, buttons,
hints and board aria-labels. The strings that stay in English do so **on
purpose** and are now asserted to stay that way, so a well-meaning translation
would fail the suite:

- `CAVE OS 1996` and `ui://desktop` — the machine's own branding
- `Netscape` / `Netscape Navigator 3.0` — a product name
- Site identity (`ZoomSearch`, `Police Records`) — brand names in the fiction

### The one finding: 8 orphan keys

🟡 These keys exist in all five languages but are named nowhere in the source —
leftovers from UI that has since been removed:

`clickAgainToStartNewGame`, `evidence`, `help`, `resume`, `counterLabel`,
`begin`, `importFromFileButton`, `closeWindowAriaLabel`

They cost nothing at runtime, and deleting translations is a one-way door, so
they are logged rather than removed. If they are genuinely dead, dropping them
removes 40 lines of noise from a file that is edited by hand.

A second, softer list is worth an eye rather than an action: values identical to
the English. Most are legitimate (`Sudoku`, `Tetris`, `Terminal`, `Redmond`, and
French/Italian cognates like `notes`, `photos`, `Score`), but the list is
reproducible with the audit script and is the cheapest way to spot a genuinely
missed translation.

---

## 2. Organisation and naming

🟢 **Fixed in this pass.** Spec naming had drifted into three competing schemes:
files that repeated their folder (`desktop-ashtray/desktop-ashtray.spec.js`),
files carrying a prefix that used to mean something (`browser-`, `desktop-`), and
files carrying a suffix the folder already said (`-localization`).

**The rule now:** a spec is named for its subject; the folder already says the
area. Applied across all 16 folders — 42 files renamed with `git mv` so history
follows them.

### CaveOS consolidation

CaveOS tests were in three places: `caveos-calculator-themes/`,
`notes-paint-documents/`, and one browser-chrome spec under
`web-content-search-records/`. They are now one folder:

```
tests/e2e/caveos/
  desktop-shell.spec.js     the OS frame: header, clock, MENU panel, window stacking
  folders.spec.js           the icon row and the Apps/Games folder system
  notes.spec.js             the ten-page notes document
  paint.spec.js             the ten-sketch paint document, tools, theme, eraser
  calculator.spec.js        the four-function calculator
  themes.spec.js            the five reskins
  games.spec.js             Minesweeper, Sudoku, Tetris, Snake
  echotrail.spec.js         the media library and its player
  netscape-chrome.spec.js   the browser's address bar and history dropdown
```

The line drawn: **the machine is `caveos/`, the web is not.** Netscape's chrome
is CaveOS; the four fictional websites, their search rules, their login gating
and their 25 authored records stay in `web-content-search-records/` and
`web-content-authentication/`, because those test the web, not the machine
showing it.

Shared CaveOS helpers now live in `tests/support/caveos-helpers.js` — the
language list, the folder openers, and `openCaveOsApp()`, which walks the whole
journey a player makes to reach an app. Five specs had been carrying their own
copy of the same four helpers.

`tests/e2e/progress-timeline/` — the newest and second-largest area — **had no
README**, the only folder in the suite missing one. Written in this pass.

---

## 3. What this audit found

### 3.1 🔴 Five stale specs, failing rather than skipping

When Paint and Calculator moved off the CaveOS desktop and into the Utilities folder (named Apps at the time),
five specs were not updated with them. They reached for `.computer-icon-paint` /
`.computer-icon-calculator` on the desktop, where those icons no longer exist,
and timed out:

- `caveos/calculator.spec.js` (its own `openCalculator` helper and the icon-order test)
- `caveos/themes.spec.js` (two tests)
- `localization/paint-and-notes.spec.js`
- `localization/menu-and-desktop-chrome.spec.js`
- `localization/window-titles-on-language-switch.spec.js`
- and `openPaint()` in the shared `tests/support/game-helpers.js`, which is why
  the breakage spread as far as it did

All fixed. The lesson is about the shared helper: `openPaint()` encoded a
navigation path, and when that path changed, every spec that trusted it broke at
once. That is the *correct* failure mode — one fix, not six — but it only works
if the helper is fixed rather than worked around.

### 3.2 🟡 A test that would have passed with the fix reverted

The icon-shape regression test (folder icons stretching into bars) was written
against the four-icon Games folder and **passed against the broken CSS**, because
`auto-fit` with four items happens to produce the right width. It only fails
against the two-icon Utilities folder. Caught by deliberately reverting the fix and
re-running — which is now the standing check for any regression test in this
project, and is written into the folder's README.

### 3.3 🟢 A hardcoded English string in the facsimile notification — and every fax title, fixed

`"Incoming facsimile"` was a literal in `ui.js`, so the notification announcing
an arriving fax read in English in all five languages. Localized, with the
fax's own authored title still shown exactly as written — the label is the app's
chrome and translates, the title is content and does not.

Worth noting against §1's headline that no hardcoded user-facing strings were
found: that audit walked `localize()` call sites and key-shaped literals, and a
bare English string interpolated into a template literal is exactly the shape it
could not see. The claim should be read as "no *keys* are missing", not "no
English is hardcoded".

**Following that thread up turned up a second, larger instance of the same
shape of bug.** Every `defaultTitleString` in `assets/*/reports_evidences.json`
— the title of every scripted fax, both Whitmore credential messages, and both
Fairchild insurance standalone pages — had been shipped as a byte-for-byte copy
of the English file into `es`/`de`/`it`/`fr`, while the `reportText` and
`descriptionText` sitting right beside each one had genuinely been translated.
The title fields were the one part of that file nobody had touched. This is
content, not code, so it was invisible to *any* mechanical audit of
`localize()` call sites — there is no key here at all, just a per-language JSON
file where one field was silently left in English.

Fixed: all six titles translated in all four languages, reusing the phrasing
each fax's own already-translated body uses for the same heading where one
exists. Regression coverage added in
`localization/facsimile-content.spec.js` — a title identical to English now
fails the suite, the same way an ECHOTRAIL track title identical to its
filename would.

**This was found by a targeted spot-check, not by this audit's method, and
the method has a real blind spot as a result.** The full scope was not
pursued here: a sweep of the other five content files (`archives.json`,
`library.json`, `police.json`, `standalone-pages.json`, `zoomsearch.json`)
found that nearly all of their prose — newspaper articles, library records,
police records, the standalone Whitmore pages, every ZoomSearch result — is
likewise untranslated in `es`/`de`/`it`/`fr`, unlike `reports_evidences.json`
and `photos_evidences.json` where translation work clearly happened. That is
hundreds of strings, is a content-authoring task rather than a code fix, and
was **explicitly left out of scope for this pass** rather than fixed — logged
here so it is not lost.

### 3.4 🔴 The test server had been silently disabling media seeking

Found while testing ECHOTRAIL's "a track that ends hands the music back to the
game". `tests/support/static-server.cjs` answered every request with a `200` and
the whole file — no `Accept-Ranges`, no `206`. Chromium therefore treated every
media file as non-seekable and **silently ignored** `audio.currentTime = …`:
the assignment appeared to succeed, no error was raised, and playback simply
carried on from where it was. A test written against it would have looked like a
product bug in the audio layer.

Fixed by teaching the server byte ranges, which is how real static hosts behave
anyway. Worth recording because it was invisible by construction — nothing fails
loudly, the seek just does not happen — and it had been making any
media-seeking test impossible for as long as the server has existed.

### 3.5 🟢 Key parity is genuinely complete

See §1. Every key referenced in source exists in all five languages and no
control bypasses `localize()`, which was the last audit's headline finding.
"Complete" is now stated more narrowly than it was: §3.3 is a reminder that key
parity and "nothing is hardcoded" are different claims, and only the first is
mechanically checked.

### 3.6 🔴 Milestone fax triggers never re-armed — a progression bug

The worst find of this pass, and a genuine soft-lock rather than a cosmetic
issue.

Both milestone-fax registries — `recordOpenFaxTriggers` in `ui.js` and
`evidenceTriggers` in `evidenceManager.js` — hold `once` triggers that delete
themselves the instant they fire. Both live in **module state, not the save**,
and nothing reset them. The consequence: the "already fired" flag outlived the
playthrough that set it. A player who finished a run and hit New Game, without
reloading the page, inherited the previous run's exhausted triggers and could
never receive those faxes again.

The sharpest form was **loading a save**: rewind to a point before a milestone
and the trigger for it was already gone, stranding the fax permanently. Since
one of those faxes carries the Level 3 police credentials, that stranded the
credentials too — locking the player out of `goldenpendant`, the Fairchild
insurance record, and the entire pendant thread for the rest of the session.

Fixed by clearing and re-registering both registries at three points: New Game,
a pasted save load, and a sticky-save resume. Re-arming is safe by
construction — every fax these triggers queue goes through
`queueFacsimileReport`, which already refuses a report that is pending or in
the persisted `consumedReportIds` list, so a re-armed trigger firing against an
already-read fax simply hits that guard.

**Why the whole suite missed it:** every other spec begins with
`page.goto("/")`, and a reload rebuilds the exact module state the bug lived
in. The bug was only reachable across two playthroughs in one page context,
which nothing did. The new regression tests deliberately reach New Game through
the pause menu instead of reloading — a version of them written the usual way
passes against the unfixed code, which was checked rather than assumed.

---

## 4. Detailed findings by area

### 4.1 CaveOS — 95% (60 behaviours, 57 covered) 🟢

Nine specs. The OS shell (header, live clock, MENU panel, window clipping and
stacking, closing the computer taking its app windows with it); the four-icon
desktop row and its wrap-only-when-narrow rule; the folder system's double-click
open, single-click contents and keyboard fallback; Notes and Paint's ten-page
document model; Paint's whole tool palette, brush size, colour well, theme-aware
canvas and the eraser painting back to the page's own ground; the calculator's
immediate-execution arithmetic; ECHOTRAIL's sortable media library and its
player; all five themes; and the four games.

Everything is driven through real input, including a real `dblclick` for folders
and real mouse drags for Paint. The one deliberate exception is Paint's native
colour well, which no automation can open; it is set through the `input` event
the picker itself fires, and that exception is documented in the README.

**ECHOTRAIL** is new this pass and arrived with 52 tests of its own: the six
authored tracks under their invented titles, lengths read from the files
themselves, all four columns sorting and reversing and tie-breaking stably,
selection kept distinct from playback, double click and Enter to play, the
transport stepping the list *as currently sorted*, and both halves of the
filename rule — a file named `backgroundMusic_<n>.mp3` joins the in-game music
rotation, anything else is playable in the library but permanently barred from
it. The behaviour with the most teeth is the music slot: a chosen track stops
the game's rotation, holds it off against every path that would restart it
(`force: true` included), and hands it back when the track ends.

Playback is asserted against the live `audioManager` singleton rather than a
stub. That proves the gesture reached the audio layer; it does not prove
anything was audible, which no browser automation can. Reaching a track's end
required `tests/support/static-server.cjs` to learn HTTP byte ranges — without
them Chromium treats media as non-seekable and silently ignores a `currentTime`
assignment, so the seek *appeared* to work and playback simply carried on. That
was found by probing rather than assumed, and it had been quietly making any
media-seeking test impossible.

**Still not covered:** how each theme *looks* (verified by eye); the
calculator's exponent-notation formatting for out-of-range results; Minesweeper
played to a win, Sudoku solved to completion, and Tetris scoring a line clear —
all reachable only through long scripted play, with the rules that produce them
covered piecemeal; ECHOTRAIL playing an mp4, which has no playback surface yet
and no fixture to point at; whether any audio is actually *audible*; and
click-to-focus promotion of a buried CaveOS window, which both folder windows
open too perfectly centred for a real mouse to reach past (covered against
offset windows in `desktop-window-chrome/focus-stacking.spec.js`).

### 4.2 Progress timeline (the corkboard) — 93% (28 behaviours, 26 covered) 🟢 *(new since the last audit)*

The largest single area in the suite by test count. Three specs cover the board's
snaking layout (earliest bottom-left, running right, then climbing back left),
six frames to a row, the arrows that trace the path including the turn arrow that
hangs above the frame its row ends on, the oversized question-mark frame; every
drag-and-drop path between the EVIDENCE envelope and the frames including
displacement, dropping on nothing, and a press that never moves; correctness
flagging and four-at-a-time locking; per-frame notes; artwork rendering with an
id/filename fallback; the envelope's three-part visibility rule and its own
draggability; the carousel's one-card slide and wraparound; and placements,
locks and notes surviving save/load, reload and New Game.

**Drag is performed with a real mouse throughout.** This is not a stylistic
choice: an earlier version of this suite dispatched synthetic `DragEvent`s and
all eighteen tests passed against a feature that did nothing whatsoever when a
photograph was pressed by hand.

**Still not covered:** the board at zoom levels other than the default, and the
easing curve of the carousel slide (its direction and one-card step are
asserted; the curve is not).

### 4.3 Progress evidence (milestones) — 92% (12 behaviours, 11 covered) 🟢 *(new since the last audit)*

Four specs: activation from a record open, a standalone page visit and a
consumed fax; the developer-enabled switch as a separate axis from player
activation; generated definitions and their id/control-digit rules; persistence
across save/load and New Game.

This system has no display of its own — the envelope now shows timeline
photographs — so its coverage is about state and triggers, with the visible
consequences tested in `progress-timeline/`.

**Still not covered:** the behaviour when a definition names a service that does
not exist (the manager rejects it, but only the tool's server API test drives
that path).

### 4.4 Tooltips — 90% (10 behaviours, 9 covered) 🟢 *(new since the last audit)*

One spec, driven entirely with a real pointer. The panel appearing on hover, the
native tooltip being suppressed and the `title` restored on leave, body-size text,
wrapping, cursor following, staying wholly on screen against a window edge,
localization in all five languages, and the player's own frame note being shown
verbatim rather than translated.

Real pointer movement is essential here rather than merely preferable: the whole
point of the layer is that the browser's own pointer machinery reaches it, over
elements that swallow pointer events and over the noticeboard's drag gestures.

**Still not covered:** the show delay itself (350 ms) as a timing assertion —
tests wait for the panel rather than asserting it did *not* appear sooner.

### 4.5 Desktop ashtray — 83% (6 behaviours, 5 covered) 🟡 *(new since the last audit)*

A new game starting lit; a real click stubbing out and relighting, with the
animation class appearing and clearing on schedule; a click mid-animation being
ignored rather than restarting or reversing it; the extinguished state surviving
save/load and a sticky-save resume.

**Still not covered:** the animation choreography itself — the multi-stage
transform keyframes, the ash flecks, the ignition flare. This is the area's whole
remaining gap and it is a genuinely hard one to assert without visual regression
baselines. Notably, a real bug *did* live here (an outer easing curve compressing
every authored keyframe beat into the first fraction of the duration) and no
test would have caught it.

### 4.6 Localization — 93% (14 behaviours, 13 covered) 🟢

Five specs in `localization/`, plus per-area localization tests inside `caveos/`,
`progress-timeline/` and elsewhere — which is the right split: a chrome string
belongs to the area that owns it.

All 5 languages, all 282 keys parity-checked, 10 window kinds re-titling live on
a mid-session switch without closing anything, and expected strings read straight
out of `localization.json` rather than hand-copied so a translation edit cannot
silently desync a test from its source of truth.

**Still not covered:** the autosave indicator's localized text
(`refreshAutosaveIndicatorLanguage()`) — the one item carried over unclosed from
the last audit.

### 4.7 Viewport / scene navigation — 92% (13 behaviours, 12 covered) 🟢

Wheel zoom through all 4 levels with clamping at both ends; drag panning and its
world-edge clamps; drag cancellation proven three ways (pointer leaving the
viewport, window blur, tab visibility change), each verified by showing that
further movement does not resume the pan; the table-leg perspective effect; the
whole noticeboard scene transition including its re-entrancy guard; and — new
this pass — `resetGameplayCameraToDefault()` on every route that arrives at a
gameplay scene.

**Still not covered:** the wheel-zoom anchor maths asserted directly against pan
position, and `applySceneTransform`'s resize re-layout on an actual viewport
resize.

### 4.8 Persistence — 93% (14 behaviours, 13 covered) 🟢

Unchanged and still the strongest area: sticky-save seeding, the 60s autosave
timer under `page.clock`, timer de-duplication across restarts, corrupt-save
recovery, isolation from unrelated localStorage keys, resume-after-refresh vs
in-memory resume, the New Game overwrite confirmation in all three outcomes, and
a full LZString round trip.

**Only gap, carried over unclosed:** `#copyButtonSavePopup` and
`#pasteButtonLoadPopup` are never clicked — the save string is read straight from
the textarea. Confirmed still true in this pass.

### 4.9 Evidence system — 89% (18 behaviours, 16 covered) 🟢

All 9 awarding records, both carousels with wraparound, empty states, the custom
name editor end to end, and both catalog error paths via fetch interception.

**Still not covered:** `addEvidenceTrigger`'s predicate/action API (no registered
trigger in the game uses it, so nothing exercises it), and SFX firing on an award.

### 4.10 Web content: search & records — 100% (14 behaviours, 14 covered) 🟢

Unchanged. All 25 authored records opened, detail-view metadata, section
headings, image galleries, per-site empty states, and the standalone Whitmore
page reached both through its in-page link and by address bar. The
References/Attachments blocks and the fields no authored record populates *on
purpose* are covered with synthetic data via catalog interception.

Note: `browser-address-history.spec.js` moved out of this folder to
`caveos/netscape-chrome.spec.js` — it tested the browser's chrome, not its
content.

### 4.11 Web content: authentication — 91% (11 behaviours, 10 covered) 🟢

Login/logout on both gated sites, privilege-level gating including the Level 3
police record, and session persistence across save/load.

### 4.12 Facsimile — 92% (12 behaviours, 11 covered) 🟢

Alert-light states, queueing, multi-message stepping, award-exactly-once, and
all three milestone triggers — two following delivered credentials through to
a working login, and a third (new this pass) whose payload is an ECHOTRAIL
unlock rather than evidence: confirmed it does not get filed as a Reports
entry despite arriving through the same fax machine, and confirmed the
unlocked track never joins the in-game background rotation.

Also new this pass: **both trigger registries re-arming across New Game and
load**, covering the progression bug in §3.6. Those tests run two playthroughs
in one page context rather than reloading between them, which is the only way
to reach the bug at all.

**Gap, carried over unclosed:** the two scripted new-game intro faxes
(`NEW_GAME_WELCOME_FAX_CONFIG` at 10s, `MISSING_REPORT_FAX_CONFIG` at 40s) are
never allowed to fire; tests inject the catalog entry directly. `page.clock` is
already in the suite for autosave and would make this cheap.

### 4.13 Notifications — 89% (9 behaviours, 8 covered) 🟢

Routing to all three targets, computer-closing behaviour, dismissal, the
already-open case, keyboard access, and the close-button overlap regression.

**Gap:** the 3-second queue release interval is never asserted as a *sequence* —
only the final total is counted.

### 4.14 Desktop window chrome — 100% (13 behaviours, 13 covered) 🟢

Complete. Drag with viewport-margin clamp, resize with minimum-size clamp,
dynamic `setResizable()`, click-to-focus z-index promotion, centring, scrollbar
visibility, the carousel aria-label API, and close/destroy — tested against
isolated `DesktopWindow` instances constructed in-page, except focus stacking,
which is app-level wiring and is tested through real windows.

### 4.15 Audio & settings — 80% (10 behaviours, 8 covered) 🟡

Every control driven and cross-checked against the live `audioManager`, plus
save/restore of all three persisted preferences via both a copy/paste round trip
and a real-refresh resume.

**Still not covered:** `onUserGesture()`'s autoplay unlock as a dedicated
pre-gesture-vs-post-gesture case, and SFX actually firing on desk-object clicks.
The second is now a broader gap than it was: the CaveOS games all play SFX and
none of it is asserted anywhere.

### 4.16 Quick login — 100% (8 behaviours, 8 covered) 🟢

Complete and unchanged.

### 4.17 Content authoring tool — 92% (13 behaviours, 12 covered) 🟢

All four sites plus standalone, five-language fan-out, update-in-place, three
validation rejections, and both id generators (Police case number, progress
evidence id) proven to scan live content rather than a stale counter.

**Gap, unchanged:** the browser-side builder UI has no committed tests — only its
server API does.

---

## 5. Cross-cutting risks

| | Risk | Detail |
| --- | --- | --- |
| 🔴 | **`ui.js` at 9,784 lines** | 61% of the app in one file, up from 5,520 (55%). No line coverage to show which parts execute. Highest-value target for instrumentation, and a standing argument for extraction — the CaveOS app factories alone are ~2,000 lines that have nothing to do with the desk. |
| 🟡 | **Single browser** | Chromium only. No Firefox or WebKit project configured. Canvas (Paint, Snake, Tetris), `getComputedStyle` assertions and the magnifier's transform maths are all engine-sensitive, and there are now three canvas games where there was one. |
| 🟡 | **Single viewport** | 1400×900 for everything except one narrow-viewport archives layout test and the CaveOS icon-wrap test. No mobile/tablet, no very large screens. |
| 🟡 | **Suite stability under parallelism** | At Playwright's default 8 workers the suite produces browser-target crashes and heap-corruption worker exits unrelated to any assertion. Pinned to 4 workers in `playwright.config.js`. Still a *masked* problem, not a solved one. |
| 🟡 | **Every spec starts from a fresh page load** | Structural blind spot, and the reason §3.6's soft-lock survived a suite this size. Almost every test opens with `page.goto("/")`, so any module-level state that outlives a playthrough but is never reset is invisible: the reload rebuilds it. Only `facsimile-system/milestone-triggers.spec.js` now drives two playthroughs in one page context. The remaining module-level flags *were* checked in this pass and are not progression gates — `gameplayInteractionsInitialized` and `progressEvidenceEnvelopeDragInitialized` are one-time DOM wiring, the rest are timer ids already cancelled on New Game — so this is a standing shape-of-bug risk for future features rather than a known live defect. Any new feature that gates content on a module-level `Map`/`Set`/flag instead of the save needs the same New Game and load reset the fax triggers now have. |
| 🟡 | **English-locked selectors** | Locators are written against `localization.json`'s `en` values. Several `game-helpers.js` helpers (`browserAddress`/`visitBrowserUrl`) locate elements by English accessible name and so hang rather than fail when driven in another language. `openPaint()` was fixed to a class selector in this pass; the rest are unchanged. Consider `data-testid` on high-traffic controls. |
| 🟡 | **No accessibility sweep** | Individual aria-labels are asserted throughout, but there is no axe/a11y scan of any screen. |
| 🟡 | **No visual regression** | One screenshot is captured as evidence (`tests/artifacts/`) but nothing compares it to a baseline. This is precisely the gap that leaves the ashtray animation and the five themes untestable. |
| 🟢 | **Content/test desync** | Well handled: specs that assert content read the same JSON the app fetches rather than hand-copying it. |
| 🔴 | **Web content is mostly untranslated** | New finding, §3.3. `archives.json`, `library.json`, `police.json`, `standalone-pages.json` and `zoomsearch.json` are nearly all still English prose in `es`/`de`/`it`/`fr` — headlines, articles, summaries, everything. `reports_evidences.json` and `photos_evidences.json` show real translation work; these five do not. No test catches this because it is a content-authoring gap, not a code path — there is nothing to assert against except the English text itself. |

---

## 6. Recommended plan

Ordered by value per unit of effort.

### Phase 1 — measure (≈0.5 day)
1. **Add V8/`c8` coverage instrumentation.** Unchanged as the top item since the
   first audit, and more valuable now that `ui.js` has grown 66%. Every estimate
   in this document becomes a measurement.

### Phase 2 — close the carried-over gaps (≈1 day)
2. Clipboard buttons in the save/load popups (`#copyButtonSavePopup`,
   `#pasteButtonLoadPopup`) — open since the first audit.
3. New-game intro fax timers via `page.clock`, which the suite already uses.
4. The autosave indicator's localized text.
5. The notification queue's 3-second release asserted as a sequence, not a total.

### Phase 3 — the gaps this audit opened (≈1.5 days)
6. **SFX assertions.** Nothing anywhere asserts a sound fired. With four games
   plus every desk object now playing SFX, a single spec that stubs the `Audio`
   constructor and counts calls would cover a lot of ground cheaply.
7. **Visual regression baselines** for the five CaveOS themes and the ashtray
   animation — the two areas that are untestable any other way.
8. Delete or keep the 8 orphan localization keys, deliberately.

### Phase 3.5 — translate the web content (scope unestimated)
8a. **`archives.json`, `library.json`, `police.json`, `standalone-pages.json`,
    `zoomsearch.json` need genuine translation** into `es`/`de`/`it`/`fr` — see
    §3.3. This is content authoring, not engineering, and hundreds of strings;
    called out on its own line because it dwarfs everything else in this plan
    and should be scoped and staffed separately rather than folded into a
    phase alongside half-day code fixes.

### Phase 4 — hardening (≈1.5 days)
9. Add a Firefox project; triage what breaks. Three canvas games raise the value
   of this since the last audit.
10. Root-cause the 8-worker instability rather than leaving it pinned at 4.
11. `data-testid` on the high-traffic controls that helpers locate by English name.

### Phase 5 — optional
12. axe accessibility sweep per screen.
13. Tests for the browser-side content builder UI.

---

## Appendix A: how to reproduce these numbers

```bash
npm run test:e2e                      # full suite -> test-reports/runs/<stamp>/
cat test-reports/history.md           # rolling index of the last 10 runs
cat test-reports/runs/<stamp>/summary.md

node scripts/run-tests.cjs --list-categories   # spec count per area
node scripts/run-tests.cjs --category caveos   # one area
```

Behaviour counts were derived by enumerating exported functions per module,
interactive element ids in `index.html`, records per content file under
`assets/en/`, keys in `localization.json`, and window kinds registered in
`ui.js` — then grepping `tests/` for each. No count was estimated by eye.

## Appendix B: the localization audit script

The key-parity, missing-key, orphan-key and identical-to-English checks in §1 are
mechanical. The script that produced them reads `localization.json` and every
`.js` file at the project root, and is worth re-running after any translation
edit:

1. Collect every `localize("key")` literal and every key-shaped string literal
   (so table-driven lookups like `titleKey: "closeSnakeWindowAriaLabel"` count).
2. Compare each language's key set against English — report missing, extra, empty.
3. Report keys referenced in source but absent from the file (**a real bug**).
4. Report keys in the file that appear nowhere in source (**probably dead**).
5. Report non-English values identical to English (**review, not a failure**).
