# Facsimile Event Trigger Guide

How to send a fax to the desk facsimile machine, and how to verify it becomes
Reports evidence. For the underlying mechanism see
[architecture.md §7](architecture.md#7-the-facsimile-machine).

## Prerequisites

1. Start a game and enter the desktop scene.
2. Confirm the facsimile rig is visible and clickable.
3. Open devtools console on the game page.

---

## Method A — raw report, direct call

The simplest path. Everything you supply is used verbatim.

```js
window.receiveFacsimileReport({
  id: "fax-night-shift-001",
  title: "CAVERN DISPATCH // NIGHT SHIFT",
  reportText: "Timestamp 02:17\nGenerator room access attempted by unknown party.",
  description: "Fax received from security relay.",
  evidenceName: "facsimile-night-shift-001",
  paperStyle: "report-parchment"
});
```

## Method B — window event

Same payload, dispatched rather than called, for loose coupling:

```js
window.dispatchEvent(new CustomEvent("cave-facsimile-report", {
  detail: {
    report: {
      id: "fax-night-shift-002",
      title: "FACILITY WATCH // DAWN",
      reportText: "Timestamp 05:48\nNorth tunnel sensor dropped for 11 seconds.",
      description: "Fax relay from perimeter system.",
      evidenceName: "facsimile-dawn-watch-002",
      paperStyle: "report-parchment"
    }
  }
}));
```

`detail` may also *be* the report object, without the `report` wrapper.

## Method C — configured fax (localized or catalog-backed)

Use this for real story content, so the fax is translated like everything else.

```js
window.receiveConfiguredFacsimileReport({
  id: "fax-whitmore-police-credentials",
  source: {
    kind: "report-localized-catalog-entry",
    languageAware: true,
    catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
    entryId: "fax-whitmore-police-credentials"
  },
  storageKey: "reports",
  titleKey: "reports",
  evidenceName: "facsimile-whitmore-police-credentials",
  messageType: "credentials"
});
```

`window.receiveLocalizedFacsimileReport` is an alias of the same function.

With a `report-localized-catalog-entry` source, the title, body, description and
paper style are pulled from `assets/{lang}/reports_evidences.json` at queue time,
and the fax follows the player's language.

Without a catalog source you can still localize by key:

- `titleKey`, `descriptionKey`, `reportTextKey` — single localization keys
- `reportTextLineKeys` — an array of keys joined with newlines to build the body

---

## Payload fields

**Required**

| Field | Purpose |
| --- | --- |
| `id` | Unique logical fax id. Used to reject duplicates and to record consumption |

**Recommended**

| Field | Default | Purpose |
| --- | --- | --- |
| `title` | localized `facsimileDefaultTitle` | Heading shown in the FACSIMILE window |
| `reportText` | — | Body text; `\n` gives line breaks |
| `description` | localized `facsimileDefaultDescription` | Description stored on the resulting evidence |
| `evidenceName` | `facsimile-<id>` | Name of the created evidence item |
| `paperStyle` | `report-parchment` | Paper style of the created evidence |
| `storageKey` | `reports` | Target evidence collection |
| `messageType` | `intel` | Drives the notification style |
| `awardsEvidence` | `true` | Set `false` for a purely informational fax that never becomes Reports evidence |

`messageType` maps to a notification type: `urgent` → `fax-urgent`,
`credentials` → `fax-credentials`, `system` → `fax-system`, anything else →
`fax-intel`. You can override the notification entirely:

```js
notification: { type: "fax-urgent", text: "Priority transmission received", sound: "fax", durationMs: 6000 }
```

---

## Expected behaviour

1. The rig switches to pending-message visuals (flashing alert light) and plays the paper-feed animation for ~1.9 s.
2. An arrival notification appears, styled by message type.
3. Opening FACSIMILE shows the title and body of the **oldest** pending fax.
4. Closing FACSIMILE after viewing creates exactly one Reports evidence entry and shows the "New Report … unlocked" reward notification — unless the fax was sent with `awardsEvidence: false`, in which case it's still consumed but nothing is added to Reports and no reward notification fires.
5. With several queued, the next one appears on the next open (FIFO). *Show Next Cached Message* commits the current one and advances without closing.
6. When the queue empties, FACSIMILE returns to NO NEW MESSAGES and the rig stops flashing.

Duplicates are rejected: a fax whose `id` is already pending, or already in
`consumedReportIds`, is dropped silently. This is what makes the pending queue
safe across save/load.

---

## Validation steps

1. Open FACSIMILE before triggering anything. Confirm NO NEW MESSAGES.
2. Trigger a fax by any method above.
3. Confirm the pending state (flashing indicator).
4. Open FACSIMILE; verify title and body.
5. Close FACSIMILE.
6. Confirm exactly one reward notification.
7. Reopen FACSIMILE; confirm NO NEW MESSAGES.
8. Open the Reports folder and confirm the new report is present and readable.
9. Trigger the same `id` again; confirm nothing happens.

### Multi-fax batch check

1. Trigger five faxes with unique `id` and `evidenceName` values.
2. Open and close FACSIMILE five times.
3. Confirm each is shown and transferred one at a time, oldest first.
4. Confirm NO NEW MESSAGES after the fifth close, and five new reports.

---

## Story milestone triggers

To fire a fax off the back of the player acquiring evidence, register a trigger
rather than calling the API directly. In `ui.js`:

```js
registerEvidenceMilestoneFaxTrigger({
  predicate: (evidence) => String(evidence?.name || "").trim() === "standalone-honeydewcavingclub",
  faxConfig: WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG,
  once: true,
  animateFeed: true,
});
```

The predicate receives a clone of each newly created evidence item. `once: true`
removes the trigger after it fires. Register these inside
`initializeEvidenceMilestoneTriggers()`, which is guarded so it only runs once
per page load.

---

## Web record-open triggers

To fire a fax off the back of the player *opening* a specific web record —
clicking through to its detail view, not just running a search that happens to
return it — register a record-open trigger instead. In `ui.js`:

```js
registerRecordOpenFaxTrigger({
  websiteId: "police",
  recordId: "arthurwhitmore",
  faxConfig: WHITMORE_LEVEL3_MILESTONE_FAX_CONFIG,
  once: true,
  animateFeed: true,
});
```

`websiteId` matches the site's `id` in `webContentRegistry.js` (`police`,
`zoomsearch`, `library`, `archives`); `recordId` matches a record's `id` in
that site's `assets/<lang>/<siteId>.json`. Both are matched
case-insensitively. Register these inside `initializeWebRecordFaxTriggers()`,
which is guarded so it only runs once per page load, and mirrors
`initializeEvidenceMilestoneTriggers()` in shape.

This is a distinct trigger channel from evidence milestones: it fires on
`caveos-browser-record-opened` (dispatched by `makeSelectableResults()` in
`webContentRegistry.js` every time a result row is selected) rather than on
evidence creation, so it also works for gated records — like this one, which
requires the Level 2 credentials from the *first* Whitmore fax just to appear
in a search — that don't award evidence themselves. The shipped example:
opening Arthur Whitmore's police record (`arthurwhitmore`, gated at
`requiredPrivilegeLevel: 2`) sends a second, Level 3 credentials fax from
Brian Whitmore (`t.fairchild` / `mapleLaw91`, added to `police.json`'s
`accounts`).

---

## New-game intro faxes (time-based, not evidence-triggered)

A new game opens with two scripted faxes fired off plain timers rather than an
evidence trigger, arranged by `scheduleNewGameIntroFacsimiles()` in `ui.js`,
called from the `#newGame` click handler:

1. **10 s in** — `NEW_GAME_WELCOME_FAX_CONFIG`, an orientation message telling
   the player to read the background story and explore the desk. Sent with
   `awardsEvidence: false`, so it never lands in Reports.
2. **40 s in** (30 s after the welcome fax) — `MISSING_REPORT_FAX_CONFIG`, the
   `missingReport` catalog entry, delivered by fax and turned into Reports
   evidence on read like any other fax. This replaces the old
   `DEFAULT_EVIDENCE_BLUEPRINTS` seed, so a fresh game's Reports folder starts
   empty.

`cancelScheduledNewGameIntroFacsimiles()` clears both timers before rescheduling
(so New Game can't stack duplicates) and is also called after a successful load,
so a still-pending timer from an abandoned New Game can't inject a fax into a
save that was just loaded.

---

## Automated coverage

`tests/report-magnifier.spec.js`:

- *facsimile desktop object receives report and awards evidence once* — empty state, pending state, rendering, one-time transfer, cleared queue.
- *facsimile queues and transfers five unique reports* — FIFO batch behaviour.
- *facsimile next cached message button advances queue and transfers evidence* — the in-window advance path.
- *minemap photo evidence milestone triggers Whitmore credentials fax* — the evidence-trigger route end to end.
- *report magnifier renders scrolled bottom content and captures evidence* — queues and reads the `missingReport` catalog entry directly (bypassing the real 40 s new-game delay) so the report is in evidence for the magnifier assertions.

`tests/regression-smoke.spec.js` additionally round-trips a queued-then-read fax
through save and load.

To record video of fax behaviour:

```bash
npx playwright test --config playwright.facsimile-video.config.js
```
