# Test suite

End-to-end Playwright tests for theCave. Everything test-related lives under
this folder; there is no second test location.

```
tests/
  e2e/        the game, driven through a real browser
  tools/      the authoring tooling (content builder HTTP API)
  support/    shared helpers and the static file server
  artifacts/  committed visual evidence produced by tests
```

Reports and run history are written to [`../test-reports/`](../test-reports/README.md).

## Running

```bash
npm run test:e2e            # everything, recorded into test-reports/runs/<stamp>/
npm run test:e2e:app        # tests/e2e only
npm run test:e2e:tools      # tests/tools only
node scripts/run-tests.cjs tests/e2e/browser-quick-login.spec.js
node scripts/run-tests.cjs --grep "quick login"
```

`npx playwright test` also works and writes to `test-reports/runs/adhoc/`, which
is excluded from the rolling history.

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
npm run test:e2e:headed -- tests/e2e/desktop-paint-window.spec.js
npm run test:e2e:headed -- --grep "flood fill"
node scripts/run-tests.cjs --headed --slow=800 tests/e2e/browser-site-search.spec.js
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
node scripts/run-tests.cjs --headed --slow tests/e2e/browser-quick-login.spec.js:28
```

Set your own pace with `--slow=<ms>` (400–800 is comfortable for reading text as
it renders; 1500 is good for catching a flash of the wrong state):

```bash
node scripts/run-tests.cjs --headed --slow=600 tests/e2e/browser-quick-login.spec.js:28
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

Every file is named for the functional area it covers, so `--grep`-free
filtering is just a path.

### `e2e/` — the game

| Spec | Covers |
| --- | --- |
| `menu-language-localization.spec.js` | Language flag buttons; menu and desktop chrome re-render; open windows re-title on a mid-session switch |
| `menu-new-game-lifecycle.spec.js` | New Game overwrite confirmation; cancel preserves the sticky save; confirm replaces it |
| `desktop-notes-window.spec.js` | Notes: ten-page model, per-page title commit, per-page body persistence |
| `desktop-paint-window.spec.js` | Paint: ten-sketch model, freehand drawing, flood fill, per-sketch canvas persistence |
| `desktop-facsimile-inbox.spec.js` | Fax inbox: alert light states, queueing, next-message stepping, award-exactly-once on close |
| `desktop-facsimile-milestone-triggers.spec.js` | Scripted faxes fired by evidence acquisition and by opening a specific police record; delivered credentials actually work |
| `evidence-magnifier.spec.js` | Magnifier lens over report text (including after scrolling) and over photos (alignment at centre and edge) |
| `evidence-awards-from-web-content.spec.js` | A standalone page awarding multiple evidences, each with its own reward toast |
| `browser-site-search.spec.js` | ZoomSearch / Library / Archives query submission, result rows, detail views, per-site empty states |
| `browser-authentication.spec.js` | Guest defaults, privilege gating, case-sensitive credentials, log out, session lifetime across navigation and save/load |
| `browser-quick-login.spec.js` | Quick login visibility rules, replay at the stored level, high-water-mark behaviour, save/load and New Game interaction |
| `browser-address-history.spec.js` | History recording, de-duplication, replaying a stored search, surviving a computer close and a save round trip |
| `browser-archives-login-layout.spec.js` | Subscriber login panel alignment against the Summary column, including at a narrow viewport |
| `notifications-window-shortcuts.spec.js` | Toasts as shortcuts to their desk object, closing the computer first, keyboard access, never covering a close button |
| `autosave-indicator.spec.js` | Floppy-disk indicator driven by the real 60s autosave: appearance, fade, single-element reuse, visibility in every scene |
| `persistence-sticky-save.spec.js` | localStorage seed write, 60s autosave timer, timer de-duplication, corrupt-save recovery, no collateral damage to other keys |
| `persistence-resume-after-refresh.spec.js` | Resume Game after a refresh versus returning to an in-memory game |
| `persistence-save-load-round-trip.spec.js` | Full LZString save payload round trip: evidence collections, notes bodies, new-game defaults |

### `tools/` — authoring tooling

| Spec | Covers |
| --- | --- |
| `web-content-builder-server.spec.js` | Content builder API: create/update records for all four sites plus standalone pages, with and without evidence, fanned out to all five language files; payload validation. Self-cleaning, with teardown verified by assertion |

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
