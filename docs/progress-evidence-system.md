# Progress Evidence — developer guide

The **progress evidence** system is a persistent record of the investigation
milestones the player has reached, displayed on the noticeboard's manila
EVIDENCE envelope.

It is a **separate system** from the evidence store described in
[evidence-system.md](evidence-system.md). That one holds the Reports, Photos and
Story items a player collects and reads; this one holds nothing but a set of
milestone identifiers. The terminology is kept deliberately distinct so the two
can never be confused in code:

| Term | Meaning |
| --- | --- |
| `progressEvidence` | The persisted collection of activated ids. This is what goes in the save file |
| `progressEvidenceId` | A unique 5-digit string identifying one piece of progress evidence, e.g. `"00001"` |
| `progressEvidenceActivated` | **Player progress.** True once the player has reached that milestone |
| `progressEvidenceDeveloperEnabled` | **Developer decision.** True when the developer has released that item for display |

> `evidenceId` is **never** used as a name in this system — it already means
> "the numeric id of an item in the evidence store" elsewhere in the codebase.

Files:

| File | Role |
| --- | --- |
| [`../progressEvidenceManager.js`](../progressEvidenceManager.js) | The whole model: the registry of every website and fax, the activated collection, eligibility, id allocation, and the save snapshot |
| [`../ui.js`](../ui.js) | The envelope's window, the three-card carousel, and the activation call sites |
| [`../styles.css`](../styles.css) | Two blocks: "Progress evidence envelope (noticeboard)" and "Progress evidence carousel" |
| [`../index.html`](../index.html) | The envelope markup inside `#noticeboardScene` |
| [`../assets/progressEvidence.json`](../assets/progressEvidence.json) | **The registry.** Every website and fax, with its id and both flags |
| [`../tools/web_content_builder.html`](../tools/web_content_builder.html) | The **Progress Evidence** panel that authors a new item |
| [`../tools/progress_evidence_id.js`](../tools/progress_evidence_id.js) | The server's `progressEvidenceId` allocator |
| [`../tests/e2e/progress-evidence/`](../tests/e2e/progress-evidence/) | The E2E coverage |

> **The envelope no longer renders this registry's own artwork.** Since the
> corkboard timeline was added, the envelope carousel shows *that* system's
> photographs (one per dated frame) instead of a card per progress evidence
> item — see
> [progress-timeline-event-system.md](progress-timeline-event-system.md).
> A `progressEvidenceId` here is now purely a **milestone/trigger id**: what a
> timeline event's `unlockedByProgressEvidenceId` points at to decide when its
> photograph is revealed. `progressEvidenceManager.js` has no image concept of
> its own any more, and `assets/progressEvidence.json` carries no `imagePath`
> field — removed along with `resolveProgressEvidenceImagePath()`, the
> `assets/photos/progressEvidenceImages/` folder, and the builder tool's image
> picker, since nothing read them any longer.

---

## 1. The data structure

### `progressEvidence`

A plain array of `progressEvidenceId` strings, in activation order, with no
duplicates:

```js
["00001", "50003", "20005"]
```

It lives in `progressEvidenceManager.js` and is the **single source of truth for
player progress**. It is the only part of the system that is saved.

### The registry

One file — `assets/progressEvidence.json` — lists every website in every
service and every received fax, one definition each:

```json
{
  "progressEvidenceId": "00001",
  "service": "zoomsearch",
  "itemId": "silvermineentrance",
  "label": "Black Pine Mine Exhausted",
  "progressEvidenceActivated": false,
  "progressEvidenceDeveloperEnabled": true
}
```

| Field | Meaning |
| --- | --- |
| `progressEvidenceId` | The id, fixed at authoring time (see "Id shape" below) |
| `service` | Which in-game service it belongs to |
| `itemId` | The record id inside that service's content JSON, or the fax config id |
| `label` | Human-readable, for the audit view |
| `progressEvidenceActivated` | Authored activation — see below. Normally `false` |
| `progressEvidenceDeveloperEnabled` | The developer's display switch |

`loadProgressEvidenceDefinitions()` reads it once at startup, before gameplay
begins. A duplicate `progressEvidenceId` is reported to the console and the
second definition dropped, so an id always means exactly one thing.

**Ids are fixed in this file, never invented at runtime.** An item with no
definition here simply has no progress evidence. This file is also the single
record of which ids are taken: `getNextProgressEvidenceId(service)` and the
builder tool's server (`tools/progress_evidence_id.js`) both allocate from it,
so the two cannot disagree.

At load time each definition becomes a live entry whose
`progressEvidenceActivated` is mirrored from the `progressEvidence` collection
by `syncActivationFlags()` on every activation, restore and reset. So:

- **`progressEvidence` (the array)** — persisted, authoritative, saved.
- **`progressEvidenceActivated` (the per-item flag)** — the derived per-item view
  of that array, which is what the envelope actually reads.

A definition may set `progressEvidenceActivated: true` to mean *"count this as
already reached"* — the builder tool's **in the envelope immediately** checkbox.
Such ids are seeded into the collection by `seedAuthoredActivations()` and
behave like any other activation from then on. Because it is a property of the
item rather than of the playthrough, the seeding is re-applied after a save is
restored and after New Game.

**Why one language-neutral file and not the per-language content JSON.** The
site content lives in five translated copies (`assets/en/zoomsearch.json`,
`assets/de/...`, and so on) with identical record ids. A `progressEvidenceId`
and its two flags are the same fact in every language, so putting them in the
content files would mean five copies of one fact, free to drift apart. Keying
this registry on `service` + `itemId` gives exactly one definition per item and
leaves `assets/{lang}/*.json` holding only localizable content. It is also why
the save carries only the activated ids and never a copy of the definitions.

Two services can legitimately hold a record with the same id — ZoomSearch and
the Canada Newspaper Archive both have a `henrywhitmore` — which is why the
lookup key includes the service.

### Id shape: a service control digit, then a sequence

A `progressEvidenceId` is five digits. The **first digit names the service**;
the remaining four are that item's sequence within that service:

```
0 0001   ->  zoomsearch, first item
4 3222   ->  standalone
3 3333   ->  archives
```

| Control digit | Service |
| --- | --- |
| `0` | ZoomSearch |
| `1` | Library Archive |
| `2` | Police Records |
| `3` | Canada Newspaper Archive |
| `4` | Standalone pages |
| `5` | Received faxes |
| `6` | Desktop items (neither a website nor a fax — e.g. opening the background story) |

So an id says where it came from with no lookup at all —
`getProgressEvidenceServiceById()` just reads the leading digit. Four digits
caps a service at 9999 items, far beyond anything this game will hold.

Each service counts up inside its own block, so allocating an id for one service
never disturbs another. `PROGRESS_EVIDENCE_CONTROL_DIGIT_BY_SERVICE` in
`progressEvidenceManager.js` and `CONTROL_DIGIT_BY_SERVICE` in
`tools/progress_evidence_id.js` are the two copies of this table and must agree.
A definition whose id does not start with its own service's control digit is
reported to the console at startup, and the builder's server refuses to store
one.

---

## 2. The two flags, and the display rule

```js
progressEvidenceActivated === true && progressEvidenceDeveloperEnabled === true
```

| Activated | Developer Enabled | Appears in envelope |
| --- | --- | --- |
| false | false | No |
| true | false | No |
| false | true | No |
| true | true | **Yes** |

The distinction matters: a player can reach a milestone the developer is not
ready to show. That item must record its activation (so it is there the moment
the developer flips the switch) and stay hidden until then. The rule exists in
exactly one place, `getEligibleProgressEvidence()`, and the envelope calls
nothing else.

---

## 3. Activating progress evidence from anywhere in the game

```js
activateProgressEvidence("00001");
```

Available two ways:

```js
// Inside a module:
import { activateProgressEvidence } from "./progressEvidenceManager.js";
activateProgressEvidence("00001");

// From the console, another script, or any non-module context:
window.activateProgressEvidence("00001");
```

**What happens when you call it:**

1. The id is trimmed to a string. An empty one is ignored and `false` returned.
2. If it is already in `progressEvidence`, nothing changes and `false` is
   returned. Calling it repeatedly is safe — there is no duplicate to create.
3. Otherwise it is appended to `progressEvidence`, `syncActivationFlags()` sets
   that item's `progressEvidenceActivated` to `true`, and `true` is returned.
4. `window.activateProgressEvidence` additionally re-renders any envelope window
   that is currently open, so an item can appear while the player is looking at
   it.
5. The next save (manual or the 60-second sticky autosave) carries the new id.

Nothing else happens. In particular it does **not** touch
`progressEvidenceDeveloperEnabled`, so an id activated this way stays hidden
until the developer enables it.

### The three call sites that already do this

| Trigger | Where | How the item is resolved |
| --- | --- | --- |
| Opening a website record | `activateProgressEvidenceForWebRecord()`, on the `caveos-browser-record-opened` event | `detail.replay.siteId` + `detail.recordId` |
| Visiting a standalone page | `activateProgressEvidenceForStandalonePage()`, in `navigateToStandalonePage()` | service `"standalone"` + the page's `id` |
| Receiving a fax | `activateProgressEvidenceForFacsimileReport()`, in `queueFacsimileReport()` | service `"facsimile"` + the fax's `id` |
| Opening the background story | `activateProgressEvidenceForDesktopItem()`, in `openStoryWindow()` | service `"desktop"` + itemId `"theArnieTragedyStory"` |

All four go through `activateProgressEvidenceForItem(service, itemId)`, which
looks the pair up in the registry and does nothing when there is no entry — an
unregistered record or an ad-hoc test fax passes through harmlessly.

Note the semantics: for a website the milestone is **opening the record**, not
merely searching for it (the same distinction `registerRecordOpenFaxTrigger()`
makes — see [facsimile-event-trigger-guide.md](facsimile-event-trigger-guide.md)).
For a fax it is **arrival**, not reading. For the background story it is
**opening its window** — `openStoryWindow()` fires the call every time, but
`activateProgressEvidence()` is idempotent, so only the first open counts.

### Adding a new trigger

Anything that can name a milestone can record one. For example, from a new
evidence trigger:

```js
addEvidenceTrigger({
  predicate: (evidence) => evidence.name === "minemap",
  action: () => window.activateProgressEvidence("00701"),
});
```

---

## 4. Enabling and disabling progress evidence as a developer

`progressEvidenceDeveloperEnabled` is **never** changed by gameplay. Two ways to
change it:

**Permanently** — edit the item's entry in `PROGRESS_EVIDENCE_DEFINITIONS` in
`progressEvidenceManager.js`:

```js
{
  progressEvidenceId: "20001",
  service: "police",
  itemId: "jamesfletcher",
  label: "Constable James Fletcher",
  progressEvidenceDeveloperEnabled: true,   // <- released for display
},
```

Omitting the field means `false`, which is the default for every item.

**For one session** (trying something out, or in a test) — the developer console
surface:

```js
window.progressEvidenceDeveloperTools.setProgressEvidenceDeveloperEnabled("20001", true);
```

The rest of that object is read-only inspection:

```js
window.progressEvidenceDeveloperTools.getProgressEvidence();          // activated ids
window.progressEvidenceDeveloperTools.getProgressEvidenceEntries();   // every item, both flags
window.progressEvidenceDeveloperTools.getEligibleProgressEvidence();  // what the envelope shows
window.progressEvidenceDeveloperTools.getProgressEvidenceIdForItem("police", "jamesfletcher");
window.progressEvidenceDeveloperTools.isProgressEvidenceActivated("20001");
```

The in-game debug window (press `-`) also logs both the activated collection and
the full registry with both flags.

---

## 5. Adding new progress evidence

**For a new website:** use the web content builder's **Progress Evidence**
panel (§11). It allocates the id, records the image and both flags, and writes
the definition — no code change at all.

**By hand**, for anything else:

1. Pick the next unused id in that service's block: its control digit followed
   by one past the highest sequence already used for it in
   `assets/progressEvidence.json`. Ids must be unique across the whole file — a
   duplicate is reported to the console at startup and the second definition is
   dropped.
2. Add a definition to `assets/progressEvidence.json` with its `service`,
   `itemId` and `label`. Leave `progressEvidenceDeveloperEnabled` off until the
   story beat it unlocks is ready.
3. Make sure something activates it. If it is a website record or a fax, the
   three existing call sites already cover it — no code needed. Otherwise call
   `activateProgressEvidence(id)` from wherever that milestone happens.
4. Point a timeline event's `unlockedByProgressEvidenceId` at this id — see
   [progress-timeline-event-system.md](progress-timeline-event-system.md) —
   which is what actually reveals a photograph to the player now.
5. Set `progressEvidenceDeveloperEnabled: true` when you want the milestone to
   be reachable at all.

---

## 6. Save and load

Progress evidence rides in the **existing** save payload; there is no separate
save mechanism, no new storage key and no version field.

**Saving** — `captureGameStatusForSaving()` in `constantsAndGlobalVars.js` adds:

```js
gameState.progressEvidence = getProgressEvidenceSnapshot();   // ["00001", "50003"]
```

Just the activated ids. The website and fax definitions live in code and are
never duplicated into the save, which keeps the payload the same size it always
was plus a few bytes per milestone.

**Loading** — `restoreGameStatus()` calls:

```js
setProgressEvidenceSnapshot(gameState.progressEvidence);
```

which:

- replaces the collection outright (a loaded save is the source of truth, the
  same rule the web-content sessions follow);
- **de-duplicates on the way in**, so a hand-edited or doubly-written save
  cannot introduce a repeated id;
- treats *anything that is not an array* — including the field simply being
  absent — as "nothing activated yet" and resets to empty, rather than failing.

That last point is the compatibility story: **a save written before this feature
existed loads normally**, with no progress evidence activated. Nothing else in
the payload changed, so old saves are not invalidated and no migration is
needed.

Both save routes are covered, because they share one payload: the copy/paste
save string and the `localStorage` sticky save (including its `beforeunload`
flush, so a plain refresh → **Resume Game** restores progress evidence too).

**New Game** clears it: `beginNewGame()` calls `resetProgressEvidence()` next to
the other resets.

---

## 7. The envelope and the carousel

### The envelope

The back of a manila envelope pinned to the corkboard, with `EVIDENCE` stamped
on it and a photograph sticking out from under its top flap. Markup is in
`index.html` inside `#noticeboardScene` (`#progressEvidenceEnvelope`); it toggles
its window like any desk object.

**It is pinned to the bottom-right corner of the corkboard**, on every device
and screen size. The `right` / `bottom` offsets are derived from the board's own
geometry (`--noticeboard-board-*` on `.noticeboard-scene`, shared with
`.noticeboard-board-frame`) rather than from fixed scene coordinates, so
resizing the board keeps the envelope in that corner instead of stranding it
mid-board.

**Where to change its position.** Everything is a CSS custom property on
`.noticeboard-scene .progress-evidence-envelope`, in the block headed *"Progress
evidence envelope (noticeboard)"* in `styles.css`. Nothing is hard-coded
anywhere else:

| Property | What it moves |
| --- | --- |
| `--progress-evidence-envelope-inset-right` / `-inset-bottom` | How far in from the corkboard's bottom-right corner it sits |
| `--progress-evidence-envelope-width` / `-height` | Its size |
| `--progress-evidence-envelope-rotation` | Its tilt on the board |
| `--progress-evidence-envelope-photo-left` / `-top` / `-width` / `-height` / `-rotation` | The photograph, relative to the envelope's own top-left corner |

> The rule is scoped to `.noticeboard-scene` deliberately: `.desktop-hoverable`
> sets `position: relative` and is declared later in the file, so an unscoped
> rule loses `position: absolute` to it — which does nothing visible with
> `left`/`top` but throws the envelope off the board with `right`/`bottom`.

### The carousel

Clicking the envelope opens a `DesktopWindow` of kind `progress-evidence`. It is
built on the **same carousel chrome as the Reports and Photos folders** — the
`<` and `>` buttons come from `DesktopWindow`'s `showCarouselNavigation` and the
index wraps in both directions, exactly as those two do.

- **It refreshes on open.** `updateProgressEvidenceWindowContent()` re-reads
  `getEligibleProgressEvidence()` every time and re-clamps the index against it,
  so the envelope can never show a stale strip. An open envelope is also
  re-rendered when an activation happens underneath it.
- **Three items at once.** `PROGRESS_EVIDENCE_VISIBLE_CARD_COUNT` = 3. The strip
  shows items `index`, `index + 1`, `index + 2`, wrapping, so three cards stay on
  screen whenever three are eligible.
- **It fills before it scrolls.** At three items or fewer everything is already
  on screen, so the cards simply fill the strip left to right as the player
  collects them (one card sits in the leftmost slot, not centred) and **both nav
  buttons stay disabled** — 0, 1, 2 and 3 items alike. The fourth item is the
  first that cannot fit, and that is when the carousel comes alive. The index is
  pinned to 0 below that threshold, so the strip always reads in collection
  order.
- **Card size.** `--progress-evidence-card-height` is
  `calc(100vh - var(--progress-evidence-card-padding))` — the browser window's
  height less a small padding allowance — capped at the window body's height.

**The one difference from Reports and Photos: the movement is animated.**
Stepping does not swap the cards instantly, and it moves the strip along by
**one card**, not by all three — the card leaving view slides out and fades, the
two staying on screen shuffle across into their neighbours' slots, and one new
card slides in from the far side fading up. `renderProgressEvidenceTrack()`:

1. Builds a strip one card wider than the settled one: for Next it starts one
   item *earlier* than the new index (so the leaving card is still on it and the
   arriving card is on the end); for Previous it starts *at* the new index (so
   the arriving card leads and the leaving one trails).
2. Inserts it with `is-stepping` — which suppresses the transitions — at its
   starting offset, with the arriving card at `is-card-entering` (opacity 0).
   The strip is left-justified, so for Next the extra card just hangs off the
   right-hand end and the start offset is 0; for Previous the arriving card is
   prepended, pushing the others one slot right, so the strip starts one slot to
   the left to hold them in place.
3. On the next animation frame, removes `is-stepping` (transitions back on),
   moves the offset one full slot — to `-step` for Next, back to 0 for Previous
   — removes `is-card-entering`, and adds `is-card-leaving` to the departing
   card.
4. After `PROGRESS_EVIDENCE_SLIDE_MS` (320 ms), replaces it with the clean
   three-card strip at the new index.

The travel distance is measured from the rendered card
(`measureProgressEvidenceCardStep()`), not assumed, because the card width is
derived from the window height. `PROGRESS_EVIDENCE_SLIDE_MS` in `ui.js` and
`--progress-evidence-slide-duration` in `styles.css` describe the same duration
and must be changed together.

---

## 8. Images and the placeholder

**This system has no images of its own any more.** `progressEvidence.json`
used to carry an `imagePath` per definition (falling back to
`[progressEvidenceId].png` in `assets/photos/progressEvidenceImages/`), and the
envelope rendered that. Both the field and the folder are gone — removed once
the envelope switched to showing the corkboard timeline's own photographs
instead of a card per progress evidence item.

What renders in the envelope now, what a missing PNG falls back to, and the
naming convention for that art (`[progressTimeLineEventId].png` in
`assets/progressEvidenceImages/`) is documented in
[progress-timeline-event-system.md](progress-timeline-event-system.md), not
here. `createProgressEvidenceCardMedia()` in `ui.js` still does the actual
image-or-placeholder rendering — the function kept its name across the switch
— but it resolves artwork via `resolveProgressTimeLineEventImagePath()`, not
anything in this file.

A `progressEvidenceId` is now purely a milestone/trigger id for that other
system to point at (`unlockedByProgressEvidenceId`); it carries no visual of
its own.

---

## 9. Progress evidence audit

Every website in every service, and every received fax. **Defaults are
`progressEvidenceActivated: false` and `progressEvidenceDeveloperEnabled: false`
for every row**; the two exceptions are called out in bold.

### ZoomSearch (`assets/{lang}/zoomsearch.json`)

Activated by: opening the record from a ZoomSearch result.

| Website | `progressEvidenceId` | Activated (default) | Developer enabled (default) |
| --- | --- | --- | --- |
| Black Pine Mine Exhausted (`silvermineentrance`) | `00001` | false | **true** |
| John Baxley (`johnbaxley`) | `00002` | false | **true** |
| We put the Wackiness in Gold Mining! (`minecart`) | `00003` | false | false |
| Apples for All! (`margaretmcleod`) | `00004` | false | false |
| Local Author is heir to the Whitmore Empire (`henrywhitmore`) | `00005` | false | false |
| Unexpectedly gains control of Whitmore & Sons Iron (`jeromewhitmore`) | `00006` | false | false |
| Brian Whitmore keeps the family business alive! (`brianwhitmore`) | `00007` | false | false |
| J & T Fairchild Valuation Experts & Insurance Brokers (`fairchilds`) | `00008` | false | false |

### Library Archive (`assets/{lang}/library.json`)

Activated by: opening the record from a Library author + title search.

| Website | `progressEvidenceId` | Activated | Developer enabled |
| --- | --- | --- | --- |
| Mysteries of the Old North West (`mysteryoldnw`) | `10001` | false | false |
| Guardians Of The North (`guardiansofthenorth`) | `10002` | false | false |
| Strange Things Found In Even Stranger Places (`strangethingsfoundinevenstrangerplaces`) | `10003` | false | false |

### Police Records (`assets/{lang}/police.json`)

Activated by: opening the record from a Police search (which requires the
record's privilege level).

| Website | `progressEvidenceId` | Activated | Developer enabled |
| --- | --- | --- | --- |
| Constable James Fletcher (`jamesfletcher`) | `20001` | false | false |
| Corporal Emile Beaulieu (`emilebeaulieu`) | `20002` | false | false |
| Lieutenant William McLeod (`williammcleod`) | `20003` | false | false |
| Corporal George Mackenzie (`georgemackenzie`) | `20004` | false | false |
| Professional Cave Diver and Corporal (`thomasorourke`) | `20005` | false | false |
| The Iron magnate who chose Policing first! (`arthurwhitmore`) | `20006` | false | false |
| GOLD PENDANT (`goldenpendant`) | `20007` | false | false |
| Fairchild insurance record 05-33-22-02-03 (`fairchildinsurancerecordexampletemplate`) | `20008` | false | false |
| Fairchild insurance record 09-24-49-02-07 (`fairchildinsurancerecordworthingpendant`) | `20009` | false | false |

### Canada Newspaper Archive (`assets/{lang}/archives.json`)

Activated by: opening the record from an Archives province + keyword search.

| Website | `progressEvidenceId` | Activated | Developer enabled |
| --- | --- | --- | --- |
| Local Author Hannah Fletcher publishes Husbands Cases (`hannahfletcher`) | `30001` | false | false |
| Local Author publishes book with interesting topic (`henrywhitmore`) | `30002` | false | false |
| Remembering a great Guardian (`williammcleodfindpendant`) | `30003` | false | false |
| Local Man Arrested in connection with Spencer disappearance (`tonyarrestedandreleased`) | `30004` | false | false |

### Standalone pages (`assets/{lang}/standalone-pages.json`)

Activated by: navigating to the page's URL in Netscape (typed, or via an
in-page link).

| Website | `progressEvidenceId` | Activated | Developer enabled |
| --- | --- | --- | --- |
| Buy your Mining Machinery from Whitmore & Sons (`whitmoresonsironmachineryco`) | `40001` | false | false |
| An Important and Historic Club (`honeydewcavingclub`) | `40002` | false | false |
| Decode Book for Insurance Records (`fairchildsinsurancerecordscodes`) | `40003` | false | false |

### Received faxes (fax configs in `ui.js`)

Activated by: the fax arriving (being queued), not by reading it.

| Fax | Source | `progressEvidenceId` | Activated | Developer enabled |
| --- | --- | --- | --- | --- |
| Welcome to the Investigation (`fax-welcome-arnie-tragedy`) | `NEW_GAME_WELCOME_FAX_CONFIG`, ~10 s into a new game | `50001` | false | false |
| Missing person report (`fax-missing-person-report`) | `MISSING_REPORT_FAX_CONFIG`, ~40 s into a new game | `50002` | false | false |
| Whitmore police credentials (`fax-whitmore-police-credentials`) | `WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG`, on acquiring the mine-map photo | `50003` | false | false |
| Whitmore level 3 credentials (`fax-whitmore-level3-credentials`) | `WHITMORE_LEVEL3_MILESTONE_FAX_CONFIG`, on opening Arthur Whitmore's police record | `50004` | false | false |

### Desktop items (hardcoded in `ui.js`)

Activated by: opening the desktop item, not reading it in full.

| Item | Source | `progressEvidenceId` | Activated | Developer enabled |
| --- | --- | --- | --- | --- |
| Background story opened (`theArnieTragedyStory`) | `openStoryWindow()`, on opening the desktop story window | `60001` | false | false |

**Totals: 27 websites across five services, plus 4 received faxes, plus 1
desktop item — 32 items, all registered.**

> The `Developer enabled` column above is the **shipped baseline**. It is the
> one column here a developer is expected to change as content is released, so
> `assets/progressEvidence.json` is always the live answer — check it there
> rather than trusting this table. Nothing else in the audit moves.

---

## 10. The two developer-enabled websites (shipped baseline)

| `progressEvidenceId` | Website | Service | Why |
| --- | --- | --- | --- |
| `00001` | Black Pine Mine Exhausted (`silvermineentrance`) | **ZoomSearch** | The first website the player reaches — the missing person report points straight at the mine, and ZoomSearch needs no login (see [happypath.md](happypath.md) §2) |
| `00002` | John Baxley (`johnbaxley`) | **ZoomSearch** | The other opening lead, credited by name on the `caveEntrance` starting photo, also reachable with no login |

Both still begin with `progressEvidenceActivated: false`. Being
developer-enabled does **not** put them in the envelope — the player has to
open each page first. `00001.png` ships as an example image; `00002.png`
deliberately does not exist, so the placeholder path is exercised by real
content.

---

## 11. Authoring a new item in the web content builder

The builder tool's **Progress Evidence** panel applies to every content type and
is **mandatory**: Preview and Inject are both blocked until it is valid. Full
tool instructions are in
[../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md](../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md);
this is what the panel does to this system.

| Control | Effect |
| --- | --- |
| `progressEvidenceId` | Read-only. Allocated by `GET /api/web-content/next-progress-evidence-id?service=<service>` — the service's control digit plus one past its highest sequence in `assets/progressEvidence.json`. Changing the Content Type re-allocates it, since the id belongs to the new service's block. **Allocate** re-asks (useful if the API was not running when the page loaded) |
| `progressEvidenceActivated` | Seeds this id as already activated, so the milestone counts as reached from the start of a new game |
| `progressEvidenceDeveloperEnabled` | The display switch. Off means the milestone can never be reached, no matter what the player does |

**On inject**, the server (`tools/web_content_builder_server.js`):

1. Upserts a definition into `assets/progressEvidence.json`, matched on
   `service` + `itemId`. Re-injecting the same record **updates it in place and
   keeps the id already allocated to it**, rather than stranding an id the
   player may already have activated.
2. **Strips** the progress evidence fields from the copy written into the site
   content files — the registry owns them, exactly as the localized evidence
   catalogs own description and caption. They are never stored twice, and
   never once per language.
3. Reports what it did under `progressEvidenceUpdate` in the response.

It refuses an id that is not five digits led by a known control digit, or whose
control digit names a different service from the record being injected.

The game picks the definition up on its next load. Blocking validation lives in
the form (`buildProgressEvidenceFields()` in `tools/web_content_builder.js`);
the server validates the shape of anything it is sent but stays tolerant of
payloads with no progress evidence at all, so scripted or hand-written calls
predating the panel still work.

---

## 12. Testing

`tests/e2e/progress-evidence/` — see that folder's
[README](../tests/e2e/progress-evidence/README.md) for the per-spec table.

```bash
node scripts/run-tests.cjs --category progress-evidence   # just this area
npm run test:e2e                                          # the full regression suite
```

Helpers are in `tests/support/game-helpers.js`: `openNoticeboard`,
`openProgressEvidenceEnvelope`, `closeProgressEvidenceWindow`,
`readProgressEvidence`, `activateProgressEvidence`,
`setProgressEvidenceDeveloperEnabled`, `readProgressEvidenceEntry`.
