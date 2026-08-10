# Facsimile Event Trigger Guide

## Purpose
Use this guide to inject an incoming fax report into the desktop facsimile, verify that it appears in the FACSIMILE window, and confirm it is transferred to the Reports evidence collection after reading.

## Prerequisites
1. Start the game and enter the desktop scene.
2. Ensure the facsimile hotspot is visible and clickable.
3. Open browser devtools console in the game page.

## Trigger Method A: Direct API Call
Call the global helper:

window.receiveFacsimileReport({
  id: "fax-night-shift-001",
  title: "CAVERN DISPATCH // NIGHT SHIFT",
  reportText: "Timestamp 02:17\nGenerator room access attempted by unknown party.",
  description: "Fax received from security relay.",
  evidenceName: "facsimile-night-shift-001",
  paperStyle: "report-parchment"
});

Expected behavior:
1. The facsimile indicator switches to pending-message visuals.
2. Opening FACSIMILE shows the message title and report body.
3. Closing FACSIMILE after viewing creates one report evidence entry.
4. If multiple faxes are queued, the next pending fax appears on the next open (FIFO order).
5. When the queue is empty, FACSIMILE returns to NO NEW MESSAGES.

## Trigger Method B: Event Dispatch
Dispatch the custom event:

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

The detail payload also accepts the report object directly in detail (without wrapping in detail.report).

## Report Payload Fields
Required:
1. id: Unique logical report ID. Used to prevent duplicate evidence creation.

Recommended:
1. title: Window-visible fax title.
2. reportText: Main report body. Supports line breaks with \n.
3. description: Stored evidence description text.
4. evidenceName: Final evidence entry name in reports collection.
5. paperStyle: Evidence paper style (for example report-parchment).

## Validation Steps
1. Open FACSIMILE before triggering. Confirm NO NEW MESSAGES.
2. Trigger event/API with a report payload.
3. Confirm facsimile pending state (green flashing indicator).
4. Open FACSIMILE and verify title + reportText content.
5. Close FACSIMILE.
6. Confirm one reward notification appears.
7. Reopen FACSIMILE and confirm NO NEW MESSAGES.
8. Open Reports evidence window and verify the new report exists.

## Multi-Fax Batch Check
1. Trigger five reports with unique id and evidenceName values.
2. Open and close FACSIMILE five times.
3. Confirm each report is shown and transferred one-by-one.
4. Confirm FACSIMILE returns to NO NEW MESSAGES after the fifth close.

## Automation Reference
The end-to-end lifecycle check exists in:
- tests/report-magnifier.spec.js

The specific test name is:
- facsimile desktop object receives report and awards evidence once

This test verifies:
1. Empty facsimile state.
2. Triggered pending state.
3. Message rendering in FACSIMILE.
4. One-time transfer into reports evidence.
5. Pending state cleared after read.
