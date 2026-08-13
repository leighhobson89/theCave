# Progress Timeline Event System

The dated picture frames pinned to the noticeboard's corkboard, the pool of
photographs waiting in the manila EVIDENCE envelope, and the drag-and-drop
between them. The player investigates, photographs accumulate in the envelope,
and they drag each one onto the frame whose date it belongs to.

---

## Naming your artwork — the short version

**An artwork file is named after the frame it belongs in:**

```
assets/photos/progressTimeLineEventImages/0220.png   ->  frame 0220 (Aug 1901)
assets/photos/progressTimeLineEventImages/0390.png   ->  frame 0390 (1928)
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
| `progressEvidenceManager.js` | The milestone ids recorded when a page is opened or a fax arrives. |
| `progressTimeLineEventManager.js` | The frames, the photographs, and what has been placed where. |

The dependency runs one way: the timeline asks progressEvidence whether a
milestone has been reached. `progressEvidenceManager.js` knows nothing about
the timeline.

---

## The flow, end to end

1. The player opens a web record, visits a standalone page, or receives a fax.
   That pushes a `progressEvidenceId` into the persisted collection.
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

### Window size is load-bearing

The envelope window opens at **0.62 x 0.52** of the viewport, not full-bleed. At
its original 0.96 x 0.98 it covered the entire corkboard, which made a
photograph already sitting in a frame impossible to pick up — the window was on
top of it. Leaving the board visible around the window is what makes
frame-to-frame and frame-to-envelope drags physically possible.

---

## Registry schema

`assets/progressTimeLineEvent.json`:

```json
{
  "progressTimeLineEventId": "0220",
  "year": "081901",
  "unlockedByProgressEvidenceId": "00002",
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
means nothing reveals the photograph yet, so it can never reach the envelope.

### `progressTimeLineEventDeveloperEnabled`

Whether this frame is on the board at all. Player progress never changes it.
Events stay registered either way, so the full timeline can keep growing while
the board shows only the curated subset. Currently **14 of 43** are enabled.

An unreleased frame also withholds its photograph from the envelope — otherwise
the player would hold a picture with nowhere to put it.

### `description`

Localized from the start: an object keyed by language code, with a key for
every language folder under `assets/` (`en`, `de`, `es`, `fr`, `it`). Only `en`
is authored; the rest are empty and ready for translation. Resolution falls
back to `en`, then to `""`.

---

## Missing artwork — the fallback

Only `0130.png` exists so far, so the fallback is the normal path.
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
  lockedFrameIds: ["0130", "0270", ...]
};
```

Correctness is **never read from the save** — it is recomputed from the ids
every time — so re-authoring the registry cannot leave a stale "correct" baked
into an old save. A locked frame that no longer holds a correct photograph is
dropped from the lock list on load, and a photograph appearing in two frames in
a hand-edited save keeps only its first occurrence.

A save written before this system existed has no field, treated as "nothing
placed yet". New Game clears placements and locks; the frames survive, being
content.

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
| `placePhotoOnProgressTimeLineFrame(frameId, photoId)` | The drop path, without a real drag. |
| `returnProgressTimeLinePhotoToEnvelope(frameId)` | What the × button does. |
| `formatProgressTimeLineEventDate(year)` | The `MMYYYY` → caption formatter. |

`getProgressTimeLineEventPlacements()` returns keys in the order placements
were *made*. Anything needing chronological order must use
`getCorrectlyPlacedProgressTimeLineFrameIds()` or sort the keys itself.

---

## Tests

`tests/e2e/progress-timeline/` — 34 tests across three files:

- **`progress-timeline-board.spec.js`** (21) — frame rendering and ordering,
  date formatting, one-milestone-unlocks-several-photographs, locked-out
  photographs, correct/incorrect placement, displacement, the × button,
  frame→frame and frame→envelope drags, the ghost appearing and the envelope
  fading mid-drag, a sub-threshold press staying a click, a miss leaving the
  photograph put, four-correct locking, locked-frame refusal, the missing-art
  fallback, real artwork, save/load, reload, New Game.
- **`progress-timeline-carousel.spec.js`** (7) — stepping, wraparound, the
  slide/fade animation, fill-from-the-left, and the pool shrinking when a
  photograph is placed. Ported from the old progressEvidence carousel suite.
- **`progress-timeline-envelope.spec.js`** (6) — which photographs reach the
  envelope and when.

Drag tests drive a **real mouse** — `mouse.move` → `mouse.down` → stepped
`mouse.move` → `mouse.up` — not synthetic events.

This matters. The first version of these tests dispatched `DragEvent`s directly
with `page.evaluate`, which exercised the handlers and passed 18/18 against a
drag that did not work at all for a player. Synthetic events cannot tell you
whether a drag can *start*. Anything testing this interaction must go through
`page.mouse`.

```bash
npx playwright test tests/e2e/progress-timeline
```

Full suite: **195 passed**.

---

## Still to come

- **Artwork** for the other 13 enabled frames.
- **The quiz phase.** The frames are the answer key; simple date questions can
  be generated straight from this registry.
- **Localizing `description`** into `de`/`es`/`fr`/`it`, and the month
  abbreviations, which currently fall back to English.
- **Tightening the enabled set.** Several enabled frames still share an unlock
  trigger with a frame that is *not* enabled, which is fine, but the curated
  list should be reviewed once the art plan is settled.
