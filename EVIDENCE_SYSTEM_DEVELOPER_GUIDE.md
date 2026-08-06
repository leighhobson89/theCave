# Evidence System Developer Guide

## Purpose
The evidence system is the single source of truth for all in-game evidence content.

Evidence includes:
- Background story (type: `story`)
- Photos (type: `photo`)
- Reports (type: `report`)

Each evidence record includes metadata such as:
- Unique `id`
- `type`
- `storageKey` (where it appears in the UI)
- `source` (how to load its content)
- `paperStyle` (presentation/material intent)

The implementation lives in [evidenceManager.js](evidenceManager.js).

## Core Data Model
The in-memory store has:
- `nextEvidenceId`
- `evidencesById`
- `collections`:
  - `backgroundStory`
  - `photos`
  - `reports`
- `indices` per collection (carousel positions)

You can inspect/serialize this via:
- `getEvidenceStoreSnapshot()`
- `setEvidenceStoreSnapshot(snapshot)`

## Evidence Creation APIs
Use these APIs from [evidenceManager.js](evidenceManager.js):

- `createStoryEvidence({ storyName, storageKey, titleKey, paperStyle })`
  - Uses language-aware template: `./assets/${storyName}_{lang}.md`
- `createReportEvidence({ reportName, storageKey, titleKey, paperStyle })`
  - Uses language-aware template: `./assets/reports/${reportName}_{lang}.md`
- `createPhotoEvidence({ photoPath, name, storageKey, titleKey, paperStyle })`
  - Uses direct photo path source
- `createEvidence(evidence)`
  - Low-level function if you need custom evidence types in future

## New Game Defaults
Default evidences are defined in `DEFAULT_EVIDENCE_BLUEPRINTS` in [evidenceManager.js](evidenceManager.js).

On New Game, UI calls:
- `initializeEvidenceStoreForNewGame()`

This resets and re-adds default evidence entries.

Current defaults include:
- Story evidence (`story_en.md` etc depending on language)
- Two photo evidences (`caveEntrance`, `caveEntrance2`)
- One report evidence (`missingReport_en.md` etc depending on language)

## Localization: How Language Is Chosen
Language state is managed by [constantsAndGlobalVars.js](constantsAndGlobalVars.js) and UI localization flow in [ui.js](ui.js).

When rendering evidence content, UI uses:
- `resolveEvidenceContentPath(evidence, getLanguage())`

For template sources (`markdown-template`), `{lang}` is replaced with active language code.

Example:
- Template: `./assets/reports/missingReport_{lang}.md`
- Active language `en` => `./assets/reports/missingReport_en.md`
- Active language `de` => `./assets/reports/missingReport_de.md`

## Mid-Game Language Change
If the player changes language while in-game:
1. `handleLanguageChange(languageCode)` updates active language.
2. `setElementsLanguageText()` runs.
3. `refreshOpenWindowLocalization()` updates titles and content for open windows.
4. Reports/story re-resolve evidence paths with new language and fetch corresponding files.

This ensures open report/story windows switch to the new language version immediately.

## Language Change After Loading a Save
Load flow:
1. Save string is parsed in [saveLoadGame.js](saveLoadGame.js).
2. `restoreGameStatus(gameState)` restores language + evidence store.
3. `checkForLanguageChange()` triggers `handleLanguageChange(getLanguage())`.
4. Window content (if open) refreshes based on current language.

Result: report/story files are resolved using the post-load language state.

## Save/Load Persistence
Saving uses [constantsAndGlobalVars.js](constantsAndGlobalVars.js):
- `captureGameStatusForSaving()` includes:
  - `language`
  - `evidenceStore` snapshot

Loading uses:
- `restoreGameStatus(gameState)`
  - Restores `evidenceStore` via `setEvidenceStoreSnapshot(...)`
  - Includes legacy fallback handling for old save fields

## Legacy Compatibility Behavior
Older save payloads may contain plain path arrays for reports/photos.

Compatibility helper functions convert those into evidence records:
- `setPhotoCollectionFromPaths(paths)`
- `setReportCollectionFromPaths(paths)`

Important:
- Report legacy paths are normalized into language-aware templates when possible.
- Old `markdown-file` report entries are normalized on snapshot restore to `markdown-template` so language switching works.

## UI Collection Usage
UI windows consume collections by storage key:
- Story: `backgroundStory`
- Photos: `photos`
- Reports: `reports`

Navigation uses:
- `getEvidenceCollection(storageKey)`
- `getEvidenceIndex(storageKey)`
- `setEvidenceIndex(storageKey, index)`
- `stepEvidenceIndex(storageKey, delta)`
- `getCurrentEvidence(storageKey)`

## Adding New Evidence Types In Future
Recommended approach:
1. Add a new storage key in `STORAGE_KEYS`.
2. Add a type in `EVIDENCE_TYPES`.
3. Add a builder function (similar to `createReportEvidence`).
4. Define a source strategy (`photo`, `markdown-template`, etc).
5. Add UI renderer/window handling for that type.
6. If needed, add default blueprint entries.

## Current File Naming Convention
For localized reports, use:
- `./assets/reports/<reportName>_<lang>.md`

For localized story files, use:
- `./assets/<storyName>_<lang>.md`

Examples:
- `missingReport_en.md`
- `story_fr.md`

## Quick Examples
Add a new localized report evidence:

```js
createReportEvidence({
  reportName: "autopsyNote",
  storageKey: "reports",
  titleKey: "reports",
});
```

Add a new photo evidence:

```js
createPhotoEvidence({
  photoPath: "./assets/photos/fingerprint01.png",
  storageKey: "photos",
  titleKey: "photos",
});
```

Both become part of the persisted evidence store and are included in saves.
