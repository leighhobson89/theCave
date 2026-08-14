# `e2e/progress-timeline/`

The corkboard timeline: the dated frames pinned to the noticeboard, the pool of
photographs in the manila EVIDENCE envelope, and the drag-and-drop between them.

A photograph is identified by the frame it was drawn for — its id **is** a
`progressTimeLineEventId`, and so is its artwork filename. The
`progressEvidenceId` on an event is only the unlock *trigger*, which is why one
source can legitimately reveal several photographs.

Implementation: [`progressTimeLineEventManager.js`](../../../progressTimeLineEventManager.js)
and the board/envelope rendering in [`ui.js`](../../../ui.js). The developer
guide is
[`docs/progress-timeline-event-system.md`](../../../docs/progress-timeline-event-system.md).

The separate milestone system that *unlocks* these photographs is
[`../progress-evidence/`](../progress-evidence/); it has no display of its own.

## Scope

| Spec | Covers |
| --- | --- |
| `board.spec.js` | One frame per developer-enabled event in id order; dates printed, falling back to the bare year; the snaking layout (earliest bottom-left, running right, then climbing back left), six frames to a row, rows centred, arrows tracing the path and the turn arrow hanging above the frame its row ends on; the oversized question-mark frame at the top centre; every drag-and-drop path between envelope and frames, including displacing an occupant, dropping on nothing, and a press that never moves being a click; correctness flagging and four-at-a-time locking; per-frame notes and their cross button; a locked frame refusing to be emptied, replaced or dragged out of; artwork rendering and the id/filename fallback; and placements, locks and notes surviving save/load, a page reload and New Game |
| `envelope.spec.js` | The envelope pinned to the corkboard and opening the carousel; the noticeboard opening at the bottom with the envelope in reach, and returning there; the three-part rule that decides what is inside (developer-enabled ∧ milestone activated ∧ not already placed); the envelope picking up photographs unlocked while it was closed; cards being the photograph alone with no id and no tooltip; and the envelope being draggable to a new spot that survives save/reload while New Game puts it back |
| `carousel.spec.js` | The carousel staying disabled until a fourth photograph exists (three fit on screen at once); stepping in both directions with wraparound; the strip visibly sliding one card along rather than swapping all three; the two cards that stay on screen keeping their places; and placing a photograph in a frame removing it from the strip |

## How these are driven

Drag-and-drop is performed with **`page.mouse.move` / `down` / `up`**, never by
dispatching `DragEvent`s. An earlier version of this suite dispatched synthetic
drag events and all eighteen tests passed against a feature that did nothing at
all when a photograph was pressed by hand. Synthetic events only prove the
handlers work once invoked; they cannot prove the browser will ever invoke them,
so they are blind to every bug where the interaction cannot start — a competing
`pointerdown`, an overlay intercepting the gesture, `pointer-events` toggling.

For the same reason the note field's tests check both directions: that typing in
it does *not* pan the board underneath, and that the same drag started on the
frame body does.

Event definitions are read from the same JSON the app fetches rather than
hand-copied, so a content edit cannot silently desync a test from what it
checks.

**Still not covered:** the board's behaviour at zoom levels other than the
default, and the exact easing of the carousel slide (its direction and
one-card step are asserted; the curve is not).
