# Facsimile system

The desk fax machine as a message inbox, and the scripted faxes fired by
progress milestones rather than by the player opening it.

| Spec | Covers |
| --- | --- |
| `inbox.spec.js` | Alert light states, queueing, next-message stepping, award-exactly-once on close |
| `milestone-triggers.spec.js` | Evidence-acquisition and record-open triggers, following delivered credentials through to a working login; a record-open trigger whose payload is an ECHOTRAIL unlock rather than evidence or credentials — confirmed not filed as case evidence, and confirmed the unlocked track never joins the in-game music rotation; and both trigger registries re-arming across New Game and load |

## Why the re-arming tests never reload the page

Both trigger registries (`recordOpenFaxTriggers` in `ui.js`, `evidenceTriggers`
in `evidenceManager.js`) hold `once` triggers that delete themselves the moment
they fire, and both live in module state rather than in the save. That
combination was a real bug: the "already fired" flag outlived the playthrough
that set it, so a second playthrough in the same browser session inherited it
and the milestone could never happen again. For the Level 3 credentials fax
that meant being locked out of Level 3 for the rest of the session — and
loading a save from *before* the milestone was the sharpest form of it, since
rewinding stranded the very fax that carries those credentials.

So these tests deliberately drive two full playthroughs in **one page
context**, reaching New Game through the pause menu rather than
`page.goto("/")`. A spec that reloaded between runs would pass against the bug,
because a reload rebuilds the module state the bug lives in — which is exactly
why it went unnoticed: every other spec in the suite starts from a fresh load.

The fourth test in that group asserts the opposite guarantee — that re-arming
*cannot* re-deliver a fax the loaded save has already consumed. It passes with
or without the fix by design: it guards `queueFacsimileReport`'s existing
`consumedReportIds` check, which is what makes re-arming safe in the first
place.
