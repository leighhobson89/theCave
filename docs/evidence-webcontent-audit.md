# Evidence + Web Content Audit (2026-08-07)

## Result
The evidence pipeline is now strict and catalog-driven.

Removed:
- report/photo markdown fallback reads
- embedded standalone route fallback from service JSON files
- legacy web-content evidence markdown folder
- unused compatibility helpers that only existed for old path-based evidence flows

## Current Flow
### Unlock Metadata
Web records define unlock metadata in:
- `assets/web-content/zoomsearch.json`
- `assets/web-content/library.json`
- `assets/web-content/police.json`
- `assets/web-content/archives.json`
- `assets/web-content/standalone-pages.json`

### Runtime Unlock
Searching a matching Netscape record with `awardsEvidence: true` causes the record's `evidence` descriptor to be added to the runtime evidence store.

### Runtime Persistence
Unlocked evidence is saved and restored through:
- `captureGameStatusForSaving()`
- `restoreGameStatus()`
- `setEvidenceStoreSnapshot()`

### Display Content
Reports render only from:
- `assets/reportsEvidences_{lang}.json`

Photos render only from:
- `assets/photos_evidences_{lang}.json`

If catalog content is missing, UI shows explicit unavailable messages.

## Migration Completed
Existing web-unlocked report markdown content was migrated into:
- `assets/reportsEvidences_en.json`
- `assets/reportsEvidences_de.json`
- `assets/reportsEvidences_es.json`
- `assets/reportsEvidences_fr.json`
- `assets/reportsEvidences_it.json`

Removed old files from:
- `assets/web-content/evidence/`

## Cleanup Performed
1. Deleted unused UI helper for old photo path resolution.
2. Deleted legacy path-based report/description loading.
3. Deleted standalone embedded-route fallback.
4. Removed unused evidence-manager compatibility helpers for old path arrays and old source kinds.
5. Updated web content builder to emit catalog-entry evidence descriptors instead of markdown-file descriptors.
6. Added duplicate-award protection when web evidence is unlocked.

## Practical Rule Going Forward
To add web-unlocked evidence:
1. Create or update the web record in `assets/web-content/*.json`.
2. Point `evidence.source` to a catalog entry id.
3. Add matching localized content to `assets/reportsEvidences_{lang}.json`.
4. Do not create markdown files for report/photo evidence.
