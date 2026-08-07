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

Current output uses a strict catalog-based report source:
- `source.kind = report-localized-catalog-entry`
- `source.languageAware = true`
- `source.catalogPathTemplate = ./assets/reportsEvidences_{lang}.json`
- `source.entryId = evidence.name`

## Important
This tool does not create report markdown files.
If `Awards Evidence` is enabled, matching report content must exist in:
- `assets/reportsEvidences_en.json`
- `assets/reportsEvidences_de.json`
- `assets/reportsEvidences_es.json`
- `assets/reportsEvidences_fr.json`
- `assets/reportsEvidences_it.json`

## Update Rules
- IDs are slug-normalized.
- Existing IDs are updated in place.
- New IDs are appended.
