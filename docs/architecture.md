# Architecture and Component Reference

This is the single reference for how *The Cave* is put together and how each
component behaves at runtime. It was rewritten from a full read of the codebase
during the August 2026 audit (see [audit-2026-08-10.md](audit-2026-08-10.md)).

Companion documents:

- [evidence-system.md](evidence-system.md) — the evidence store and content catalogs, in depth
- [progress-evidence-system.md](progress-evidence-system.md) — the separate progress evidence system and the noticeboard EVIDENCE envelope
- [investigation-archives.md](investigation-archives.md) — the four in-game web services and their search rules
- [facsimile-event-trigger-guide.md](facsimile-event-trigger-guide.md) — how to trigger and test incoming faxes
- [../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md](../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md) — the web content generator tool

---

## 1. Runtime shape

The game is a static, build-free ES-module browser app. There is no bundler and
no framework; `index.html` is opened directly (or served by any static server).

`index.html` loads exactly two scripts:

| Script | Purpose |
| --- | --- |
| `lz-string` (CDN) | Save-string compression, used as the `LZString` global by `saveLoadGame.js` |
| `ui.js` (module) | The entry point. Everything else is reached through its import graph |

### Module graph

```
ui.js  (entry point, DOM wiring, all window construction)
├── constantsAndGlobalVars.js   game state, element cache, save payload, all getters/setters
│   ├── evidenceManager.js      evidence store, blueprints, triggers
│   └── progressEvidenceManager.js  progress evidence registry and activated ids
├── evidenceManager.js
├── progressEvidenceManager.js
├── game.js                     scene state machine, viewport zoom/pan, scene transitions
├── audioManager.js             music playlist, SFX, mute/volume
├── localization.js             localization.json loader and localize()
├── desktopWindow.js            the draggable/resizable window component
├── saveLoadGame.js             save-string capture and restore
├── stickySave.js               localStorage autosave + resume-after-refresh
├── webContentManager.js        website registry, sessions, search, evidence awards
└── webContentRegistry.js       the four site definitions and their page renderers
```

Only `ui.js` touches the DOM directly for game chrome; `webContentRegistry.js`
builds the in-browser website pages, and `desktopWindow.js` owns window frames.

### Startup sequence

On `DOMContentLoaded`, `ui.js`:

1. `setElements()` — caches every `getElementById` lookup into one object.
2. `initializeEvidenceMilestoneTriggers()` — registers the story-progression fax triggers.
3. Syncs ashtray and facsimile visual state from the (empty) saved state.
4. Wires audio controls, desk-object click handlers, and the desktop calendar date.
5. Binds the menu buttons, the language buttons, the save/load popup and the global keydown handler.
6. `handleLanguageChange(getLanguageSelected())` then `setGameState(getMenuState())`.
7. `refreshStickySaveResumeOffer()` — last, because `setGameState(getMenuState())`
   only enables Resume for a game already in memory; this enables and highlights
   it when a sticky save is found in `localStorage` instead (see §14).

---

## 2. Game state and scenes

`game.js` owns a three-value state machine held in `constantsAndGlobalVars.js`:

| State | Constant | Meaning |
| --- | --- | --- |
| Menu | `MENU_STATE` | Title screen; `#menu` visible, `#gameArea` hidden |
| Desktop | `DESKTOP_STATE` | The investigator's desk |
| Noticeboard | `NOTICEBOARD_STATE` | The corkboard scene |

`DESKTOP_STATE` and `NOTICEBOARD_STATE` are the two *gameplay* states
(`isGameplayState()`). `activeGameplayState` remembers which of the two the
player was in, so returning from the menu restores the right scene. It is also
persisted in the save payload.

`setGameState(newState)` swaps the `d-none` / `d-flex` classes on `#menu` and
`#gameArea`, marks the active language flag button, enables Resume/Save when a
game is in progress, and calls `updateSceneVisibility()`.

`transitionGameplayScene(targetState)` performs the desktop↔noticeboard swap
behind `#sceneFadeOverlay`: fade to opaque over `SCENE_FADE_DURATION_MS`
(750 ms), switch state, fade back. A `sceneTransitionInProgress` guard makes the
transition non-reentrant.

### Viewport: zoom, pan and parallax

The desk is a `2600 × 1800` world inside `#desktopViewport`.

- **Zoom** — four discrete levels, `ZOOM_LEVELS = [0.60, 0.65, 0.85, 1]`, stepped by mouse wheel. Zooming keeps the viewport centre fixed in world space. The `#zoomReadout` badge fades in for 1.5 s on each change.
- **Pan** — left-button drag. `clampPan()` prevents panning past the world edges. The drag is cancelled on pointer-up/leave/cancel, window blur, and tab visibility change.
- **Parallax** — `#deskParallax` translates at `PARALLAX_FACTOR` (0.1) of the world pan and scales at `0.9 + zoom * 0.03`, giving the background a slower drift.
- **Table legs** — `updateTableLegPerspective()` computes, per leg, how far the current pan has moved it away from the centred position, and drives three CSS custom properties (`--leg-extend`, `--leg-squash`, `--leg-sheen`) so the legs appear to lengthen and catch light as you pan toward a corner.

---

## 3. `DesktopWindow` — the window component

`desktopWindow.js` exports one class used by every in-game window. It creates
its own DOM:

```
.desktop-window
├── .desktop-window-header   (drag handle)
│   ├── .desktop-window-title
│   └── .story-window-close
├── .desktop-window-body
│   └── .desktop-window-carousel-layout   (when showCarouselNavigation)
│       ├── .desktop-window-carousel-nav.carousel-nav-prev
│       ├── .desktop-window-carousel-content
│       └── .desktop-window-carousel-nav.carousel-nav-next
│   └── .desktop-window-content-host      (otherwise)
└── .desktop-window-resize-handle
```

Key behaviour:

- **Dragging** — pointerdown on the header, except on interactive elements (`button, input, textarea, select, option, a, [role='button'], [data-no-window-drag]`). Position is clamped so the window keeps a `marginRatio` (5%) margin inside its parent.
- **Resizing** — bottom-right handle, only when opened with `resizable: true`. Minimum size `540 × 360`.
- **Opening** — `open({ resizable, showScrollbar })` centres the window once (`dataset.positioned` guards repeats) at `initialWidthRatio` × `initialHeightRatio` of the parent, then clamps it into view.
- **Closing** — `close()` cancels interactions, fires `onClose`, and destroys the DOM (windows always own their DOM in this codebase).
- **Stacking** — `ui.js` assigns z-indexes from `DESKTOP_WINDOW_BASE_Z_INDEX` (45) upward. Any pointerdown on a window raises it via `getNextDesktopWindowZIndex()`.

### Window registry in `ui.js`

Two collections track open windows:

- `activeDesktopWindows` — a `Set` of live controllers.
- `desktopWindowKinds` — a `WeakMap` from controller to a *kind* string.

The kinds are: `story`, `photos`, `reports`, `notes`, `facsimile`, `computer`,
`computer-notes`, `computer-paint`, `computer-netscape`, `progress-evidence`,
`debug`.

`toggleExistingWindowsByKind(kind)` closes all open windows of a kind and
returns `true`, which is how every desk object behaves as a toggle: clicking the
Reports folder opens Reports; clicking it again closes it.

`refreshOpenWindowLocalization()` re-titles and re-renders open windows after a
language change, driven by the `DESKTOP_WINDOW_LOCALIZATION_BY_KIND` table.

---

## 4. Evidence carousels (Photos and Reports folders)

Both folders open the *same* window type. `EVIDENCE_CAROUSEL_WINDOWS` in
`ui.js` holds the only differences between them (CSS classes, storage key,
content builder, scroll container, resize targets); `openEvidenceCarouselWindow()`
does the rest.

### Anatomy

```
.photos-carousel-container / .reports-carousel-container
├── .evidence-title-bar          editable evidence title + ✓ commit button
├── .evidence-controls-host      magnifier toggle + "n/total" counter
├── .photos-media-viewport  /  .reports-content-viewport
│   ├── .photo-paper-wrap > img          (photos)
│   ├── .photo-caption-outer             (photos)
│   └── .report-paper-wrap > .report-document-content > .report-document-text  (reports)
├── .evidence-description-outer  the parchment description panel
└── .evidence-magnifier-overlay-host
```

The `<` and `>` buttons come from `DesktopWindow`'s carousel layout and call
`stepEvidenceCarousel(storageKey, ±1)`, which is a no-op on an empty collection.
The index wraps in both directions (`normalizeIndex` in `evidenceManager.js`),
so paging past the last item returns to the first.

### Renaming evidence

The title bar is a live rename control. `wireEvidenceTitleEditor()` enables the
✓ button only when the typed title is non-empty and differs from the committed
one; Enter also commits. Committing calls `setEvidenceCustomName(evidenceId, …)`,
which is stored per evidence id in `evidenceCustomNames` and persisted in the
save. A blank title reverts to the committed value; it never clears the name.

`getEvidenceDisplayTitle()` prefers the custom name, then the catalog/blueprint
`defaultTitleString`, then the evidence `name`, then `"Untitled Evidence"`.

> Note: committing a title updates the input immediately, but the tab/row
> `aria-label` is only refreshed on the next full render. This is long-standing
> behaviour and was preserved by the audit.

### Paper styles

Each evidence item names a *paper style*, applied as a single modifier class:

| Wrapper | Base class | Prefix | Default |
| --- | --- | --- | --- |
| Report | `report-paper-wrap` | `report-paper-style-` | `report-parchment` |
| Photo | `photo-paper-wrap` | `photo-paper-style-` | `photo-mounted` |

Known values in the content today: `report-parchment`, `photo-mounted`,
`photo-mounted-ivory`, `photo-mounted-linen`.

The description panel gets its own style, derived by
`getDescriptionPaperStyleFromEvidence()`: an explicit `descriptionPaperStyle`
wins; otherwise a `report-parchment*` source style is reused as-is; otherwise
photo mounts map to a matching parchment (`ivory → report-parchment`,
`linen → report-parchment-ash`, `chalk → report-parchment-sepia`,
`aged → report-parchment-char`), with `report-parchment-moss` as the fallback.

### Photo mount layout

`layoutPhotoMount()` fits a 16:9 frame (max `760 × 428`) inside the media
viewport, accounting for the wrapper's padding and border, then pins the image
to that frame. `syncPhotoMountChrome()` then matches the title bar width, the
caption width and the description panel height to the mount. A `ResizeObserver`
on the viewport and the paper wrapper reruns both on every window resize.

### The magnifier

`createEvidenceMagnifierController()` builds a circular lens (175 px, 3×
magnification) that follows the pointer while the ⌕ toggle is active.

- **Photos** — the preview is a copy of the `<img>`. The controller computes the letterboxed content box from `naturalWidth/Height` so the magnified point matches the pointer even when the image does not fill its frame.
- **Reports** — the preview is a deep clone of the scrollable text element, forced to its full scroll size so text below the fold can be magnified after scrolling.

Lens position is clamped inside the overlay host, and the preview transform is
clamped so the lens never shows past the content edges. Updates are batched into
one `requestAnimationFrame` per pointer move, and the source element's `scroll`
event re-runs the same frame.

### The progress evidence carousel (the noticeboard envelope)

A third carousel, built on the same `DesktopWindow` chrome but driven by a
different system — see
[progress-evidence-system.md](progress-evidence-system.md) for the whole thing.
The differences worth knowing here:

- It shows one **timeline photograph** per card, not a card per progress evidence item — see [progress-timeline-event-system.md](progress-timeline-event-system.md). `progressEvidenceManager.js` decides only which photographs are *unlocked* (via a timeline event's `unlockedByProgressEvidenceId`); it carries no image or card content of its own.
- **Three cards at once** (`PROGRESS_EVIDENCE_VISIBLE_CARD_COUNT`), each about the browser window's height less a padding allowance, stepping one item at a time with wraparound.
- Stepping is **animated, and moves by one card**: the departing card slides out and fades, the two that stay shuffle across into their neighbours' slots, and the arriving card slides in from the far side fading up. The strip is built one card wider for the duration and translated by a single measured card slot. `PROGRESS_EVIDENCE_SLIDE_MS` in `ui.js` and `--progress-evidence-slide-duration` in `styles.css` must agree.
- Cards load `[progressTimeLineEventId].png` from `assets/progressEvidenceImages/`, falling back to a placeholder card carrying the id when the file does not exist yet.
- The trigger registry is `assets/progressEvidence.json`, loaded at startup: one language-neutral file holding every website's and fax's id and two flags (no image). Ids are five digits led by a service control digit (`0` ZoomSearch … `5` faxes, `6` desktop items) and are fixed there, never invented at runtime. The web content builder's Progress Evidence panel is what writes it.
- The envelope can be **dragged anywhere on the corkboard** by the player (see progress-timeline-event-system.md) — it only *starts* anchored near the middle of the board via the board's own `--noticeboard-board-*` custom properties, not fixed scene coordinates.

---

## 5. The Story folder

The `#backgroundFolder` stack opens a single non-resizable window rendering
`assets/{lang}/story.md` as plain text on lined paper. Text is fetched once per
resolved path and cached in `storyTextCacheByLanguage`. A language change
re-renders the open window through `refreshOpenWindowLocalization()`.

The story evidence item is created from `DEFAULT_EVIDENCE_BLUEPRINTS`, and its
content path comes from `resolveEvidenceContentPath()`. If the story evidence is
missing, `getStoryText()` falls back to `assets/{lang}/story.md` directly.

---

## 6. Notes and Paint — the paged-document model

Notes (desk folder, and the CaveOS Notes app) and Paint (CaveOS only) are the
same UI: a ten-tab strip where each tab has a number button and an editable
title, next to one editor pane. They share every helper in `ui.js` and are
described by two model objects:

| | Notes | Paint |
| --- | --- | --- |
| Model | `NOTES_PAGE_MODEL` | `PAINT_PAGE_MODEL` |
| Pages | `NOTES_PAGE_COUNT` = 10 | `PAINT_PAGE_COUNT` = 10 |
| Default title | `Page 1…10` | `Sketch 1…10` |
| Body field | `content` (string) | `snapshot` (data URL) |
| Editor | `<textarea>` | `<canvas>` 1024 × 640 |

Shared helpers: `buildDefaultPageTitle`, `readPageOrDefault`, `clampToPageCount`,
`resolveActivePageIndex`, `persistActivePageBody`, `refreshPageTitleCommitState`,
`commitPageTitle`, `createPageTabRow`, `createPageTabRows`, `syncPageTabRows`.

Tab colours cycle through `NOTES_TAB_COLORS` (ten pastels) via the
`--notes-tab-color` custom property.

Persistence is *page-scoped*: switching tabs writes the current body back to the
active page first, so bodies survive tab switches, window closes and saves.
`persistActivePageBody()` skips the write when the body is unchanged, which
matters for Paint because producing a snapshot re-encodes the whole canvas.

### Paint specifics

- **Tools** — `pen`, `line`, `rect`, `eraser`, `fill`, plus a brush-size slider (1–18), a colour input and CLEAR.
- **Live preview** — for `line` and `rect`, the canvas is snapshotted on pointerdown and restored on each move before drawing the shape, so the preview does not smear.
- **Eraser** — draws with the background colour (`#041204`) at double width, rather than compositing.
- **Fill** — a scanline flood fill over a `Uint32Array` view of the bitmap (see [audit-2026-08-10.md](audit-2026-08-10.md)).
- **Snapshots** — `canvas.toDataURL("image/webp", 0.82)`, falling back to PNG if WebP is unavailable. Snapshots are written into the save payload, so Paint pages are the largest contributor to save size.

---

## 7. The facsimile machine

The fax rig on the desk is the game's push channel for story beats. Full
authoring and testing instructions are in
[facsimile-event-trigger-guide.md](facsimile-event-trigger-guide.md); this is the
mechanism.

### State

`facsimileState` in `constantsAndGlobalVars.js` holds two arrays:

- `pendingReports` — faxes received but not yet read, FIFO, de-duplicated by `id`.
- `consumedReportIds` — ids already turned into evidence, so a fax can never be awarded twice.

Both are saved and restored. `setFacsimileState()` also accepts the legacy
single `pendingReport` field written by older saves.

### Entry points

| Entry point | Payload | Used by |
| --- | --- | --- |
| `window.receiveFacsimileReport(report)` | Raw report object | Console/testing |
| `window.receiveConfiguredFacsimileReport(config)` | Config with localization keys or a catalog source | Story triggers |
| `window.receiveLocalizedFacsimileReport(config)` | Alias of the above | Story triggers |
| `cave-facsimile-report` window event | `detail.report` or `detail` | Loose coupling from other systems |

`sanitizeFacsimileReport()` normalizes a raw payload;
`buildFacsimileReportFromConfig()` builds one from a config, resolving
`titleKey` / `descriptionKey` / `reportTextKey` / `reportTextLineKeys` through
`localize()`. For a config whose `source.kind` is
`report-localized-catalog-entry`, title and description are deliberately left
blank so the localized catalog entry can fill them in
(`queueConfiguredFacsimileReport()` does that lookup before queueing).

### Lifecycle

1. A fax is queued. Duplicates (already pending, or already consumed) are rejected.
2. The rig gets `has-pending-message` (flashing alert light) and plays the `is-receiving` paper-feed animation for 1.9 s.
3. A notification is queued. The type is derived from `messageType`: `urgent → fax-urgent`, `credentials → fax-credentials`, `system → fax-system`, anything else → `fax-intel`.
4. The player opens FACSIMILE and reads the first pending message. `hasReadPendingMessage` / `viewedReportId` record that it was seen.
5. Reading is committed either by closing the window or by pressing *Show Next Cached Message*. `commitReadFacsimileReportToEvidence()` creates the report evidence (unless one with the same `evidenceName` already exists), moves the id to `consumedReportIds`, and fires the "New Report … unlocked" reward notification. A fax config carrying `awardsEvidence: false` skips both the evidence creation and the reward notification — it's still read, tracked in `consumedReportIds`, and cleared from the queue, but it never becomes Reports evidence. This is how the new-game welcome fax stays purely informational.
6. The next queued fax becomes the visible one. When the queue empties, the window shows NO NEW MESSAGES.

### Milestone triggers

`evidenceManager.addEvidenceTrigger({ predicate, action, once })` runs a
predicate against every newly created evidence item.
`registerEvidenceMilestoneFaxTrigger()` wraps that to send a configured fax.

The one shipped trigger is `WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG`: acquiring
the mine-map photo (`standalone-honeydewcavingclub`, or any photo whose path is
`./assets/photos/minemap.png`) sends the Whitmore police-credentials fax.

### New-game intro faxes

The missing person report is no longer a `DEFAULT_EVIDENCE_BLUEPRINTS` entry —
a new game starts with an empty Reports folder. Instead, `scheduleNewGameIntroFacsimiles()`
(called from the `#newGame` click handler, after `resetFacsimileState()`) arms two
`window.setTimeout` calls:

1. At `NEW_GAME_WELCOME_FAX_DELAY_MS` (10 s), `NEW_GAME_WELCOME_FAX_CONFIG` queues —
   an orientation fax (`awardsEvidence: false`) telling the player to read the
   background story and explore the desk. It never becomes Reports evidence.
2. At `NEW_GAME_WELCOME_FAX_DELAY_MS + NEW_GAME_MISSING_REPORT_FAX_DELAY_MS`
   (40 s), `MISSING_REPORT_FAX_CONFIG` queues — the same `missingReport` catalog
   entry that used to be seeded directly, now delivered by fax and turned into
   Reports evidence like any other read fax.

`cancelScheduledNewGameIntroFacsimiles()` clears both timers; it's called at the
top of `scheduleNewGameIntroFacsimiles()` itself (so re-clicking New Game can't
stack timers) and from the load-game success path (so a still-pending timer from
an abandoned New Game can't inject a fax into a just-loaded save).

---

## 8. The computer (CaveOS 1996)

Clicking the laptop opens a full-viewport `computer` window whose content is the
CaveOS desktop: a header, three icons, and an analogue clock panel.

- **Icons** — Notes, Paint, Netscape. Each toggles its app window *inside* the CaveOS desktop (`parentElement` is the CaveOS container, not the game area), so app windows are clipped to the screen.
- **Clock** — a live analogue clock updated every second by `setInterval`; the interval is cleared when the computer window closes. The date line uses a module-level `Intl.DateTimeFormat`.
- **MENU panel** — clicking the clock panel (or Enter/Space on it) returns to the main menu.
- **App windows** — opened through `openComputerAppWindow()`, which builds a `DesktopWindow`, centres it with `positionWindowWithinParent()` and tracks it in `contentRefs.appWindows`. Notes/Paint open at 60% × 58%; Netscape opens full-size.
- **Closing** — closing the computer window closes its tracked app windows and clears the clock interval.

### Netscape Navigator 3.0

`createComputerNetscapeWindowContentElements()` builds the browser shell:

```
.caveos-browser-app
├── .caveos-browser-toolbar        five quick-link buttons
├── .caveos-browser-address-row    URL input + Go + back/forward/home
└── .caveos-browser-page-host      the rendered page
```

**Destinations** (`browserViews`):

| View | URL | Rendered by |
| --- | --- | --- |
| `welcome` | `about:welcome` | Local template |
| `zoomsearch` | `http://www.zoomsearch.net` | Web content site `zoomsearch` |
| `library` | `http://library.intra` | Web content site `library` |
| `police` | `http://records.sk-police.gov` | Web content site `police` |
| `archives` | `http://archives.canada.news` | Web content site `archives` |
| `cosmic` | `https://leighhobson89.github.io/cosmicForge/` | Local template (real outbound links) |

Views carrying a `siteId` are rendered by `webContentManager.createWebsitePage()`;
the rest use a local render function.

**Routing.** URLs are normalized (lower-cased, trailing slashes stripped) and
looked up in `urlRouteMap` (the views above, registered with and without a
trailing slash). On a miss, `standalone-pages.json` is lazily fetched once and
its records are looked up in `standalonePageRouteMap`. On a second miss, a
"Page Not Found" page is rendered.

**Standalone pages** are simple authored documents: a title, optional per-page
`style` (background colour, text colour, font family), an optional image gallery
and body paragraphs. Body text may embed navigable in-game links using the
`*-*http://example.com*-*` delimiter. A standalone page may award evidence on
first visit (`awardsEvidence: true`).

**Two independent histories:**

| | Back/forward history | Address dropdown history |
| --- | --- | --- |
| Storage | `navigationHistory` (in-window) | `browserAddressHistory` (global, saved) |
| Limit | `HISTORY_LIMIT` = 5 | `BROWSER_ADDRESS_HISTORY_LIMIT` = 10 |
| Lifetime | Lost when the window closes | Survives the window, the computer, and save/load |

Address history entries are either a plain URL string or
`{ url, replay }`. A `replay` records the site id and the exact query that
produced a record, so choosing that entry from the dropdown re-runs the search
and re-selects the record — the page's `caveos-browser-replay` listener does
this. That is why opening a record updates the address bar to the record's own
URL.

`setBrowserAddressHistory()` is the canonical writer and **de-duplicates by
URL**: revisiting a page moves its entry to the most-recent position, carrying
the newer replay data, rather than appending a duplicate. This applies to live
pushes and to restored saves alike, so a repeatedly visited URL can never
consume several of the ten slots. `pushAddressHistoryEntry()` skips
`about:welcome` entirely — it is rendered on every browser open and is one click
away on Home — and re-reads the canonical list afterwards so the window's copy
never drifts.

---

## 9. The web content system

Two modules, plus JSON content. See
[investigation-archives.md](investigation-archives.md) for the per-site search
rules.

### `webContentManager.js`

A factory returning a small API over a registry of site definitions:

| Function | Purpose |
| --- | --- |
| `registerWebsite(definition)` | Validates and stores a site. `id`, `dataPath`, `search` and `buildPage` are required |
| `loadWebsiteData(id)` | Fetches and caches the site JSON; returns a deep clone |
| `getSession(id)` / `loginWebsite(id, credentials)` | Per-site login sessions |
| `searchWebsite(id, request)` | Runs the site's own `search`, then awards evidence for each returned record |
| `createWebsitePage(id)` | Calls the site's `buildPage` with bound helpers |

Evidence awards are de-duplicated per `websiteId:recordId` in
`awardedEvidenceKeys`, so re-running the same search never awards twice.

### Sessions

`websiteSessions` lives in the manager's closure, and the manager is created
**once** at module load. A login therefore outlives the page, the Netscape
window and the computer window: navigating away and back, or closing and
reopening the computer, keeps whoever was signed in.

`createAuthPanel()` only signs in the site's default guest account when
`getSession()` reports no session at all — the first time that page is ever
built. Its **Log Out** button does not clear the session; it signs back in as
the default guest account (`public` level 0 for Police, `free` for Archives),
which is what "logged out" means for these sites, and clears the input fields.

Credentials are matched **exactly** by `findAccountForCredentials()` in
`webContentRegistry.js`: username and password are both case sensitive, and both
must be non-empty. Only surrounding whitespace is trimmed from the username.

Sessions are part of the save payload (`webContentSessions`), keyed by
website id. `webContentManager.js` exposes `getSessionsSnapshot()` and
`restoreSessionsSnapshot()` for this; because the manager is created via a
factory rather than being a singleton module, `ui.js` registers those two
functions with `constantsAndGlobalVars.js` at startup
(`registerWebContentSessionsProvider()`), and `captureGameStatusForSaving()` /
`restoreGameStatus()` call through that registration rather than importing
`ui.js` directly, which would create a circular import. Restoring **replaces**
every session rather than merging, so loading a save always reproduces exactly
the logins that existed when it was made — including "logged out," for a save
made before this feature existed. New Game calls `webContentManager.clearSessions()`
directly, since `ui.js` already holds the instance.

### Quick login

Once the player manually authenticates **above a site's public default level**,
the credentials that achieved it are remembered so they can be replayed with one
click. The button sits on its own full-width row directly beneath Login / Log
Out and reads `Quick Log in (Lvl X)` on Police and `Quick Subscriber Login` on
the Archives — one mechanism, two labels, supplied per-site by
`formatQuickLoginLabel`.

Three properties matter:

- **It cannot escalate.** `quickLoginWebsite()` replays the stored username and
  password through the site's ordinary `authenticate` path rather than writing a
  session object directly, so it can only ever reproduce a level a manual login
  already earned. Reaching Level 3 still requires typing Level 3 credentials once.
- **It is a high-water mark.** `recordQuickLogin()` in
  `constantsAndGlobalVars.js` only overwrites the stored entry when the new level
  is *higher*, so logging back in at Level 1 does not downgrade a banked Level 3.
- **A guest sign-in never counts.** `recordManualLogin()` ignores any login
  resolving to access level 0, otherwise `public`/`public` or `free`/`free` would
  offer a quick login to access the player already has.

The credentials are **game state, not UI state**: they live in
`quickLoginState` in `constantsAndGlobalVars.js`, ride along in
`captureGameStatusForSaving()` under `quickLoginState`, are restored by
`setQuickLoginState()`, and are wiped by `resetQuickLoginState()` on New Game.
`webContentManager.js` reaches them through an injected `quickLogin: { get,
record }` provider passed by `ui.js`, the same pattern already used for
`awardEvidence` — the manager never imports game state itself.

Named convenience readers (`getPoliceQuickLoginEnabled()`,
`getHighestPoliceLoginLevel()`, `getNewspaperQuickLoginEnabled()`) derive from
that one map rather than being stored separately, so there is a single source of
truth and no way for the flags and the credentials to disagree.

### `webContentRegistry.js`

Defines the four sites and their renderers. Shared building blocks:
`createResultsTable`, `createDetailHost`, `createMetadataGrid`,
`createTextSection`, `createKeyValueList`, `createImageGallery`,
`makeSelectableResults`, plus the wiring helpers `wireReplayListener`,
`wireEnterKeySubmit`, `createAuthPanel` and `runSiteSearch`.

`createImageGallery`, `normalizeLines` and `appendDelimitedLinkText` are
exported and reused by `ui.js` for standalone pages, so gallery and link markup
is identical everywhere.

Every site returns **at most one** record, and the results table is sliced to one
row. Selecting the row renders the detail panel and dispatches
`caveos-browser-record-opened` — always, whether or not the record has a `url`.
The address-bar/replay-history listener in `ui.js` only acts when `detail.url`
is non-empty (police records don't have one); `handleBrowserRecordOpenedForFaxTriggers()`
listens on `document` for the same event and keys off `detail.replay.siteId` +
`detail.recordId` instead, which every site's `getReplayDetail` supplies
regardless of `url`. This is what "opening" a record (as opposed to merely
searching for it) means for `registerRecordOpenFaxTrigger()` — see
[facsimile-event-trigger-guide.md](facsimile-event-trigger-guide.md).

### Awarding evidence from the web

When a returned record has `awardsEvidence: true` and an `evidence` descriptor
(object or array), `awardWebContentEvidence()` in `ui.js`:

1. Checks the target collection for an existing item matching by `source.entryId`, `source.path`, name+type, or source-kind+name.
2. Strips `description` / `photoCaption` from catalog-backed photo descriptors, so the localized catalog stays the single source of truth.
3. Creates the evidence and, for photo/report types from a known service, shows the "New Photo/Report … unlocked" reward notification.

---

## 10. The Web Content Generator tool

`tools/web_content_builder.html` + `.js` + `_server.js` is the authoring tool for
all in-game web content. Full instructions:
[../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md](../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md).

```
tools/web_content_builder.html   the form UI
tools/web_content_builder.js     form state, preview, payload construction
tools/web_content_builder_server.js  local write API on http://localhost:5058
```

Run `node tools/web_content_builder_server.js`, open the HTML page, fill the
form, preview, then Inject. The server:

1. Upserts the record (by slugified `id`) into the right `assets/en/*.json` bucket (the tool only edits the English site copy; other languages are separate files kept in sync manually).
2. If the record awards evidence, upserts a matching entry into **all five** localized evidence catalogs (`assets/{lang}/photos_evidences.json` or `assets/{lang}/reports_evidences.json`), seeding every language with the entered text as placeholder content.
3. Strips catalog-owned fields from the copy stored in the web-content JSON.

This tool is now the only content generator in the repository. The former
Evidence JSON Builder (`tools/debug_json_string_tool.html`, its script, its
`evidence_builder_server.js` API and its manual) was removed in the August 2026
audit — the web content builder had already absorbed evidence-catalog writing.
Editing an evidence catalog by hand is still perfectly fine; they are plain
`{ "entries": [ … ] }` JSON files.

---

## 11. Notifications

`showNotifcation(type, text, durationMs, sound, target)` (also exposed as
`window.showNotifcation`) pushes onto a queue that releases **one notification
every 3 s** (`NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS`), so a burst of evidence
awards does not stack on screen. The release interval stops itself when the
queue drains.

Each notification fades in on the next animation frame, plays its SFX, and is
removed after `max(200, durationMs)` plus a 260 ms fade-out.

Types map to CSS classes `game-notification-{type}`: `info` (default), `error`,
`reward`, `fax-system`, `fax-intel`, `fax-credentials`, `fax-urgent`.

### Clicking a notification

The optional fifth argument, `target`, names a desk object the notification is
about and turns it into a shortcut to that window. Valid values are the keys of
`NOTIFICATION_TARGETS` in `ui.js`: `facsimile`, `reports`, `photos`. Omit it and
the notification stays purely informational, exactly as before.

`openNotificationTarget()` does three things, in order:

1. Closes the computer window if it is open. The computer is full-screen, so
   anything opened behind it would be invisible; its own `onClose` also closes
   its child app windows (Netscape, Notes, Paint).
2. If the target window is already open, raises it. Unlike the desk objects,
   a notification never *toggles* its target shut — clicking "new evidence"
   should never close the folder you are looking at.
3. Otherwise opens it through the **same opener the desk object uses**
   (`openFacsimileWindow` / `openReportsWindow` / `openPhotosWindow`), so the
   game-state consequences are identical to opening it by hand. For the
   facsimile that matters a lot: opening marks the pending message read and
   closing commits it to evidence, and the shortcut goes through both.

Consistency with manual opening is deliberate down to the details — the photos
and reports carousels open at their current index rather than jumping to the
newly awarded item, because that is what the folders do when clicked on the
desk.

The toasts live in the **bottom-right**. They used to be top-right, but that
corner holds every window's close button and the floating settings cog; once
notifications became clickable a stack of them there would swallow those
clicks (which it briefly did — a close-button click was silently retried for
15 s). Bottom-left is the autosave indicator, so bottom-right is the free
corner. The host stays `pointer-events: none`; only notifications carrying a
`target` opt back in via `.is-actionable`.

> The exported name is misspelled (`showNotifcation`). It is left as-is because
> it is a documented global used from the console and by tests.

---

## 12. Audio

`audioManager.js` exports a single `AudioManager` instance.

- **Music** — six tracks in `audio/music/`. Playback is shuffled; `playRandomTrack({ excludeCurrent: true })` avoids repeating the current track, and each track chains into the next on `ended`. A failed track skips to another.
- **SFX** — five registered effects (`clickButton`, `clickSwitch`, `newEvidence`, `fax`, `evidenceGain`). `playSfx()` also accepts a raw path. `fax` plays with a fax's arrival notification; `evidenceGain` plays when a photo or report is unlocked into the Evidence folder.
- **Gating** — browsers block audio before user interaction, so every click handler calls `audioManager.onUserGesture()` first, which starts music if it is not paused.
- **Mute and volume** — mute is a saved boolean; music and SFX volumes are saved floats (defaults 0.1 and 0.85). Muting sets music volume to 0 rather than pausing, so the track keeps its position.
- **Manual pause** — `manuallyPaused` distinguishes "player pressed pause" from "not started yet", so an unrelated gesture never resumes music the player deliberately stopped.

---

## 13. Localization

`localization.json` holds one object per language (`en`, `es`, `de`, `it`, `fr`),
each a flat key → string map. `localize(key, language)` returns the key itself
when the language or key is missing, which makes missing strings visible rather
than blank.

`initLocalization()` fetches `localization.json` **once** and reuses it for every
later language change.

Strings may contain `${…}` template expressions, which are evaluated by
`interpolateTemplateLiteral()`. No shipped string uses this today.

Language switching goes through `handleLanguageChange(code)`:
`setLanguageSelected` → `initLocalization` → `setElementsLanguageText()`.
The latter walks `LOCALIZED_STATIC_TEXT_BY_ELEMENT_KEY` for the static chrome,
then refreshes the mute label, transport controls, open windows and the calendar.

Content is localized separately, by file:

- Story — `assets/{lang}/story.md`
- Reports — `assets/{lang}/reports_evidences.json`
- Photos — `assets/{lang}/photos_evidences.json`

Web content (`assets/<lang>/*.json`) is **not** localized.

---

## 14. Save and load

There are two routes into and out of the same payload and the same encoding:
the **manual copy/paste save string**, and the **sticky save** autosaved into
`localStorage` (below). Neither has a file download.

- `captureGameStatusForSaving()` builds the payload object.
- `saveGame()` JSON-stringifies it, compresses it with `LZString.compressToEncodedURIComponent`, and puts the result in the popup's read-only text area for the player to copy.
- `loadGame()` reads the text area, decompresses, parses, and calls `restoreGameStatus()`, then re-applies the language and alerts on success. Each failure mode has its own message.

The payload:

| Field | Notes |
| --- | --- |
| `language`, `audioMuted`, `musicVolumePreference`, `sfxVolumePreference` | Settings |
| `evidenceStore` | Full store snapshot: `nextEvidenceId`, `evidencesById`, `collections`, `indices` |
| `evidenceCustomNames` | Player-renamed evidence, by id |
| `progressEvidence` | Activated `progressEvidenceId`s only — the website/fax definitions stay in code. Absent in older saves, which restore as "nothing activated" (see [progress-evidence-system.md](progress-evidence-system.md) §6) |
| `notesPages`, `notesActivePageIndex` | Ten notes pages |
| `paintPages`, `paintActivePageIndex` | Ten sketches, each a data-URL snapshot |
| `ashtrayHasLitCigarette`, `ashtrayHasExtraButt` | Ashtray state |
| `facsimileState` | Pending and consumed faxes |
| `browserAddressHistory` | Up to 10 address entries with replay data, de-duplicated by URL |
| `webContentSessions` | Police Records and Canada Archives logins, by website id |
| `quickLoginState` | Banked quick-login credentials per website id (see §9, "Quick login") |
| `activeGameplayState` / `currentScene` | Which scene to restore |

`restoreGameStatus()` is defensive throughout: every setter re-validates and
clamps its input, and an unusable `evidenceStore` falls back to
`initializeEvidenceStoreForNewGame()`.

### Sticky save (`stickySave.js`)

An autosaved copy of the game in `localStorage` under the namespaced key
`theCave:sticky-save`, so refreshing or reopening the tab offers **Resume Game**
instead of losing the session. It deliberately reuses
`captureGameStatusForSaving()` + LZString — the *same* format as the copy/paste
string, just stored somewhere else — so the project has one save format, not two.

| Function | Notes |
| --- | --- |
| `writeStickySave()` | Serialises current state and stores it. Returns false rather than throwing. |
| `readStickySave()` | Returns the parsed state, or null. **Clears** an unreadable entry so a corrupt save cannot fail on every subsequent load. |
| `hasStickySave()` | Whether a resumable game exists. |
| `clearStickySave()` | Removes only this key; unrelated `localStorage` entries are untouched. |
| `startStickyAutosave({ onAutosave })` / `stopStickyAutosave()` | The 60s timer, plus a `beforeunload` flush. |

Lifecycle notes:

- `startStickyAutosave()` is **idempotent** — it stops any existing timer and
  listener before installing new ones, so New Game → Load → Resume in one session
  cannot stack duplicate intervals.
- The autosave writes fresh state each tick (it calls
  `captureGameStatusForSaving()` at write time), never a captured snapshot.
- A `beforeunload` flush covers refreshing between two ticks.
- New Game, Load Game and Resume all seed a write immediately rather than
  leaving up to a minute where a refresh would resume the *previous* game.
- Every entry point degrades quietly if `localStorage` throws (private-browsing
  modes) or if the LZString CDN script is missing: the feature turns itself off
  rather than breaking the game.

### Autosave indicator

`startStickyAutosave()` takes an `onAutosave` callback that fires **only after a
timed autosave that actually wrote**, so the indicator reports a real save
rather than just a timer tick. It is deliberately not called for the immediate
seed writes (New Game / Load / Resume) or the `beforeunload` flush. `ui.js`
wires it in one place, `beginStickyAutosave()`, so the three start points cannot
disagree; `stickySave.js` itself stays DOM-free.

`showAutosaveIndicator()` in `ui.js` shows a floppy-disk SVG inside a spinning
ring with a "Saving…" label:

- **One element, created once and reused**, so overlapping saves can never
  stack two indicators — a save arriving while it is still up just restarts the
  visible window and cancels the pending hide.
- Appended to **`<body>`**, not `#gameArea`, so it shows in every state:
  desktop, noticeboard, menu, and with any window (including the full-screen
  computer) open.
- `position: fixed; left: 40px; bottom: 40px`, anchored to the viewport.
- Fade in and fade out are the same **0.75 s** `opacity` transition; the
  element is visible for `AUTOSAVE_INDICATOR_VISIBLE_MS` (1.6 s) between them.
  `visibility` is delayed by the fade duration so the hidden element cannot be
  hit-tested. The spinner animation is parked (`.is-active` removed) once the
  fade-out finishes rather than running invisibly forever.
- `z-index: var(--z-autosave-indicator)` = **100000**, defined on `:root` as the
  documented topmost layer. The next highest value anywhere is 9990 (the
  evidence magnifier); nothing else should use or exceed the indicator's.

**Resume flow.** On startup `refreshStickySaveResumeOffer()` enables the Resume
button and adds `.has-sticky-save` (a pulsing highlight) when a save is found.
Clicking Resume with no game in memory calls `restoreStickySaveIntoGame()`,
which mirrors the load-from-string path so both routes end in the same state; a
save that fails to restore is discarded and the button re-disabled. With a game
already in memory (Escape → menu → Resume) it stays the plain "go back" path and
does not touch `localStorage`.

**New Game confirmation.** Because New Game overwrites the sticky save, it opens
`#newGameConfirmPopup` first whenever `hasStickySave()` is true. Cancel leaves
the stored save byte-for-byte untouched; confirming calls `clearStickySave()`
then `beginNewGame()`. With no sticky save present, New Game starts immediately
as before. `beginNewGame()` holds everything a new game resets, so the button
and the dialog cannot drift apart.

---

## 15. Desk objects

| Object | Element | Behaviour |
| --- | --- | --- |
| Story stack | `#backgroundFolder` | Toggles the story window |
| Reports folder | `#reportsFolder` | Toggles the reports carousel |
| Photos folder | `#photosFolder` | Toggles the photos carousel |
| Notes folder | `#notesFolder` | Toggles the notes window |
| Calendar | `#desktopCalendar` | Shows today's real month/day; clicking returns to the menu |
| Ashtray | `#desktopAshtrayHotspot` | Toggles the lit cigarette; 620 ms extinguish/relight animations, state saved |
| Facsimile | `#desktopFacsimileHotspot` | Toggles the FACSIMILE window |
| Computer | `#desktopComputerHotspot` | Toggles the CaveOS window |
| Evidence envelope | `#progressEvidenceEnvelope` | On the **noticeboard**, not the desk. Toggles the progress evidence carousel |

The floating control cluster holds the settings (♫) toggle, which expands
mute/transport/volume controls, and the noticeboard toggle, which runs the faded
scene transition.

---

## 16. The debug window

Pressing `-` (or numpad minus) during gameplay, while not typing in a field,
toggles a green `debug-window`. Its single **Log** button prints a grouped
console snapshot: the current language, the raw evidence store, a
per-collection view with resolved content paths, the full save payload object,
its JSON length, and the compressed save length and preview.

The Playwright suite drives this window to assert on evidence state.

---

## 17. Tests

Playwright, against a local static server (`tests/support/static-server.cjs`,
port 4173). The suite is split by functional area; see
[`tests/README.md`](../tests/README.md) for the per-spec table and
[`test-reports/README.md`](../test-reports/README.md) for run history.

```bash
npm run test:e2e            # everything, recorded into test-reports/runs/<stamp>/
npm run test:e2e:app        # tests/e2e only (the game)
npm run test:e2e:tools      # tests/tools only (the content builder API)
npm run test:e2e:categories # list every tests/e2e/ category and its spec count
npm run test:e2e:category -- quick-login   # just that one category
npm run test:e2e:headed     # watch it in a real browser (forces one worker)
npm run test:e2e:slow       # ...with a 350ms pause between actions
npm run test:e2e:ui         # interactive UI mode
node scripts/run-tests.cjs tests/e2e/quick-login/browser-quick-login.spec.js
```

```
tests/
  e2e/
    <category>/*.spec.js   one folder per coverage area (12 today; 18 specs)
  tools/                    the content builder HTTP API
  support/                  shared helpers (game-helpers.js) and the static server
  artifacts/                committed visual evidence produced by tests
```

`tests/e2e/` has no registry file — every immediate subfolder is a category.
Playwright's own file matching already recurses into subfolders, so adding one
is just `mkdir tests/e2e/<name>` plus `.spec.js` files; `--category <name>` and
`--list-categories` in `scripts/run-tests.cjs` pick it up with no code change.
Each category folder has its own `README.md`. Three exist today with no specs
yet (`audio-settings`, `desktop-window-chrome`, `viewport-scene-navigation`) —
the top gaps in `docs/test-coverage-analysis.md`.

Results are written to `test-reports/runs/<timestamp>/` (JSON, a markdown
summary, the full HTML report and an `artifacts/` folder), with a rolling
history of the last 10 runs indexed in `test-reports/history.md`.

Every test captures a screenshot, video and trace **on failure only**; these go
into that run's own `artifacts/` folder, so history retains each run's failure
evidence instead of the newest run wiping the previous one's. The run summary
links them and embeds the screenshot inline.

Note for anyone adding specs: clicking `#newGame` a second time in the same
browser context opens the overwrite confirmation, because the first game wrote
a sticky save. Use `startNewGame()`/`clickNewGame()` from
`tests/support/game-helpers.js`, which accept the dialog when it appears.

Locators are written against the English values in `localization.json`.
Rewording an English string breaks them, so treat those values as a contract.

Worker count is pinned to 4 in `playwright.config.js`: Playwright's default of
8 on this machine crashes browser targets and produces failures unrelated to
the assertions. Override with `CAVE_WORKERS`.

`playwright.facsimile-video.config.js` is the same config with `video: "on"`,
for capturing fax behaviour.

---

## 18. Known issues

Carried forward from the audit; none were changed, because each fix alters
behaviour or existing save files.

1. **The story collection is keyed `"undefined"`.** `STORAGE_KEYS.BACKGROUND_STORY` is referenced throughout `evidenceManager.js` and `ui.js` but was never defined on `STORAGE_KEYS`, so it evaluates to `undefined` and the collection key is the string `"undefined"` — in memory and in every save file. Behaviour is self-consistent; the only symptom is that the debug window's per-collection view shows an empty `theArnieTragedy` bucket instead of the story. Fixing it needs a save migration.
2. **`openNotesWindow()` returns nothing.** `openComputerWindow()` does `const notesWindow = openNotesWindow(…); if (notesWindow) …`, so a CaveOS Notes window is never added to `appWindows` and is not closed with the computer. Its controller stays in `activeDesktopWindows` until the next Notes toggle. A one-line `return notesWindowController;` fixes it, at the cost of an extra close sound.
3. **The zoom readout starts at "3/5".** `setElementsLanguageText()` hardcodes `3/5` while `updateZoomReadout()` reports `n/4` from `ZOOM_LEVELS`. The label corrects itself on the first zoom.
4. **`showNotifcation` is misspelled** and is a public global.
