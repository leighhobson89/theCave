# Web Content Builder Tool Manual

## Files

- UI: [tools/web_content_builder.html](tools/web_content_builder.html)
- Logic: [tools/web_content_builder.js](tools/web_content_builder.js)
- Inject API: [tools/web_content_builder_server.js](tools/web_content_builder_server.js)

## Start the Inject API

```bash
node tools/web_content_builder_server.js
```

The API listens on `http://localhost:5058`.

## Open the Builder

Open [tools/web_content_builder.html](tools/web_content_builder.html) in your browser (or from your local static server).

## Workflow

1. Choose the Content Type option.
2. Enter a required content ID.
3. Fill relevant fields.
4. Use the service-specific sections:
  - Zoom Search Fields
  - Library Archive Fields
  - Police Records Fields
  - Canada Newspaper Archive Fields
5. For Standalone Page, use the styling section.
6. Click **Generate Preview**.
7. Click **Confirm + Inject**.

## Content Types

- Zoom Search
- Library Archive
- Police Records
- Canada Newspaper Archive
- Standalone Page

## Service Sections

- Zoom Search Fields:
  - Keywords
- Library Archive Fields:
  - Author
  - Publication Title
- Police Records Fields:
  - Keywords
  - Required Privilege Level
- Canada Newspaper Archive Fields:
  - Province
  - Keywords
  - Publication (optional)
  - Required Access Level

## Mode Rules

- If `Standalone Page` is selected:
  - URL is required.
  - Keywords are optional.
- If any other content type is selected:
  - Keywords are required in that content type's own section.
  - URL is optional.

## Province Placement

- Province is not part of the shared content fields.
- Province appears only in `Canada Newspaper Archive Fields`.

## Standalone Styling

Standalone pages include style fields for:

- `backgroundColor`
- `fontFamily` with presets:
  - Arial
  - Comic Sans
  - Courier New
  - Times New Roman

## Buckets

- `records`: standard service entries (searchable by the existing archive systems)
- `records` in `standalone-pages.json`: hidden standalone text pages (manual URL only)

## Notes

- Every injected entry is normalized to a stable slug ID.
- Existing IDs are updated in-place.
- New IDs are appended.
- This tool writes directly to:
  - `assets/web-content/zoomsearch.json`
  - `assets/web-content/library.json`
  - `assets/web-content/police.json`
  - `assets/web-content/archives.json`
  - `assets/web-content/standalone-pages.json`
