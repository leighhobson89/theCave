# `e2e/progress-evidence/`

The progress evidence system: the persistent record of investigation milestones
the player has reached. `progressEvidenceActivated` is player progress, set
when a website record opens, a standalone page is visited, or a fax is opened
and consumed (not merely received); `progressEvidenceDeveloperEnabled` is the
developer's separate switch for whether that milestone can be reached at all.

Implementation: [`progressEvidenceManager.js`](../../../progressEvidenceManager.js)
and the progress evidence activation call sites in
[`ui.js`](../../../ui.js). The developer guide is
[`docs/progress-evidence-system.md`](../../../docs/progress-evidence-system.md).

**This system has no display of its own any more.** The manila EVIDENCE
envelope on the noticeboard now shows the corkboard timeline's photographs, not
a card per progress evidence item — that coverage (the envelope, its carousel,
image/placeholder rendering) lives in
[`../progress-timeline/`](../progress-timeline/), not here. A
`progressEvidenceId` here is purely a milestone/trigger id that a timeline
event's `unlockedByProgressEvidenceId` points at.

## Scope

| Spec | Covers |
| --- | --- |
| `progress-evidence-activation-and-persistence.spec.js` | Nothing activated on a new game; `activateProgressEvidence()` adds an id; duplicate activation is a no-op; save preserves and load restores the collection; a full save → reload → Resume cycle |
| `progress-evidence-game-triggers.spec.js` | Activation from opening a website record, visiting a standalone page, and receiving a fax, and that both flags land correctly on the resulting entry |
| `progress-evidence-generated-definitions.spec.js` | The registry file (`assets/progressEvidence.json`): definitions registered at startup, authored activation, duplicate ids refused, and the real file's service-coded ids |
| `progress-evidence-existing-folders.spec.js` | The Reports and Photos carousels are unaffected by this system |

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
- **Stub `assets/progressEvidence.json`, never write it.** These specs run in
  parallel with everything else, so a real write would be visible to any other
  spec that happened to load the page mid-run. `page.route` before the first
  navigation is the pattern — see `progress-evidence-generated-definitions.spec.js`.
- **If a spec needs to see something rendered — a card, a carousel step, an
  image or its placeholder — it belongs in `../progress-timeline/`, not here.**
  That system owns the envelope now; this one only owns milestone bookkeeping.
- Helpers live in [`../../support/game-helpers.js`](../../support/game-helpers.js)
  (`openNoticeboard`, `openProgressEvidenceEnvelope`, `readProgressEvidence`,
  `activateProgressEvidence`, `setProgressEvidenceDeveloperEnabled`).
