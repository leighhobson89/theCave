# Web Content Builder Tool Manual

## Files
- UI: [tools/web_content_builder.html](tools/web_content_builder.html)
- Logic: [tools/web_content_builder.js](tools/web_content_builder.js)
- Inject API: [tools/web_content_builder_server.js](tools/web_content_builder_server.js)

## Start Inject API
```bash
node tools/web_content_builder_server.js
```

## Writes To
- `assets/web-content/zoomsearch.json`
- `assets/web-content/library.json`
- `assets/web-content/police.json`
- `assets/web-content/archives.json`
- `assets/web-content/standalone-pages.json`

## Workflow
1. Choose content type.
2. Enter content ID.
3. Fill shared fields.
4. Fill service-specific fields.
5. Configure standalone style if needed.
6. Configure evidence metadata if needed.
7. Generate preview.
8. Confirm and inject.

## Shared Fields
- Content Type
- Content ID
- URL
- Title / Headline
- Summary
- Main text
- Image paths

## Standalone Styling
- Background Color text field
- Pipette button opens native color picker
- Font Family preset dropdown

## Evidence Fields
The builder always emits a full evidence object for consistent record shape.

Controls:
- `Awards Evidence` checkbox
- `Evidence Type` dropdown
- `Storage Key` dropdown
- `Title Key` dropdown
- `Name` text field
- `Default Title String` text field
- `Paper Style` dropdown
- `Description` text area
- `Photo Caption (optional)` text field

Supported presets:
- `report`
	- `storageKey = reports`
	- `titleKey = reports`
	- `source.kind = report-localized-catalog-entry`
	- `source.catalogPathTemplate = ./assets/reportsEvidences_{lang}.json`
- `photo`
	- `storageKey = photos`
	- `titleKey = photos`
	- `source.kind = photo-localized-catalog-entry`
	- `source.catalogPathTemplate = ./assets/photos_evidences_{lang}.json`

All presets also emit:
- `source.languageAware = true`
- `source.entryId = evidence.name`

## Important
When `Awards Evidence` is enabled, Inject now also upserts matching localized evidence catalog entries.

Photo evidence updates:
- `assets/photos_evidences_en.json`
- `assets/photos_evidences_de.json`
- `assets/photos_evidences_es.json`
- `assets/photos_evidences_fr.json`
- `assets/photos_evidences_it.json`

Report evidence updates:
- `assets/reportsEvidences_en.json`
- `assets/reportsEvidences_de.json`
- `assets/reportsEvidences_es.json`
- `assets/reportsEvidences_fr.json`
- `assets/reportsEvidences_it.json`

Notes:
- The entered evidence description/report text is copied to all language catalog entries (`en`, `de`, `es`, `fr`, `it`) as initial placeholder content.
- For photo evidence, `Photo Caption (optional)` sets `images[].alt` in the created/updated web-content record (browser tooltip on hover).
- Photo caption text is intended for the evidence carousel caption row, not for visible caption text on web-content pages.

## Update Rules
- IDs are slug-normalized.
- Existing IDs are updated in place.
- New IDs are appended.
