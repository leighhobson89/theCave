# Evidence System

How unlocked evidence is stored, rendered and persisted. For the UI around it
(the carousels, the magnifier, renaming) see
[architecture.md §4](architecture.md#4-evidence-carousels-photos-and-reports-folders).

Primary files:

- [`evidenceManager.js`](../evidenceManager.js) — the store, blueprints and triggers
- [`ui.js`](../ui.js) — rendering, catalog resolution, web/fax award paths
- [`constantsAndGlobalVars.js`](../constantsAndGlobalVars.js) — save capture and restore

Displayed report and photo content comes **only** from localized catalog JSON.
There is no markdown fallback for report or photo evidence; only the background
story uses markdown.

---

## The store

One in-memory object, snapshot straight into the save:

```js
{
  nextEvidenceId: 1,
  evidencesById: { "1": { id, type, storageKey, titleKey, name, defaultTitleString, paperStyle, source } },
  collections:   { "<story>": [1], photos: [2], reports: [3] },   // arrays of ids, in unlock order
  indices:       { "<story>": 0, photos: 0, reports: 0 }          // carousel position per collection
}
```

Three collections, addressed by *storage key*:

| Collection | Storage key at runtime | Folder |
| --- | --- | --- |
| Background story | `"undefined"` — see the note below | The Arnie Tragedy stack |
| Photos | `"photos"` | Photos folder |
| Reports | `"reports"` | Reports folder |

> **Known defect.** `evidenceManager.js` and `ui.js` both address the story
> collection as `STORAGE_KEYS.BACKGROUND_STORY`, but that member was never
> defined on `STORAGE_KEYS`. It therefore evaluates to `undefined` and the
> collection key is the literal string `"undefined"`, in memory and in every
> save file written so far. Everything is self-consistent so the game works
> correctly; the only symptom is that the debug window's per-collection view
> shows an empty `theArnieTragedy` bucket. Defining the constant would orphan
> the story evidence in existing saves, so it needs a save migration. Documented
> in a comment on `STORAGE_KEYS`.

### API

| Function | Purpose |
| --- | --- |
| `initializeEvidenceStoreForNewGame()` | Resets and rebuilds from `DEFAULT_EVIDENCE_BLUEPRINTS` |
| `createEvidence(descriptor)` | Adds an item, returns a clone, runs evidence triggers |
| `getEvidenceCollection(key)` | All items in a collection, as clones |
| `getEvidenceCount(key)` | Item count without cloning — use this for emptiness checks |
| `getCurrentEvidence(key)` | The item at the collection's current index |
| `getEvidenceIndex(key)` / `setEvidenceIndex(key, i)` / `stepEvidenceIndex(key, delta)` | Carousel position; indices wrap in both directions |
| `getEvidenceStoreSnapshot()` / `setEvidenceStoreSnapshot(snapshot)` | Save and restore |
| `getEvidenceStorageKeys()` | The `STORAGE_KEYS` object |
| `addEvidenceTrigger({ predicate, action, once })` | Run `action` when a newly created item matches `predicate` |

Every read returns a deep clone, so callers can never mutate the store by
accident.

### New-game defaults

`DEFAULT_EVIDENCE_BLUEPRINTS` in `evidenceManager.js` seeds a new game. Today:

1. The background story (`story`, markdown template).
2. `caveEntrance.png` (photo, `photo-mounted-ivory`).
3. `missingReport` (report).

Add a blueprint entry to give the player something from the start.

---

## Content sources

Each evidence item carries a `source` object naming how its content is
resolved.

### `markdown-template` — the story

```js
source: { kind: "markdown-template", languageAware: true, pathTemplate: "./assets/story_{lang}.md" }
```

`{lang}` is substituted with the active language code. Rendered as plain text.

### `report-localized-catalog-entry` — reports

```js
source: {
  kind: "report-localized-catalog-entry",
  languageAware: true,
  catalogPathTemplate: "./assets/reportsEvidences_{lang}.json",
  entryId: "missingReport"
}
```

Catalog file shape:

```json
{ "entries": [
  { "id": "missingReport",
    "defaultTitleString": "Missing Person Report",
    "paperStyle": "report-parchment",
    "reportText": "…",
    "descriptionText": "…" }
] }
```

Fields used: `reportText`, `descriptionText`, `defaultTitleString`, `paperStyle`.

### `photo-localized-catalog-entry` — photos

```js
source: {
  kind: "photo-localized-catalog-entry",
  languageAware: true,
  catalogPathTemplate: "./assets/photos_evidences_{lang}.json",
  entryId: "caveEntrance",
  photoPath: "./assets/photos/caveEntrance.png"
}
```

Catalog entry shape:

```json
{ "id": "caveEntrance",
  "photoPath": "./assets/photos/caveEntrance.png",
  "defaultTitleString": "Cave Entrance",
  "paperStyle": "photo-mounted-ivory",
  "captionText": "…",
  "descriptionText": "…" }
```

The **catalog** `photoPath` is what the carousel renders, not the one on the
source descriptor.

### `facsimile-inline-report` — faxes without a catalog

A fax that carries its own `reportText` and `description` inline gets this
source kind. Inline text wins over any catalog lookup for reports.

### Catalog loading

`loadEvidenceCatalogByLanguage()` fetches a catalog once per
`pathTemplate|language` pair and caches the parsed entries as a `Map` keyed by
`id`. A leading BOM is stripped (`sanitizeCatalogText`). A failed fetch caches an
empty map, so a broken catalog does not retry on every render.

### Missing content

The UI never silently falls back. It renders an explicit message naming the
evidence, the missing entry id or field, and the requested language:

```
Report content unavailable for 'Missing Person Report'.
Missing catalog entry 'missingReport' for language 'de'.
```

```
Photo description unavailable for 'Cave Entrance'.
Catalog entry 'caveEntrance' is missing 'descriptionText' for language 'fr'.
```

---

## How evidence gets unlocked

There are three paths in.

### 1. New-game blueprints

`initializeEvidenceStoreForNewGame()`, as above.

### 2. Web content

A record in `assets/web-content/*.json` with `awardsEvidence: true` and an
`evidence` descriptor (object, or array for multiple). On a matching search or
standalone-page visit:

1. `webContentManager.searchWebsite()` calls `awardEvidenceForRecord()`, de-duplicated per `websiteId:recordId`.
2. `awardWebContentEvidence()` in `ui.js` de-duplicates again against the live collection — by `source.entryId`, `source.path`, name+type, or source-kind+name — so reloading a save and re-searching cannot duplicate an item.
3. Catalog-backed photo descriptors have their `description` and `photoCaption` stripped, keeping the localized catalog authoritative.
4. `createEvidence()` inserts it and a reward notification fires.

### 3. Facsimile

Reading a fax and closing the window (or advancing to the next message) commits
it as report evidence. See
[facsimile-event-trigger-guide.md](facsimile-event-trigger-guide.md).

---

## Evidence triggers

`addEvidenceTrigger({ predicate, action, once = true })` registers a callback
run against every newly created evidence item. Both the predicate and the action
receive a clone, and both are wrapped in try/catch so a bad trigger cannot break
evidence creation. A `once` trigger removes itself after firing.

`registerEvidenceMilestoneFaxTrigger()` in `ui.js` builds on this to send a
configured fax at a story milestone. The shipped example is the Whitmore
police-credentials fax, triggered by acquiring the mine-map photo.

---

## Save and load

Captured by `captureGameStatusForSaving()` and restored by
`restoreGameStatus()`, both in `constantsAndGlobalVars.js`.

`setEvidenceStoreSnapshot()` validates aggressively on the way in: it requires
`collections`, `evidencesById` and `indices`; drops collection ids with no
matching item; back-fills a missing `defaultTitleString` from the item name;
clamps every index into range; and guarantees the three known collections exist.
If it returns `false`, `restoreGameStatus()` falls back to
`initializeEvidenceStoreForNewGame()`. That is save validation, not content
fallback.

Player-assigned names live outside the store, in `evidenceCustomNames` (evidence
id → name), and are saved alongside it.

---

## Authoring rules

For web-unlocked report evidence:

1. Keep unlock metadata in `assets/web-content/*.json`.
2. Use source kind `report-localized-catalog-entry`.
3. Match `evidence.name` and `source.entryId` to an entry id in `assets/reportsEvidences_{lang}.json`.
4. Add the text to **every** supported language catalog (`en`, `de`, `es`, `fr`, `it`).
5. Do not create markdown files for report or photo evidence.

The [Web Content Builder](../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md) does
steps 1–4 for you, seeding all five catalogs with your text as placeholder
content for later translation.
