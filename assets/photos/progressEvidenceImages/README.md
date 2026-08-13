# Progress evidence images

The images shown on the cards inside the noticeboard's manila EVIDENCE
envelope. This folder is what the web content builder's **Progress Evidence**
panel photo picker defaults to.

Two ways an item finds its image, in order:

1. **An explicit `imagePath`** on its registry entry — what the builder's photo
   picker writes, so the file can be named anything:
   `./assets/photos/progressEvidenceImages/black-pine-poster.png`
2. **The naming convention**, when no `imagePath` is set — the file named after
   the `progressEvidenceId`:

```
assets/photos/progressEvidenceImages/00001.png    ->  progressEvidenceId "00001"
```

Both come from `resolveProgressEvidenceImagePath()` in
[`../../../progressEvidenceManager.js`](../../../progressEvidenceManager.js),
resolved on every render, so renaming this folder is a one-line change there
(`PROGRESS_EVIDENCE_IMAGE_DIRECTORY`).

A missing file is expected while the artwork is still being drawn: the card
falls back to a portrait placeholder showing the `progressEvidenceId` as text
(`createProgressEvidenceCardMedia()` in `ui.js`). Nothing breaks, and dropping
the image in later is all that is needed to replace the placeholder.

Portrait images suit the card frame best.

See [`../../../docs/progress-evidence-system.md`](../../../docs/progress-evidence-system.md)
for the full developer guide.
