# Test suite

End-to-end Playwright tests for theCave. Everything test-related lives under
this folder; there is no second test location.

```
tests/
  e2e/                          the game, driven through a real browser
    <category>/*.spec.js        one folder per coverage area — see "Categories" below
  tools/                        the authoring tooling (content builder HTTP API)
  support/                      shared helpers and the static file server
  artifacts/                    committed visual evidence produced by tests
```

Reports and run history are written to [`../test-reports/`](../test-reports/README.md).

## Categories

Every coverage area under `tests/e2e/` is its own folder. This is a plain
filesystem convention, not a registry anywhere — Playwright's own file matching
already recurses into subfolders, so a new category is just a new folder:

```bash
mkdir tests/e2e/my-new-area
# drop *.spec.js files in it — nothing else to wire up
node scripts/run-tests.cjs --category my-new-area
```

```bash
npm run test:e2e:categories                    # list every category and its spec count
npm run test:e2e:category -- quick-login        # run just that one
node scripts/run-tests.cjs --category quick-login
```

```
$ npm run test:e2e:categories

Categories under tests/e2e/ (12):

  persistence                  5 specs
  web-content-search-records   3 specs
  evidence-system              2 specs
  facsimile-system             2 specs
  notes-paint-documents        2 specs
  localization                 1 spec
  notifications                1 spec
  quick-login                  1 spec
  web-content-authentication   1 spec
  audio-settings               (empty)
  desktop-window-chrome        (empty)
  viewport-scene-navigation    (empty)
```

An unknown category name, or one with no `.spec.js` files in it yet, fails with
a message pointing at that folder's `README.md` rather than Playwright's opaque
"No tests found" — try `node scripts/run-tests.cjs --category audio-settings`
to see it (that one's still empty; it's the top gap in
`docs/test-coverage-analysis.md`).

Every category folder has its own `README.md` describing its scope and current
specs — start there before adding a test, to confirm it belongs in that folder
rather than a neighbouring one.

## Running

Three scopes, from broadest to narrowest: **everything**, **one category
folder**, **one test**.

```bash
npm run test:e2e            # everything, recorded into test-reports/runs/<stamp>/
npm run test:e2e:app        # tests/e2e only
npm run test:e2e:tools      # tests/tools only
```

`npx playwright test` also works and writes to `test-reports/runs/adhoc/`, which
is excluded from the rolling history.

### Running all tests in one folder

Every category is a folder under `tests/e2e/` (see "Categories" above). Two
equivalent ways to run everything in one:

```bash
npm run test:e2e:category -- quick-login          # by category name
node scripts/run-tests.cjs --category quick-login
```

```bash
node scripts/run-tests.cjs tests/e2e/quick-login   # by path, same result
```

`--category` is worth reaching for over the raw path because it validates the
name — a typo or an empty category (e.g. `audio-settings`, which has no specs
yet) fails immediately with a clear message instead of Playwright's generic
"No tests found":

```
$ node scripts/run-tests.cjs --category qiuck-login
No such category: "qiuck-login"

Categories under tests/e2e/ (12):
  persistence                  5 specs
  ...
```

Both forms are recorded into `test-reports/history.md` like a full run, and the
run's `summary.md` still breaks results down "By category" and "By suite" even
when only one category ran.

**Headed, for the whole folder** — watch every test in a category run in a real
browser, one after another (see "Watching it run" below for what headed mode
does):

```bash
node scripts/run-tests.cjs --category persistence --headed --slow
node scripts/run-tests.cjs --category persistence --headed --slow=600
```

Via the npm script, the category name must come **immediately** after `--`
(it's appended straight onto the script's own `--category`), with any other
flags following it:

```bash
npm run test:e2e:category -- persistence --headed --slow=600
```

```
Headed mode: one worker, 600ms between actions.
Running 17 tests using 1 worker
```

This runs every spec in the folder back to back headed — for `persistence`
(the biggest category, 17 tests) that's several minutes of watching. Narrow
further with `--grep` if you only want to watch part of a large folder.

## Watching it run (headed mode)

```bash
npm run test:e2e:headed     # real browser window, full speed
npm run test:e2e:slow       # real browser, 350ms pause between actions
npm run test:e2e:ui         # Playwright UI mode: pick tests, time-travel, watch
npm run test:e2e:debug      # Playwright Inspector: step through, one at a time
```

Headed runs **force a single worker**, so you watch one browser rather than four
racing each other. Narrow the run and tune the pace with any Playwright argument
after `--`:

```bash
npm run test:e2e:headed -- tests/e2e/notes-paint-documents/desktop-paint-window.spec.js
npm run test:e2e:headed -- --grep "flood fill"
node scripts/run-tests.cjs --headed --slow=800 --category web-content-search-records
```

`--slow[=ms]` is this repo's flag, not Playwright's — the runner consumes it and
translates it into `slowMo`. `CAVE_HEADED=1` and `CAVE_SLOWMO=800` do the same
thing as environment variables if you want them set for a whole shell session.

### Running one specific test, slowly

This is the usual "why is *that one* failing?" workflow. Two ways to pin down a
single test; both run headed at 350ms per action.

**By test name** — copy the title straight out of the `test("…")` call:

```bash
npm run test:e2e:slow -- --grep "police quick login is hidden until a manual login succeeds"
```

```
Headed mode: one worker, 350ms between actions.
Running 1 test using 1 worker
  1 passed (6.4s)
```

**By file and line** — unambiguous, and the form the failure output already
gives you:

```bash
node scripts/run-tests.cjs --headed --slow tests/e2e/quick-login/browser-quick-login.spec.js:28
```

Set your own pace with `--slow=<ms>` (400–800 is comfortable for reading text as
it renders; 1500 is good for catching a flash of the wrong state):

```bash
node scripts/run-tests.cjs --headed --slow=600 tests/e2e/quick-login/browser-quick-login.spec.js:28
```

Two things worth knowing about `--grep`:

- It is a **regex matched against the full title path**, which includes the file
  prefix — so `--grep "^police quick login"` matches **nothing**, because the
  string it tests against starts with `e2e/browser-quick-login.spec.js › `. Just
  use the plain title, or a distinctive fragment of it.
- A fragment matches **every** test containing it. `--grep "police quick login"`
  runs three tests, not one. Use the full title, or `file:line`, when you mean
  exactly one.

To confirm what a selector will run before committing to a slow headed pass:

```bash
npx playwright test --grep "police quick login" --list
```

For picking apart one failure, `test:e2e:ui` and `test:e2e:debug` are usually
better than `--headed`: both are interactive, and neither records a run into
history.

## Failure evidence

Every test in every spec is already configured to capture evidence **on failure
only** (`playwright.config.js` → `use`). Passing tests produce nothing, which is
what keeps a green run's folder small.

| Artifact | Setting | What you get |
| --- | --- | --- |
| Screenshot | `screenshot: "only-on-failure"` | Full 1400×900 viewport PNG at the moment of failure |
| Video | `video: "retain-on-failure"` | WebM of the whole test, kept only if it failed |
| Trace | `trace: "retain-on-failure"` | Full Playwright trace — DOM snapshots, network, console, per-step timeline |
| Error context | automatic | Markdown dump of the page's accessibility tree at failure |

These land in `test-reports/runs/<stamp>/artifacts/`, **inside the run folder**,
so the rolling history keeps each run's failure evidence rather than the newest
run destroying the previous one's. The run's `summary.md` links each artifact and
embeds the screenshot inline.

The trace is the most useful of the four when a failure is not obvious:

```bash
npx playwright show-trace test-reports/runs/<stamp>/artifacts/<test-dir>/trace.zip
```

## Suites

Every spec is named for the specific behaviour it covers, and lives inside a
category folder named for the coverage area — so a path already tells you both.
A run's `summary.md` groups results the same way, under "By category" (a
rollup) and "By suite" (per file).

### `e2e/quick-login/` — 100% covered, the model to copy

| Spec | Covers |
| --- | --- |
| `browser-quick-login.spec.js` | Visibility rules, replay at the stored level, high-water-mark behaviour, save/load and New Game interaction |

### `e2e/persistence/` — save, load, sticky save, resume

| Spec | Covers |
| --- | --- |
| `autosave-indicator.spec.js` | Floppy-disk indicator driven by the real 60s autosave: appearance, fade, single-element reuse, visibility in every scene |
| `menu-new-game-lifecycle.spec.js` | New Game overwrite confirmation; cancel preserves the sticky save; confirm replaces it |
| `persistence-resume-after-refresh.spec.js` | Resume Game after a refresh versus returning to an in-memory game |
| `persistence-save-load-round-trip.spec.js` | Full LZString save payload round trip: evidence collections, notes bodies, new-game defaults |
| `persistence-sticky-save.spec.js` | localStorage seed write, 60s autosave timer, timer de-duplication, corrupt-save recovery, no collateral damage to other keys |

### `e2e/facsimile-system/`

| Spec | Covers |
| --- | --- |
| `desktop-facsimile-inbox.spec.js` | Alert light states, queueing, next-message stepping, award-exactly-once on close |
| `desktop-facsimile-milestone-triggers.spec.js` | Scripted faxes fired by evidence acquisition and by opening a specific police record; delivered credentials actually work |

### `e2e/notes-paint-documents/`

| Spec | Covers |
| --- | --- |
| `desktop-notes-window.spec.js` | Ten-page model, per-page title commit, per-page body persistence |
| `desktop-paint-window.spec.js` | Ten-sketch model, freehand drawing, flood fill, per-sketch canvas persistence |

### `e2e/evidence-system/`

| Spec | Covers |
| --- | --- |
| `evidence-magnifier.spec.js` | Magnifier lens over report text (including after scrolling) and over photos (alignment at centre and edge) |
| `evidence-awards-from-web-content.spec.js` | A standalone page awarding multiple evidences, each with its own reward toast |

### `e2e/progress-evidence/`

| Spec | Covers |
| --- | --- |
| `progress-evidence-activation-and-persistence.spec.js` | Nothing activated on a new game; `activateProgressEvidence()` adding an id; duplicate activation as a no-op; save/load round trip; a full save → reload → Resume cycle |
| `progress-evidence-envelope-display.spec.js` | The two-flag eligibility rule in all four combinations, refresh-on-open, three cards at once |
| `progress-evidence-images.spec.js` | `[progressEvidenceId].png` when it exists; the id-carrying placeholder when it does not |
| `progress-evidence-carousel.spec.js` | Prev/next with wraparound, and the one-card slide: four cards mid-step, end cards fading, the middle pair holding opacity and landing in their neighbours' slots |
| `progress-evidence-game-triggers.spec.js` | Activation from opening a website record, visiting a standalone page, and receiving a fax |
| `progress-evidence-generated-definitions.spec.js` | Definitions written by the web content builder tool: registered at startup, authored activation and image path, and no redefining a shipped id |
| `progress-evidence-existing-folders.spec.js` | Reports and Photos still behave exactly as before with progress evidence in play |

### `e2e/web-content-search-records/`

| Spec | Covers |
| --- | --- |
| `browser-site-search.spec.js` | ZoomSearch / Library / Archives query submission, result rows, detail views, per-site empty states |
| `browser-address-history.spec.js` | History recording, de-duplication, replaying a stored search, surviving a computer close and a save round trip |
| `browser-archives-login-layout.spec.js` | Subscriber login panel alignment against the Summary column, including at a narrow viewport |

### `e2e/web-content-authentication/`

| Spec | Covers |
| --- | --- |
| `browser-authentication.spec.js` | Guest defaults, privilege gating, case-sensitive credentials, log out, session lifetime across navigation and save/load |

### `e2e/localization/`

| Spec | Covers |
| --- | --- |
| `menu-language-localization.spec.js` | Language flag buttons; menu and desktop chrome re-render; open windows re-title on a mid-session switch |

### `e2e/notifications/`

| Spec | Covers |
| --- | --- |
| `notifications-window-shortcuts.spec.js` | Toasts as shortcuts to their desk object, closing the computer first, keyboard access, never covering a close button |

### `e2e/audio-settings/`, `e2e/desktop-window-chrome/`, `e2e/viewport-scene-navigation/`

Empty — the three named gaps flagged first in `docs/test-coverage-analysis.md`.
Each folder's `README.md` describes what belongs there.

### `tools/` — authoring tooling (not a game category — a separate kind of test)

| Spec | Covers |
| --- | --- |
| `web-content-builder-server.spec.js` | Content builder API: create/update records for all four sites plus standalone pages, with and without evidence, fanned out to all five language files; the Police case number and progressEvidenceId allocators; the progress evidence definition upsert into `assets/progressEvidence.json`; payload validation. Self-cleaning, with teardown verified by assertion |

## Conventions

- **Drive the UI, not the modules.** Helpers in `support/game-helpers.js` click
  real buttons. The handful that import app modules directly
  (`captureGameStatusForSaving`, address-history reads) are named so it is
  obvious they bypass the UI, and are used only where asserting on serialised
  state is the point of the test.
- **Selectors follow the English default.** Locators are written against
  `localization.json`'s `en` values. Changing an English string — even just
  rewording it — breaks locators, so treat those values as a contract.
- **Tests must self-clean.** `tools/web-content-builder-server.spec.js` writes
  to real content files; its teardown removes everything it created and then
  re-reads every file to *assert* nothing is left behind, rather than assuming
  the removal worked.
- **Parallelism is pinned.** See `workers` in `playwright.config.js` — the
  default of 8 on this machine crashes browser targets and produces failures
  unrelated to the assertions.
