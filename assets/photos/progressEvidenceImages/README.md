# Progress evidence images

The images shown on the cards inside the noticeboard's manila EVIDENCE
envelope. This folder is what the web content builder's **Progress Evidence**
panel photo picker defaults to.

Every registry entry names its image explicitly, on the convention "file named
after the `progressEvidenceId`":

```
assets/photos/progressEvidenceImages/00001.png    ->  progressEvidenceId "00001"
```

The builder tool prefills that path as soon as an id is allocated, so an author
normally drops the file in here under its id and touches nothing else. Two
exceptions:

- **Artwork named something else** — the builder's photo picker writes whatever
  file you choose into `imagePath`, e.g.
  `./assets/photos/progressEvidenceImages/black-pine-poster.png`.
- **A hand-written entry with a blank `imagePath`** — falls back to the same
  convention, so it still finds `[progressEvidenceId].png`.

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
