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
- Police Case Number allocation (shared by the server and the test suite):
  [police_case_number.js](police_case_number.js)

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

It also writes progress evidence definitions into one language-neutral file:
- `assets/progressEvidence.json`

See "Progress Evidence" below.

## Workflow
1. Choose content type — every panel *below* Content Form greys out except
   the one that applies (Evidence Fields and Progress Evidence are the two
   exceptions; they're always active).
2. Enter content ID.
3. Fill the Content Form fields (used by every content type).
4. Fill the fields in that type's own panel.
5. Configure evidence metadata if needed.
6. Fill the Progress Evidence panel — mandatory for every content type.
7. Generate preview.
8. Confirm and inject.

When a record needs more than one evidence entry, use `Add Another Evidence` to queue the current draft, clear the form, and then fill the next evidence. The builder will emit a single `evidence` object for one entry or an array for multiple entries.

## Field Ownership (2026-08-13 redesign)
Every field lives in exactly one panel, and each panel maps to exactly one
content type — nothing is shared or duplicated across panels, so there's
nothing that can conflict between them. Earlier revisions of this tool had
a single shared "Title / Headline" field in the Content Form panel that
every content type *except* Library read from — Library had (and still
has) its own separate Publication Title field, so filling in the shared one
while Library was selected silently did nothing. That's the shape of bug
this ownership model rules out categorically: a field that isn't wired to
the currently-active type's build function now lives inside a panel that's
visibly greyed out and functionally disabled, rather than sitting in a
panel that's always active but sometimes secretly ignored.

The Content Form panel keeps only the handful of fields every content type
reads identically:
- Content Type
- Content ID
- Main text
- Image paths
- Image Caption / Alt Text
- Image Text Application

A collapsible "Field rules" section at the top of the Content Form panel
repeats the full field-to-panel-to-type mapping in table form for quick
reference in the tool itself.

Fields marked with `†` appear as a column in that content type's search
results table — leaving one blank means that column renders empty for
every player who finds the record. A legend at the bottom of the Content
Form panel repeats this. All other fields are metadata-only: they render in
the record's detail view (or, for Keywords/Required Privilege/Access Level,
aren't rendered at all — they only drive search matching and gating).

`webContentRegistry.js` can render several metadata fields this tool
doesn't expose at all (Province, Officer, Classification, Declassification
Status and a References/Attachments list on Police; Province and References
on Library; Edition on Archives) — none of them feed a table column, so
they were tried in the 2026-08-13 test-coverage follow-up, found to not be
worth the authoring overhead for content that never surfaces in search
results, and removed again. Proven only by synthetic data in
`tests/e2e/web-content-search-records/browser-detail-synthetic-fields.spec.js`.
Add a field back to the relevant panel if a real record ever needs one.

## Service-Specific Fields
- **Zoom Search:** Website Name `†` (required), Page Title `†`, URL
  (optional — defaults to `zoomsearch.net/manual/<id>` if left blank),
  Summary `†`, Keywords
- **Library Archive:** Author `†`, Publication Title `†`, Publisher `†`,
  Publication Year `†`, Summary `†` — no URL field; Library records don't
  have one
- **Police Records:** Title `†`, Case Number `†` (auto-generated — see
  below), Date `†`, Summary `†`, Keywords, Required Privilege Level — no
  URL field
- **Canada Newspaper Archive:** Headline `†`, Province `†`, Date `†`,
  Summary `†`, Publication (optional), Keywords, Required Access Level —
  no URL field
- **Standalone Page:** Page Title, URL (required) — in its own "Standalone
  Page Fields" panel, alongside "Standalone Page Styling" (Background/Text
  Color, Font Family); neither has a `†` field, since standalone pages
  aren't listed in any search results table

Every field above is written to the record only when non-blank (except
Publication, which is always written, even empty, and the required fields
each type validates before Preview/Inject will proceed), matching how
authored content already omits a field entirely rather than storing it as
an empty string.

## Police Case Number Generation
Case Number follows a fixed format, `NNNNN-A`: a zero-padded number that
always increases by a random amount between 10 and 100 (never a fixed +1,
so the sequence can't be walked or guessed), followed by a random uppercase
letter. The moment Police is selected as the content type, an empty Case
Number field is auto-filled by asking the inject API
(`GET /api/web-content/next-police-case-number`) for the next one; the
"New" button next to the field always fetches a fresh one, overwriting
whatever's there. Both the field and the button leave the value fully
editable — the generator is a starting suggestion, not a lock.

There is no separate counter file recording "the highest number so far".
`tools/police_case_number.js` (shared by the server and by
`tests/tools/web-content-builder-server.spec.js`) derives it by scanning
`assets/en/police.json`'s existing `caseNumber` values on every request, so
the JSON itself is always the single source of truth and can't drift out of
sync with a forgotten or lost counter file. One consequence: two prefill
requests in a row without an actual inject in between (e.g. opening the
Police panel, then Clear, then Police again) can each independently
generate a number from the same base and needn't be increasing relative to
each other — only a real, saved record raises the baseline for the next
generation. All 9 originally-authored Police records were backfilled this
way on 2026-08-13, starting from a highest of 0 (no real case numbers
existed yet); the values then propagated to the other 4 language files,
since a case number is a fact, not translated prose.

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

## Progress Evidence
Every record also gets **progress evidence**: an entry in the persistent record
of the player's progression through the investigation, shown on the manila
EVIDENCE envelope on the noticeboard. This panel is active for every content
type, and it is **mandatory** — Preview and Inject are both blocked until it is
valid. Full system reference:
[../docs/progress-evidence-system.md](../docs/progress-evidence-system.md).

Controls:
- `progressEvidenceId` — read-only. Allocated from
  `GET /api/web-content/next-progress-evidence-id?service=<service>` on page
  load, on Clear, and whenever the Content Type changes. It is deliberately not
  typeable — a hand-entered id could collide with one the game has already
  handed out. The `Allocate` button re-asks, which is what to press if the
  Inject API was not running when the page loaded.

  Ids are **five digits: a service control digit, then a four-digit sequence
  within that service** — `0` Zoom Search, `1` Library, `2` Police, `3`
  Archives, `4` Standalone, `5` received faxes. So `43222` is a standalone page
  and `33333` is an archives record, readable at a glance. Each service counts
  up in its own block, which is why switching Content Type allocates a new id:
  an id belongs to one service and the server rejects a mismatch.
- `Choose Progress Evidence Photo` — required. Writes
  `./assets/photos/progressEvidenceImages/<file>`. The file does not have to
  exist yet: in game a missing image falls back to a placeholder card showing
  the id, so artwork can follow later.
- `progressEvidenceActivated` — checked means "count this as already reached",
  so it shows in the envelope immediately without the player doing anything.
- `progressEvidenceDeveloperEnabled` — the display switch. **Both** flags must
  be true for an item to appear; with this one off it stays hidden even when
  activated is on.

Blocked with a message in the status line when:
- no id has been allocated (the Inject API was offline — start it and press
  `Allocate`)
- no progress evidence image has been chosen

On Inject the server:
- upserts a definition into `assets/progressEvidence.json`, matched on
  service + record id. Re-injecting the same record **updates it in place and
  keeps the id it was first allocated**, so an id the player may already have
  activated is never stranded.
- **strips** the four progress evidence fields from the copy written into the
  site content files — the progress evidence registry owns them, the same way
  the localized evidence catalogs own description and caption. They are never
  stored in two places.
- reports what it did under `progressEvidenceUpdate` in the response.

`assets/progressEvidence.json` **is** the game's progress evidence registry — it
loads it at startup — so a record authored here needs no code change to become
real progress evidence. It is one language-neutral file rather than a field in
each of the five translated content files, because an id and its two flags are
the same fact in every language.

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
- A record's progress evidence definition is matched on service + record id, so
  re-injecting updates it rather than allocating a second `progressEvidenceId`.
