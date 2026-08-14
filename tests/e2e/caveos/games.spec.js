// Minesweeper, Sudoku and Tetris — the three games that joined Snake in the
// CaveOS Games folder.
//
// Every game is driven the way a player drives it: real clicks on real cells,
// real right clicks to flag, real keys on the focused board. Nothing here calls
// an opener or a game function directly, because a test that did would still
// pass with the click wiring torn out.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { startNewGame, openComputer } = require("../../support/game-helpers");
const {
  CAVEOS_LANGUAGES,
  closeCaveOsWindow,
  gamesFolderWindow,
  openCaveOsApp,
  openGamesFolder,
  selectCaveOsTheme,
  startNewGameInLanguage,
  switchLanguageMidGame,
} = require("../../support/caveos-helpers");

const LANGUAGES = CAVEOS_LANGUAGES;

// Open one game the whole way through: new game, computer, Games folder, then a
// single click on the icon — the same journey a player makes.
async function openGame(page, iconClassName, windowClassName) {
  await startNewGame(page);
  await openCaveOsApp(page, { folder: "games", iconClassName, windowClassName });
}

/* ---------------------------------------------------------------------------
   Minesweeper
   --------------------------------------------------------------------------- */

test("Minesweeper opens from the Games folder with a full board and no mines laid", async ({ page }) => {
  await openGame(page, "computer-icon-minesweeper", "caveos-minesweeper-window");

  await expect(page.locator(".caveos-minesweeper-window .desktop-window-title"))
    .toHaveText(localization.en.computerMinesweeperWindowTitle);
  await expect(page.locator(".caveos-minesweeper-cell")).toHaveCount(81);
  await expect(page.locator(".caveos-minesweeper-mines"))
    .toHaveText(`${localization.en.minesweeperMinesLabel}: 10`);
  await expect(page.locator(".caveos-minesweeper-state"))
    .toHaveText(localization.en.minesweeperStartHint);
});

test("the first click is always safe and opens a region", async ({ page }) => {
  await openGame(page, "computer-icon-minesweeper", "caveos-minesweeper-window");

  // The very first click of a fresh board, repeated on fresh boards, must never
  // hit a mine — that is the guarantee laying the mines after the first click
  // is there to provide.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.locator(".caveos-minesweeper-cell").nth(40).click();

    await expect(page.locator(".caveos-minesweeper-state"))
      .not.toHaveText(localization.en.minesweeperLostText);
    // The clicked square and its neighbours are all mine-free, so at least the
    // nine of them open together.
    const revealed = await page.locator(".caveos-minesweeper-cell.is-revealed").count();
    expect(revealed).toBeGreaterThanOrEqual(9);

    await page.locator(".caveos-minesweeper-new-game").click();
    await expect(page.locator(".caveos-minesweeper-cell.is-revealed")).toHaveCount(0);
  }
});

test("a right click plants a flag and decrements the mine counter", async ({ page }) => {
  await openGame(page, "computer-icon-minesweeper", "caveos-minesweeper-window");

  const cell = page.locator(".caveos-minesweeper-cell").first();
  await cell.click({ button: "right" });

  await expect(cell).toHaveClass(/is-flagged/);
  await expect(page.locator(".caveos-minesweeper-mines"))
    .toHaveText(`${localization.en.minesweeperMinesLabel}: 9`);

  // A flagged square is protected: a left click on it must not reveal it.
  await cell.click();
  await expect(cell).not.toHaveClass(/is-revealed/);

  await cell.click({ button: "right" });
  await expect(cell).not.toHaveClass(/is-flagged/);
  await expect(page.locator(".caveos-minesweeper-mines"))
    .toHaveText(`${localization.en.minesweeperMinesLabel}: 10`);
});

test("flag mode turns a plain left click into a flag", async ({ page }) => {
  await openGame(page, "computer-icon-minesweeper", "caveos-minesweeper-window");

  const flagToggle = page.locator(".caveos-minesweeper-flag-toggle");
  await flagToggle.click();
  await expect(flagToggle).toHaveAttribute("aria-pressed", "true");

  const cell = page.locator(".caveos-minesweeper-cell").nth(5);
  await cell.click();
  await expect(cell).toHaveClass(/is-flagged/);
  await expect(cell).not.toHaveClass(/is-revealed/);

  await flagToggle.click();
  await expect(flagToggle).toHaveAttribute("aria-pressed", "false");
});

test("hitting a mine ends the game and shows every mine", async ({ page }) => {
  await openGame(page, "computer-icon-minesweeper", "caveos-minesweeper-window");

  // Open a corner to lay the mines, then keep clicking covered squares until
  // one of them goes off. Ten mines in eighty-one squares makes this quick, and
  // it is still the player's own left click that finds them.
  await page.locator(".caveos-minesweeper-cell").first().click();

  for (let attempt = 0; attempt < 81; attempt += 1) {
    const covered = page.locator(".caveos-minesweeper-cell:not(.is-revealed)");
    if (!(await covered.count())) {
      break;
    }

    await covered.first().click();

    if (await page.locator(".caveos-minesweeper-cell.is-mine").count()) {
      break;
    }
  }

  await expect(page.locator(".caveos-minesweeper-state"))
    .toHaveText(localization.en.minesweeperLostText);
  // Losing uncovers the lot, so all ten are on show.
  await expect(page.locator(".caveos-minesweeper-cell.is-mine")).toHaveCount(10);
});

/* ---------------------------------------------------------------------------
   Sudoku
   --------------------------------------------------------------------------- */

test("Sudoku opens with a solvable-looking grid of givens and blanks", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  await expect(page.locator(".caveos-sudoku-window .desktop-window-title"))
    .toHaveText(localization.en.computerSudokuWindowTitle);
  await expect(page.locator(".caveos-sudoku-cell")).toHaveCount(81);

  const givens = page.locator(".caveos-sudoku-cell.is-given");
  await expect(givens).toHaveCount(30);

  // Every given carries a digit, and every blank is genuinely blank.
  const texts = await page.locator(".caveos-sudoku-cell").evaluateAll(
    (cells) => cells.map((cell) => ({
      isGiven: cell.classList.contains("is-given"),
      text: cell.textContent.trim(),
    }))
  );
  texts.forEach(({ isGiven, text }) => {
    expect(isGiven ? /^[1-9]$/.test(text) : text === "").toBe(true);
  });
});

test("the generated grid is a legal sudoku: no digit repeats in a row, column or box", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  // The puzzle is produced by shuffling a known-good grid, so the shuffle
  // itself is what needs guarding — a bad transform would show up as a repeat.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const values = await page.locator(".caveos-sudoku-cell").evaluateAll(
      (cells) => cells.map((cell) => cell.textContent.trim())
    );

    const groups = [];
    for (let line = 0; line < 9; line += 1) {
      const row = [];
      const column = [];
      const box = [];
      const boxRow = Math.floor(line / 3) * 3;
      const boxColumn = (line % 3) * 3;

      for (let step = 0; step < 9; step += 1) {
        row.push(values[line * 9 + step]);
        column.push(values[step * 9 + line]);
        box.push(values[(boxRow + Math.floor(step / 3)) * 9 + boxColumn + (step % 3)]);
      }

      groups.push(row, column, box);
    }

    groups.forEach((group) => {
      const filled = group.filter(Boolean);
      expect(new Set(filled).size).toBe(filled.length);
    });

    await page.locator(".caveos-sudoku-new-game").click();
  }
});

test("a blank takes a digit from the keypad, and a given refuses one", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  const blank = page.locator(".caveos-sudoku-cell:not(.is-given)").first();
  await blank.click();
  await expect(blank).toHaveClass(/is-selected/);

  await page.locator(".caveos-sudoku-key", { hasText: /^7$/ }).click();
  await expect(blank).toHaveText("7");

  await page.locator(".caveos-sudoku-clear").click();
  await expect(blank).toHaveText("");

  // A given is a clue, not an entry: selecting it and pressing a key must leave
  // it exactly as the puzzle set it.
  const given = page.locator(".caveos-sudoku-cell.is-given").first();
  const givenText = await given.textContent();
  await given.click();
  await page.locator(".caveos-sudoku-key", { hasText: /^4$/ }).click();
  await expect(given).toHaveText(givenText);
});

test("typing a digit fills the selected cell, and the arrows move the selection", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  const cells = page.locator(".caveos-sudoku-cell");
  const blank = page.locator(".caveos-sudoku-cell:not(.is-given)").first();
  await blank.click();

  const startIndex = Number(await blank.getAttribute("data-index"));

  // A real key on the focused cell, not a dispatched event.
  await page.keyboard.press("ArrowRight");
  await expect(cells.nth(startIndex + 1)).toHaveClass(/is-selected/);

  await page.keyboard.press("ArrowDown");
  await expect(cells.nth(startIndex + 10)).toHaveClass(/is-selected/);
});

test("a digit that clashes with a given is marked as a conflict", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  // Find a blank in the same row as a given, and type that given's digit into
  // it: both cells should light up as clashing.
  const { blankIndex, givenIndex, digit } = await page.locator(".caveos-sudoku-cell").evaluateAll(
    (cells) => {
      for (let row = 0; row < 9; row += 1) {
        const rowCells = cells.slice(row * 9, row * 9 + 9);
        const given = rowCells.find((cell) => cell.classList.contains("is-given"));
        const blank = rowCells.find((cell) => !cell.classList.contains("is-given"));
        if (given && blank) {
          return {
            blankIndex: Number(blank.dataset.index),
            givenIndex: Number(given.dataset.index),
            digit: given.textContent.trim(),
          };
        }
      }
      return null;
    }
  );

  const cells = page.locator(".caveos-sudoku-cell");
  await cells.nth(blankIndex).click();
  await page.locator(".caveos-sudoku-key", { hasText: new RegExp(`^${digit}$`) }).click();

  await expect(cells.nth(blankIndex)).toHaveClass(/is-conflict/);
  await expect(cells.nth(givenIndex)).toHaveClass(/is-conflict/);
});

test("New game deals a different grid", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  const readGrid = () => page.locator(".caveos-sudoku-cell").evaluateAll(
    (cells) => cells.map((cell) => cell.textContent.trim()).join("")
  );

  const first = await readGrid();
  // The transform is random, so a repeat is possible but vanishingly unlikely
  // to happen four times running.
  let sawDifferent = false;
  for (let attempt = 0; attempt < 4 && !sawDifferent; attempt += 1) {
    await page.locator(".caveos-sudoku-new-game").click();
    sawDifferent = (await readGrid()) !== first;
  }

  expect(sawDifferent).toBe(true);
});

/* ---------------------------------------------------------------------------
   Tetris
   --------------------------------------------------------------------------- */

test("Tetris starts on Enter and the well changes on its own", async ({ page }) => {
  await openGame(page, "computer-icon-tetris", "caveos-tetris-window");

  await expect(page.locator(".caveos-tetris-window .desktop-window-title"))
    .toHaveText(localization.en.computerTetrisWindowTitle);
  await expect(page.locator(".caveos-tetris-score"))
    .toHaveText(`${localization.en.tetrisScoreLabel}: 0`);
  await expect(page.locator(".caveos-tetris-lines"))
    .toHaveText(`${localization.en.tetrisLinesLabel}: 0`);
  await expect(page.locator(".caveos-tetris-hint"))
    .toHaveText(localization.en.tetrisStartHint);

  const board = page.locator(".caveos-tetris-app");
  await board.press("Enter");
  await expect(page.locator(".caveos-tetris-hint")).toHaveText("");

  // The well is a canvas, so gravity is observed through the pixels changing
  // rather than by reading game state.
  const wellSignature = () => page.locator(".caveos-tetris-board").evaluate(
    (canvas) => canvas.toDataURL().length + ":" + canvas.toDataURL().slice(-64)
  );

  const firstFrame = await wellSignature();
  await expect.poll(wellSignature, { timeout: 5000 }).not.toBe(firstFrame);
});

// The horizontal extent of everything drawn in the well. Blocks are painted in
// the theme's bright ink; the ground and the faint grid lines over it are not,
// so a green channel above 200 picks out blocks and nothing else. Measuring
// columns rather than comparing whole frames matters because gravity is pulling
// the piece down throughout — the vertical position moves on its own, the
// horizontal one only moves when the player presses a key.
function pieceColumns(page) {
  return page.locator(".caveos-tetris-board").evaluate((canvas) => {
    const { width, height } = canvas;
    const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);

    let minX = Infinity;
    let maxX = -Infinity;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 1] > 200) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }

    return { minX, maxX, width: maxX - minX };
  });
}

test("the arrow keys move and rotate the falling piece", async ({ page }) => {
  await openGame(page, "computer-icon-tetris", "caveos-tetris-window");

  const board = page.locator(".caveos-tetris-app");
  await board.press("Enter");

  // Pieces spawn centred in a ten-wide well, so there is always room to step
  // left, and one press must move the piece exactly one 22px cell.
  const beforeMove = await pieceColumns(page);
  await board.press("ArrowLeft");
  const afterMove = await pieceColumns(page);
  expect(afterMove.minX).toBe(beforeMove.minX - 22);

  await board.press("ArrowRight");
  expect((await pieceColumns(page)).minX).toBe(beforeMove.minX);

  // The square piece looks identical rotated, so this hunts for a piece that
  // visibly turns — its footprint gets narrower or wider — dealing a new one
  // with a hard drop whenever the current one does not.
  let sawRotation = false;
  for (let attempt = 0; attempt < 10 && !sawRotation; attempt += 1) {
    const beforeRotate = await pieceColumns(page);
    await board.press("ArrowUp");
    sawRotation = (await pieceColumns(page)).width !== beforeRotate.width;

    if (!sawRotation) {
      await board.press(" ");
      await page.waitForTimeout(120);
    }
  }

  expect(sawRotation).toBe(true);
});

test("the space bar drops the piece straight to the floor", async ({ page }) => {
  await openGame(page, "computer-icon-tetris", "caveos-tetris-window");

  const board = page.locator(".caveos-tetris-app");
  await board.press("Enter");

  const lowestBlockRow = () => page.locator(".caveos-tetris-board").evaluate((canvas) => {
    const { width, height } = canvas;
    const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);

    for (let y = height - 1; y >= 0; y -= 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 1] > 200) {
          return y;
        }
      }
    }

    return -1;
  });

  // The well is twenty rows of 22px, so the bottom row runs to y=439. A hard
  // drop puts the piece there at once — somewhere gravity, at one row every
  // 560ms, would take a good ten seconds to reach.
  await board.press(" ");
  await expect.poll(lowestBlockRow, { timeout: 3000 }).toBeGreaterThan(410);
});

test("Tetris ends when the well fills, and Enter starts a fresh game", async ({ page }) => {
  await openGame(page, "computer-icon-tetris", "caveos-tetris-window");

  const board = page.locator(".caveos-tetris-app");
  await board.press("Enter");

  // Hard-dropping every piece into the same column stacks it to the ceiling
  // before long. Twenty rows, four-cell pieces, so forty drops is ample.
  for (let drop = 0; drop < 60; drop += 1) {
    if (await page.locator(".caveos-tetris-hint").evaluate(
      (element) => element.textContent.trim() !== ""
    )) {
      break;
    }

    await board.press("ArrowLeft");
    await board.press("ArrowLeft");
    await board.press("ArrowLeft");
    await board.press("ArrowLeft");
    await board.press("ArrowLeft");
    await board.press(" ");
  }

  await expect(page.locator(".caveos-tetris-hint"))
    .toContainText(localization.en.tetrisGameOverText, { timeout: 10000 });

  await board.press("Enter");
  await expect(page.locator(".caveos-tetris-hint")).toHaveText("");
  await expect(page.locator(".caveos-tetris-score"))
    .toHaveText(`${localization.en.tetrisScoreLabel}: 0`);
});

test("closing Tetris stops its drop loop", async ({ page }) => {
  await openGame(page, "computer-icon-tetris", "caveos-tetris-window");

  await page.locator(".caveos-tetris-app").press("Enter");
  await page.waitForTimeout(400);
  await page.locator(".caveos-tetris-window .story-window-close").click();
  await expect(page.locator(".caveos-tetris-window")).toHaveCount(0);

  // A drop that survived its window would throw against the detached canvas;
  // the page staying error-free across several drop periods is the evidence.
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.waitForTimeout(1600);
  expect(pageErrors).toEqual([]);
});

/* ---------------------------------------------------------------------------
   Themes and localization
   --------------------------------------------------------------------------- */

test("the games follow the CaveOS theme", async ({ page }) => {
  await openGame(page, "computer-icon-tetris", "caveos-tetris-window");

  const readWellPixel = () => page.locator(".caveos-tetris-board").evaluate((canvas) => {
    const [red, green, blue] = canvas.getContext("2d").getImageData(1, 1, 1, 1).data;
    return `${red},${green},${blue}`;
  });

  // Terminal's ground is the dark green #041204.
  await expect.poll(readWellPixel).toBe("4,18,4");

  await selectCaveOsTheme(page, "redmond");
  // The well repaints on the next frame it draws, which the running game
  // supplies; starting it guarantees one without waiting on gravity.
  await page.locator(".caveos-tetris-app").press("Enter");
  await expect.poll(readWellPixel, { timeout: 4000 }).toBe("255,255,255");
});

for (const language of LANGUAGES) {
  test(`Minesweeper, Sudoku and Tetris are localized in ${language.code}`, async ({ page }) => {
    const strings = localization[language.code];
    await startNewGameInLanguage(page, language.buttonId);
    await openComputer(page);
    await openGamesFolder(page);

    const folder = gamesFolderWindow(page);
    await expect(folder.locator(".computer-icon-minesweeper .computer-icon-label"))
      .toHaveText(strings.computerMinesweeperIconLabel);
    await expect(folder.locator(".computer-icon-sudoku .computer-icon-label"))
      .toHaveText(strings.computerSudokuIconLabel);
    await expect(folder.locator(".computer-icon-tetris .computer-icon-label"))
      .toHaveText(strings.computerTetrisIconLabel);

    await folder.locator(".computer-icon-minesweeper").click();
    await expect(page.locator(".caveos-minesweeper-window .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeMinesweeperWindowAriaLabel);
    await expect(page.locator(".caveos-minesweeper-mines"))
      .toHaveText(`${strings.minesweeperMinesLabel}: 10`);
    await expect(page.locator(".caveos-minesweeper-state"))
      .toHaveText(strings.minesweeperStartHint);
    await expect(page.locator(".caveos-minesweeper-new-game"))
      .toHaveText(strings.minesweeperNewGameButton);
    await expect(page.locator(".caveos-minesweeper-flag-toggle"))
      .toHaveText(strings.minesweeperFlagModeButton);
    await closeCaveOsWindow(page, "caveos-minesweeper-window");

    await folder.locator(".computer-icon-sudoku").click();
    await expect(page.locator(".caveos-sudoku-window .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeSudokuWindowAriaLabel);
    await expect(page.locator(".caveos-sudoku-state")).toHaveText(strings.sudokuHint);
    await expect(page.locator(".caveos-sudoku-new-game")).toHaveText(strings.sudokuNewGameButton);
    await expect(page.locator(".caveos-sudoku-clear")).toHaveText(strings.sudokuClearKey);
    await closeCaveOsWindow(page, "caveos-sudoku-window");

    await folder.locator(".computer-icon-tetris").click();
    await expect(page.locator(".caveos-tetris-window .story-window-close"))
      .toHaveAttribute("aria-label", strings.closeTetrisWindowAriaLabel);
    await expect(page.locator(".caveos-tetris-score"))
      .toHaveText(`${strings.tetrisScoreLabel}: 0`);
    await expect(page.locator(".caveos-tetris-lines"))
      .toHaveText(`${strings.tetrisLinesLabel}: 0`);
    await expect(page.locator(".caveos-tetris-hint")).toHaveText(strings.tetrisStartHint);
  });
}

test("a mid-session language switch re-titles the open games", async ({ page }) => {
  await openGame(page, "computer-icon-sudoku", "caveos-sudoku-window");

  await expect(page.locator(".caveos-sudoku-state")).toHaveText(localization.en.sudokuHint);

  // The language buttons live on the pause menu, so the switch is made the way
  // a player makes it: Escape, pick a flag, resume.
  await switchLanguageMidGame(page, "btnFrench");

  await expect(page.locator(".caveos-sudoku-window .desktop-window-title"))
    .toHaveText(localization.fr.computerSudokuWindowTitle);
  await expect(page.locator(".caveos-sudoku-state")).toHaveText(localization.fr.sudokuHint);
  await expect(page.locator(".caveos-sudoku-new-game")).toHaveText(localization.fr.sudokuNewGameButton);
});
