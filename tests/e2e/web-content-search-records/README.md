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
| `browser-record-catalog.spec.js` | Every authored record across ZoomSearch (8), Library (3), Police (9) and Archives (3) opens and renders correctly; real metadata fields, section headings and image galleries; Library/Police/Archives empty states |
| `browser-detail-synthetic-fields.spec.js` | Case Number, Officer, Classification, Declassification, Edition, Publisher/Province (Library) and the References/Attachments blocks — fields no authored record currently populates, proven against a synthetic record injected via `page.route` |
| `browser-standalone-whitmore-page.spec.js` | The `whitmoresonsironmachineryco` standalone page — reached via the mine-cart article's in-page link and directly by URL; confirms it awards no evidence |

All 25 authored records (ZoomSearch 8, Library 3, Police 9, Archives 3, plus
the 2 standalone pages covered under `tests/e2e/evidence-system/` because
both award evidence, and this folder's own Whitmore page) are now opened by
some spec in the suite.

**A real content gap, not a test gap:** `webContentRegistry.js` renders Case
Number, Officer, Classification, Declassification and Edition (and
Publisher/Province on Library records), but no record in `police.json`,
`library.json` or `archives.json` currently populates any of them — the code
has always been dead in production content. Same story for
`references`/`attachments`: `createKeyValueList` is real, wired-up code with
nothing in the game's authored content that ever supplies it. This was found
while trying to write real-data assertions for `docs/test-coverage-analysis.md`'s
"detail-view field rendering" gap and turned out to need synthetic data
instead — see `browser-detail-synthetic-fields.spec.js`.
