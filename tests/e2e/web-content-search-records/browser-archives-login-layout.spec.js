// Layout regression for the Canada Newspaper Archive subscriber login panel,
// which is positioned to line its right edge up with the results table's
// Summary column rather than the page edge.
const { test, expect } = require("@playwright/test");
const { startNewGame, openNetscape, openArchives } = require("../../support/game-helpers");

test("archives subscriber login right edge aligns with the Summary column", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  const geometry = await page.evaluate(() => {
    const auth = document.querySelector(".browser-archives-auth");
    const headers = Array.from(document.querySelectorAll(".browser-page-archives .browser-results-table thead th"));
    const summary = headers[headers.length - 1];
    const table = document.querySelector(".browser-page-archives .browser-results-table");
    const shell = document.querySelector(".browser-page-shell-archives");
    return {
      authRight: auth.getBoundingClientRect().right,
      authLeft: auth.getBoundingClientRect().left,
      summaryRight: summary.getBoundingClientRect().right,
      summaryText: summary.textContent,
      tableRight: table.getBoundingClientRect().right,
      shellRight: shell.getBoundingClientRect().right,
    };
  });

  expect(geometry.summaryText).toBe("Summary");
  // Same edge, allowing only for sub-pixel layout rounding.
  expect(Math.abs(geometry.authRight - geometry.summaryRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.authRight - geometry.tableRight)).toBeLessThanOrEqual(1);

  // The two edges must meet by the login panel moving inward, NOT by the
  // results table stretching out to the page edge: the right gutter stays.
  expect(geometry.shellRight - geometry.tableRight).toBeGreaterThan(200);
  expect(geometry.authLeft).toBeGreaterThan(0);
});

test("archives subscriber login stays aligned when the viewport narrows", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await page.setViewportSize({ width: 1000, height: 900 });

  const geometry = await page.evaluate(() => {
    const auth = document.querySelector(".browser-archives-auth");
    const headers = Array.from(document.querySelectorAll(".browser-page-archives .browser-results-table thead th"));
    return {
      authRight: auth.getBoundingClientRect().right,
      summaryRight: headers[headers.length - 1].getBoundingClientRect().right,
    };
  });

  expect(Math.abs(geometry.authRight - geometry.summaryRight)).toBeLessThanOrEqual(1);
});
