# Evidence JSON Builder Tool Manual

## Location
- Tool page: [tools/debug_json_string_tool.html](tools/debug_json_string_tool.html)
- Tool script: [tools/debug_json_string_tool.js](tools/debug_json_string_tool.js)
- Inject API server: [tools/evidence_builder_server.js](tools/evidence_builder_server.js)

## Start the inject server (required)
Run this once before using `Confirm + Inject + Copy`:

```powershell
node tools/evidence_builder_server.js
```

This server writes directly to this project root, so there is no folder picker popup.

## Purpose
This tool helps you:
- Convert multiline report or description text into a single-line JSON string with escaped CRLF (`\r\n`)
- Always append a trailing comma to the output string
- Inject content into the correct evidence JSON file by language and target
- Create an evidence entry if the ID does not exist
- Update the entry if the ID already exists
- Copy the generated output to clipboard automatically after inject

## Supported JSON targets
- Report content:
  - File pattern: `assets/reportsEvidences_{lang}.json`
  - Field: `reportText`
- Report description:
  - File pattern: `assets/reportsEvidences_{lang}.json`
  - Field: `descriptionText`
- Photo description:
  - File pattern: `assets/photos_evidences_{lang}.json`
  - Field: `descriptionText`

## Languages
Available language dropdown values:
- `en`
- `de`
- `es`
- `fr`
- `it`

## Field reference (required vs optional)
- Input: required
- Language: required
- Inject Target: required
- Evidence ID: optional
  - If empty, tool auto-generates from Default Title
  - If still empty, tool generates a timestamp-based ID
- Default Title: optional
  - If empty, title is derived from evidence ID
- Paper Style: optional
  - If empty, defaults by target are used
- Photo Path: optional
  - Mainly used for `photoDescription`
  - If creating a photo entry and empty, defaults to `./assets/photos/caveEntrance.png`

## Valid paperStyle values in this project
Current values found in your evidence files:
- `report-parchment`
- `photo-mounted-ivory`
- `photo-mounted-linen`

## Buttons
- Convert
  - Generates output string from Input
  - Output always includes trailing comma
- Pick Photo File
  - Lets you choose an image file
  - Populates Photo Path as `./assets/photos/<filename>`
- Confirm + Inject + Copy
  - Converts text
  - Injects into correct JSON file and field
  - Creates or updates entry by evidence ID
  - Copies output string to clipboard
  - If `add as default startup evidence` is checked, also appends a blueprint entry in `evidenceManager.js` under `DEFAULT_EVIDENCE_BLUEPRINTS` (skips duplicates)
- Copy Output
  - Copies current output box content to clipboard
- Clear
  - Clears input/output and optional metadata fields

## Output format details
- Newlines are normalized and persisted as CRLF (`\r\n`)
- Final newline is always present
- Output is always one JSON string literal on one line
- Output always ends with a trailing comma

## Create vs update behavior
Given selected language + target + evidence ID:
- If ID exists:
  - Tool updates only the selected target field
  - Optional fields override when provided (`defaultTitleString`, `paperStyle`, and `photoPath` for photo target)
- If ID does not exist:
  - Tool creates a new entry with defaults
  - Tool writes converted text into selected field

## Startup default checkbox behavior
When `add as default startup evidence` is checked during inject:
- For report targets (`reportText`, `reportDescription`), the tool appends:
  - `kind: EVIDENCE_TYPES.REPORT`
  - `reportName: "<evidenceId>"`
- For photo target (`photoDescription`), the tool appends:
  - `kind: EVIDENCE_TYPES.PHOTO`
  - `photoPath: "<photoPath>"` (or fallback)
  - `name: "<evidenceId>"`
- If a matching default blueprint already exists, it does not add a duplicate.

## Default entry templates used by the tool
If creating a report entry:
- `id`
- `defaultTitleString`
- `paperStyle` (default `report-parchment`)
- `reportText`
- `descriptionText`

If creating a photo entry:
- `id`
- `photoPath` (default `./assets/photos/caveEntrance.png`)
- `defaultTitleString`
- `paperStyle` (default `photo-mounted-ivory`)
- `descriptionText`

## Project root behavior
Inject writes are hardcoded to this workspace root (`theCave`) by the local Node server.
No directory selection popup is used for inject.

## Quick workflow
1. Open [tools/debug_json_string_tool.html](tools/debug_json_string_tool.html)
2. Paste text into Input
3. Select Language
4. Select Inject Target
5. Optionally set ID/title/paper style/photo path
6. Optional: click Pick Photo File
7. Click Confirm + Inject + Copy
8. Verify status message and inspect updated JSON file in `assets`
