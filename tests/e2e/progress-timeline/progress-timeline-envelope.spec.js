// The manila EVIDENCE envelope on the noticeboard, now that it holds the
// draggable timeline photographs rather than progressEvidence cards, and the
// rule that decides what is in it:
//
//   the photograph's frame is progressTimeLineEventDeveloperEnabled  AND
//   the milestone named by unlockedByProgressEvidenceId is activated AND
//   the photograph is not already sitting in a frame
//
// Ported from the progress-evidence envelope-display suite.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  clickNewGame,
  closeProgressEvidenceWindow,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  progressEvidenceEnvelope,
  progressEvidenceWindow,
  startNewGame,
} = require("../../support/game-helpers");

const progressTimeLineEventDefinitions = require("../../../assets/progressTimeLineEvent.json").definitions;

function cardIds(page) {
  return progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => card.dataset.progressTimeLinePhotoId)
  );
}

test("the envelope is pinned to the noticeboard and opens the photograph carousel", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const envelope = progressEvidenceEnvelope(page);
  await expect(envelope).toBeVisible();
  await expect(envelope.locator(".progress-evidence-envelope-label")).toHaveText("EVIDENCE");
  await expect(envelope.locator(".progress-evidence-envelope-photo")).toBeVisible();

  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceWindow(page).locator(".desktop-window-title")).toHaveText("Progress Evidence");
});

test("a photograph with no unlock trigger and no starter flag can never reach the envelope", async ({ page }) => {
  await startNewGame(page);

  // Some events are drawn from the background story and have no page or fax
  // behind them, so nothing can ever reveal their photograph — unless they are
  // also marked availableFromStart, which bypasses the trigger check entirely
  // (see the next test). The frame still renders either way — the date belongs
  // on the timeline — but an untriggered, non-starter photograph never reaches
  // the pool.
  const untriggered = progressTimeLineEventDefinitions.filter(
    (definition) => !String(definition.unlockedByProgressEvidenceId || "").trim()
      && definition.availableFromStart !== true
  );
  expect(untriggered.length).toBeGreaterThan(0);

  await openNoticeboard(page);

  for (const definition of untriggered) {
    expect(await page.evaluate(
      (id) => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked(id),
      definition.progressTimeLineEventId
    )).toBe(false);

    // The frame is on the board even though it can never be filled.
    await expect(page.locator(
      `#progressTimeLineBoard .progress-timeline-frame[data-progress-time-line-event-id="${definition.progressTimeLineEventId}"]`
    )).toHaveCount(1);
  }
});

test("the envelope starts empty when nothing has been activated", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // No timeline event is currently `availableFromStart` (see
  // progressTimeLineEventManager.js), so nothing is in the pool until the
  // player reaches a milestone.
  expect(await page.evaluate(
    (id) => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked(id),
    "0130"
  )).toBe(false);
  await expect(progressEvidenceCards(page)).toHaveCount(0);
  expect(await cardIds(page)).toEqual([]);
});

test("a photograph appears only once its milestone has been reached", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).toEqual([]);

  // 00001 is the Black Pine mine closure article, which reveals the 1851
  // photograph for frame 0130.
  await activateProgressEvidence(page, "00001");

  await expect(progressEvidenceCards(page)).toHaveCount(1);
  expect(await cardIds(page)).toEqual(["0130"]);
});

test("reopening the envelope picks up photographs unlocked while it was closed", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
  expect(await cardIds(page)).toEqual([]);

  await closeProgressEvidenceWindow(page);
  await activateProgressEvidence(page, "00001");
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).toEqual(["0130"]);
});

test("the envelope shows three photographs at once, out of a larger pool", async ({ page }) => {
  await startNewGame(page);

  // 00002 and 40002 are the two pages that each reveal a pair of photographs —
  // 0220, 0390, 0250, 0360.
  await activateProgressEvidence(page, "00002");
  await activateProgressEvidence(page, "40002");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // Four unlocked in total, three on screen, in chronological order.
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  expect(await cardIds(page)).toEqual(["0220", "0250", "0360"]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/4");
});

// Hovering must not hand the player the answer: working out which frame a
// photograph belongs to is the puzzle.
test("photographs and frames carry no tooltip and never name their event", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const description = progressTimeLineEventDefinitions
    .find((definition) => definition.progressTimeLineEventId === "0130").description.en;

  const card = progressEvidenceCards(page).first();
  expect(await card.getAttribute("title")).toBeNull();
  // The accessible name is the bare id, not the description.
  await expect(card).toHaveAttribute("aria-label", "0130");
  expect(await card.getAttribute("aria-label")).not.toBe(description);

  const frame = page.locator(
    '#progressTimeLineBoard .progress-timeline-frame[data-progress-time-line-event-id="0130"]'
  );
  expect(await frame.getAttribute("title")).toBeNull();
  // A frame says only the date it already prints on its face.
  await expect(frame).toHaveAttribute("aria-label", "Jul 1851");
});

// ---------------------------------------------------------------------------
// Moving the envelope around the corkboard.
//
// The envelope is pinned into the noticeboard world, not to the screen, so on a
// board this tall it scrolls out of reach as soon as the player pans up to the
// later rows. Being able to drag it with them is what keeps the photographs
// reachable.
// ---------------------------------------------------------------------------

async function dragEnvelopeBy(page, deltaX, deltaY) {
  const envelope = progressEvidenceEnvelope(page);
  const box = await envelope.boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(startX + (deltaX * step) / 6, startY + (deltaY * step) / 6);
  }
  await page.mouse.up();
}

function readEnvelopePosition(page) {
  return page.evaluate(() => {
    const element = document.getElementById("progressEvidenceEnvelope");
    return { left: element.style.left, top: element.style.top };
  });
}

test("the envelope can be dragged to a new spot on the corkboard", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  // Anchored by CSS to begin with, so it carries no inline position.
  expect(await readEnvelopePosition(page)).toEqual({ left: "", top: "" });

  const before = await progressEvidenceEnvelope(page).boundingBox();
  await dragEnvelopeBy(page, 160, -220);
  const after = await progressEvidenceEnvelope(page).boundingBox();

  expect(after.x).toBeGreaterThan(before.x);
  expect(after.y).toBeLessThan(before.y);

  // It is now positioned explicitly, in world coordinates.
  const position = await readEnvelopePosition(page);
  expect(position.left).not.toBe("");
  expect(position.top).not.toBe("");
});

test("moving the envelope does not also open it, but clicking it still does", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  // A drag is a move, not a click: the window must stay shut.
  await dragEnvelopeBy(page, 140, -160);
  await expect(progressEvidenceWindow(page)).toHaveCount(0);

  // A plain click still opens it.
  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceWindow(page)).toBeVisible();
});

test("where the envelope was left survives a save and reload, and New Game puts it back", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await dragEnvelopeBy(page, 180, -240);

  const moved = await readEnvelopePosition(page);
  expect(moved.left).not.toBe("");

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await openNoticeboard(page);

  expect(await readEnvelopePosition(page)).toEqual(moved);

  // Where the player left it is progress, not content, so New Game returns it
  // to the CSS anchor.
  await page.keyboard.press("Escape");
  await clickNewGame(page);
  await openNoticeboard(page);
  expect(await readEnvelopePosition(page)).toEqual({ left: "", top: "" });
});
