# Investigation Archives (the in-game web)

The four JSON-driven investigation services reachable from Netscape inside
CaveOS, plus the standalone hidden pages.

| Service | Site id | URL |
| --- | --- | --- |
| ZoomSearch (search engine) | `zoomsearch` | `http://www.zoomsearch.net` |
| Library Archive | `library` | `http://library.intra` |
| Police Records | `police` | `http://records.sk-police.gov` |
| Canada Newspaper Archive | `archives` | `http://archives.canada.news` |

Plus one non-service favourite, Cosmic Forge
(`https://leighhobson89.github.io/cosmicForge/`), which is a static promo page
with real outbound links.

Runtime split:

- [`webContentManager.js`](../webContentManager.js) — loads site JSON, holds login sessions, runs searches, awards evidence
- [`webContentRegistry.js`](../webContentRegistry.js) — the four site definitions, their search rules and their detail templates
- [`ui.js`](../ui.js) — the Netscape shell: quick links, URL bar, address history, back/forward, standalone routing

See [architecture.md §8–9](architecture.md#8-the-computer-caveos-1996) for the
browser shell and the manager API.

---

## Core behaviour

Every service follows the same flow:

1. Enter search criteria.
2. Press the search button, or Enter in the keyword field.
3. The system returns **zero or exactly one** record. The results list is sliced to one row regardless.
4. The row appears in the results table.
5. Selecting the row renders the full record below the table, and updates the URL bar to the record's own URL.

Only the detail layout differs per service.

> **All matching is exact and whole-term.** Partial words never match. This is
> deliberate: the player is meant to learn the exact term elsewhere in the
> investigation before it will resolve.

---

## Search rules

### ZoomSearch

- Field: keyword only.
- Matches against the record's `keywords` array only — **not** `pageTitle`, `summary` or body text.
- A keyword entry may itself be multi-word (`"black pine mine"`); the whole entry must be typed.
- Empty-result message: *"Search brings up a lot of unrelated bumph. You move on."*

Current data (`assets/web-content/zoomsearch.json`):

| Record | Keywords |
| --- | --- |
| `silvermineentrance` | `black pine mine`, `silver mine`, `mine` |
| `johnbaxley` | `john baxley` |
| `minecart` | `mine cart`, `minecart`, `truck`, `mine truck` |
| `margaretmcleod` | `margaret`, `margaret mcleod`, `apples`, `maple grove` |

### Library Archive

- Fields: author **and** title, both mandatory.
- Both must exactly match the *same* record.
- A Clear button resets the form and the results.

Current data: `Hannah Fletcher` + `Mysteries of the Old North West`.

### Police Records

- Field: keyword only, matched against `keywords`.
- Records declare `requiredPrivilegeLevel`. A match the session cannot see returns no rows and the message *"One or more matching records were hidden by privilege restrictions."* — so the player learns the record exists but is gated.
- Signed in as the default `public` account (level 0) on open.

Accounts (`assets/web-content/police.json`):

| Username | Password | Level | Label |
| --- | --- | ---: | --- |
| `public` | `public` | 0 | Public (default) |
| `james.f` | `oscar123` | 1 | Constable James Fletcher |
| `b.whitmore` | `ironVeins15` | 2 | Mr Brian Whitmore |
| `administrator` | `atlas` | 5 | Administrator |

Records and their required level:

| Record | Keywords | Level |
| --- | --- | ---: |
| `jamesfletcher` | `james fletcher`, `james` | 0 |
| `emilebeaulieu` | `emile`, `emile beaulieu`, `rock climber` | 0 |
| `williammcleod` | `william`, `william mcleod` | 0 |
| `georgemackenzie` | `george`, `george mackenzie`, `moustache` | 0 |
| `thomasorourke` | `thomas o'rourke`, `thomas orourke`, `thomas` | 1 |

### Canada Newspaper Archive

- Fields: province (dropdown) **and** keyword, both mandatory, both must match the same record.
- Province options: Saskatchewan, Ontario, Quebec, Alberta. The selection is remembered across page re-renders for the session (`lastSelectedArchiveProvince`).
- Records declare `requiredAccessLevel`; gated matches report *"Subscriber-only articles were hidden by access level."*

Accounts (`assets/web-content/archives.json`):

| Username | Password | Level | Label |
| --- | --- | ---: | --- |
| `free` | `free` | 0 | Free (default) |
| `subscriber` | `subscribe` | 1 | Subscriber |

Current data: `hannahfletcher`, province **Alberta**, keywords
`hannah fletcher` / `hannah` / `mysteries of the old north west`, level 0.

---

## Detail templates

Each service renders its own layout from shared building blocks
(`createMetadataGrid`, `createTextSection`, `createKeyValueList`,
`createImageGallery`).

| Service | Layout | Fields used |
| --- | --- | --- |
| ZoomSearch | Site banner, page title, then two columns: summary + page content on the left, image gallery on the right | `websiteName`, `pageTitle`, `summary`, `pageContent` (or `htmlContent`/`body`), `images[]` |
| Library | Two columns: gallery left, title + bibliographic metadata right; then the extract; then references | `title`, `author`, `publisher`, `publicationYear`, `province`, `summary`, `extract` (or `body`), `images[]`, `references[]` |
| Police | Title, metadata grid, gallery, report body, attachments list | `title`, `caseNumber`, `province`, `officer`, `classification`, `declassificationStatus`, `date`, `summary`, `report` (or `body`), `images[]`, `attachments[]` |
| Archives | Headline, publication metadata, article body, then photographs | `headline`, `publication`, `edition`, `province`, `date`, `summary`, `article` (or `body`), `images[]` |

### Body text

Body fields accept either a string (split into paragraphs on blank lines) or an
array of strings. Within body text, an in-game URL wrapped in `*-*` delimiters
becomes a clickable link that navigates the browser:

```
Read more at *-*http://honeydewcavingclub.com*-* for the full story.
```

### Images

```json
{ "src": "./assets/photos/caveEntrance.png",
  "alt": "Description of the image",
  "caption": "Optional caption" }
```

`src` is required and relative to the web app root; `alt` is recommended (it is
also used as the hover tooltip); `caption` is optional. A bare string is
accepted and treated as `src` with no alt or caption.

Formal contracts live in `assets/web-content/schemas/`:
`zoomsearch.schema.json`, `library.schema.json`, `police.schema.json`,
`archives.schema.json`, `standalone-page.schema.json`.

---

## Standalone hidden pages

Self-contained pages that no search returns; they open only by typing their URL
(or by following an inline `*-*…*-*` link from another page).

They all live in **one** file, `assets/web-content/standalone-pages.json`, under
a `records` array:

```json
{
  "siteId": "standalone",
  "displayName": "Standalone Pages",
  "records": [
    {
      "id": "honeydewcavingclub",
      "title": "Honey Dew Caving Club",
      "url": "http://honeydewcavingclub.com",
      "content": ["Paragraph one.", "Paragraph two."],
      "images": [{ "src": "./assets/photos/minemap.png", "alt": "Mine map" }],
      "style": {
        "backgroundColor": "#0566e6",
        "textColor": "#fafafa",
        "fontFamily": "Courier New, Lucida Console, monospace"
      },
      "awardsEvidence": true,
      "evidence": [ { "type": "photo", "…": "…" } ]
    }
  ]
}
```

Rules:

- `id` and `url` are required; `url` must be unique across all standalone pages.
- `content` may be a string or a string array.
- `style` is optional and applies only to that page's shell.
- `awardsEvidence: true` plus an `evidence` object or array awards on first visit.
- The routes are fetched lazily, once, the first time an unrecognised URL is entered.

Shipped pages:

| Id | URL | Awards evidence |
| --- | --- | --- |
| `whitmoresonsironmachineryco` | `http://www.whitmore-sons-iron-machinery-co.com/mining` | No |
| `honeydewcavingclub` | `http://honeydewcavingclub.com` | Yes — two photos, one of which triggers the Whitmore fax |

---

## Browser navigation

- The URL bar is editable; Enter or the Go button navigates. Escape closes the suggestion list.
- Quick links: ZoomSearch, Library, Police Records, Cosmic Forge, Canada Archives.
- Home returns to `about:welcome`.
- Back/forward walk an in-window history capped at 5 entries; it is discarded when the window closes.
- Focusing the URL bar drops down the **address history**: up to 10 previously visited URLs, newest first, persisted in the save. Choosing one whose entry carries replay data re-runs the original search and re-selects the record, rather than just re-opening the site's front page.
- An unknown URL renders a "Page Not Found" page listing the attempted address.

---

## Evidence integration

A record unlocks evidence with:

```json
"awardsEvidence": true,
"evidence": { "type": "photo", "storageKey": "photos", "titleKey": "photos",
              "name": "standalone-honeydewcavingclub",
              "defaultTitleString": "Mine Map", "paperStyle": "photo-mounted",
              "source": { "kind": "photo-localized-catalog-entry",
                          "languageAware": true,
                          "catalogPathTemplate": "./assets/photos_evidences_{lang}.json",
                          "entryId": "standalone-honeydewcavingclub",
                          "photoPath": "./assets/photos/minemap.png" } }
```

`evidence` may be an array to award several items from one record. The displayed
text always comes from the localized catalog, never from the web-content JSON —
see [evidence-system.md](evidence-system.md).

Awards are de-duplicated twice: once per `websiteId:recordId` for the session,
and again against the live evidence collection, so repeat searches and reloaded
saves never duplicate an item.

---

## Adding records

Use the [Web Content Builder](../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md) — it
writes the record *and* seeds the localized evidence catalogs. To hand-author,
add an object to the relevant file with at least:

| File | Minimum fields |
| --- | --- |
| `zoomsearch.json` | `id`, `websiteName`, `pageTitle`, `url`, `keywords`, `summary`, `pageContent` |
| `library.json` | `id`, `author`, `title`, `publisher`, `publicationYear`, `province`, `keywords`, `summary`, `extract` |
| `police.json` | `id`, `province`, `title`, `keywords`, `summary`, `report`, `caseNumber`, `officer`, `classification`, `declassificationStatus`, `date`, `requiredPrivilegeLevel` |
| `archives.json` | `id`, `province`, `headline`, `publication`, `edition`, `date`, `keywords`, `summary`, `article`, `requiredAccessLevel` |
| `standalone-pages.json` | `id`, `url`, `title`, `content` |

No application code changes are needed for new records, provided:

- the record follows the schema for its file;
- its search terms are unique enough to return zero or one record;
- image paths resolve;
- any evidence payload keeps the contract above, and matching catalog entries exist in all five languages;
- for archives records, `province` exactly matches one of the four dropdown options.
