#!/usr/bin/env node
//
// Runs the Playwright suite into a timestamped folder under test-reports/runs/
// and keeps a rolling history of the most recent runs (oldest pruned once the
// limit is exceeded, rather than wiped on every run).
//
// Usage:
//   node scripts/run-tests.cjs                    # whole suite
//   node scripts/run-tests.cjs tests/e2e          # only the e2e folder
//   node scripts/run-tests.cjs --grep "quick"     # any playwright CLI args
//   node scripts/run-tests.cjs --headed           # watch it in a real browser
//   node scripts/run-tests.cjs --headed --slow    # ...slowly enough to follow
//   node scripts/run-tests.cjs --slow=600         # custom pause, in ms
//
// One specific test, headed and slowed down (the usual debugging pass):
//   node scripts/run-tests.cjs --headed --slow tests/e2e/browser-quick-login.spec.js:28
//   npm run test:e2e:slow -- --grep "police quick login is hidden until a manual login succeeds"
//
// Note --grep is a regex over the FULL title path ("e2e/foo.spec.js > test
// name"), so "^test name" matches nothing, and a fragment matches every test
// containing it. Use file:line when you mean exactly one.
//
// Everything after the script name is forwarded to `playwright test` verbatim,
// except `--slow[=ms]`, which this script consumes and turns into an env var.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const REPORTS_ROOT = path.join(PROJECT_ROOT, "test-reports");
const RUNS_ROOT = path.join(REPORTS_ROOT, "runs");
const HISTORY_LIMIT = Number.parseInt(process.env.CAVE_HISTORY_LIMIT || "10", 10);

// 2026-08-12T19-51-04 -- sorts chronologically as a plain string, and is a
// legal directory name on Windows (no colons).
function runStamp(date = new Date()) {
  return date.toISOString().replace(/\..+$/, "").replace(/:/g, "-");
}

// Playwright colourises error messages for the terminal; those escape sequences
// are noise in a markdown file.
function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\[[0-9;]*m/g, "");
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.round((milliseconds || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// Playwright's JSON reporter nests suites arbitrarily deep; flatten to one row
// per test with the status of its last attempt.
function flattenTests(jsonReport) {
  const rows = [];

  const walkSuite = (suite, fileHint) => {
    const file = suite.file || fileHint || "";
    (suite.specs || []).forEach((spec) => {
      (spec.tests || []).forEach((testEntry) => {
        const lastResult = (testEntry.results || []).at(-1) || {};
        rows.push({
          file: spec.file || file,
          title: spec.title,
          status: testEntry.status || lastResult.status || "unknown",
          duration: lastResult.duration || 0,
          // Screenshot / video / trace captured at the moment of failure. Paths
          // are absolute in the JSON report; made repo-relative when written out.
          attachments: (lastResult.attachments || [])
            .filter((attachment) => attachment.path)
            .map((attachment) => ({ name: attachment.name, path: attachment.path })),
          errors: (lastResult.errors || [])
            .map((error) => stripAnsi(String(error.message || "")).split("\n")[0])
            .filter(Boolean),
        });
      });
    });
    (suite.suites || []).forEach((child) => walkSuite(child, file));
  };

  (jsonReport.suites || []).forEach((suite) => walkSuite(suite, suite.file));
  return rows;
}

function summarise(rows) {
  const counts = { passed: 0, failed: 0, timedOut: 0, skipped: 0, interrupted: 0, other: 0 };
  rows.forEach(({ status }) => {
    if (status in counts) {
      counts[status] += 1;
    } else if (status === "expected") {
      counts.passed += 1;
    } else if (status === "unexpected") {
      counts.failed += 1;
    } else {
      counts.other += 1;
    }
  });
  return counts;
}

function groupByFile(rows) {
  const byFile = new Map();
  rows.forEach((row) => {
    const key = row.file || "(unknown file)";
    if (!byFile.has(key)) {
      byFile.set(key, []);
    }
    byFile.get(key).push(row);
  });
  return byFile;
}

function writeSummary(runDir, stamp, rows, counts, wallClockMs, exitCode) {
  const total = rows.length;
  const verdict = exitCode === 0 ? "PASS" : "FAIL";
  const lines = [
    `# Test run ${stamp}`,
    "",
    `**Result:** ${verdict}  `,
    `**Total:** ${total}  `,
    `**Passed:** ${counts.passed}  `,
    `**Failed:** ${counts.failed + counts.timedOut + counts.interrupted}  `,
    `**Skipped:** ${counts.skipped}  `,
    `**Wall clock:** ${formatDuration(wallClockMs)}`,
    "",
    "## By suite",
    "",
    "| Suite | Tests | Passed | Failed | Time |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];

  for (const [file, fileRows] of groupByFile(rows)) {
    const fileCounts = summarise(fileRows);
    const fileTime = fileRows.reduce((sum, row) => sum + (row.duration || 0), 0);
    lines.push(
      `| ${file} | ${fileRows.length} | ${fileCounts.passed} | `
      + `${fileCounts.failed + fileCounts.timedOut + fileCounts.interrupted} | ${formatDuration(fileTime)} |`
    );
  }

  const failures = rows.filter((row) => ["failed", "timedOut", "interrupted", "unexpected"].includes(row.status));
  if (failures.length) {
    lines.push("", "## Failures", "");
    failures.forEach((row) => {
      lines.push(`### ${row.title}`, "");
      lines.push(`- **Status:** ${row.status}`);
      lines.push(`- **Spec:** \`${row.file}\``);
      row.errors.forEach((message) => lines.push(`- **Error:** ${message}`));

      // Link the captured evidence so a failure in history is reviewable
      // without re-running anything.
      const screenshot = row.attachments.find((a) => a.name === "screenshot");
      const video = row.attachments.find((a) => a.name === "video");
      const trace = row.attachments.find((a) => a.name === "trace");
      const rel = (attachment) => path.relative(runDir, attachment.path).split(path.sep).join("/");

      if (screenshot) {
        lines.push(`- **Screenshot:** [\`${rel(screenshot)}\`](${rel(screenshot)})`);
      }
      if (video) {
        lines.push(`- **Video:** [\`${rel(video)}\`](${rel(video)})`);
      }
      if (trace) {
        lines.push(`- **Trace:** \`npx playwright show-trace ${path.relative(PROJECT_ROOT, trace.path)}\``);
      }
      if (screenshot) {
        lines.push("", `![${row.title}](${rel(screenshot)})`);
      }
      lines.push("");
    });
  }

  lines.push("", `_Full HTML report: \`${path.relative(PROJECT_ROOT, path.join(runDir, "html", "index.html"))}\`_`, "");
  fs.writeFileSync(path.join(runDir, "summary.md"), lines.join("\n"), "utf8");
  return { total, verdict };
}

// Keeps the newest HISTORY_LIMIT run folders and deletes the rest. Timestamped
// names sort chronologically, so a plain reverse sort is enough. The "adhoc"
// folder (written by a bare `npx playwright test`) is never part of history.
function pruneHistory() {
  if (!fs.existsSync(RUNS_ROOT)) {
    return [];
  }

  const runDirs = fs
    .readdirSync(RUNS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "adhoc")
    .map((entry) => entry.name)
    .sort()
    .reverse();

  runDirs.slice(HISTORY_LIMIT).forEach((name) => {
    fs.rmSync(path.join(RUNS_ROOT, name), { recursive: true, force: true });
  });

  return runDirs.slice(0, HISTORY_LIMIT);
}

// A single file listing the retained runs newest-first, so the history is
// readable without opening each folder.
function writeHistoryIndex(retained) {
  const lines = [
    "# Test run history",
    "",
    `Most recent ${HISTORY_LIMIT} runs, newest first. Regenerated on every`,
    "`npm run test:e2e`. See `runs/<stamp>/summary.md` for per-run detail.",
    "",
    "| Run | Result | Passed | Failed | Total |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  retained.forEach((name) => {
    const summaryPath = path.join(RUNS_ROOT, name, "summary.md");
    if (!fs.existsSync(summaryPath)) {
      lines.push(`| ${name} | (no summary) | | | |`);
      return;
    }

    const text = fs.readFileSync(summaryPath, "utf8");
    const read = (label) => (text.match(new RegExp(`\\*\\*${label}:\\*\\* (.+?)\\s*$`, "m")) || [])[1] || "";
    lines.push(
      `| [${name}](runs/${name}/summary.md) | ${read("Result")} | `
      + `${read("Passed")} | ${read("Failed")} | ${read("Total")} |`
    );
  });

  lines.push("");
  fs.writeFileSync(path.join(REPORTS_ROOT, "history.md"), lines.join("\n"), "utf8");
}

function main() {
  const stamp = runStamp();
  const runDir = path.join(RUNS_ROOT, stamp);
  fs.mkdirSync(runDir, { recursive: true });

  const rawArgs = process.argv.slice(2);

  // `--slow` / `--slow=600` is ours, not Playwright's: strip it and translate it
  // into CAVE_SLOWMO, which playwright.config.js reads. Default 350ms is about
  // the slowest you can watch without losing patience on a full suite.
  const slowArg = rawArgs.find((arg) => arg === "--slow" || arg.startsWith("--slow="));
  const forwardedArgs = rawArgs.filter((arg) => arg !== slowArg);
  const slowMo = slowArg
    ? (Number(slowArg.split("=")[1]) || 350)
    : Number(process.env.CAVE_SLOWMO) || 0;

  // Playwright's own `--headed` flag switches the browser on but cannot reach
  // the `workers` expression in the config, which would leave four visible
  // browsers racing each other. Detect it here and set the env var the config
  // uses, so headed always means one browser.
  const isHeaded = forwardedArgs.includes("--headed")
    || process.env.CAVE_HEADED === "1"
    || process.env.CAVE_HEADED === "true";

  if (isHeaded) {
    console.log(
      `Headed mode: one worker, ${slowMo ? `${slowMo}ms between actions` : "full speed"}.`
    );
  }

  const startedAt = Date.now();

  // Run Playwright's CLI entry point under the current Node binary rather than
  // shelling out to `npx`: on Windows, Node refuses to spawn .cmd shims without
  // a shell (EINVAL), and this skips the npx resolution step entirely.
  let playwrightCli;
  try {
    playwrightCli = require.resolve("@playwright/test/cli");
  } catch {
    console.error("Could not resolve @playwright/test — run `npm install` first.");
    process.exit(1);
  }

  const result = spawnSync(
    process.execPath,
    [playwrightCli, "test", ...forwardedArgs],
    {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        CAVE_REPORT_DIR: runDir,
        CAVE_HEADED: isHeaded ? "1" : "",
        CAVE_SLOWMO: String(slowMo),
      },
    }
  );

  if (result.error) {
    console.error(`\nCould not start Playwright: ${result.error.message}`);
    process.exit(1);
  }

  const wallClockMs = Date.now() - startedAt;
  const exitCode = result.status === null ? 1 : result.status;

  const jsonPath = path.join(runDir, "results.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`\nNo JSON report at ${jsonPath} — the run did not reach the reporter.`);
    process.exit(exitCode || 1);
  }

  const jsonReport = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const rows = flattenTests(jsonReport);
  const counts = summarise(rows);
  const { total, verdict } = writeSummary(runDir, stamp, rows, counts, wallClockMs, exitCode);

  writeHistoryIndex(pruneHistory());

  console.log(`\n${verdict}: ${counts.passed}/${total} passed in ${formatDuration(wallClockMs)}`);
  console.log(`Report:  ${path.relative(PROJECT_ROOT, runDir)}`);
  console.log(`History: ${path.relative(PROJECT_ROOT, path.join(REPORTS_ROOT, "history.md"))}`);

  process.exit(exitCode);
}

main();
