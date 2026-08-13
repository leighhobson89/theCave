# Story Timeline — Fixed Inconsistencies Log

A record of gaps/inconsistencies that were previously flagged as open in
[`story-timeline.md`](story-timeline.md) §5 ("Known gaps and
inconsistencies") and have since been fixed in shipped content. Kept here,
out of the main reference, so that doc's "still open" section stays a
reliable to-do list rather than a mix of live issues and history. Nothing
in this file describes current behaviour to design against — check
`story-timeline.md` itself for that.

---

- **2026-08-13: this doc, not shipped content, had Andrew Spencer's date of
  death wrong.** §1's timeline and §2's character index both dated
  Andrew's death to **28 Jul 1901**, sourced to the missing-person
  report's line "confirmed by the local Coroner on 28 July." That clause
  is the Coroner's formal confirmation date, not a second date of death —
  `story_en.md` plays the whole sequence (Andrew stumbling into the
  farmyard, being bandaged, and dying in Diane's arms) as one continuous,
  unbroken scene with no day-break, so he in fact died the evening of
  **27 Jul 1901**, the same day he returned from the cave. Corrected in
  both places; the shipped `reports_evidences.json` text itself was never
  wrong, just misread.
- The handwritten police username on `mysteriesOldNW.png` previously read
  `james.f` against the live `j.fletcher` account; the art now reads
  `j.fletcher` and matches exactly. No longer outstanding, kept here as a
  record of the fix.
- `09-24-49-02-07` previously had no discoverable code — the Fairchild
  ZoomSearch page now closes that gap with a standing line ("we're the
  lucky 07 when it comes to Insurance"), giving Route (`07`) directly and
  Document (`02`, Insurance Policy) by context. Combined with Gold/
  Pendant/Worthing from `goldenpendant`, all five segments are now
  legitimately derivable — see `happypath.md` §8 step 18. (The decode
  book's own tables had at one point dropped their leading zeros and
  reshuffled the Name Index so Fairchild read `7`, but Hollingworth `22`
  and Worthing `49` — the two values baked into shipped codes — kept
  their exact original numbers, so nothing else needed to change at the
  time. Leading zeros were later restored across all five index
  categories — `7 — Fairchilds` is `07 — Fairchilds` again — so the
  decode book's own formatting now matches the two-digit codes it
  decodes; the numeric values themselves, including Fairchild's, never
  changed.) No longer outstanding, kept here as a record of the fix.
- **2026-08-13 audit: does Anthony Worthing knowing about the pendant
  force a contradiction?** Checked, and the suspected contradiction turned
  out to be real, correcting a too-quick first pass logged earlier the
  same day. McLeod's own report says "follow ups are being carried out to
  ascertain possible owners" right after the November 1901 find — not
  "ownership was never established" — and Fairchild's insurance paperwork
  for the same pendant sits inside the *police's* Level 3 files, not just
  Fairchild's, suggesting the follow-up succeeded. Both support Lieutenant
  McLeod identifying and questioning Anthony Worthing within weeks or
  months of the find, exactly as suspected — a small-town Lieutenant
  actively investigating ownership of an engraved heirloom, with the
  town's one valuation broker holding the matching policy, is not a
  stretch. What survives is narrower than "nobody ever knew": "ownership...
  officially still open" (repeated verbatim through the 1957 obituary)
  reads as *never disclosed publicly*, not *never known privately* — i.e.
  Anthony was very likely questioned and released, and the file sealed
  rather than closed. The fix for a future 1907 scene is therefore what it
  reveals, not when it happens: not "the pendant was found" (already known
  to him since ~1901–02) but "it's now sitting in a published book" — a
  leak to suppress, not news to process. One further correction, unchanged
  from the first pass: the caving club was founded in 1902, not 1901, and
  by then he'd already know the pendant wasn't recoverable from the cave —
  so any motive for joining (1902–1904 only, never 1901) needs to be
  something other than an unwitting search (see `story-timeline.md` §4's
  "Simon and Tony" entry).
- **2026-08-13, same-day follow-up: the audit above is now shipped
  content, and the caving club date moved again.** Two changes, made
  directly rather than left as developer-doc analysis: (1) `goldenpendant`
  (`police.json`, all 5 languages) now carries the November 1901
  follow-up/questioning note verbatim in-game, not just in this doc —
  Anthony Worthing being brought in and released without charge is now a
  real, readable part of the pendant's evidence report. (2) The caving
  club's founding *and* its team photo both moved from 1902/1904 to
  **September 1901** (`police.json` thomasorourke, `standalone-pages.json`
  honeydewcavingclub, `photos_evidences.json`, all 5 languages), so that
  Anthony's club membership predates his November 1901 questioning rather
  than following it by a year — this was a deliberate author decision, not
  a bug fix, made after the audit above had already concluded the *original*
  1902 date was internally consistent on its own. Two ripple edits went
  with it: the club's "ten years of activity" (standalone page) became
  "just over a decade," and the collective map's compilation span
  (`photos_evidences.json`, the map entry) became "1901–1911," both to
  stay arithmetically consistent with the earlier founding date. See
  `story-timeline.md` §1, §2 and §4 for the fully updated timeline and
  character notes.
