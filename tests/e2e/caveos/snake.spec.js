// Snake, in the CaveOS Games folder.
//
// The board is a canvas, so movement is observed through the pixels changing
// rather than by reading game state — a test that read the game's own variables
// would pass with the rendering torn out.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame } = require("../../support/game-helpers");
const {
  CAVEOS_LANGUAGES,
  openCaveOsApp,
  startNewGameInLanguage,
} = require("../../support/caveos-helpers");

const SNAKE = {
  folder: "games",
  iconClassName: "computer-icon-snake",
  windowClassName: "caveos-snake-window",
};

const boardSignature = (page) => page.locator(".caveos-snake-board").evaluate(
  (canvas) => canvas.toDataURL().length + ":" + canvas.toDataURL().slice(-64)
);

test("Snake starts on Enter and moves on its own", async ({ page }) => {
  await startNewGame(page);
  await openCaveOsApp(page, SNAKE);

  const board = page.locator(".caveos-snake-app");
  await expect(board).toBeVisible();
  await expect(page.locator(".caveos-snake-score")).toHaveText(`${localization.en.snakeScoreLabel}: 0`);
  await expect(page.locator(".caveos-snake-hint")).toHaveText(localization.en.snakeStartHint);

  // A real key on the focused board, not a synthetic start call.
  await board.press("Enter");
  await expect(page.locator(".caveos-snake-hint")).toHaveText("");

  const firstFrame = await boardSignature(page);
  await expect.poll(() => boardSignature(page), { timeout: 4000 }).not.toBe(firstFrame);
});

test("Snake ends when it hits a wall, and Enter starts a fresh game", async ({ page }) => {
  await startNewGame(page);
  await openCaveOsApp(page, SNAKE);

  const board = page.locator(".caveos-snake-app");
  await board.press("Enter");

  // The snake starts travelling right from x=4 on a 24-wide board, so left
  // alone it runs into the right-hand wall within a few seconds.
  await expect(page.locator(".caveos-snake-hint"))
    .toContainText(localization.en.snakeGameOverText, { timeout: 8000 });

  await board.press("Enter");
  await expect(page.locator(".caveos-snake-hint")).toHaveText("");
  await expect(page.locator(".caveos-snake-score")).toHaveText(`${localization.en.snakeScoreLabel}: 0`);
});

test("an arrow key turns the snake, but a reversal onto its own neck is ignored", async ({ page }) => {
  await startNewGame(page);
  await openCaveOsApp(page, SNAKE);

  const board = page.locator(".caveos-snake-app");
  await board.press("Enter");

  // Travelling right; ArrowLeft would be an instant self-collision, so it must
  // be refused rather than ending the game.
  await board.press("ArrowLeft");
  await page.waitForTimeout(500);
  await expect(page.locator(".caveos-snake-hint")).toHaveText("");

  // A legal turn is accepted: heading up, the snake reaches the top wall and
  // ends the game far sooner than the right-hand wall would have taken.
  await board.press("ArrowUp");
  await expect(page.locator(".caveos-snake-hint"))
    .toContainText(localization.en.snakeGameOverText, { timeout: 6000 });
});

test("closing Snake stops its game loop", async ({ page }) => {
  await startNewGame(page);
  await openCaveOsApp(page, SNAKE);

  await page.locator(".caveos-snake-app").press("Enter");
  await page.waitForTimeout(400);
  await page.locator(".caveos-snake-window .story-window-close").click();
  await expect(page.locator(".caveos-snake-window")).toHaveCount(0);

  // A tick that survived its window would throw against the detached canvas;
  // the page staying error-free across several tick periods is the evidence.
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.waitForTimeout(800);
  expect(pageErrors).toEqual([]);
});

for (const language of CAVEOS_LANGUAGES) {
  test(`Snake is localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openCaveOsApp(page, SNAKE);

    await expect(page.locator(".caveos-snake-window .desktop-window-title"))
      .toHaveText(strings.computerSnakeWindowTitle);
    await expect(page.locator(".caveos-snake-window .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeSnakeWindowAriaLabel);
    await expect(page.locator(".caveos-snake-app"))
      .toHaveAttribute("aria-label", strings.snakeBoardAriaLabel);
    await expect(page.locator(".caveos-snake-score"))
      .toHaveText(`${strings.snakeScoreLabel}: 0`);
    await expect(page.locator(".caveos-snake-hint")).toHaveText(strings.snakeStartHint);
  });
}
