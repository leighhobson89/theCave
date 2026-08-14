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

// Read from the registry rather than hardcoded, per this project's own rule
// against restating an authoring decision that changes freely — the envelope
// is not necessarily empty at the start of a new game; whatever is currently
// `availableFromStart` is already there.
const STARTER_PHOTO_IDS = progressTimeLineEventDefinitions
  .filter((definition) => definition.availableFromStart === true)
  .map((definition) => definition.progressTimeLineEventId)
  .sort();

function sortedWithStarters(...ids) {
  return [...STARTER_PHOTO_IDS, ...ids].sort();
}

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

// The camera and the envelope's resting place are a pair: the envelope sits low
// on the right of a board several screens tall, and is only reachable because
// entering the scene parks the view at the bottom (focusNoticeboardAtBottom in
// game.js). Before that, the pan was inherited from the desk — a much shorter
// world — and the envelope routinely opened off screen, taking the whole
// photograph pool out of reach with it.
test("the noticeboard opens at the bottom of the board, with the envelope in reach", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  const viewport = page.viewportSize();

  // The bottom edge of the scene is sitting on the bottom of the viewport.
  const scene = await page.locator("#noticeboardScene").boundingBox();
  expect(Math.abs((scene.y + scene.height) - viewport.height)).toBeLessThan(2);

  // The whole corkboard is on screen, so no row of the timeline is cut off.
  const corkboard = await page.locator(".noticeboard-corkboard").boundingBox();
  expect(corkboard.x).toBeGreaterThanOrEqual(0);
  expect(corkboard.x + corkboard.width).toBeLessThanOrEqual(viewport.width);

  // ...and the envelope is on screen and usable without panning first. Its
  // right edge can sit outside a narrow viewport (the scene is wider than the
  // board and the view is centred horizontally), so this asserts what actually
  // matters — that the player can see it and click it where it lands.
  const envelope = await progressEvidenceEnvelope(page).boundingBox();
  expect(envelope.y).toBeGreaterThanOrEqual(0);
  expect(envelope.y + envelope.height).toBeLessThanOrEqual(viewport.height);
  const centreX = envelope.x + envelope.width / 2;
  expect(centreX).toBeGreaterThan(0);
  expect(centreX).toBeLessThan(viewport.width);

  // And it opens on a click from there, with no panning first.
  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceWindow(page)).toBeVisible();
});

test("leaving the noticeboard and coming back returns the view to the bottom", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  // Pan far up the board, as a player working the later rows would.
  const scene = page.locator("#noticeboardScene");
  const before = await scene.boundingBox();
  await page.mouse.move(700, 200);
  await page.mouse.down();
  await page.mouse.move(700, 800, { steps: 8 });
  await page.mouse.up();
  expect((await scene.boundingBox()).y).toBeGreaterThan(before.y);

  // Back to the desk and in again.
  await page.locator("#noticeboardButton").click();
  await expect(page.locator("#deskWorld")).not.toHaveClass(/is-scene-hidden/);
  await openNoticeboard(page);

  const viewport = page.viewportSize();
  const after = await scene.boundingBox();
  expect(Math.abs((after.y + after.height) - viewport.height)).toBeLessThan(2);
});

test("a photograph with no unlock trigger and no starter flag can never reach the envelope", async ({ page }) => {
  await startNewGame(page);

  // Some events are drawn from the background story and have no page or fax
  // behind them, so nothing can ever reveal their photograph — unless they are
  // also marked availableFromStart, which bypasses the trigger check entirely.
  // The frame still renders either way — the date belongs on the timeline —
  // but an untriggered, non-starter photograph never reaches the pool. This
  // is an authoring fact that can change (every current gap could be given a
  // trigger, or marked a starter), so skip rather than fail if none exist
  // right now — the behaviour this guards is in isProgressTimeLinePhotoUnlocked()
  // and does not need live content to prove it.
  const untriggered = progressTimeLineEventDefinitions.filter(
    (definition) => !String(definition.unlockedByProgressEvidenceId || "").trim()
      && definition.availableFromStart !== true
  );
  test.skip(untriggered.length === 0, "no permanently-gapped event in the current registry");

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

test("nothing beyond the starter baseline is in the envelope until a milestone is reached", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await page.evaluate(
    (id) => window.progressTimeLineEventDeveloperTools.isProgressTimeLinePhotoUnlocked(id),
    "0130"
  )).toBe(false);
  await expect(progressEvidenceCards(page)).toHaveCount(Math.min(3, STARTER_PHOTO_IDS.length));
  expect(await cardIds(page)).toEqual(STARTER_PHOTO_IDS);
});

test("a photograph appears only once its milestone has been reached", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).toEqual(STARTER_PHOTO_IDS);

  // 00001 is the Black Pine mine closure article, which reveals the 1851
  // photograph for frame 0130.
  await activateProgressEvidence(page, "00001");

  expect(await cardIds(page)).toEqual(sortedWithStarters("0130"));
});

test("reopening the envelope picks up photographs unlocked while it was closed", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
  expect(await cardIds(page)).toEqual(STARTER_PHOTO_IDS);

  await closeProgressEvidenceWindow(page);
  await activateProgressEvidence(page, "00001");
  await openProgressEvidenceEnvelope(page);

  expect(await cardIds(page)).toEqual(sortedWithStarters("0130"));
});

test("the envelope shows three photographs at once, out of a larger pool", async ({ page }) => {
  await startNewGame(page);

  // 00002 reveals one photograph (0220); 40002 reveals a pair (0250, 0360) —
  // three in total, plus whatever the starter baseline already contributes.
  await activateProgressEvidence(page, "00002");
  await activateProgressEvidence(page, "40002");

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const pool = sortedWithStarters("0220", "0250", "0360");
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  expect(await cardIds(page)).toEqual(pool.slice(0, 3));
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter"))
    .toHaveText(`1/${pool.length}`);
});

test("an envelope card is just the photograph, with no id printed under it", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, "00001");
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const card = progressEvidenceCards(page).first();

  // Nothing is printed on the card any more — the artwork gets the whole of it.
  await expect(card.locator(".progress-evidence-card-label")).toHaveCount(0);
  await expect(card).toHaveText("");

  // The id survives where it does not cost the player any space: as the
  // accessible name and the data attribute the drag code and these tests use.
  await expect(card).toHaveAttribute("aria-label", "0130");
  await expect(card).toHaveAttribute("data-progress-time-line-photo-id", "0130");

  // The image fills the card, less only its even padding.
  const cardBox = await card.boundingBox();
  const imageBox = await card.locator(".progress-evidence-card-image").boundingBox();
  expect(imageBox.height).toBeGreaterThan(cardBox.height * 0.85);
  // No caption strip left at the bottom: the gap under the image matches the
  // gap above it.
  const gapAbove = imageBox.y - cardBox.y;
  const gapBelow = (cardBox.y + cardBox.height) - (imageBox.y + imageBox.height);
  expect(Math.abs(gapBelow - gapAbove)).toBeLessThan(2);
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

// The envelope rests on the bottom-RIGHT of the corkboard, which is where the
// noticeboard camera opens, so every drag below goes left and up — into the
// board. Dragging it further right would push it past the edge of the viewport,
// where its own centre is no longer clickable and the test would be measuring
// that instead of the drag.
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
  await dragEnvelopeBy(page, -160, -220);
  const after = await progressEvidenceEnvelope(page).boundingBox();

  expect(after.x).toBeLessThan(before.x);
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
  await dragEnvelopeBy(page, -140, -160);
  await expect(progressEvidenceWindow(page)).toHaveCount(0);

  // A plain click still opens it.
  await openProgressEvidenceEnvelope(page);
  await expect(progressEvidenceWindow(page)).toBeVisible();
});

test("where the envelope was left survives a save and reload, and New Game puts it back", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await dragEnvelopeBy(page, -180, -240);

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
