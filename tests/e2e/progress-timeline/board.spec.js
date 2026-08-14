// The dated frames pinned to the corkboard, the pool of photographs in the
// EVIDENCE envelope, and the drag-and-drop between them.
//
// A photograph is identified by the frame it was drawn for — its id IS a
// progressTimeLineEventId, and so is its artwork filename. The progressEvidence
// id on an event is only the unlock *trigger*, which is why one source can
// legitimately reveal several photographs. See
// docs/progress-timeline-event-system.md.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  captureSaveStringViaMenu,
  clickNewGame,
  loadSaveStringViaMenu,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceWindow,
  startNewGame,
} = require("../../support/game-helpers");

const progressTimeLineEventDefinitions = require("../../../assets/progressTimeLineEvent.json").definitions;

const enabledDefinitions = progressTimeLineEventDefinitions.filter(
  (definition) => definition.progressTimeLineEventDeveloperEnabled === true
);

// Whichever timeline events are currently `availableFromStart` (see
// progressTimeLineEventManager.js) are in the player's hands from the very
// first moment of a new game, with nothing to unlock — so the pool is not
// necessarily empty. Read from the registry rather than hardcoded, per this
// project's rule against restating an authoring decision that changes freely,
// so these tests keep working unchanged as that set is edited.
const STARTER_PHOTO_IDS = progressTimeLineEventDefinitions
  .filter((definition) => definition.availableFromStart === true)
  .map((definition) => definition.progressTimeLineEventId)
  .sort();

// What any exact pool assertion should compare against once `ids` have been
// unlocked — folds in the starter baseline above.
function sortedWithStarters(...ids) {
  return [...STARTER_PHOTO_IDS, ...ids].sort();
}

// Frames whose photographs both come from one milestone, so a single
// activation puts a known set into the envelope.
const UNLOCK_40002_FRAMES = ["0250", "0360"];

function frames(page) {
  return page.locator("#progressTimeLineBoard .progress-timeline-frame");
}

function frame(page, frameId) {
  return page.locator(
    `#progressTimeLineBoard .progress-timeline-frame[data-progress-time-line-event-id="${frameId}"]`
  );
}

function frameSlot(page, frameId) {
  return frame(page, frameId).locator(".progress-timeline-frame-slot");
}

function noteRow(page, frameId) {
  return frame(page, frameId).locator(".progress-timeline-frame-note");
}

function noteInput(page, frameId) {
  return frame(page, frameId).locator(".progress-timeline-frame-note-input");
}

function noteClearButton(page, frameId) {
  return frame(page, frameId).locator(".progress-timeline-frame-note-clear");
}

function readNote(page, frameId) {
  return page.evaluate(
    (id) => window.progressTimeLineEventDeveloperTools.getProgressTimeLineEventNote(id),
    frameId
  );
}

// Types into a frame's note field the way a player does — a real click to focus
// it and real keystrokes — rather than setting `.value`, which would not prove
// the field is reachable or that its input handler is wired up.
async function typeNote(page, frameId, text) {
  await focusFrame(page, frameId);
  await noteInput(page, frameId).click();
  await page.keyboard.type(text);
}

function envelopePhotoIds(page) {
  return page.evaluate(
    () => window.progressTimeLineEventDeveloperTools
      .getEnvelopeProgressTimeLinePhotos()
      .map((photo) => photo.progressTimeLineEventId)
  );
}

function readPlacement(page, frameId) {
  return page.evaluate(
    (id) => window.progressTimeLineEventDeveloperTools.getProgressTimeLineFramePlacement(id),
    frameId
  );
}

function place(page, frameId, photoId) {
  return page.evaluate(
    ([f, p]) => window.progressTimeLineEventDeveloperTools.placePhotoOnProgressTimeLineFrame(f, p),
    [frameId, photoId]
  );
}

// Unlocks a known set of photographs by activating the milestones behind them.
async function unlockPhotos(page, frameIds) {
  const triggers = [...new Set(
    frameIds.map((frameId) => progressTimeLineEventDefinitions
      .find((definition) => definition.progressTimeLineEventId === frameId).unlockedByProgressEvidenceId)
  )];

  for (const trigger of triggers) {
    await activateProgressEvidence(page, trigger);
  }
}

// Drives a REAL mouse drag: press on the source, move past the threshold in
// steps, release over the target. Nothing synthetic — this is the same gesture
// a player makes, which is the only way to catch the drag failing to start at
// all. (The first version of these tests dispatched DragEvents directly and
// therefore passed against a drag that did not work.)
async function focusFrame(page, frameId) {
  await page.evaluate(
    (id) => window.progressTimeLineEventDeveloperTools.focusProgressTimeLineFrame(id),
    frameId
  );
}

async function dragPhoto(page, { photoId, fromFrameId = "", toFrameId = "", toEnvelope = false, release = true }) {
  // The board is taller than the screen, so whichever frame the drag involves
  // has to be panned into view before its coordinates mean anything.
  await focusFrame(page, fromFrameId || toFrameId);

  const source = fromFrameId
    ? page.locator(
      `.progress-timeline-frame[data-progress-time-line-event-id="${fromFrameId}"] .progress-timeline-frame-slot`
    )
    : page.locator(`.progress-evidence-card[data-progress-time-line-photo-id="${photoId}"]`).first();

  const target = toEnvelope
    ? page.locator(".progress-evidence-viewport")
    : page.locator(`.progress-timeline-frame[data-progress-time-line-event-id="${toFrameId}"]`);

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    return false;
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Several intermediate moves: the first has to clear the 5px threshold that
  // separates a drag from a click, and the rest exercise the ghost tracking.
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(
      startX + ((endX - startX) * step) / 6,
      startY + ((endY - startY) * step) / 6
    );
  }

  if (!release) {
    return true;
  }

  await page.mouse.up();
  return true;
}

test("the board draws one frame per developer-enabled event, in progressTimeLineEventId order", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  await expect(frames(page)).toHaveCount(enabledDefinitions.length);
  expect(enabledDefinitions.length).toBeGreaterThan(0);

  const renderedIds = await frames(page).evaluateAll(
    (elements) => elements.map((element) => element.dataset.progressTimeLineEventId)
  );

  // Ascending id order is the chronological order — that is the whole contract
  // of the id, and why `year` is never sorted on.
  expect(renderedIds).toEqual([...renderedIds].sort());
  expect(renderedIds).toEqual(enabledDefinitions.map((definition) => definition.progressTimeLineEventId));
});

test("a frame prints its date, using the bare year when the month is unknown", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const format = (year) => page.evaluate(
    (value) => window.progressTimeLineEventDeveloperTools.formatProgressTimeLineEventDate(value),
    year
  );

  expect(await format("071851")).toBe("Jul 1851");
  expect(await format("061920")).toBe("Jun 1920");
  // "00" means the month is genuinely unknown, not a formatting failure.
  expect(await format("001988")).toBe("1988");
  // The reserved sentinel for "no fixed in-fiction year".
  expect(await format("009999")).toBe("Present day");
  expect(await format("nonsense")).toBe("");

  await expect(frame(page, "0130").locator(".progress-timeline-frame-date")).toHaveText("Jul 1851");
});

test("a new game starts with empty frames and an empty envelope", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  expect(await envelopePhotoIds(page)).toEqual(STARTER_PHOTO_IDS);
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getProgressTimeLineEventPlacements()
  )).toEqual({});

  await expect(frame(page, "0130")).not.toHaveClass(/is-filled/);
});

// The reason a photograph is identified by its frame and not by the page it
// came from: one page can carry clues about several different dates.
test("one milestone can unlock several photographs, one per frame", async ({ page }) => {
  await startNewGame(page);

  // 40002 is the Honey Dew Caving Club standalone page: it carries both the
  // club's founding photo (Sept 1901) and the 1912 map release.
  await activateProgressEvidence(page, "40002");
  await openNoticeboard(page);

  // One activation, two distinct photographs, each named after its own frame
  // (plus the starter baseline that is always present).
  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters(...UNLOCK_40002_FRAMES));

  // Each is correct in its own frame, and both can be right at once — which is
  // the whole point of identifying a photograph by frame rather than by source.
  expect((await place(page, "0250", "0250")).isCorrect).toBe(true);
  expect((await place(page, "0360", "0360")).isCorrect).toBe(true);

  // Swapped over, the same two photographs are wrong.
  expect((await place(page, "0360", "0250")).isCorrect).toBe(false);
  expect((await place(page, "0250", "0360")).isCorrect).toBe(false);
});

test("a photograph whose milestone has not been reached cannot be placed", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked("0130")
  )).toBe(false);
  expect(await place(page, "0130", "0130")).toBeNull();

  await activateProgressEvidence(page, "00001");
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked("0130")
  )).toBe(true);
  expect((await place(page, "0130", "0130")).isCorrect).toBe(true);
});

test("a drag lifts a ghost that follows the pointer and fades the envelope back", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // Nothing in flight yet.
  await expect(page.locator(".progress-timeline-photo-ghost")).toHaveCount(0);

  await dragPhoto(page, { photoId: "0130", toFrameId: "0130", release: false });

  // Mid-drag: a ghost exists, and the envelope has gone transparent and
  // click-through so the board underneath can take the drop.
  await expect(page.locator(".progress-timeline-photo-ghost")).toHaveCount(1);
  const envelopeWindow = page.locator(".progress-evidence-window");
  await expect(envelopeWindow).toHaveClass(/is-photo-drag-active/);
  await expect(envelopeWindow).toHaveClass(/is-photo-drag-passthrough/);
  expect(await envelopeWindow.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  expect(Number(await envelopeWindow.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1);

  // The frame under the pointer is highlighted as the live target.
  await expect(frame(page, "0130")).toHaveClass(/is-drop-target/);

  await page.mouse.up();

  // Released: the ghost is gone and the envelope is back to normal.
  await expect(page.locator(".progress-timeline-photo-ghost")).toHaveCount(0);
  await expect(envelopeWindow).not.toHaveClass(/is-photo-drag-active/);
  expect((await readPlacement(page, "0130")).isCorrect).toBe(true);
});

test("a press that never moves is a click, not a drag", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = page.locator('.progress-evidence-card[data-progress-time-line-photo-id="0130"]').first();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Under the 5px threshold.
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2 + 1);
  await page.mouse.up();

  await expect(page.locator(".progress-timeline-photo-ghost")).toHaveCount(0);
  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters("0130"));
});

test("dropping a photograph somewhere that is neither a frame nor the envelope leaves it where it was", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = page.locator('.progress-evidence-card[data-progress-time-line-photo-id="0130"]').first();
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Off to the very top-left corner, clear of every frame and the envelope.
  await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 - 40);
  await page.mouse.move(2, 2);
  await page.mouse.up();

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getProgressTimeLineEventPlacements()
  )).toEqual({});
  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters("0130"));
});

test("dragging a photograph from the envelope into its frame records it correct and empties it from the envelope", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters("0130"));
  expect(await dragPhoto(page, { photoId: "0130", toFrameId: "0130" })).toBe(true);

  expect(await readPlacement(page, "0130")).toEqual({
    progressTimeLinePhotoId: "0130",
    isCorrect: true,
    isLocked: false,
  });

  // Placed photographs leave the pool — there is only one of each. The
  // starters are unaffected, since 0130 was never one of them.
  expect(await envelopePhotoIds(page)).toEqual(STARTER_PHOTO_IDS);

  const target = frame(page, "0130");
  await expect(target).toHaveClass(/is-filled/);
  await expect(target).toHaveClass(/is-correct/);
  await expect(target).toHaveAttribute("data-placement-correct", "true");
});

test("any photograph may be dropped in any frame, but only a matching one is flagged correct", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await dragPhoto(page, { photoId: "0130", toFrameId: "0320" })).toBe(true);

  expect(await readPlacement(page, "0320")).toEqual({
    progressTimeLinePhotoId: "0130",
    isCorrect: false,
    isLocked: false,
  });
  await expect(frame(page, "0320")).toHaveClass(/is-incorrect/);
});

test("the cross button returns a photograph to the envelope", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);

  await place(page, "0130", "0130");
  expect(await envelopePhotoIds(page)).toEqual(STARTER_PHOTO_IDS);

  await frame(page, "0130").locator(".progress-timeline-frame-remove").click();

  expect(await readPlacement(page, "0130")).toBeNull();
  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters("0130"));
  await expect(frame(page, "0130")).not.toHaveClass(/is-filled/);
});

test("a photograph can be dragged straight from one frame to another", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);

  await place(page, "0320", "0130");
  expect(await dragPhoto(page, { photoId: "0130", fromFrameId: "0320", toFrameId: "0130" })).toBe(true);

  // It moved rather than being copied: the old frame is empty again.
  expect(await readPlacement(page, "0320")).toBeNull();
  expect((await readPlacement(page, "0130")).isCorrect).toBe(true);
});

// Deliberately NOT one of the two earliest frames. The envelope window docks
// bottom-left over that corner of the board, and pan clamping cannot push
// `0100` or `0130` out from under it — they are already at the left edge of the
// scene — so a press on either lands on the window and no drag ever starts.
// Every other frame focuses clear of it. See the note in
// docs/progress-timeline-event-system.md.
const FRAME_CLEAR_OF_ENVELOPE_WINDOW = "0140";

test("a photograph can be dragged out of a frame back into the envelope", async ({ page }) => {
  const frameId = FRAME_CLEAR_OF_ENVELOPE_WINDOW;

  await startNewGame(page);
  await unlockPhotos(page, [frameId]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  await place(page, frameId, frameId);
  expect(await envelopePhotoIds(page)).not.toContain(frameId);

  expect(await dragPhoto(page, { photoId: frameId, fromFrameId: frameId, toEnvelope: true })).toBe(true);

  expect(await readPlacement(page, frameId)).toBeNull();
  expect(await envelopePhotoIds(page)).toContain(frameId);
});

test("dropping onto an occupied frame displaces the photograph that was there", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, [...UNLOCK_40002_FRAMES]);
  await openNoticeboard(page);

  await place(page, "0250", "0360");
  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters("0250"));

  const result = await place(page, "0250", "0250");
  expect(result.isCorrect).toBe(true);
  expect(result.displacedPhotoId).toBe("0360");

  // The displaced photograph goes back to the pool rather than vanishing.
  expect(await envelopePhotoIds(page)).toEqual(sortedWithStarters("0360"));
});

test("four correct placements lock together, consecutive or not", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, lockSet);
  await openNoticeboard(page);

  // Deliberately scattered across the board — the rule is four correct, not
  // four adjacent.
  await place(page, "0130", "0130");
  await place(page, "0320", "0320");
  const beforeLock = await place(page, "0270", "0270");
  expect(beforeLock.lockedFrameIds).toEqual([]);
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getLockedProgressTimeLineFrameIds()
  )).toEqual([]);

  const atLock = await place(page, "0100", "0100");
  expect(atLock.lockedFrameIds).toEqual(["0100", "0130", "0270", "0320"]);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getLockedProgressTimeLineFrameIds()
  )).toEqual(["0100", "0130", "0270", "0320"]);

  await expect(frame(page, "0130")).toHaveClass(/is-locked/);
  await expect(frame(page, "0130")).toHaveAttribute("data-placement-locked", "true");
});

test("a frame's tooltip carries the event description once locked, and not before", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, lockSet);
  await openNoticeboard(page);

  const description = progressTimeLineEventDefinitions
    .find((definition) => definition.progressTimeLineEventId === "0130").description.en;

  // Empty frame: no tooltip.
  expect(await frame(page, "0130").getAttribute("title")).toBeNull();

  // Correctly placed but not yet locked: still no tooltip — the puzzle for
  // this frame is not settled until the whole batch locks.
  await place(page, "0130", "0130");
  expect(await frame(page, "0130").getAttribute("title")).toBeNull();

  // The fourth correct placement locks the batch.
  await place(page, "0320", "0320");
  await place(page, "0270", "0270");
  await place(page, "0100", "0100");
  await expect(frame(page, "0130")).toHaveClass(/is-locked/);

  // Now, and only now, the tooltip carries the description.
  await expect(frame(page, "0130")).toHaveAttribute("title", description);

  // Permanent: still there after a full save/reload cycle re-renders the
  // board from scratch, not just as a leftover from the moment it locked.
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await openNoticeboard(page);
  await expect(frame(page, "0130")).toHaveAttribute("title", description);
});

// ---------------------------------------------------------------------------
// The player's note above each frame.
// ---------------------------------------------------------------------------

test("a note typed above a frame is saved, shown as the photograph's tooltip, and survives a reload", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);

  await expect(noteInput(page, "0130")).toHaveValue("");
  // Nothing written yet, so the photograph carries no tooltip.
  expect(await frameSlot(page, "0130").getAttribute("title")).toBeNull();

  await typeNote(page, "0130", "mine closure? check against 1851");

  await expect(noteInput(page, "0130")).toHaveValue("mine closure? check against 1851");
  expect(await readNote(page, "0130")).toBe("mine closure? check against 1851");

  // Hovering the photograph reports the note back.
  await expect(frameSlot(page, "0130"))
    .toHaveAttribute("title", "mine closure? check against 1851");

  // The sticky save flushes on beforeunload, so a plain refresh is the whole
  // save-and-reload cycle a player would experience.
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await openNoticeboard(page);

  await expect(noteInput(page, "0130")).toHaveValue("mine closure? check against 1851");
  await expect(frameSlot(page, "0130"))
    .toHaveAttribute("title", "mine closure? check against 1851");
});

test("the cross beside a note empties it, and the photograph's tooltip with it", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);

  await typeNote(page, "0130", "scratch that");
  expect(await readNote(page, "0130")).toBe("scratch that");

  await noteClearButton(page, "0130").click();

  await expect(noteInput(page, "0130")).toHaveValue("");
  expect(await readNote(page, "0130")).toBe("");
  expect(await frameSlot(page, "0130").getAttribute("title")).toBeNull();
});

// The board pans from a pointerdown anywhere in the viewport, so this is the
// bug that would otherwise be invisible to anything but a real mouse: pressing
// in the field and dragging across it to select text would haul the whole
// corkboard around instead of selecting.
//
// The drag must go LEFT. Pan is clamped to a maximum of 0 (clampPan() in
// game.js) and focusing a frame this early in the timeline leaves it already at
// that limit, so a rightward drag is clamped to nothing and would pass whether
// or not the guard exists — which is exactly how the first version of this test
// passed against a removed guard.
const NOTE_DRAG_DISTANCE = 150;

test("using the note field does not drag the board underneath it", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await focusFrame(page, "0130");

  const before = await frame(page, "0130").boundingBox();

  const input = await noteInput(page, "0130").boundingBox();
  const startX = input.x + input.width - 5;
  const y = input.y + input.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - NOTE_DRAG_DISTANCE, y, { steps: 6 });
  await page.mouse.up();

  const after = await frame(page, "0130").boundingBox();
  expect(Math.round(after.x)).toBe(Math.round(before.x));
  expect(Math.round(after.y)).toBe(Math.round(before.y));
});

// The counterpart to the test above, and what proves it is testing anything at
// all: the same leftward drag started on the frame's own body — which has no
// guard — does move the board.
test("the same drag started on the frame body does pan the board", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await focusFrame(page, "0130");

  const before = await frame(page, "0130").boundingBox();

  const date = await frame(page, "0130").locator(".progress-timeline-frame-date").boundingBox();
  const startX = date.x + date.width - 5;
  const y = date.y + date.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - NOTE_DRAG_DISTANCE, y, { steps: 6 });
  await page.mouse.up();

  const after = await frame(page, "0130").boundingBox();
  expect(Math.round(after.x)).toBe(Math.round(before.x) - NOTE_DRAG_DISTANCE);
});

test("locking a frame removes its note field and cross, clears the note, and keeps the space", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, lockSet);
  await openNoticeboard(page);

  await typeNote(page, "0130", "my working note");
  expect(await readNote(page, "0130")).toBe("my working note");

  const noteRowHeightBefore = (await noteRow(page, "0130").boundingBox()).height;
  expect(noteRowHeightBefore).toBeGreaterThan(0);

  for (const frameId of lockSet) {
    await place(page, frameId, frameId);
  }
  await expect(frame(page, "0130")).toHaveClass(/is-locked/);

  // The field and its cross are gone — there is nothing left to annotate.
  await expect(noteInput(page, "0130")).toHaveCount(0);
  await expect(noteClearButton(page, "0130")).toHaveCount(0);

  // ...and the note itself is cleared rather than left in the save as text the
  // player can no longer reach.
  expect(await readNote(page, "0130")).toBe("");

  // The row keeps exactly the space it had, so the frame does not shrink and
  // reflow the board around it.
  expect((await noteRow(page, "0130").boundingBox()).height).toBe(noteRowHeightBefore);

  // The note tooltip hands over to the event description, which is only safe to
  // show now the puzzle for this frame is settled.
  const description = progressTimeLineEventDefinitions
    .find((definition) => definition.progressTimeLineEventId === "0130").description.en;
  await expect(frame(page, "0130")).toHaveAttribute("title", description);
  expect(await frameSlot(page, "0130").getAttribute("title")).toBeNull();
});

test("a locked frame's note stays cleared across a save and reload", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, lockSet);
  await openNoticeboard(page);

  await typeNote(page, "0130", "note that will not survive locking");
  for (const frameId of lockSet) {
    await place(page, frameId, frameId);
  }
  expect(await readNote(page, "0130")).toBe("");

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await openNoticeboard(page);

  expect(await readNote(page, "0130")).toBe("");
  await expect(noteInput(page, "0130")).toHaveCount(0);
});

test("a locked frame cannot be emptied, replaced, or dragged out of", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, [...lockSet, "0220"]);
  await openNoticeboard(page);

  for (const frameId of lockSet) {
    await place(page, frameId, frameId);
  }
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.isProgressTimeLineFrameLocked("0130")
  )).toBe(true);

  // No cross button on a settled frame.
  await expect(frame(page, "0130").locator(".progress-timeline-frame-remove")).toHaveCount(0);

  // It refuses a new photograph, refuses to be emptied, and will not give up
  // the one it holds.
  expect(await place(page, "0130", "0220")).toBeNull();
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.returnProgressTimeLinePhotoToEnvelope("0130")
  )).toBe(false);
  expect(await place(page, "0220", "0130")).toBeNull();

  expect((await readPlacement(page, "0130")).progressTimeLinePhotoId).toBe("0130");
});

// Whichever registered, developer-enabled event currently has no PNG on disk
// — normal while the art is still being drawn, but which id that is changes
// as artwork gets filled in, so it is found live rather than hardcoded (see
// tests/e2e/progress-evidence/README.md's rule against restating an
// authoring decision that changes freely).
const IMAGE_DIRECTORY = path.join(__dirname, "..", "..", "..", "assets", "progressEvidenceImages");
const idWithoutArtwork = enabledDefinitions.find(
  (definition) => !fs.existsSync(path.join(IMAGE_DIRECTORY, `${definition.progressTimeLineEventId}.png`))
)?.progressTimeLineEventId;

test("a photograph with no artwork falls back to its id and filename in the envelope and the frame", async ({ page }) => {
  test.skip(!idWithoutArtwork, "every registered event currently has artwork");

  await startNewGame(page);
  await unlockPhotos(page, [idWithoutArtwork]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = page.locator(`.progress-evidence-card[data-progress-time-line-photo-id="${idWithoutArtwork}"]`).first();
  await expect(card.locator(".progress-evidence-placeholder-id")).toHaveText(idWithoutArtwork);
  await expect(card.locator(".progress-evidence-placeholder-filename")).toHaveText(`${idWithoutArtwork}.png`);

  await place(page, idWithoutArtwork, idWithoutArtwork);

  const slot = frame(page, idWithoutArtwork).locator(".progress-timeline-frame-slot");
  await expect(slot.locator(".progress-evidence-placeholder-id")).toHaveText(idWithoutArtwork);
  await expect(slot.locator(".progress-evidence-placeholder-filename")).toHaveText(`${idWithoutArtwork}.png`);
});

test("a photograph whose artwork exists renders that image", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.resolveProgressTimeLineEventImagePath("0130")
  )).toBe("./assets/progressEvidenceImages/0130.png");

  await place(page, "0130", "0130");

  const image = frame(page, "0130").locator(".progress-timeline-frame-slot .progress-evidence-card-image");
  await expect(image).toHaveCount(1);
  expect(await image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
});

test("the save string preserves placements and locks, and loading restores them", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, [...lockSet, "0220"]);

  for (const frameId of lockSet) {
    await place(page, frameId, frameId);
  }
  await place(page, "0250", "0220");

  const saveString = await captureSaveStringViaMenu(page);

  // Diverge from the save so a successful load is unambiguous.
  await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.returnProgressTimeLinePhotoToEnvelope("0250")
  );
  expect(await readPlacement(page, "0250")).toBeNull();

  await loadSaveStringViaMenu(page, saveString);

  expect(await readPlacement(page, "0250")).toEqual({
    progressTimeLinePhotoId: "0220",
    isCorrect: false,
    isLocked: false,
  });
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getLockedProgressTimeLineFrameIds()
  )).toEqual(lockSet.slice().sort());
});

test("placements survive a save and page reload cycle and are redrawn", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await place(page, "0130", "0130");

  // The sticky save flushes on beforeunload, so a plain refresh is the whole
  // save-and-reload cycle a player would experience.
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await openNoticeboard(page);

  expect(await readPlacement(page, "0130")).toEqual({
    progressTimeLinePhotoId: "0130",
    isCorrect: true,
    isLocked: false,
  });
  await expect(frame(page, "0130")).toHaveClass(/is-correct/);
});

test("a new game clears placements and locks but leaves the frames in place", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0100"];
  await unlockPhotos(page, lockSet);
  for (const frameId of lockSet) {
    await place(page, frameId, frameId);
  }

  // Escape raises the in-game menu; #newGame is only reachable from there once
  // a game is already running.
  await page.keyboard.press("Escape");
  await clickNewGame(page);
  await openNoticeboard(page);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getProgressTimeLineEventPlacements()
  )).toEqual({});
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getLockedProgressTimeLineFrameIds()
  )).toEqual([]);
  // Back to the starter baseline — New Game clears player progress, and
  // unlocking those four milestones was player progress.
  expect(await envelopePhotoIds(page)).toEqual(STARTER_PHOTO_IDS);

  // The frames are content, not progress — they survive.
  await expect(frames(page)).toHaveCount(enabledDefinitions.length);
});

// ---------------------------------------------------------------------------
// The snaking layout: earliest bottom-left, running right, then climbing and
// running back left, with arrows following that path up to the oversized
// question-mark frame at the top.
// ---------------------------------------------------------------------------

// The first and last frame of each row, read from the live enabled set rather
// than hardcoded: which events are enabled is an authoring decision that
// changes freely, and gaps in the id sequence (a retired or not-yet-placed
// event) shift row boundaries just as much as the count does. Chunking the
// same chronological order the board itself renders in is what keeps these
// honest.
const ROWS_OF_SIX = enabledDefinitions.reduce((rows, definition, index) => {
  if (index % 6 === 0) {
    rows.push([]);
  }
  rows[rows.length - 1].push(definition.progressTimeLineEventId);
  return rows;
}, []);
const ROW0_FIRST = ROWS_OF_SIX[0][0];
const ROW0_LAST = ROWS_OF_SIX[0][ROWS_OF_SIX[0].length - 1];
const ROW1_FIRST = ROWS_OF_SIX[1][0];
const ROW1_LAST = ROWS_OF_SIX[1][ROWS_OF_SIX[1].length - 1];

async function frameBox(page, frameId) {
  return frame(page, frameId).boundingBox();
}

test("every timeline event is on the board, none held back", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  // Every registered event is currently released, so the board is the whole
  // timeline — not a fixed count, since which events exist and which are
  // enabled both change as the timeline is authored.
  expect(enabledDefinitions).toHaveLength(progressTimeLineEventDefinitions.length);
  await expect(frames(page)).toHaveCount(progressTimeLineEventDefinitions.length);
});

test("rows hold six frames and are centred on the board", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const rows = page.locator("#progressTimeLineBoard .progress-timeline-row");
  await expect(rows.nth(0).locator(".progress-timeline-frame")).toHaveCount(6);

  const board = await page.locator("#progressTimeLineBoard").boundingBox();
  const row = await rows.nth(0).boundingBox();
  expect(Math.abs((row.x + row.width / 2) - (board.x + board.width / 2))).toBeLessThan(4);
});

test("the timeline snakes: earliest bottom-left, running right, then climbing and running back left", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const row0First = await frameBox(page, ROW0_FIRST);
  const row0Last = await frameBox(page, ROW0_LAST);
  const row1First = await frameBox(page, ROW1_FIRST);
  const row1Last = await frameBox(page, ROW1_LAST);

  // Bottom row runs left to right.
  expect(row0First.x).toBeLessThan(row0Last.x);
  expect(Math.abs(row0First.y - row0Last.y)).toBeLessThan(2);

  // The row above sits higher up the board (smaller y).
  expect(row1First.y).toBeLessThan(row0First.y);

  // ...and runs the other way: its first frame is on the RIGHT, continuing from
  // where the row below ended, and it travels back towards the left.
  expect(row1First.x).toBeGreaterThan(row1Last.x);
  expect(Math.abs(row1First.y - row1Last.y)).toBeLessThan(2);

  // The turn happens exactly where the previous row finished: the two frames
  // share a column. They line up to the pixel because the turn arrow is no
  // longer a flex item of the row — it hangs above its frame instead — so
  // nothing displaces the frames along the row.
  expect(Math.abs(row1First.x - row0Last.x)).toBeLessThan(2);
});

test("arrows trace the path, turning with the snake", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const rows = page.locator("#progressTimeLineBoard .progress-timeline-row");
  // Whatever the current event count is, at six per row.
  await expect(rows).toHaveCount(Math.ceil(progressTimeLineEventDefinitions.length / 6));

  // A full row of six frames has five arrows between them plus one turn arrow
  // climbing to the row above.
  const bottomRowArrows = rows.nth(0).locator(".progress-timeline-arrow");
  await expect(bottomRowArrows).toHaveCount(6);
  await expect(bottomRowArrows.nth(0)).toHaveClass(/is-right/);
  await expect(bottomRowArrows.nth(5)).toHaveClass(/is-up/);

  // The row above runs the other way, so its arrows point the other way.
  const secondRowArrows = rows.nth(1).locator(".progress-timeline-arrow");
  await expect(secondRowArrows.nth(0)).toHaveClass(/is-left/);
  await expect(secondRowArrows.nth(5)).toHaveClass(/is-up/);
});

test("the turn arrow hangs above the frame the row ends on, centred on it and clear of both rows", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const rows = page.locator("#progressTimeLineBoard .progress-timeline-row");
  const row = rows.nth(0);
  const turnArrow = row.locator(".progress-timeline-arrow.is-up");

  // It belongs to a frame, not to the row: that is what keeps it out of the
  // row's flow, so it cannot shift the frames along or widen the row.
  const hostFrame = row.locator(".progress-timeline-frame", {
    has: page.locator(".progress-timeline-arrow.is-up"),
  });
  await expect(hostFrame).toHaveCount(1);

  const arrowBox = await turnArrow.boundingBox();
  const hostBox = await hostFrame.boundingBox();
  const rowAboveBox = await rows.nth(1).boundingBox();

  // Centred on the frame it climbs from.
  expect(Math.abs((arrowBox.x + arrowBox.width / 2) - (hostBox.x + hostBox.width / 2))).toBeLessThan(2);

  // ...and in the gap above it, touching neither its own frame nor the row above.
  expect(arrowBox.y + arrowBox.height).toBeLessThan(hostBox.y);
  expect(arrowBox.y).toBeGreaterThan(rowAboveBox.y + rowAboveBox.height);
});

test("an oversized question-mark frame sits at the top centre, above every dated frame", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const finalFrame = page.locator("#progressTimeLineFinalFrame");
  await expect(finalFrame).toHaveCount(1);
  await expect(finalFrame.locator(".progress-timeline-final-frame-question")).toHaveText("?");

  const finalBox = await finalFrame.boundingBox();
  const ordinaryBox = await frameBox(page, ROW0_FIRST);

  // Four times the width of an ordinary frame.
  expect(finalBox.width).toBeGreaterThan(ordinaryBox.width * 3.5);

  // Above every dated frame on the board.
  const topOfDatedFrames = Math.min(...await frames(page).evaluateAll(
    (elements) => elements.map((element) => element.getBoundingClientRect().top)
  ));
  expect(finalBox.y + finalBox.height).toBeLessThanOrEqual(topOfDatedFrames + 1);

  // Centred across the board rather than sitting at one end.
  const board = await page.locator("#progressTimeLineBoard").boundingBox();
  const finalCentre = finalBox.x + finalBox.width / 2;
  const boardCentre = board.x + board.width / 2;
  expect(Math.abs(finalCentre - boardCentre)).toBeLessThan(4);
});
