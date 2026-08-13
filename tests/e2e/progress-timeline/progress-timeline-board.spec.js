// The dated frames pinned to the corkboard, the pool of photographs in the
// EVIDENCE envelope, and the drag-and-drop between them.
//
// A photograph is identified by the frame it was drawn for — its id IS a
// progressTimeLineEventId, and so is its artwork filename. The progressEvidence
// id on an event is only the unlock *trigger*, which is why one source can
// legitimately reveal several photographs. See
// docs/progress-timeline-event-system.md.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  captureSaveStringViaMenu,
  clickNewGame,
  loadSaveStringViaMenu,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  startNewGame,
} = require("../../support/game-helpers");

const progressTimeLineEventDefinitions = require("../../../assets/progressTimeLineEvent.json").definitions;

const enabledDefinitions = progressTimeLineEventDefinitions.filter(
  (definition) => definition.progressTimeLineEventDeveloperEnabled === true
);

// Frames whose photographs all come from one milestone, so a single activation
// puts a known set into the envelope.
const UNLOCK_00002_FRAMES = ["0220", "0390"];
const UNLOCK_40002_FRAMES = ["0250", "0360"];

function frames(page) {
  return page.locator("#progressTimeLineBoard .progress-timeline-frame");
}

function frame(page, frameId) {
  return page.locator(
    `#progressTimeLineBoard .progress-timeline-frame[data-progress-time-line-event-id="${frameId}"]`
  );
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
async function dragPhoto(page, { photoId, fromFrameId = "", toFrameId = "", toEnvelope = false, release = true }) {
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

  expect(await envelopePhotoIds(page)).toEqual([]);
  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getProgressTimeLineEventPlacements()
  )).toEqual({});

  await expect(frame(page, "0130")).not.toHaveClass(/is-filled/);
});

// The reason a photograph is identified by its frame and not by the page it
// came from: one page can carry clues about several different dates.
test("one milestone can unlock several photographs, one per frame", async ({ page }) => {
  await startNewGame(page);

  // 00002 is the John Baxley page: it carries both the Aug 1901 search party
  // and his 1928 retirement.
  await activateProgressEvidence(page, "00002");
  await openNoticeboard(page);

  // One activation, two distinct photographs, each named after its own frame.
  expect(await envelopePhotoIds(page)).toEqual(UNLOCK_00002_FRAMES);

  // Each is correct in its own frame, and both can be right at once — which is
  // the whole point of identifying a photograph by frame rather than by source.
  expect((await place(page, "0220", "0220")).isCorrect).toBe(true);
  expect((await place(page, "0390", "0390")).isCorrect).toBe(true);

  // Swapped over, the same two photographs are wrong.
  expect((await place(page, "0390", "0220")).isCorrect).toBe(false);
  expect((await place(page, "0220", "0390")).isCorrect).toBe(false);
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
  expect(await envelopePhotoIds(page)).toEqual(["0130"]);
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
  expect(await envelopePhotoIds(page)).toEqual(["0130"]);
});

test("dragging a photograph from the envelope into its frame records it correct and empties it from the envelope", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await envelopePhotoIds(page)).toEqual(["0130"]);
  expect(await dragPhoto(page, { photoId: "0130", toFrameId: "0130" })).toBe(true);

  expect(await readPlacement(page, "0130")).toEqual({
    progressTimeLinePhotoId: "0130",
    isCorrect: true,
    isLocked: false,
  });

  // Placed photographs leave the pool — there is only one of each.
  expect(await envelopePhotoIds(page)).toEqual([]);

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
  expect(await envelopePhotoIds(page)).toEqual([]);

  await frame(page, "0130").locator(".progress-timeline-frame-remove").click();

  expect(await readPlacement(page, "0130")).toBeNull();
  expect(await envelopePhotoIds(page)).toEqual(["0130"]);
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

test("a photograph can be dragged out of a frame back into the envelope", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  await place(page, "0130", "0130");
  expect(await envelopePhotoIds(page)).toEqual([]);

  expect(await dragPhoto(page, { photoId: "0130", fromFrameId: "0130", toEnvelope: true })).toBe(true);

  expect(await readPlacement(page, "0130")).toBeNull();
  expect(await envelopePhotoIds(page)).toEqual(["0130"]);
});

test("dropping onto an occupied frame displaces the photograph that was there", async ({ page }) => {
  await startNewGame(page);
  await unlockPhotos(page, [...UNLOCK_00002_FRAMES]);
  await openNoticeboard(page);

  await place(page, "0220", "0390");
  expect(await envelopePhotoIds(page)).toEqual(["0220"]);

  const result = await place(page, "0220", "0220");
  expect(result.isCorrect).toBe(true);
  expect(result.displacedPhotoId).toBe("0390");

  // The displaced photograph goes back to the pool rather than vanishing.
  expect(await envelopePhotoIds(page)).toEqual(["0390"]);
});

test("four correct placements lock together, consecutive or not", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0520"];
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

  const atLock = await place(page, "0520", "0520");
  expect(atLock.lockedFrameIds).toEqual(["0130", "0270", "0320", "0520"]);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.getLockedProgressTimeLineFrameIds()
  )).toEqual(["0130", "0270", "0320", "0520"]);

  await expect(frame(page, "0130")).toHaveClass(/is-locked/);
  await expect(frame(page, "0130")).toHaveAttribute("data-placement-locked", "true");
});

test("a locked frame cannot be emptied, replaced, or dragged out of", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0520"];
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

test("a photograph with no artwork falls back to its id and filename in the envelope and the frame", async ({ page }) => {
  await startNewGame(page);
  // 0320 has no PNG in assets/photos/progressTimeLineEventImages yet, which is
  // the normal case while the art is being drawn.
  await unlockPhotos(page, ["0320"]);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = page.locator('.progress-evidence-card[data-progress-time-line-photo-id="0320"]').first();
  await expect(card.locator(".progress-evidence-placeholder-id")).toHaveText("0320");
  await expect(card.locator(".progress-evidence-placeholder-filename")).toHaveText("0320.png");

  await place(page, "0320", "0320");

  const slot = frame(page, "0320").locator(".progress-timeline-frame-slot");
  await expect(slot.locator(".progress-evidence-placeholder-id")).toHaveText("0320");
  await expect(slot.locator(".progress-evidence-placeholder-filename")).toHaveText("0320.png");
});

test("a photograph whose artwork exists renders that image", async ({ page }) => {
  await startNewGame(page);
  // 0130.png is the one piece of art currently in the folder.
  await unlockPhotos(page, ["0130"]);
  await openNoticeboard(page);

  expect(await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.resolveProgressTimeLineEventImagePath("0130")
  )).toBe("./assets/photos/progressTimeLineEventImages/0130.png");

  await place(page, "0130", "0130");

  const image = frame(page, "0130").locator(".progress-timeline-frame-slot .progress-evidence-card-image");
  await expect(image).toHaveCount(1);
  expect(await image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
});

test("the save string preserves placements and locks, and loading restores them", async ({ page }) => {
  await startNewGame(page);
  const lockSet = ["0130", "0320", "0270", "0520"];
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
  const lockSet = ["0130", "0320", "0270", "0520"];
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
  expect(await envelopePhotoIds(page)).toEqual([]);

  // The frames are content, not progress — they survive.
  await expect(frames(page)).toHaveCount(enabledDefinitions.length);
});
