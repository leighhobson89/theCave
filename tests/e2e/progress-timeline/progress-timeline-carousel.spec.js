// The envelope carousel, now that the envelope holds timeline photographs: how
// it fills up before there is anything to navigate, stepping in both directions
// (with the same wraparound the Reports and Photos carousels have), and the
// animated slide + fade that distinguishes it from them — the strip visibly
// moves one card along, rather than the cards swapping instantly.
//
// Up to three photographs all fit on screen, so the navigation only becomes
// usable once a fourth exists.
//
// Ported from the progress-evidence carousel suite when the envelope stopped
// holding progressEvidence cards and started holding the draggable photographs.
//
// Read the starter baseline from the registry rather than hardcoded, per this
// project's own rule against restating an authoring decision that changes
// freely (see tests/e2e/progress-evidence/README.md) — the pool is not
// necessarily empty at the start of a new game. The three fixture ids below
// are each unlocked by a milestone of their own, chosen so their ids already
// sort after every starter (so the pool stays in the simple shape
// [...starters, ...whatever's unlocked] rather than interleaving with them),
// and together with the starter baseline reach the four-item threshold where
// the carousel comes alive.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  progressEvidenceWindow,
  startNewGame,
} = require("../../support/game-helpers");

const progressTimeLineEventDefinitions = require("../../../assets/progressTimeLineEvent.json").definitions;

const STARTER_PHOTO_IDS = progressTimeLineEventDefinitions
  .filter((definition) => definition.availableFromStart === true)
  .map((definition) => definition.progressTimeLineEventId)
  .sort();

// Three photographs, each unlocked by a milestone of its own. Deliberately not
// the two-photographs-from-one-page cases (00002, 40002), because these tests
// need to add exactly one photograph at a time.
const PHOTO_IDS = ["0270", "0280", "0320"];
const UNLOCK_TRIGGERS = ["20007", "30004", "10001"];

function cardIds(page) {
  return progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => card.dataset.progressTimeLinePhotoId)
  );
}

function track(page) {
  return progressEvidenceWindow(page).locator(".progress-evidence-track");
}

// The pool after unlocking the first `unlockedCount` of PHOTO_IDS, folding in
// the starter baseline that is present from the very first moment.
function poolWith(unlockedCount) {
  return [...STARTER_PHOTO_IDS, ...PHOTO_IDS.slice(0, unlockedCount)];
}

// The three-wide visible window starting at `index`, wrapping.
function windowAt(pool, index) {
  return [0, 1, 2].map((offset) => pool[(index + offset + pool.length) % pool.length]);
}

async function openEnvelopeWithFourPhotos(page) {
  await startNewGame(page);

  for (const progressEvidenceId of UNLOCK_TRIGGERS) {
    await activateProgressEvidence(page, progressEvidenceId);
  }

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
}

test("the carousel steps forward and back through the photographs, wrapping at each end", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);
  const pool = poolWith(PHOTO_IDS.length);
  expect(pool).toHaveLength(4);

  const window = progressEvidenceWindow(page);
  const counter = window.locator(".progress-evidence-carousel-counter");
  const previousButton = window.locator(".carousel-nav-prev");
  const nextButton = window.locator(".carousel-nav-next");

  await expect(counter).toHaveText("1/4");
  expect(await cardIds(page)).toEqual(windowAt(pool, 0));
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(counter).toHaveText("2/4");
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 1));

  await nextButton.click();
  await expect(counter).toHaveText("3/4");
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 2));

  // Back the other way.
  await previousButton.click();
  await expect(counter).toHaveText("2/4");
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 1));

  await previousButton.click();
  await expect(counter).toHaveText("1/4");
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 0));

  // ...and past the start, so the index wraps to the end.
  await previousButton.click();
  await expect(counter).toHaveText("4/4");
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 3));
});

// Clicks a nav button and watches the whole step from inside the page,
// reporting what each card did. Sampling from the test process instead would
// race the 320ms transition: a round trip can outlast the animation, and a
// single timed sample can land before the browser has started it when the
// machine is busy. Extremes over the whole movement do not race anything.
async function stepAndSampleTransition(page, navButtonClass) {
  return progressEvidenceWindow(page).evaluate(async (windowElement, buttonClass) => {
    const readTranslateX = (element) => {
      const matrix = /matrix\(([^)]+)\)/.exec(window.getComputedStyle(element).transform);
      return matrix ? Number(matrix[1].split(",")[4]) : 0;
    };
    const readOpacity = (element) => Number(window.getComputedStyle(element).opacity);

    windowElement.querySelector(buttonClass).click();

    // The stepping strip is built synchronously by the click handler, so it is
    // already in place here — one card wider than the settled strip.
    const trackElement = windowElement.querySelector(".progress-evidence-track");
    const cards = Array.from(trackElement.querySelectorAll(".progress-evidence-card"));
    const isNext = trackElement.classList.contains("is-stepping-next");

    const leavingCard = isNext ? cards[0] : cards[cards.length - 1];
    const enteringCard = isNext ? cards[cards.length - 1] : cards[0];
    const stationaryCards = cards.filter((card) => card !== leavingCard && card !== enteringCard);

    const steppingClasses = trackElement.className;
    const steppingCardIds = cards.map((card) => card.dataset.progressTimeLinePhotoId);
    const startTranslateX = readTranslateX(trackElement);

    let leavingMinimumOpacity = 1;
    let enteringMaximumOpacity = 0;
    let stationaryMinimumOpacity = 1;
    let endTranslateX = startTranslateX;

    const deadline = performance.now() + 2000;
    while (trackElement.isConnected && performance.now() < deadline) {
      leavingMinimumOpacity = Math.min(leavingMinimumOpacity, readOpacity(leavingCard));
      enteringMaximumOpacity = Math.max(enteringMaximumOpacity, readOpacity(enteringCard));
      stationaryCards.forEach((card) => {
        stationaryMinimumOpacity = Math.min(stationaryMinimumOpacity, readOpacity(card));
      });
      endTranslateX = readTranslateX(trackElement);

      await new Promise((resolve) => { window.requestAnimationFrame(resolve); });
    }

    return {
      steppingClasses,
      steppingCardIds,
      leavingCardId: leavingCard.dataset.progressTimeLinePhotoId,
      enteringCardId: enteringCard.dataset.progressTimeLinePhotoId,
      leavingMinimumOpacity,
      enteringMaximumOpacity,
      stationaryMinimumOpacity,
      translateXDelta: endTranslateX - startTranslateX,
    };
  }, navButtonClass);
}

test("stepping next moves the strip along by one card, not by all three", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);
  const pool = poolWith(PHOTO_IDS.length);

  const transition = await stepAndSampleTransition(page, ".carousel-nav-next");

  // Four cards during the step: the one leaving, the two shuffling along, and
  // the one arriving — regardless of how much bigger the whole pool is.
  expect(transition.steppingClasses).toContain("is-stepping-next");
  expect(transition.steppingCardIds).toEqual([pool[0], pool[1], pool[2], pool[3]]);
  expect(transition.leavingCardId).toBe(pool[0]);
  expect(transition.enteringCardId).toBe(pool[3]);

  // The strip travels left, by one card slot rather than the whole strip.
  expect(transition.translateXDelta).toBeLessThan(0);

  // Only the two end cards change opacity; the pair shuffling across stays
  // fully visible throughout, which is what makes it read as a shuffle.
  expect(transition.leavingMinimumOpacity).toBeLessThan(1);
  expect(transition.enteringMaximumOpacity).toBeGreaterThan(0);
  expect(transition.stationaryMinimumOpacity).toBe(1);

  // Settled: three cards again, shifted along by exactly one.
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 1));
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  await expect(track(page)).not.toHaveClass(/is-stepping/);
});

test("stepping previous moves the strip the other way, again by one card", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);
  const pool = poolWith(PHOTO_IDS.length);
  const wrappedIndex = pool.length - 1;

  const transition = await stepAndSampleTransition(page, ".carousel-nav-prev");

  // The mirror image: the arriving (wrapped-to-the-end) card is prepended and
  // the last of the old window leaves.
  expect(transition.steppingClasses).toContain("is-stepping-prev");
  expect(transition.steppingCardIds).toEqual([pool[wrappedIndex], pool[0], pool[1], pool[2]]);
  expect(transition.leavingCardId).toBe(pool[2]);
  expect(transition.enteringCardId).toBe(pool[wrappedIndex]);

  expect(transition.translateXDelta).toBeGreaterThan(0);
  expect(transition.leavingMinimumOpacity).toBeLessThan(1);
  expect(transition.enteringMaximumOpacity).toBeGreaterThan(0);
  expect(transition.stationaryMinimumOpacity).toBe(1);

  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, wrappedIndex));
  await expect(progressEvidenceCards(page)).toHaveCount(3);
});

test("the two cards that stay on screen keep their places rather than being replaced", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);
  const pool = poolWith(PHOTO_IDS.length);
  expect(await cardIds(page)).toEqual(windowAt(pool, 0));

  const slotsBefore = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  await progressEvidenceWindow(page).locator(".carousel-nav-next").click();
  await expect.poll(() => cardIds(page)).toEqual(windowAt(pool, 1));

  const slotsAfter = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  // The two cards that were already visible have each moved one slot to the
  // left: the position the second card now occupies is the one the first held,
  // and the third sits where the second was.
  expect(slotsAfter).toEqual(slotsBefore);
});

test("the carousel starts holding just the starter baseline, and stays disabled until a fourth photograph unlocks", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const previousButton = progressEvidenceWindow(page).locator(".carousel-nav-prev");
  const nextButton = progressEvidenceWindow(page).locator(".carousel-nav-next");
  const counter = progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter");

  // Nothing has been unlocked yet, so the pool is just whatever the starter
  // baseline already contributes.
  expect(await cardIds(page)).toEqual(poolWith(0));

  // Unlocking two of the three fixtures exactly fills the visible strip
  // (starter baseline + 2) — both nav buttons stay disabled at 0, 1, 2 and 3
  // items alike.
  for (const progressEvidenceId of UNLOCK_TRIGGERS.slice(0, 2)) {
    await activateProgressEvidence(page, progressEvidenceId);
  }
  await expect(progressEvidenceCards(page)).toHaveCount(poolWith(2).length);
  expect(await cardIds(page)).toEqual(poolWith(2));
  await expect(counter).toHaveText(`1/${poolWith(2).length}`);
  await expect(previousButton).toBeDisabled();
  await expect(nextButton).toBeDisabled();

  // The one that crosses the pool into a fourth item is the one that cannot
  // fit, so the carousel comes alive.
  await activateProgressEvidence(page, UNLOCK_TRIGGERS[2]);

  await expect(progressEvidenceCards(page)).toHaveCount(3);
  expect(await cardIds(page)).toEqual(poolWith(2));
  await expect(counter).toHaveText(`1/${poolWith(3).length}`);
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();
});

test("unlocked photographs fill the strip from the left, and a fourth does not disturb them", async ({ page }) => {
  await startNewGame(page);

  for (const progressEvidenceId of UNLOCK_TRIGGERS.slice(0, 2)) {
    await activateProgressEvidence(page, progressEvidenceId);
  }

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // Left-aligned and evenly spaced, not centred in the window.
  const slotsBefore = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );
  expect(slotsBefore[0]).toBeLessThan(slotsBefore[1]);
  expect(slotsBefore[1]).toBeLessThan(slotsBefore[2]);

  // Unlocking a fourth (off-screen until the player navigates) leaves the
  // three on-screen photographs exactly where they were.
  await activateProgressEvidence(page, UNLOCK_TRIGGERS[2]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter"))
    .toHaveText(`1/${poolWith(3).length}`);

  const slotsAfter = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );
  expect(slotsAfter).toEqual(slotsBefore);
  expect(await cardIds(page)).toEqual(poolWith(2));
});

test("placing a photograph in a frame removes it from the carousel", async ({ page }) => {
  await startNewGame(page);
  // All three fixture photographs unlocked, crossing the enabled/disabled
  // boundary exercised in the test above.
  for (const progressEvidenceId of UNLOCK_TRIGGERS) {
    await activateProgressEvidence(page, progressEvidenceId);
  }
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const fullPool = poolWith(PHOTO_IDS.length);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter"))
    .toHaveText(`1/${fullPool.length}`);
  await expect(progressEvidenceWindow(page).locator(".carousel-nav-next")).toBeEnabled();

  await page.evaluate(
    (photoId) => window.progressTimeLineEventDeveloperTools.placePhotoOnProgressTimeLineFrame(photoId, photoId),
    PHOTO_IDS[0]
  );

  // Back down to three, so the carousel goes quiet again.
  const withoutFirst = fullPool.filter((id) => id !== PHOTO_IDS[0]);
  await expect.poll(() => cardIds(page)).toEqual(withoutFirst);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter"))
    .toHaveText(`1/${withoutFirst.length}`);
  await expect(progressEvidenceWindow(page).locator(".carousel-nav-next")).toBeDisabled();
});
