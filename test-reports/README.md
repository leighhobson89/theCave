# Test reports

Every recorded run of the Playwright suite lands here. This is the only place
test results are written — `test-results/` is Playwright's own scratch space for
traces and failure screenshots and is not a report.

## Layout

```
test-reports/
  README.md            this file (tracked in git)
  history.md           generated index of retained runs, newest first
  runs/
    2026-08-12T19-51-04/
      results.json     raw Playwright JSON reporter output
      summary.md       by-category and per-suite breakdown, failure list, embedded screenshots
      html/            full interactive Playwright HTML report
      artifacts/       failure evidence: screenshots, video, traces
    2026-08-12T18-04-11/
      ...
    adhoc/             overwritten by a bare `npx playwright test`; not history
```

`artifacts/` lives inside the run folder on purpose. Playwright wipes its output
directory at the start of every run, so leaving it at the default
`test-results/` meant each run destroyed the previous run's failure evidence —
the summaries survived in history but the screenshots did not.

## Running

```bash
npm run test:e2e            # whole suite, recorded into a new timestamped run
npm run test:e2e:app        # tests/e2e only (the game)
npm run test:e2e:tools      # tests/tools only (the content builder API)
npm run test:e2e:categories # list every tests/e2e/ category and its spec count
npm run test:e2e:category -- quick-login   # just that one category
npm run test:e2e:headed     # watch it in a real browser (single worker)
npm run test:e2e:slow       # ...with a 350ms pause between actions
npm run test:e2e:ui         # interactive UI mode (not recorded to history)
npm run test:e2e:debug      # Playwright Inspector (not recorded to history)
```

Any Playwright CLI argument is forwarded, so these work too:

```bash
node scripts/run-tests.cjs tests/e2e/quick-login/quick-login.spec.js
node scripts/run-tests.cjs --grep "quick login"

# one specific test, headed, slowed down enough to watch
npm run test:e2e:slow -- --grep "police quick login is hidden until a manual login succeeds"
node scripts/run-tests.cjs --headed --slow=600 tests/e2e/quick-login/quick-login.spec.js:28
```

See [`tests/README.md`](../tests/README.md#categories) for how the
`tests/e2e/<category>/` folders work, and
[`tests/README.md`](../tests/README.md#running-one-specific-test-slowly) for
the `--grep` caveats.

Opening the HTML report for a specific run:

```bash
npx playwright show-report test-reports/runs/<stamp>/html
```

## Failure evidence

Screenshots, video and traces are captured for **every test, on failure only**.
A green run produces no artifacts at all. See
[`tests/README.md`](../tests/README.md#failure-evidence) for the full table.

When a run fails, start with its `summary.md`: it lists each failure with the
first line of the error, embeds the screenshot inline, and gives you the
ready-to-paste command for the trace:

```bash
npx playwright show-trace test-reports/runs/<stamp>/artifacts/<test-dir>/trace.zip
```

## Rolling history

`scripts/run-tests.cjs` keeps the **10 most recent runs** and prunes older ones
after each run, so history accumulates rather than being wiped each time.
Override the depth with `CAVE_HISTORY_LIMIT`:

```bash
CAVE_HISTORY_LIMIT=25 npm run test:e2e
```

Run folders are gitignored — they contain videos and traces and are rebuilt on
every run. If you want a specific run's `summary.md` kept in version control,
copy it out of `runs/` before it ages past the limit.

A bare `npx playwright test` writes to `runs/adhoc/`, which is excluded from
history and overwritten each time, so ad-hoc debugging never displaces a
recorded run.
