# CaveOS

Everything inside the computer on the detective's desk: the OS shell, its
folder system, and every app that opens in it — Notes, Paint, Calculator,
Netscape's chrome, and the four games. See §8 of `docs/architecture.md` for the
implementation, the "CaveOS themes" section in `ui.js`, and the matching token
block in `styles.css`.

The one thing that lives *inside* CaveOS but is tested elsewhere is Netscape's
**content**: the four fictional websites, their search rules, their login gating
and the 25 authored records are `web-content-search-records/` and
`web-content-authentication/`. Those test the web, not the machine showing it.
Netscape's own chrome — address bar, history dropdown, nav buttons — is here.

| Spec | Covers |
| --- | --- |
| `desktop-shell.spec.js` | The OS frame itself: the CAVE OS 1996 header and `ui://desktop` subheader, the analogue clock actually running, the clock panel returning to the main menu, closing the computer taking its app windows with it, app windows being clipped to the OS screen rather than the desk, a second window opening above the first, and the shell chrome localized in all five languages (including the folder icons' double-click hint, and Netscape staying in English on purpose) |
| `folders.spec.js` | The desktop holding only the two folders then Notes and Netscape, in that order, on a single row that wraps only once the viewport is too narrow for four columns; icons inside a folder keeping the desktop's square shape; a single click on a folder doing nothing and a double click opening it; each folder's contents; keyboard access; re-opening toggling a folder closed; and folder names, titles and close aria-labels localized in all five languages |
| `notes.spec.js` | The ten-page paged-document model, per-page title commit, per-page body persistence |
| `paint.spec.js` | The ten-sketch model, per-sketch canvas persistence, every tool in the palette putting ink on the canvas, the brush-size slider and colour well changing what the pen lays down, the canvas ground and default pen following the theme, the eraser restoring that ground rather than painting white, flood fill, and a sketch surviving a save/load round trip |
| `calculator.spec.js` | Opening and closing the window; digits, all four operators, decimal point and sign keys; immediate-execution (left-to-right) chaining; divide-by-zero showing the error and Clear recovering; a reopened calculator starting fresh; and the icon label, window title, close aria-label, key aria-labels and error text localized in all five languages |
| `themes.spec.js` | The picker's placement in the title bar; Terminal as the default and all five themes offered in order; each theme producing a genuinely distinct palette with exactly one theme class applied; a theme reaching app windows inside the OS; Netscape's chrome following a theme while the fictional websites inside it do not; window geometry being unaffected by a theme change; the theme surviving a computer close/reopen, a save/load round trip and a real-browser-refresh resume; New Game resetting to Terminal; and the picker label and option names localized in all five languages |
| `games.spec.js` | Minesweeper's board, its always-safe first click, right-click and flag-mode flagging, and the loss that uncovers every mine; Sudoku's grid being a legal puzzle after the random transform, keypad and keyboard entry, givens refusing input, conflict marking, and New game dealing a different grid; Tetris starting on Enter, falling under gravity, moving and rotating and hard-dropping on real keys, ending when the well fills, and stopping its loop on close; Snake starting on Enter, moving on its own, a legal turn being taken and a reversal onto its own neck being refused, ending at a wall, restarting, and stopping its loop on close; Tetris following a theme change; and all four games localized in all five languages plus a mid-session language switch |
| `netscape-chrome.spec.js` | The address-history dropdown: recording visited pages, de-duplicating revisits, replaying a stored search, and surviving both a computer close and a save/load round trip |

Shared helpers live in `tests/support/caveos-helpers.js` — the language list,
the folder openers, and `openCaveOsApp()`, which walks the whole journey a
player makes to reach an app.

## How these are driven

Folders are opened with a **real `dblclick`** and their contents with a **real
single click**, because that difference in gesture is the feature — calling the
openers directly would pass with the double-click wiring removed entirely.
Snake's and Tetris's movement is observed through the canvas pixels changing
rather than by reading game state, for the same reason, and Paint is always
drawn on with a real mouse drag.

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

Paint's **brush size is a range slider and its colour is a native colour well**.
Neither takes `fill()`, and the OS colour picker cannot be driven at all, so the
slider is moved with real arrow keys and the colour is set with the `input`
event the picker itself would fire. That is the one deliberate exception to
"real input only" in this folder, and it is confined to the colour well.

**A note on timing:** the global `button { transition: background-color 0.3s }`
rule in `styles.css` means a button's colour arrives up to 300 ms after its
theme class does. Assertions on button colour use `expect.poll` for that
reason; reading immediately after the class lands catches a colour mid-fade.

**Still not covered:** how each theme looks (verified by eye during
development); the calculator's exponent-notation formatting for results too
large or small for the display; Minesweeper played all the way to a win, Sudoku
solved to completion, and Tetris scoring for a cleared line — all three
reachable only through long scripted play, with the rules that produce them
covered piecemeal above; and click-to-focus promotion of a *buried* CaveOS
window, which both folder windows open too perfectly centred to test with a
real mouse (it is covered against offset windows in
`desktop-window-chrome/focus-stacking.spec.js`).
