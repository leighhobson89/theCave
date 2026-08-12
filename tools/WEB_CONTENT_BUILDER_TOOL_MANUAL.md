# Web Content Builder Tool Manual

The Web Content Generator is the **only** content authoring tool in this
repository. It creates records for the four in-game web services and standalone
hidden pages, and — when a record awards evidence — it also writes the matching
localized evidence catalog entries.

> The former Evidence JSON Builder (`debug_json_string_tool.html`, its script and
> its `evidence_builder_server.js` API) was removed in the August 2026 audit.
> This tool had already absorbed evidence-catalog writing. Hand-editing
> `assets/{lang}/reports_evidences.json` and `assets/{lang}/photos_evidences.json`
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
Every language-aware asset lives under a per-language folder,
`assets/<lang>/`, `lang` in `en`, `de`, `es`, `fr`, `it` — the site JSON files,
the evidence catalogs, and the story markdown all follow this one convention
now. The builder only edits the English copy:
- `assets/en/zoomsearch.json`
- `assets/en/library.json`
- `assets/en/police.json`
- `assets/en/archives.json`
- `assets/en/standalone-pages.json`

The other languages' copies (`assets/de/...`, `assets/es/...`, `assets/fr/...`,
`assets/it/...`) are separate files that must be translated and kept in sync
manually for now.

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
	- `source.catalogPathTemplate = ./assets/{lang}/reports_evidences.json`
- `photo`
	- `storageKey = photos`
	- `titleKey = photos`
	- `source.kind = photo-localized-catalog-entry`
	- `source.catalogPathTemplate = ./assets/{lang}/photos_evidences.json`

All presets also emit:
- `source.languageAware = true`
- `source.entryId = evidence.name`

## Important
When `Awards Evidence` is enabled, Inject now also upserts matching localized evidence catalog entries.

Photo evidence updates:
- `assets/en/photos_evidences.json`
- `assets/de/photos_evidences.json`
- `assets/es/photos_evidences.json`
- `assets/fr/photos_evidences.json`
- `assets/it/photos_evidences.json`

Report evidence updates:
- `assets/en/reports_evidences.json`
- `assets/de/reports_evidences.json`
- `assets/es/reports_evidences.json`
- `assets/fr/reports_evidences.json`
- `assets/it/reports_evidences.json`

Notes:
- The entered evidence description/report text is copied to all language catalog entries (`en`, `de`, `es`, `fr`, `it`) as initial placeholder content.
- For photo evidence, `Photo Caption (optional)` sets `images[].alt` in the created/updated web-content record (browser tooltip on hover).
- Photo caption text is intended for the evidence carousel caption row, not for visible caption text on web-content pages.

## Update Rules
- IDs are slug-normalized.
- Existing IDs are updated in place.
- New IDs are appended.
