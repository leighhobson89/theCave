# Evidence system

Evidence awarded by visiting web content, the Photos/Reports carousels
(navigation, empty states, custom titles), the standalone background story
window, error paths for a broken catalog lookup, and the magnifier lens over
both report text and photos.

| Spec | Covers |
| --- | --- |
| `awards-from-web-content.spec.js` | A standalone page awarding multiple evidences, each with its own reward toast |
| `awards-full-catalog.spec.js` | The 6 remaining awarding records not reached by the spec above: ZoomSearch, all 3 Library books, the Fairchild standalone insurance page, and the Level 3 `goldenpendant` police record (refused below Level 3, awarded once logged in) -- all 9 awarding records in the game are covered between the two specs |
| `carousel-navigation.spec.js` | Photos/Reports carousel prev/next stepping with wraparound at both ends, and the empty-carousel state (with navigation disabled) for both collections |
| `custom-names.spec.js` | The evidence title editor: committing via Enter or the ✓ button, the commit button's disabled state, an emptied input reverting instead of committing, a custom name following its evidence across carousel navigation, surviving a save/load round trip, and New Game clearing it |
| `missing-catalog-entry.spec.js` | The two catalog error-message paths (`buildMissingCatalogEntryMessage` / `buildMissingCatalogFieldMessage`) for both photos and reports, triggered by injecting evidence with no matching catalog entry, and by intercepting a catalog fetch to serve one entry with a blank field |
| `background-story.spec.js` | The single background-story evidence, which isn't a carousel: opening it from the desk, its real markdown content, and reopening after close |
| `magnifier.spec.js` | Magnifier over report text (including after scrolling) and over photos (alignment at centre and edge) |

**A note on how awarding actually happens:** ZoomSearch, Library, Police and
Archives award evidence the moment a matching record appears in a *search
result* (`webContentManager`'s `searchWebsite()` walks every record in the
results and awards on the spot) -- no click into the detail view is required.
Only standalone pages award on navigation instead. `evidence-awards-full-
catalog.spec.js` relies on this to keep its Library test to plain searches
rather than needing to open each book's detail view.

**A note on the report-text locator:** the magnifier controller clones the
report text node into its own (hidden) preview surface on every render, so an
unqualified `.report-document-text` locator resolves to two elements. Specs
that read report content use `.first()`.

**Still not covered:** `addEvidenceTrigger`'s predicate/action API (currently
unused by any registered trigger, so there is nothing in the game that
exercises it); SFX firing on evidence award (see the audio-settings gap of
the same shape); and an axe/a11y sweep of the carousel and title-editor
controls.
