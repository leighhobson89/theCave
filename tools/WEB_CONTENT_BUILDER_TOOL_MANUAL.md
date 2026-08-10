# Web Content Builder Tool Manual

The Web Content Generator is the **only** content authoring tool in this
repository. It creates records for the four in-game web services and standalone
hidden pages, and — when a record awards evidence — it also writes the matching
localized evidence catalog entries.

> The former Evidence JSON Builder (`debug_json_string_tool.html`, its script and
> its `evidence_builder_server.js` API) was removed in the August 2026 audit.
> This tool had already absorbed evidence-catalog writing. Hand-editing
> `assets/reportsEvidences_{lang}.json` and `assets/photos_evidences_{lang}.json`
> is still fine; they are plain `{ "entries": [ … ] }` files.

## Files
- UI: [web_content_builder.html](web_content_builder.html)
- Logic: [web_content_builder.js](web_content_builder.js)
- Inject API: [web_content_builder_server.js](web_content_builder_server.js)

## Start Inject API
Run from the repository root; the server writes to that root, so there is no
folder picker.

```bash
node tools/web_content_builder_server.js     # http://localhost:5058
```

Then open `tools/web_content_builder.html` in a browser.

## Writes To
- `assets/web-content/zoomsearch.json`
- `assets/web-content/library.json`
- `assets/web-content/police.json`
- `assets/web-content/archives.json`
- `assets/web-content/standalone-pages.json`

All records are written into each file's `records` array.

## Workflow
1. Choose content type.
2. Enter content ID.
3. Fill shared fields.
4. Fill service-specific fields.
5. Configure standalone style if needed.
6. Configure evidence metadata if needed.
7. Generate preview.
8. Confirm and inject.

When a record needs more than one evidence entry, use `Add Another Evidence` to queue the current draft, clear the form, and then fill the next evidence. The builder will emit a single `evidence` object for one entry or an array for multiple entries.

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
For multi-evidence records, the builder emits an array of full evidence objects in the same order they were queued.

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
