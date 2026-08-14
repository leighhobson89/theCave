# CaveOS calculator, themes, folders & games

The Calculator app, the four games (Snake, Minesweeper, Sudoku, Tetris), the
Apps/Games folder system, and the five-way theme picker in the computer
window's title bar. See the "CaveOS themes" section in `ui.js`, the matching
token block in `styles.css`, and §8 of `docs/architecture.md`.

| Spec | Covers |
| --- | --- |
| `caveos-calculator.spec.js` | Opening and closing the window; digits, all four operators, decimal point and sign keys; immediate-execution (left-to-right) chaining; divide-by-zero showing the error and Clear recovering; a reopened calculator starting fresh; and the icon label, window title, close aria-label, key aria-labels and error text localized in all five languages |
| `caveos-themes.spec.js` | The picker's placement in the title bar; Terminal as the default and all five themes offered in order; each theme producing a genuinely distinct palette with exactly one theme class applied; a theme reaching app windows inside the OS; Netscape's chrome following a theme while the fictional websites inside it do not; window geometry being unaffected by a theme change; the theme surviving a computer close/reopen, a save/load round trip and a real-browser-refresh resume; New Game resetting to Terminal; and the picker label and option names localized in all five languages |
| `caveos-folders-snake.spec.js` | The desktop holding only the two folders then Notes and Netscape, in that order and on a single row that wraps only once the viewport is too narrow for four columns; icons inside a folder keeping the desktop's square shape; a single click on a folder doing nothing and a double click opening it; each folder's contents opening on a single click; keyboard access to folders; Snake starting on Enter, moving on its own, ending at a wall and restarting; Snake's loop stopping when its window closes; Paint's canvas and default pen following the theme; the eraser restoring the canvas ground rather than white; and folder names and Snake localized in all five languages |
| `caveos-games.spec.js` | Minesweeper's board, its always-safe first click, right-click and flag-mode flagging, and the loss that uncovers every mine; Sudoku's grid being a legal puzzle after the random transform, keypad and keyboard entry, givens refusing input, conflict marking, and New game dealing a different grid; Tetris starting on Enter, falling under gravity, moving and rotating and hard-dropping on real keys, ending when the well fills, and stopping its loop on close; the games following a theme change; and all three localized in all five languages plus a mid-session language switch |

Folders are opened with a **real `dblclick`** and their contents with a **real
single click**, because that difference in gesture is the feature — calling the
openers directly would pass with the double-click wiring removed entirely.
Snake's and Tetris's movement is observed through the canvas pixels changing
rather than by reading game state, for the same reason.

Tetris's key handling is measured as the **horizontal extent of the blocks on
the canvas**, not as whole-frame comparisons. Gravity is pulling the piece down
throughout, so any before/after frame comparison would change on its own and
prove nothing; the piece only moves sideways when the player presses a key, so
a one-cell shift in `minX` is evidence a real key was handled. The rotation
check hunts across several pieces because the square tetromino looks identical
rotated.

The icon-shape test opens the **two-icon Apps folder** as well as Games. The
`1fr` tracks that caused the original bug stretch icons only when a folder holds
too few to fill the row, so a test that opened only the four-icon Games folder
would pass with the fix reverted — that was checked, not assumed.

Themes are asserted through **computed styles and CSS custom properties**, not
screenshots — the behaviour worth protecting is that the chrome re-reads the
theme's tokens, which a pixel comparison would test far more brittly and would
fail on unrelated layout changes.

**A note on timing:** the global `button { transition: background-color 0.3s }`
rule in `styles.css` means a button's colour arrives up to 300 ms after its
theme class does. Assertions on button colour use `expect.poll` for that
reason; reading immediately after the class lands catches a colour mid-fade.

**Still not covered:** how each theme looks (verified by eye during
development), the calculator's exponent-notation formatting for results too
large or small for the display, Minesweeper being played all the way to a win,
Sudoku being solved to completion, and Tetris scoring for a cleared line —
all three are reachable only through long scripted play, and the rules that
produce them are covered piecemeal by the tests above.
