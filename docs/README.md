# The Cave — Documentation

A static, build-free ES-module browser game. Open `index.html` through any
static server (or `node tests/support/static-server.cjs`, which serves the repo root on
port 4173).

```bash
npm install
node tests/support/static-server.cjs     # http://127.0.0.1:4173
npm run test:e2e                 # Playwright suite
```

## Where to start

| Document | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | **Start here.** How every component works: scenes and the viewport, the window system, evidence carousels, the story window, Notes and Paint, the facsimile, the CaveOS computer and Netscape, the web content system, notifications, audio, localization, save/load, the debug window, tests, and known issues |
| [evidence-system.md](evidence-system.md) | The evidence store, content catalogs, the three unlock paths, evidence triggers, save validation, authoring rules |
| [progress-evidence-system.md](progress-evidence-system.md) | The separate progress evidence system: milestone ids, the two flags, the noticeboard EVIDENCE envelope and its carousel, image/placeholder loading, the full website and fax audit |
| [investigation-archives.md](investigation-archives.md) | The four in-game web services: exact search rules, real login credentials, record data, detail templates, standalone hidden pages, how to add records |
| [facsimile-event-trigger-guide.md](facsimile-event-trigger-guide.md) | Sending faxes, payload fields, the read-to-evidence lifecycle, milestone triggers, record-open triggers, validation steps |
| [story-timeline.md](story-timeline.md) | Snapshot audit of every character, date and connection findable in the shipped story/evidence/web-content assets, plus known gaps and inconsistencies |
| [../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md](../tools/WEB_CONTENT_BUILDER_TOOL_MANUAL.md) | The Web Content Generator: the only content authoring tool in the repo |
| [audit-2026-08-10.md](audit-2026-08-10.md) | The August 2026 audit: what was removed, de-duplicated, rewritten, and what was deliberately left alone |

## Source layout

```
index.html                  markup and CDN script tags
styles.css                  all styling (the desk, windows, papers, CaveOS, browser)
localization.json           per-language string maps (en, es, de, it, fr)

ui.js                       entry point; DOM wiring and every window
constantsAndGlobalVars.js   game state, element cache, save payload
evidenceManager.js          evidence store, blueprints, triggers
progressEvidenceManager.js  progress evidence registry loader, activated ids,
                            eligibility, id allocation
game.js                     scene state machine, zoom/pan, scene transitions
desktopWindow.js            draggable/resizable window component
audioManager.js             music and SFX
localization.js             localization loader and localize()
saveLoadGame.js             save-string capture and restore
webContentManager.js        website registry, sessions, search, evidence awards
webContentRegistry.js       the four site definitions and page renderers

assets/
  {lang}/story.md                    background story text, per language
  {lang}/reports_evidences.json       localized report catalog
  {lang}/photos_evidences.json       localized photo catalog
  {lang}/*.json                      the in-game websites, per language
                                      (archives, library, police, zoomsearch,
                                      standalone-pages)
  photos/                            photo evidence images
  photos/progressEvidenceImages/     progress evidence card images
  progressEvidence.json              the progress evidence registry: every
                                      website and fax, its id, image and flags
  web-content/schemas/*.json         formal record contracts
  flags/, fonts/

tools/                      the Web Content Generator (UI, logic, local write API)
tests/                      Playwright specs and the static server
```

## Conventions

- **No build step.** Plain ES modules, loaded directly by the browser.
- **Content is data.** New records, evidence and pages should need no code change — only JSON, plus catalog entries in all five languages.
- **Exact-match search.** In-game services never do partial matching; that is a design rule, not a limitation.
- **No silent fallbacks for content.** Missing catalog entries or fields render an explicit message naming the item, the entry id, the field and the language.
- **Save compatibility matters.** The evidence store snapshot goes straight into the save string, so renaming a storage key or a payload field breaks existing saves.
