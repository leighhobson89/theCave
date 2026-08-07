# Investigation Archive System

This project uses a JSON-driven archive system for four in-game investigation services:

- Search Engine
- Police Records
- Canada Newspaper Archive
- Library Archive

The runtime is split between two files:

- `webContentManager.js`: loads site JSON, stores login sessions, runs site searches, and awards evidence.
- `webContentRegistry.js`: defines each site, its search rules, and its rendering template.

Browser shell behavior for Netscape is handled in:

- `ui.js`: Favorites, editable URL input, manual URL routing, back history, and home navigation.

## Core Behavior

All four services follow the same player flow:

1. Enter search criteria.
2. Press the search button.
3. The system returns either zero records or exactly one record.
4. The record appears in the results table.
5. The player selects the returned row.
6. The full record renders underneath the table.

The rendering process is standardized:

- each service shows a search form
- each service shows a results table
- each service shows a detail panel below the table
- each service uses archive-specific layout classes for the detail panel

Only the visual presentation differs by archive.

## Search Rules

### Search Engine

- Search field: keyword only
- Matching rule: exact full-term match only
- Partial keywords do not match
- Matching fields in JSON: `pageTitle`, `keywords`

Example:

- `relay` can match
- `rela` does not match

### Police Records

- Search field: keyword only
- Matching rule: exact full-term match only
- Partial keywords do not match
- Matching fields in JSON: `title`, `keywords`
- Login controls visibility by privilege level

Example:

- `director file` can match
- `director` does not match unless it exists exactly in `keywords`

### Canada Newspaper Archive

- Search fields: province and keyword
- Province is mandatory
- Keyword is mandatory
- Matching rule: both fields must match exactly
- Partial keywords do not match
- Province selector defaults to `Saskatchewan`
- Province selector resets to `Saskatchewan` after every search
- Matching fields in JSON: `province`, `headline`, `keywords`

Example:

- Province `Alberta` + keyword `telegram` can match
- Province `Saskatchewan` + keyword `telegram` does not match

### Library Archive

- Search fields: author and title
- Both are mandatory
- Both must exactly match the same record
- Matching fields in JSON: `author`, `title`

Example:

- `Edith Vale` + `Notebook of River Marks` can match
- `Edith` + `Notebook of River Marks` does not match

## Rendering Templates

### Search Engine Template

Detail layout:

- website banner
- page title
- URL
- main page content
- side image column

Primary fields used:

- `websiteName`
- `pageTitle`
- `url`
- `summary`
- `pageContent`
- `images[]`

### Police Records Template

Detail layout:

- record title
- metadata grid
- large evidence image gallery
- report body
- attachments list

Primary fields used:

- `title`
- `caseNumber`
- `province`
- `officer`
- `classification`
- `declassificationStatus`
- `date`
- `summary`
- `report`
- `images[]`
- `attachments[]`

### Canada Newspaper Archive Template

Detail layout:

- headline
- publication metadata
- article body
- photographs after the article

Primary fields used:

- `headline`
- `publication`
- `edition`
- `province`
- `date`
- `summary`
- `article`
- `images[]`

### Library Archive Template

Detail layout:

- cover or illustration on the left
- bibliographic metadata on the right
- extract below both
- references below extract

Primary fields used:

- `author`
- `title`
- `publisher`
- `publicationYear`
- `province`
- `summary`
- `extract`
- `images[]`
- `references[]`

## Image References

Images are referenced directly from JSON.

Recommended image object shape:

```json
{
  "src": "./assets/photos/caveEntrance.png",
  "alt": "Description of the image",
  "caption": "Optional caption"
}
```

Rules:

- `src` is required
- `alt` is recommended
- `caption` is optional
- paths are relative to the web app root

A plain string is also accepted, but the object format is preferred for maintainability.

## Required and Optional Fields

See the schema files in `assets/web-content/schemas/` for the formal contract.

Files:

- `zoomsearch.schema.json`
- `library.schema.json`
- `police.schema.json`
- `archives.schema.json`
- `standalone-page.schema.json`

## Netscape URL Navigation

The in-game Netscape browser now supports manual URL entry.

Behavior:

- URL input is editable.
- Press `Enter` in the URL field to navigate.
- Entering any favorite URL manually opens that favorite page.
- Hidden routes can be defined in JSON and opened only by direct URL entry.
- Back button returns to the previous visited page.
- Browser history stores the last 5 visited pages.
- Home button always returns to `about:welcome`.

Favorite URLs:

- `http://www.zoomsearch.net`
- `http://library.intra`
- `http://records.sk-police.gov`
- `https://leighhobson89.github.io/cosmicForge/`
- `http://archives.canada.news`

### Hidden Standalone Pages

Every web-content JSON file can optionally define:

- `standalonePages: []`

These pages are intentionally not part of service search results. They are self-contained text pages rendered only when their URL is entered manually.

Object shape:

```json
{
   "id": "relay-maintenance-bulletin",
   "title": "Relay Maintenance Bulletin",
   "url": "http://www.zoomsearch.net/internal/relay-maintenance-bulletin",
   "source": "ZoomSearch hidden route",
   "content": [
      "Line one.",
      "Line two."
   ]
}
```

Rules:

- `id` is required.
- `url` is required and should be unique across all standalone pages.
- `title` is recommended.
- `content` can be a string or string array.
- `source` is optional metadata.

### Test Hidden Page URL

The following hidden page is included for testing:

- `http://www.zoomsearch.net/internal/relay-maintenance-bulletin`

## Examples

### Login Details

Police Records:

- Public: `public` / `public` (level 0)
- Detective: `detective` / `ember` (level 2)
- Administrator: `administrator` / `atlas` (level 5)

Canada Newspaper Archive:

- Free: `free` / `free` (level 0)
- Subscriber: `subscriber` / `subscribe` (level 1)

### Search + URL Examples

Search Engine:

- URL: `http://www.zoomsearch.net`
- Query `relay` returns **Sun Echo Relay**
- Query `rela` returns no result

Library Archive:

- URL: `http://library.intra`
- Author `Edith Vale` + Title `Notebook of River Marks` returns one record
- Author `Edith` + Title `Notebook of River Marks` returns no result

Police Records:

- URL: `http://records.sk-police.gov`
- Query `station log` returns Station Log 01
- Query `director file` requires Administrator access level

Canada Newspaper Archive:

- URL: `http://archives.canada.news`
- Province `Alberta` + keyword `telegram` returns Prairie Telegram (subscriber level)
- Province `Saskatchewan` + keyword `telegram` returns no result

Hidden standalone page:

- URL `http://www.zoomsearch.net/internal/relay-maintenance-bulletin`
- Opens only by manual URL entry; not listed in favorites; not returned by any archive search.

## Evidence Integration

A record can unlock evidence by including:

- `awardsEvidence: true`
- `evidence: { ... }`

The evidence payload is passed into the existing evidence system by `webContentManager.js`.

## Adding New Records

### Search Engine

1. Add a new object to `assets/web-content/zoomsearch.json`.
2. Supply at minimum:
   - `id`
   - `websiteName`
   - `pageTitle`
   - `url`
   - `keywords`
   - `summary`
   - `pageContent`
3. If needed, add `images[]`.
4. If the record should unlock evidence, add `awardsEvidence` and `evidence`.

### Police Records

1. Add a new object to `assets/web-content/police.json`.
2. Supply at minimum:
   - `id`
   - `province`
   - `title`
   - `keywords`
   - `summary`
   - `report`
   - `caseNumber`
   - `officer`
   - `classification`
   - `declassificationStatus`
   - `date`
   - `requiredPrivilegeLevel`
3. Add `images[]` and `attachments[]` if available.

### Canada Newspaper Archive

1. Add a new object to `assets/web-content/archives.json`.
2. Supply at minimum:
   - `id`
   - `province`
   - `headline`
   - `publication`
   - `edition`
   - `date`
   - `keywords`
   - `summary`
   - `article`
   - `requiredAccessLevel`
3. Add `images[]` if available.
4. Ensure the province exactly matches one of the UI options.

### Library Archive

1. Add a new object to `assets/web-content/library.json`.
2. Supply at minimum:
   - `id`
   - `author`
   - `title`
   - `publisher`
   - `publicationYear`
   - `province`
   - `keywords`
   - `summary`
   - `extract`
3. Add `images[]` and `references[]` when available.

## Test Data Coverage

The current JSON files already include example scenarios for:

- search engine without images
- search engine with one image
- search engine with multiple images
- police report without photographs
- police report with one photograph
- police report with multiple photographs
- newspaper article without photograph
- newspaper article with photograph
- library entry with illustration
- library entry without illustration
- successful and unsuccessful search flows for every archive

## Extending the System

No application code changes should be required for new records as long as:

- the record follows the correct schema
- exact-match search terms remain unique enough to return zero or one record
- image paths remain valid
- optional evidence payloads keep the existing evidence contract

## Web Content Builder Tool

Standalone builder files:

- `tools/web_content_builder.html`
- `tools/web_content_builder.js`
- `tools/web_content_builder_server.js`

This tool is similar in spirit to the evidence builder and supports:

- Creating records for `zoomsearch`, `library`, `police`, and `archives`
- Creating hidden standalone text pages
- Entering text and image paths
- Entering service-specific fields (for example province, privilege level, access level)
- Live JSON preview before writing
- Confirm-and-inject into the target JSON file

ID policy:

- Every record and standalone page must have an `id`.
- IDs are stable references for future evidence unlock integrations.
- Builder enforces/normalizes IDs before injection.
