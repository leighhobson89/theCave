const path = require("path");
const { defineConfig } = require("@playwright/test");

// Where this run's reports are written. `npm run test:e2e` (scripts/run-tests.cjs)
// points these at a timestamped folder under test-reports/runs/ and keeps a
// rolling history; running `npx playwright test` directly falls back to
// test-reports/runs/adhoc so it never overwrites a recorded run.
const REPORT_DIR = process.env.CAVE_REPORT_DIR
  || path.join(__dirname, "test-reports", "runs", "adhoc");

// Headed mode. `--headed` on the CLI also works and takes precedence; the env
// var exists so `CAVE_HEADED=1` can be set once for a whole shell session.
const HEADED = process.env.CAVE_HEADED === "1" || process.env.CAVE_HEADED === "true";

// Milliseconds to pause between actions. Only useful with a visible browser --
// at 0 (the default) a headed run is still too fast to follow by eye.
const SLOW_MO = Number(process.env.CAVE_SLOWMO) || 0;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  // Playwright's default (half the CPU count, 8 here) has been observed to
  // destabilise this suite on Windows: browser targets crash and workers exit
  // with heap-corruption codes, producing failures unrelated to the assertions.
  // Four is stable and costs roughly 20s on a full run. Override deliberately:
  //   CAVE_WORKERS=8 npm run test:e2e
  // Headed runs force a single worker so you are watching one browser, not four.
  workers: HEADED ? 1 : (Number(process.env.CAVE_WORKERS) || 4),

  // Failure artifacts (screenshot, video, trace, error context) are written
  // here. Keeping it inside the run folder is deliberate: Playwright wipes its
  // output directory at the start of every run, so leaving this at the default
  // `test-results/` meant each run destroyed the previous run's failure
  // evidence -- the summaries survived in history but the screenshots did not.
  outputDir: path.join(REPORT_DIR, "artifacts"),

  reporter: [
    ["line"],
    ["json", { outputFile: path.join(REPORT_DIR, "results.json") }],
    ["html", { outputFolder: path.join(REPORT_DIR, "html"), open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: !HEADED,
    launchOptions: SLOW_MO ? { slowMo: SLOW_MO } : {},
    viewport: {
      width: 1400,
      height: 900,
    },
    // Applies to every test in every spec. `only-on-failure` captures at the
    // moment of failure; passing tests produce no artifacts, which is what
    // keeps a green run's folder small.
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node tests/support/static-server.cjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
