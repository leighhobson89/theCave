# Evidence System Developer Guide

## Purpose
The evidence system stores the player's unlocked evidence at runtime and persists it in save data.

Displayed report and photo content is now loaded strictly from localized catalog JSON files. There is no markdown fallback for report/photo evidence.

Primary files:
- [evidenceManager.js](evidenceManager.js)
- [ui.js](ui.js)
- [constantsAndGlobalVars.js](constantsAndGlobalVars.js)

## Runtime Store
The in-memory evidence store contains:
- `nextEvidenceId`
- `evidencesById`
- `collections`
  - `backgroundStory`
  - `photos`
  - `reports`
- `indices`

Main APIs:
- `getEvidenceStoreSnapshot()`
- `setEvidenceStoreSnapshot(snapshot)`
- `getEvidenceCollection(storageKey)`
- `getCurrentEvidence(storageKey)`
- `setEvidenceIndex(storageKey, index)`
- `stepEvidenceIndex(storageKey, delta)`

## New Game Defaults
`initializeEvidenceStoreForNewGame()` rebuilds the store from `DEFAULT_EVIDENCE_BLUEPRINTS` in [evidenceManager.js](evidenceManager.js).

## Content Sources
### Story
Story evidence uses language-aware markdown template source:
- `./assets/story_{lang}.md`

### Reports
Reports use localized catalog entries:
- catalog file: `./assets/reportsEvidences_{lang}.json`
- source kind: `report-localized-catalog-entry`
- source fields:
  - `languageAware`
  - `catalogPathTemplate`
  - `entryId`

Rendered report fields come from the catalog entry:
- `reportText`
- `descriptionText`
- `defaultTitleString`
- `paperStyle`

### Photos
Photos use localized catalog entries:
- catalog file: `./assets/photos_evidences_{lang}.json`
- source kind: `photo-localized-catalog-entry`
- source fields:
  - `languageAware`
  - `catalogPathTemplate`
  - `entryId`

Rendered photo fields come from the catalog entry:
- `photoPath`
- `descriptionText`
- `defaultTitleString`
- `paperStyle`

## Missing Resource Handling
If a report/photo catalog entry or required field is missing, UI does not fall back to old paths.
Instead it shows an explicit user-facing unavailable message describing:
- which evidence item failed
- which catalog entry is missing
- which field is missing
- which language was requested

## Web Content Evidence Flow
Web-linked evidence unlock descriptors live in:
- `assets/web-content/zoomsearch.json`
- `assets/web-content/library.json`
- `assets/web-content/police.json`
- `assets/web-content/archives.json`
- `assets/web-content/standalone-pages.json`

When a Netscape search returns a record with:
- `awardsEvidence: true`
- `evidence: { ... }`

Then the flow is:
1. [webContentManager.js](webContentManager.js) awards the record evidence.
2. `awardWebContentEvidence(...)` in [ui.js](ui.js) deduplicates it against the current runtime collection.
3. `createEvidence(...)` in [evidenceManager.js](evidenceManager.js) inserts it into the runtime store.
4. Save data persists it via `evidenceStore` snapshot.

## Save/Load
Saved by:
- `captureGameStatusForSaving()` in [constantsAndGlobalVars.js](constantsAndGlobalVars.js)

Restored by:
- `restoreGameStatus(gameState)` in [constantsAndGlobalVars.js](constantsAndGlobalVars.js)
- `setEvidenceStoreSnapshot(snapshot)` in [evidenceManager.js](evidenceManager.js)

If the stored evidence snapshot is invalid, the system falls back only to reinitializing the store for a new game.
This is not content fallback; it is save validation.

## Authoring Rule For Web Evidence
For web-unlocked report evidence:
1. Keep unlock metadata in `assets/web-content/*.json`.
2. Use source kind `report-localized-catalog-entry`.
3. Use `evidence.name` and `source.entryId` to match an entry in `assets/reportsEvidences_{lang}.json`.
4. Add the report text to every supported language catalog.

This keeps unlock logic, save/load, and carousel rendering aligned to one strict pipeline.
