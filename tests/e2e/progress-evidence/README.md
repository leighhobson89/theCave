# `e2e/progress-evidence/`

The progress evidence system: the persistent record of investigation milestones
the player has reached, and the manila EVIDENCE envelope on the noticeboard that
displays them.

Implementation: [`progressEvidenceManager.js`](../../../progressEvidenceManager.js),
the progress evidence section of [`ui.js`](../../../ui.js), and the envelope /
carousel CSS blocks in [`styles.css`](../../../styles.css). The developer guide
is [`docs/progress-evidence-system.md`](../../../docs/progress-evidence-system.md).

## Scope

| Spec | Covers |
| --- | --- |
| `progress-evidence-activation-and-persistence.spec.js` | Nothing activated on a new game; `activateProgressEvidence()` adds an id; duplicate activation is a no-op; save preserves and load restores the collection; a full save → reload → Resume cycle |
| `progress-evidence-envelope-display.spec.js` | The two-flag eligibility rule in all four combinations, the envelope refreshing on open, and three cards on screen at once |
| `progress-evidence-images.spec.js` | `[progressEvidenceId].png` displayed when it exists; the placeholder card carrying the id when it does not |
| `progress-evidence-carousel.spec.js` | Prev/next navigation in both directions, and the one-card slide: four cards mid-step, the end cards fading, the middle pair holding their opacity and landing in their neighbours' slots |
| `progress-evidence-game-triggers.spec.js` | Activation from opening a website record and from receiving a fax, each reflected in the envelope |
| `progress-evidence-generated-definitions.spec.js` | The registry file (`assets/progressEvidence.json`): definitions registered at startup, authored activation, authored image path, duplicate ids refused, and the real file's service-coded ids |
| `progress-evidence-existing-folders.spec.js` | The Reports and Photos carousels are unaffected by the new system |

The server half of the builder's Progress Evidence panel — id allocation and the
definition upsert — is covered in
[`../../tools/web-content-builder-server.spec.js`](../../tools/web-content-builder-server.spec.js).

## Notes for anyone adding a spec here

- **Two flags, never one.** `progressEvidenceActivated` is player progress and is
  set through `window.activateProgressEvidence(id)`;
  `progressEvidenceDeveloperEnabled` is the developer's display switch and is set
  through `window.progressEvidenceDeveloperTools.setProgressEvidenceDeveloperEnabled(id, bool)`.
  A test that only sets one of them is testing the hidden case.
- **Never hard-code which items are developer-enabled.** That flag is an
  authoring decision a developer changes freely, so a spec that restates the
  enabled set breaks the moment someone flips one. Either enable what the test
  needs itself (`setProgressEvidenceDeveloperEnabled`) or read the expectation
  from `assets/progressEvidence.json`, as
  `progress-evidence-activation-and-persistence.spec.js` does. The shipped
  baseline is `00001` and `00002` (both ZoomSearch, the game's two earliest
  websites).
- **Ids carry their service in the leading digit** — `0` ZoomSearch, `1` Library,
  `2` Police, `3` Archives, `4` Standalone, `5` faxes — so `20005` in a spec is a
  police record and `50003` is a fax. They come from `assets/progressEvidence.json`;
  none are invented at runtime.
- **`assets/photos/progressEvidenceImages/00001.png` exists; `00002.png`
  deliberately does not.** That pair is what lets the image and placeholder
  paths both be covered against real content.
- **Stub `assets/progressEvidence.json`, never write it.** These specs run in
  parallel with everything else, so a real write would be visible to any other
  spec that happened to load the page mid-run. `page.route` before the first
  navigation is the pattern — see `progress-evidence-generated-definitions.spec.js`.
- Helpers live in [`../../support/game-helpers.js`](../../support/game-helpers.js)
  (`openNoticeboard`, `openProgressEvidenceEnvelope`, `readProgressEvidence`,
  `activateProgressEvidence`, `setProgressEvidenceDeveloperEnabled`).
