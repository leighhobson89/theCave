# Architecture and Component Reference

This is the single reference for how *The Cave* is put together and how each
component behaves at runtime. It was rewritten from a full read of the codebase
during the August 2026 audit (see [audit-2026-08-10.md](audit-2026-08-10.md)).

Companion documents:

- [evidence-system.md](evidence-system.md) — the evidence store and content catalogs, in depth
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
│   └── evidenceManager.js      evidence store, blueprints, triggers
├── evidenceManager.js
├── game.js                     scene state machine, viewport zoom/pan, scene transitions
├── audioManager.js             music playlist, SFX, mute/volume
├── localization.js             localization.json loader and localize()
├── desktopWindow.js            the draggable/resizable window component
├── saveLoadGame.js             save-string capture and restore
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
`computer-notes`, `computer-paint`, `computer-netscape`, `debug`.

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

---

## 5. The Story folder

The `#backgroundFolder` stack opens a single non-resizable window rendering
`assets/story_{lang}.md` as plain text on lined paper. Text is fetched once per
resolved path and cached in `storyTextCacheByLanguage`. A language change
re-renders the open window through `refreshOpenWindowLocalization()`.

The story evidence item is created from `DEFAULT_EVIDENCE_BLUEPRINTS`, and its
content path comes from `resolveEvidenceContentPath()`. If the story evidence is
missing, `getStoryText()` falls back to `assets/story_{lang}.md` directly.

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
5. Reading is committed either by closing the window or by pressing *Show Next Cached Message*. `commitReadFacsimileReportToEvidence()` creates the report evidence (unless one with the same `evidenceName` already exists), moves the id to `consumedReportIds`, and fires the "New Report … unlocked" reward notification.
6. The next queued fax becomes the visible one. When the queue empties, the window shows NO NEW MESSAGES.

### Milestone triggers

`evidenceManager.addEvidenceTrigger({ predicate, action, once })` runs a
predicate against every newly created evidence item.
`registerEvidenceMilestoneFaxTrigger()` wraps that to send a configured fax.

The one shipped trigger is `WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG`: acquiring
the mine-map photo (`standalone-honeydewcavingclub`, or any photo whose path is
`./assets/photos/minemap.png`) sends the Whitmore police-credentials fax.

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
| Storage | `navigationHistory` (in-window) | `browserAddressHistory` (saved) |
| Limit | `HISTORY_LIMIT` = 5 | 10 entries |
| Lifetime | Lost when the window closes | Persisted in the save |

Address history entries are either a plain URL string or
`{ url, replay }`. A `replay` records the site id and the exact query that
produced a record, so choosing that entry from the dropdown re-runs the search
and re-selects the record — the page's `caveos-browser-replay` listener does
this. That is why opening a record updates the address bar to the record's own
URL.

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

Sessions default to `{ authenticated: false, accessLevel: 0, accessLabel: "Guest" }`.
Evidence awards are de-duplicated per `websiteId:recordId` in
`awardedEvidenceKeys`, so re-running the same search never awards twice.

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
`caveos-browser-record-opened`, which is what feeds the address bar and replay
history.

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

1. Upserts the record (by slugified `id`) into the right `assets/web-content/*.json` bucket.
2. If the record awards evidence, upserts a matching entry into **all five** localized evidence catalogs (`assets/photos_evidences_{lang}.json` or `assets/reportsEvidences_{lang}.json`), seeding every language with the entered text as placeholder content.
3. Strips catalog-owned fields from the copy stored in the web-content JSON.

This tool is now the only content generator in the repository. The former
Evidence JSON Builder (`tools/debug_json_string_tool.html`, its script, its
`evidence_builder_server.js` API and its manual) was removed in the August 2026
audit — the web content builder had already absorbed evidence-catalog writing.
Editing an evidence catalog by hand is still perfectly fine; they are plain
`{ "entries": [ … ] }` JSON files.

---

## 11. Notifications

`showNotifcation(type, text, durationMs, sound)` (also exposed as
`window.showNotifcation`) pushes onto a queue that releases **one notification
every 3 s** (`NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS`), so a burst of evidence
awards does not stack on screen. The release interval stops itself when the
queue drains.

Each notification fades in on the next animation frame, plays its SFX, and is
removed after `max(200, durationMs)` plus a 260 ms fade-out.

Types map to CSS classes `game-notification-{type}`: `info` (default), `error`,
`reward`, `fax-system`, `fax-intel`, `fax-credentials`, `fax-urgent`.

> The exported name is misspelled (`showNotifcation`). It is left as-is because
> it is a documented global used from the console and by tests.

---

## 12. Audio

`audioManager.js` exports a single `AudioManager` instance.

- **Music** — six tracks in `audio/music/`. Playback is shuffled; `playRandomTrack({ excludeCurrent: true })` avoids repeating the current track, and each track chains into the next on `ended`. A failed track skips to another.
- **SFX** — three registered effects (`clickButton`, `clickSwitch`, `newEvidence`). `playSfx()` also accepts a raw path.
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

- Story — `assets/story_{lang}.md`
- Reports — `assets/reportsEvidences_{lang}.json`
- Photos — `assets/photos_evidences_{lang}.json`

Web content (`assets/web-content/*.json`) is **not** localized.

---

## 14. Save and load

Saving is manual and string-based; there is no auto-save and no file download.

- `captureGameStatusForSaving()` builds the payload object.
- `saveGame()` JSON-stringifies it, compresses it with `LZString.compressToEncodedURIComponent`, and puts the result in the popup's read-only text area for the player to copy.
- `loadGame()` reads the text area, decompresses, parses, and calls `restoreGameStatus()`, then re-applies the language and alerts on success. Each failure mode has its own message.

The payload:

| Field | Notes |
| --- | --- |
| `language`, `audioMuted`, `musicVolumePreference`, `sfxVolumePreference` | Settings |
| `evidenceStore` | Full store snapshot: `nextEvidenceId`, `evidencesById`, `collections`, `indices` |
| `evidenceCustomNames` | Player-renamed evidence, by id |
| `notesPages`, `notesActivePageIndex` | Ten notes pages |
| `paintPages`, `paintActivePageIndex` | Ten sketches, each a data-URL snapshot |
| `ashtrayHasLitCigarette`, `ashtrayHasExtraButt` | Ashtray state |
| `facsimileState` | Pending and consumed faxes |
| `browserAddressHistory` | Up to 10 address entries with replay data |
| `activeGameplayState` / `currentScene` | Which scene to restore |

`restoreGameStatus()` is defensive throughout: every setter re-validates and
clamps its input, and an unusable `evidenceStore` falls back to
`initializeEvidenceStoreForNewGame()`.

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

Playwright, against a local static server (`tests/static-server.cjs`, port 4173).

```bash
npm run test:e2e            # everything
npx playwright test tests/report-magnifier.spec.js
```

| Spec | Covers |
| --- | --- |
| `tests/report-magnifier.spec.js` | Report and photo magnifier geometry, standalone-page evidence awards, the full facsimile lifecycle (single, batch of five, next-message button), and the mine-map milestone fax |
| `tests/regression-smoke.spec.js` | Notes and Paint paged documents (tabs, titles, per-page bodies, flood fill), all four web services including privilege gating, address-history replay, language switching, story-window retitling, and a save/load round trip |

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
