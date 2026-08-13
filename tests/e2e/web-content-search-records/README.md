# Web content — search & records

Netscape site search: query submission, result rows, detail views, per-site
empty states, address-history recording/replay, the archives login panel's
layout, the full authored record catalog, and the one standalone page nothing
else in the suite reaches.

| Spec | Covers |
| --- | --- |
| `browser-address-history.spec.js` | History recording, de-duplication, replaying a stored search, surviving a computer close and a save round trip |
| `browser-archives-login-layout.spec.js` | Subscriber login panel alignment against the Summary column, including at a narrow viewport |
| `browser-site-search.spec.js` | ZoomSearch / Library / Archives query submission, result rows, detail views, per-site empty states |
| `browser-record-catalog.spec.js` | Every authored record across ZoomSearch (8), Library (3), Police (9) and Archives (3) opens and renders correctly; every metadata field that feeds a search-results table column, section headings and image galleries; Library/Police/Archives empty states |
| `browser-detail-synthetic-fields.spec.js` | Case Number, Officer, Classification, Declassification, Edition, Publisher/Province (Library) and the References/Attachments blocks, proven against synthetic data injected via `page.route` — for Officer/Classification/Declassification/Province/References/Edition, the *only* place they're tested, since no real record populates them, on purpose (see below) |
| `browser-standalone-whitmore-page.spec.js` | The `whitmoresonsironmachineryco` standalone page — reached via the mine-cart article's in-page link and directly by URL; confirms it awards no evidence |

All 25 authored records (ZoomSearch 8, Library 3, Police 9, Archives 3, plus
the 2 standalone pages covered under `tests/e2e/evidence-system/` because
both award evidence, and this folder's own Whitmore page) are now opened by
some spec in the suite.

**A real content gap, found, acted on, then scoped back down:**
`webContentRegistry.js` renders Case Number, Officer, Classification,
Declassification and Edition (and Publisher/Province on Library records),
but as of the 2026-08-13 audit no record in `police.json`, `library.json` or
`archives.json` populated any of them — the code had always been dead in
production content. Same story for `references`/`attachments`:
`createKeyValueList` was real, wired-up code with nothing in the game's
authored content that ever supplied it. This was found while trying to
write real-data assertions for `docs/test-coverage-analysis.md`'s
"detail-view field rendering" gap and turned out to need synthetic data
instead (`browser-detail-synthetic-fields.spec.js`).

The first fix backfilled every one of those fields with a `"TODONOW"`
placeholder on every record missing one, across all 5 languages, and added
a form field for each to `tools/web_content_builder.js`/`.html`. On review,
that was narrowed to just the fields that actually feed a
search-results-table column — a blank one of *those* means an empty column
for every player who finds the record, which is a sharper failure mode than
a blank detail-view field. Province/Officer/Classification/Declassification
Status (Police), Province/References (Library) and Edition (Archives) don't
feed any table, so their `"TODONOW"` placeholders, JSON keys and form
fields were all removed again. What's still backfilled: Case Number and
Date (Police), Publisher and Publication Year (Library) — 115 placeholders
remained at that point, down from the first pass's 385.

A third pass then filled in real content where one existed: Library's
Publisher/Publication Year and Archives' one missing Date were hand-authored
in English and propagated to the other 4 languages (facts, not translated
prose). Police's Case Number got a generator instead of hand-authoring —
`tools/police_case_number.js`, format `NNNNN-A` with an always-random
10–100 increment, scanning `assets/en/police.json` for the current highest
rather than trusting a separate counter — now wired into the tool as an
auto-fill-on-select plus a "New" button to regenerate. Police's Date was
scanned the same way Archives' had been: 3 of its 9 records had an
unambiguous date embedded in their own report text and were filled in; the
other 6 only had several competing narrative dates and no single obvious
"record date", so a real value was chosen for them directly instead of
guessed. A fourth pass filled in that last group by hand and, purely for
readability, moved `caseNumber`/`date` to sit right after `title` on every
Police record (ahead of `keywords`) across all 5 languages — no value
changed. **Every `TODONOW` placeholder in the project is now resolved.**
`browser-detail-synthetic-fields.spec.js`'s synthetic-data coverage isn't a
residual gap left behind by that — Province/Officer/Classification/
Declassification Status/References (Police/Library) and Edition (Archives)
were deliberately excluded from authoring in the second pass because none of
them feed a table column, so no real record will ever reach that rendering
path; that spec is the only place it's still checked, on purpose. See
`docs/test-coverage-analysis.md` §1.3/§1.12 and
`tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md` for the full story.
