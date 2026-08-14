# Progress Timeline Event System

The dated picture frames pinned to the noticeboard's corkboard, the pool of
photographs waiting in the manila EVIDENCE envelope, and the drag-and-drop
between them. The player investigates, photographs accumulate in the envelope,
and they drag each one onto the frame whose date it belongs to.

---

## Naming your artwork — the short version

**An artwork file is named after the frame it belongs in:**

```
assets/progressEvidenceImages/0220.png   ->  frame 0220 (Aug 1901)
assets/progressEvidenceImages/0390.png   ->  frame 0390 (1928)
```

That is the whole rule. If you are drawing the August 1901 search party, that
is frame `0220`, so the file is `0220.png`. Nothing else to look up, nothing to
keep in sync.

### Why not name it after the page it came from?

Because **one page can carry clues about several different dates**, which is
exactly the case that broke the first design. The John Baxley page is
progressEvidence `00002`, and it mentions both:

- the August 1901 search party → frame `0220`
- "joined our club in 1928 following his retirement" → frame `0390`

If artwork were named `00002.png` there could only ever be one file, one card in
the envelope, and two frames both claiming it. So the progressEvidenceId is
**not** the photograph's identity and **not** the answer key. It is only the
*unlock trigger*, and several events may name the same one:

```json
{ "progressTimeLineEventId": "0220", "unlockedByProgressEvidenceId": "00002", ... }
{ "progressTimeLineEventId": "0390", "unlockedByProgressEvidenceId": "00002", ... }
```

Opening the Baxley page once puts **two** photographs — `0220.png` and
`0390.png` — into the envelope, each correct in exactly one frame. There is no
suffix scheme, no `-a`/`-b`, and no second field to remember.

This relies on your guarantee that one photograph only ever fits one frame. If
that ever stops being true, this is the assumption to revisit.

---

## The three systems

| File | Holds |
| --- | --- |
| `evidenceManager.js` | The Reports/Photos/Story items the player collects and reads. |
| `progressEvidenceManager.js` | The milestone ids recorded when a page is opened or a fax is read. |
| `progressTimeLineEventManager.js` | The frames, the photographs, and what has been placed where. |

The dependency runs one way: the timeline asks progressEvidence whether a
milestone has been reached. `progressEvidenceManager.js` knows nothing about
the timeline.

---

## The flow, end to end

1. The player opens a web record, visits a standalone page, or opens and
   consumes a fax. That pushes a `progressEvidenceId` into the persisted
   collection.
   **No notification fires** — deliberately, so the player cannot
   reverse-engineer what triggered it.
2. Every timeline event naming that id as its `unlockedByProgressEvidenceId`
   (and which is developer-enabled) now has its photograph in the envelope.
3. The player drags a photograph out of the envelope onto a frame. **Any
   photograph may be dropped in any frame** — a wrong one is stored as
   incorrect rather than bounced.
4. A placed photograph **leaves the envelope**. There is only one of each.
5. Once **four correct placements** exist — *consecutive or not* — they lock
   together as a validated batch, and a "Timeline section validated"
   notification fires. Locking is the player's only confirmation that a batch
   was right, since individual frames never say.

### Moving photographs around

| Action | Result |
| --- | --- |
| Drag envelope card → frame | Placed; removed from the envelope. |
| Drag frame → another frame | Moved, not copied; the first frame empties. |
| Drag frame → envelope | Returned to the pool. |
| Click the frame's **×** button | Returned to the pool. |
| Drop onto an occupied frame | The photograph already there is displaced back to the envelope. |
| Anything involving a **locked** frame | Refused. |

### How the drag is implemented — and why not HTML5 DnD

Dragging is built on **pointer events and a floating ghost element**, not the
HTML5 drag-and-drop API. The native version was tried first and did not work at
all: no `dragstart` ever fired.

Two things on this screen defeat it:

- `.desktop-viewport` owns a `pointerdown` handler for panning the scene, which
  competes for the same gesture.
- The envelope window sits *on top of* the frames, so the drop has to pass
  through it — and toggling `pointer-events` on the window mid-drag is exactly
  the kind of thing that silently cancels a native drag in Chromium.

The hand-rolled version removes both failure modes:

| Piece | Behaviour |
| --- | --- |
| Threshold | A press becomes a drag only after 5px of travel, so clicking a card never lifts it. |
| Ghost | A copy of the artwork (`.progress-timeline-photo-ghost`), fixed-position, centred on the cursor, `pointer-events: none`. |
| Drop target | Resolved from **frame geometry** (`getBoundingClientRect`), never from `elementFromPoint` — so nothing on top can intercept it. |
| Envelope | Fades to 20% opacity and goes `pointer-events: none` for the duration, purely so the board is visible and cannot swallow the release. |
| Miss | Released off any frame and off the envelope, the photograph stays exactly where it started. |

`element.draggable` is explicitly set to `false`, and a `dragstart` handler
calls `preventDefault()`, so the inner `<img>` cannot start a second, competing
native drag on the same press.

### Which target wins when they overlap

The envelope window floats over the board, so a point can be inside both it and
a frame at once. Which one takes the drop depends on where the drag began,
because that is what the player is expressing:

- **from the envelope** → they are placing, so **frames win**
- **from a frame** → they may be putting it back, so the **envelope wins**

### Window size and position are load-bearing

The envelope window opens **small (0.32 x 0.38) and docked bottom-left**, not
centred and not full-bleed. This is not cosmetic:

- At the original 0.96 x 0.98 it covered the entire corkboard, so a photograph
  already in a frame could never be picked up — the window was on top of it.
- `DesktopWindow` centres by default, which puts it exactly over the middle of
  the board where frames land when panned into view.
- Pan clamping means a bottom-row frame cannot always be lifted *above* a
  bottom-docked window, so the clear area has to be to the **side** of it.

`focusNoticeboardOnElement()` (game.js) accordingly anchors a focused frame at
**0.76 across, 0.34 down** rather than dead centre, keeping it clear of the
envelope.

---

## Board layout — the snake

Frames run in a boustrophedon: the **earliest is bottom-left**, the row runs
right, then climbs a row and runs back **left**, and so on up the board. Arrows
trace that path, and the last frame points up at an oversized question-mark
frame centred at the top — the unanswered question the whole timeline is being
built to answer.

The snake is pure CSS once `renderProgressTimeLineBoard()` chunks the frames
into rows of `PROGRESS_TIMELINE_FRAMES_PER_ROW` (6), centred on the board:

- the board is `flex-direction: column-reverse`, so row 0 lands at the bottom;
- odd rows get `flex-direction: row-reverse`, so they run right-to-left;
- rows are `justify-content: center`; the snake still reads correctly because
  every full row spans the same width, so a reversed row starts directly above
  where the row below finished;
- the question-mark frame is appended **last**, so column-reverse puts it at the
  very top.

Arrows are one glyph rotated three ways (`is-right`, `is-left`, `is-up`), so
every arrow on the board is the same shape.

The two horizontal arrows are flex items sitting between frames, but the turn
arrow (`is-up`) is not: it is appended **inside** the frame its row ends on and
positioned absolutely, hanging above that frame, horizontally centred on it, in
the gap the board leaves between rows. Being out of the row's flow it costs no
layout — it cannot nudge the frames along or widen the row, which is why a
reversed row lines up column-for-column with the row below it.

### The board is tall, and that has consequences

Eight rows of six plus the oversized frame put the corkboard at **4180px**
inside a **4520px** scene. Two things follow:

- **Pan clamping is per scene.** `WORLD_HEIGHT` (1800) still describes the desk;
  the noticeboard uses `NOTICEBOARD_WORLD_HEIGHT`, selected by
  `getActiveWorldHeight()` in game.js. Sharing one height would leave most of
  the corkboard unreachable. **`NOTICEBOARD_WORLD_HEIGHT` must match
  `.noticeboard-scene`'s height in styles.css.**
- **Nothing can assume a frame is on screen.** Anything wanting to interact with
  a particular frame must call `focusNoticeboardOnElement()` first.

### Tuning knobs

| Knob | Where | Effect |
| --- | --- | --- |
| `PROGRESS_TIMELINE_FRAMES_PER_ROW` | ui.js | Frames per row (6); more per row = fewer rows = shorter board. |
| `--progress-timeline-frame-width` | `.noticeboard-scene` | One frame's width (220px). Height follows it via the slot's 3:4 aspect, so this scales a frame in both directions. The final frame is a multiple of it. |
| `--progress-timeline-final-frame-width` | `.progress-timeline-final-frame` | Currently `frame-width * 4`. The question mark scales with it automatically. |
| `--noticeboard-board-height` | `.noticeboard-scene` | Corkboard height. Raise it if rows are added. |
| `NOTICEBOARD_WORLD_HEIGHT` | constantsAndGlobalVars.js | **Must** track `.noticeboard-scene`'s height. |

---

## No tooltips — until a frame locks in

Neither a photograph in the envelope nor an unsettled frame on the board
carries a `title` attribute, and neither exposes its event description as an
accessible name either. A card's accessible name is its bare id; a frame's is
only the date already printed on its face.

Naming the event on hover would hand the player the answer while the frame is
still in play — working out which frame a photograph belongs to *is* the
puzzle. `progress-timeline-envelope.spec.js` asserts this for unsettled cards
and frames so it cannot regress.

**Once a frame locks**, the puzzle for it is over, so
`renderProgressTimeLineFrameContent()` sets its `title` to the event's
localized description at that point, and only at that point — never before,
and (since a locked frame never unlocks) never removed again. This is a plain
hover tooltip, not an accessible-name change: the frame's `aria-label` stays
the bare date even once locked.

The one tooltip a frame *does* carry before locking is the player's own note
(below), and that is deliberately the player's own words rather than anything
the registry knows.

---

## The player's note

Every unlocked frame carries a one-line text field above its photograph, plus a
cross that empties it. The player can write as much as they like — the field
scrolls sideways rather than wrapping — and hovering the photograph plays the
whole note back as a tooltip.

| Piece | Where |
| --- | --- |
| Storage | `progressTimeLineEventNotes` in `progressTimeLineEventManager.js`, frame id -> text |
| Read / write | `getProgressTimeLineEventNote()` / `setProgressTimeLineEventNote()` |
| Rendering | `renderProgressTimeLineFrameNote()` in `ui.js` |
| Styling | `.progress-timeline-frame-note*` in `styles.css` |

Notes ride in the same save payload as placements, under `notes`.

**Locking a frame deletes its note.** A note is scaffolding for a question that
is still open; once the frame is settled, the field and its cross are removed
and the text is dropped from the save rather than left as something the player
can see but never edit. `setProgressTimeLineEventNote()` refuses a locked
frame, and `setProgressTimeLineEventSnapshot()` drops any note restored against
one, so "locked frames have no note" holds for a loaded game too and not just
for the session that locked them.

Three things are load-bearing and easy to break:

- **The row keeps its height when the field goes.** `.progress-timeline-frame-note`
  is a fixed `--progress-timeline-frame-note-height`, so a locking frame does
  not shrink and reflow every row around it.
- **The frame's photo-remove cross is positioned below that row**, off the same
  variable. Without that it lands on top of the note's own clear button.
- **The field stops `pointerdown` from propagating.** The noticeboard pans from
  a pointerdown anywhere in the viewport, so without it a click into the field
  — or a drag to select the text in it — drags the whole corkboard instead.

The note tooltip sits on the **slot**, not the frame, for two reasons: it must
not fire over the input the player is typing into, and leaving a locked frame's
slot untitled lets the browser fall through to the frame's own `title`, which
is how the description takes over cleanly at lock.

---

## Registry schema

`assets/progressTimeLineEvent.json`:

```json
{
  "progressTimeLineEventId": "0220",
  "year": "081901",
  "unlockedByProgressEvidenceId": "00002",
  "availableFromStart": false,
  "progressTimeLineEventDeveloperEnabled": true,
  "description": {
    "en": "The NWMP search party ... works the cave and the old mine.",
    "de": "", "es": "", "fr": "", "it": ""
  }
}
```

### `progressTimeLineEventId`

The **authoritative ordering key**, and the identity of the frame, of the
photograph that belongs in it, and of the artwork file. A zero-padded 4-digit
string, allocated in steps of `10` (`0100`, `0110`, `0120`, …) so a new event
can always be dropped between two existing ones (`0111`–`0119`) without
renumbering. Starting at `0100` leaves the same room at the front.

The board sorts on this and nothing else. Fixed length means plain string
comparison is correct.

### `year`

A 6-character `MMYYYY` code — **month first, then year**. `"121901"` is
December 1901. Drives the caption under the frame; it is *not* an ordering key.

- Month `"00"` means the month is genuinely unknown; the frame prints the bare
  year (`"001988"` → `1988`).
- Same-year entries needing a stable order can use synthetic months
  (`"001901"`, `"011901"`, …) purely to break the tie.
- `"009999"` is the reserved sentinel for "no fixed in-fiction year"; it prints
  as *Present day*.

**Never sort the whole list by `year`.** With the month leading, `"121901"`
(Dec 1901) is numerically larger than `"001903"` (1903, month unknown), which
would sort December 1901 *after* 1903. That is why
`progressTimeLineEventId` exists.

### `unlockedByProgressEvidenceId`

The milestone that reveals this photograph — a *trigger*, not an answer.
Several events may share one (see the naming section above). A blank value
means nothing reveals the photograph yet, so it can never reach the envelope —
unless `availableFromStart` says otherwise (below).

### `availableFromStart`

"Starter kit" evidence: the player has this photograph from the very first
moment of a new game, with nothing to unlock at all. Checked *before*
`unlockedByProgressEvidenceId` in `isProgressTimeLinePhotoUnlocked()`, so it
overrides that field rather than needing it filled in — a blank
`unlockedByProgressEvidenceId` is fine on a starter event, and a populated one
(kept for lore/documentation reasons) is simply never consulted.

**Currently no event uses this flag.** `0140` (Andrew born) and `0150` (Arnie
born) used to be marked `availableFromStart`, but now unlock the ordinary way,
via the missing-person-report fax (`50002`) — the same trigger their
`unlockedByProgressEvidenceId` already named, so removing the flag was enough.
`0180` (the Spencers settle at Black Pine) now unlocks via `60001`, the
milestone recorded the moment the player opens the "Arnie Tragedy" background
story window (see [progress-evidence-system.md](progress-evidence-system.md)'s
`desktop` service) rather than being handed over regardless of anything the
player does.

The flag itself stays in the schema and in `isProgressTimeLinePhotoUnlocked()`
even with nothing currently using it — it is the mechanism for handing a
*future* event straight to the player from the first moment of a new game,
with nothing to unlock, and is worth keeping for that.

Unlike `unlockedByProgressEvidenceId`, there is nothing to *activate*: this is
a pure content flag, evaluated fresh from the registry every time, so it needs
no seeding on New Game and no save-file bookkeeping (contrast with
`progressEvidenceManager.js`'s `authoredActivatedIds`/`seedAuthoredActivations`,
which exists only because *that* system's "already true" state has to survive
being reset).

### `progressTimeLineEventDeveloperEnabled`

Whether this frame is on the board at all. Player progress never changes it.
Events stay registered either way, so the full timeline can keep growing while
the board shows only the curated subset. Currently **all 42 registered events**
are enabled — the whole timeline is on the board.

An unreleased frame also withholds its photograph from the envelope — otherwise
the player would hold a picture with nowhere to put it.

**Three events have no unlock trigger and are not starter evidence** — `0190`,
`0230`, `0240`. They come from the background story or from photo-catalog
entries that no page or fax reveals, so their frames render (the dates belong
on the timeline) but can never be filled. Give them a trigger, mark them
`availableFromStart`, or accept them as permanent gaps.

### `description`

Localized from the start: an object keyed by language code, with a key for
every language folder under `assets/` (`en`, `de`, `es`, `fr`, `it`). Only `en`
is authored; the rest are empty and ready for translation. Resolution falls
back to `en`, then to `""`.

---

## Missing artwork — the fallback

Only `0100`, `0130`, `0140`, `0150`, `0160`, `0170` and `0180` have artwork so
far, so the fallback is still the normal path for most of the timeline.
`createProgressEvidenceCardMedia()` attaches an `error` handler to the `<img>`;
on a 404 it swaps itself for a placeholder printing:

- an "Evidence pending" caption,
- the **photograph's id** (`0320`),
- the **filename it was looking for** (`0320.png`).

Frames reuse that exact builder, so an unfilled-art frame shows the same
id-and-filename card, scaled down. That is enough to test the whole system
before any artwork exists — which is what the suite does.

---

## Save / load

```js
gameState.progressTimeLineEvents = {
  placements: { "0130": "0130", ... },   // frame id -> photograph id
  lockedFrameIds: ["0130", "0270", ...],
  notes: { "0320": "the book one?" }     // frame id -> the player's own text
};
```

Correctness is **never read from the save** — it is recomputed from the ids
every time — so re-authoring the registry cannot leave a stale "correct" baked
into an old save. A locked frame that no longer holds a correct photograph is
dropped from the lock list on load, and a photograph appearing in two frames in
a hand-edited save keeps only its first occurrence.

A save written before this system existed has no field, treated as "nothing
placed yet". New Game clears placements, locks and notes; the frames survive,
being content.

---

## Developer surface

`window.progressTimeLineEventDeveloperTools`:

| Call | Does |
| --- | --- |
| `getProgressTimeLineEventEntries()` | Every registered event, chronological. |
| `getBoardProgressTimeLineEvents()` | Just the developer-enabled ones. |
| `getEnvelopeProgressTimeLinePhotos()` | The photographs currently in the pool. |
| `getProgressTimeLineFramePlacement(frameId)` | `{ progressTimeLinePhotoId, isCorrect, isLocked }` or null. |
| `getProgressTimeLineEventPlacements()` | All placements (**insertion order**). |
| `getCorrectlyPlacedProgressTimeLineFrameIds()` | Correct frames, **chronological**. |
| `getLockedProgressTimeLineFrameIds()` | Validated, settled frames. |
| `isProgressTimeLinePhotoUnlocked(photoId)` | Whether it has reached the envelope. |
| `getProgressTimeLineEventNote(frameId)` | The player's note on that frame, or `""`. |
| `placePhotoOnProgressTimeLineFrame(frameId, photoId)` | The drop path, without a real drag. |
| `returnProgressTimeLinePhotoToEnvelope(frameId)` | What the × button does. |
| `formatProgressTimeLineEventDate(year)` | The `MMYYYY` → caption formatter. |

`getProgressTimeLineEventPlacements()` returns keys in the order placements
were *made*. Anything needing chronological order must use
`getCorrectlyPlacedProgressTimeLineFrameIds()` or sort the keys itself.

---

## Tests

`tests/e2e/progress-timeline/` — 51 tests across three files:

- **`progress-timeline-board.spec.js`** (33) — frame rendering and ordering,
  date formatting, one-milestone-unlocks-several-photographs, locked-out
  photographs, correct/incorrect placement, displacement, the × button,
  frame→frame and frame→envelope drags, the ghost appearing and the envelope
  fading mid-drag, a sub-threshold press staying a click, a miss leaving the
  photograph put, four-correct locking, the locked-frame description tooltip,
  locked-frame refusal, the note field (typing, the clear cross, the hover
  tooltip, surviving a reload, and being removed and cleared on lock without
  the row shrinking), the missing-art fallback, real artwork, save/load,
  reload, New Game, plus the snaking layout, the arrows turning with it, and
  the oversized question-mark frame.
- **`progress-timeline-carousel.spec.js`** (7) — stepping, wraparound, the
  slide/fade animation, unlocked photographs filling the strip from the left,
  and the pool shrinking when a photograph is placed. Ported from the old
  progressEvidence carousel suite.
- **`progress-timeline-envelope.spec.js`** (11) — which photographs reach the
  envelope and when, that an untriggered non-starter photograph never reaches
  it, that a card is the bare photograph with no id printed on it, and that
  nothing carries a spoiler tooltip. No test currently exercises
  `availableFromStart` actually bypassing the trigger check, since no event in
  the registry uses the flag any more — see that field in the schema section
  above.

Drag tests drive a **real mouse** — `mouse.move` → `mouse.down` → stepped
`mouse.move` → `mouse.up` — not synthetic events.

This matters. The first version of these tests dispatched `DragEvent`s directly
with `page.evaluate`, which exercised the handlers and passed 18/18 against a
drag that did not work at all for a player. Synthetic events cannot tell you
whether a drag can *start*. Anything testing this interaction must go through
`page.mouse`. The note field is typed into the same way — a real click to focus
it and real keystrokes, never by assigning `.value`.

Driving a real mouse is necessary but not sufficient: a real-mouse test can
still be vacuous. "Using the note field does not drag the board underneath it"
originally dragged **rightward**, and pan is clamped to a maximum of 0
(`clampPan()` in game.js) with the focused frame already at that limit — so the
board could not have moved either way and the test passed against a deliberately
removed guard. It now drags leftward, and
"the same drag started on the frame body does pan the board" sits next to it as
the control that proves the gesture moves the board when nothing suppresses it.
Both were verified by removing the guard and watching the first fail and the
second pass.

No event currently uses `availableFromStart`, so the pool genuinely starts
empty and most assertions below say so directly. `progress-timeline-board.spec.js`
still folds a `STARTER_PHOTO_IDS` baseline (read from the registry, not
hardcoded) into its pool assertions via `sortedWithStarters()`, so it keeps
working unchanged if a future event is ever marked `availableFromStart` again.

```bash
npx playwright test tests/e2e/progress-timeline
```

The three long-standing envelope-position failures are fixed: the noticeboard
now opens at the bottom of the board (`focusNoticeboardAtBottom()`), which is
where the envelope rests, so it is on screen and reachable from the moment the
scene appears.

---

## Still to come

- **The two earliest frames cannot be dragged out of while the envelope window
  is open.** The window docks bottom-left over that corner of the board, and pan
  clamping cannot push `0100` or `0130` out from under it — they are already at
  the left edge of the scene — so a press on either lands on the window and no
  drag starts. Every other frame focuses clear of it, and the player can always
  close or move the window, so this is a rough edge rather than a dead end.
  `progress-timeline-board.spec.js` picks a frame clear of the window
  (`FRAME_CLEAR_OF_ENVELOPE_WINDOW`) and says why.
- **The envelope's right edge is clipped on narrow viewports.** The scene is
  wider than the corkboard and the view is centred horizontally, so at around
  1400 CSS px the rightmost ~50px of the envelope sits outside the viewport.
  It is still visible and clickable, and the whole corkboard is on screen;
  fixing it properly means either nudging the envelope left onto the board or
  anchoring the camera to the scene's bottom-right instead of bottom-centre.
- **Artwork** for every frame past `0130.png`.
- **The quiz phase.** The frames are the answer key; simple date questions can
  be generated straight from this registry.
- **Localizing `description`** into `de`/`es`/`fr`/`it`, and the month
  abbreviations, which currently fall back to English.
- **`availableFromStart` events**, if a future fact should be handed to the
  player from the first moment of a new game rather than unlocked — no event
  currently uses the flag, but it is kept in the schema for exactly that. See
  that field in the schema section above.
