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
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  progressEvidenceWindow,
  startNewGame,
} = require("../../support/game-helpers");

// Four photographs, each unlocked by a milestone of its own, listed in the
// chronological order the envelope shows them in. Deliberately not the
// two-photographs-from-one-page cases (00002, 40002), because these tests need
// to add exactly one photograph at a time.
const PHOTO_IDS = ["0130", "0270", "0320", "0520"];
const UNLOCK_TRIGGERS = ["00001", "20007", "10001", "10002"];

function cardIds(page) {
  return progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => card.dataset.progressTimeLinePhotoId)
  );
}

function track(page) {
  return progressEvidenceWindow(page).locator(".progress-evidence-track");
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

  const window = progressEvidenceWindow(page);
  const counter = window.locator(".progress-evidence-carousel-counter");
  const previousButton = window.locator(".carousel-nav-prev");
  const nextButton = window.locator(".carousel-nav-next");

  await expect(counter).toHaveText("1/4");
  expect(await cardIds(page)).toEqual(["0130", "0270", "0320"]);
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(counter).toHaveText("2/4");
  await expect.poll(() => cardIds(page)).toEqual(["0270", "0320", "0520"]);

  await nextButton.click();
  await expect(counter).toHaveText("3/4");
  await expect.poll(() => cardIds(page)).toEqual(["0320", "0520", "0130"]);

  // Back the other way, and past the start so the index wraps to the end.
  await previousButton.click();
  await expect(counter).toHaveText("2/4");
  await expect.poll(() => cardIds(page)).toEqual(["0270", "0320", "0520"]);

  await previousButton.click();
  await expect(counter).toHaveText("1/4");
  await expect.poll(() => cardIds(page)).toEqual(["0130", "0270", "0320"]);

  await previousButton.click();
  await expect(counter).toHaveText("4/4");
  await expect.poll(() => cardIds(page)).toEqual(["0520", "0130", "0270"]);
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

  const transition = await stepAndSampleTransition(page, ".carousel-nav-next");

  // Four cards during the step: the one leaving, the two shuffling along, and
  // the one arriving.
  expect(transition.steppingClasses).toContain("is-stepping-next");
  expect(transition.steppingCardIds).toEqual(["0130", "0270", "0320", "0520"]);
  expect(transition.leavingCardId).toBe("0130");
  expect(transition.enteringCardId).toBe("0520");

  // The strip travels left, by one card slot rather than the whole strip.
  expect(transition.translateXDelta).toBeLessThan(0);

  // Only the two end cards change opacity; the pair shuffling across stays
  // fully visible throughout, which is what makes it read as a shuffle.
  expect(transition.leavingMinimumOpacity).toBeLessThan(1);
  expect(transition.enteringMaximumOpacity).toBeGreaterThan(0);
  expect(transition.stationaryMinimumOpacity).toBe(1);

  // Settled: three cards again, shifted along by exactly one.
  await expect.poll(() => cardIds(page)).toEqual(["0270", "0320", "0520"]);
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  await expect(track(page)).not.toHaveClass(/is-stepping/);
});

test("stepping previous moves the strip the other way, again by one card", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);

  const transition = await stepAndSampleTransition(page, ".carousel-nav-prev");

  // The mirror image: the arriving card is prepended and the last one leaves.
  expect(transition.steppingClasses).toContain("is-stepping-prev");
  expect(transition.steppingCardIds).toEqual(["0520", "0130", "0270", "0320"]);
  expect(transition.leavingCardId).toBe("0320");
  expect(transition.enteringCardId).toBe("0520");

  expect(transition.translateXDelta).toBeGreaterThan(0);
  expect(transition.leavingMinimumOpacity).toBeLessThan(1);
  expect(transition.enteringMaximumOpacity).toBeGreaterThan(0);
  expect(transition.stationaryMinimumOpacity).toBe(1);

  await expect.poll(() => cardIds(page)).toEqual(["0520", "0130", "0270"]);
  await expect(progressEvidenceCards(page)).toHaveCount(3);
});

test("the two cards that stay on screen keep their places rather than being replaced", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);
  expect(await cardIds(page)).toEqual(["0130", "0270", "0320"]);

  const slotsBefore = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  await progressEvidenceWindow(page).locator(".carousel-nav-next").click();
  await expect.poll(() => cardIds(page)).toEqual(["0270", "0320", "0520"]);

  const slotsAfter = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  // 0270 and 0320 have each moved one slot to the left: the position 0270 now
  // occupies is the one 0130 held, and 0320 sits where 0270 was.
  expect(slotsAfter).toEqual(slotsBefore);
});

test("the carousel navigation stays disabled until there are more photographs than fit on screen", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  const previousButton = progressEvidenceWindow(page).locator(".carousel-nav-prev");
  const nextButton = progressEvidenceWindow(page).locator(".carousel-nav-next");
  const counter = progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter");

  // Nothing collected yet.
  await expect(progressEvidenceCards(page)).toHaveCount(0);
  await expect(previousButton).toBeDisabled();
  await expect(nextButton).toBeDisabled();

  // One, two, then three: the strip fills up and there is still nothing to
  // navigate to, so both buttons stay disabled the whole way.
  for (const [collected, progressEvidenceId] of UNLOCK_TRIGGERS.slice(0, 3).entries()) {
    await activateProgressEvidence(page, progressEvidenceId);

    await expect(progressEvidenceCards(page)).toHaveCount(collected + 1);
    expect(await cardIds(page)).toEqual(PHOTO_IDS.slice(0, collected + 1));
    await expect(counter).toHaveText(`1/${collected + 1}`);
    await expect(previousButton).toBeDisabled();
    await expect(nextButton).toBeDisabled();
  }

  // The fourth is the one that cannot fit, so the carousel comes alive.
  await activateProgressEvidence(page, UNLOCK_TRIGGERS[3]);

  await expect(progressEvidenceCards(page)).toHaveCount(3);
  await expect(counter).toHaveText("1/4");
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();
});

test("the cards fill the strip from the left as photographs are unlocked", async ({ page }) => {
  await startNewGame(page);
  await activateProgressEvidence(page, UNLOCK_TRIGGERS[0]);

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  // One card sits in the leftmost slot, not centred in the window.
  const slotWithOne = await progressEvidenceCards(page).first().evaluate(
    (card) => Math.round(card.getBoundingClientRect().left)
  );

  await activateProgressEvidence(page, UNLOCK_TRIGGERS[1]);
  await expect(progressEvidenceCards(page)).toHaveCount(2);

  // Unlocking a second leaves the first exactly where it was and puts the new
  // one to its right.
  const slotsWithTwo = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  expect(slotsWithTwo[0]).toBe(slotWithOne);
  expect(slotsWithTwo[1]).toBeGreaterThan(slotsWithTwo[0]);
});

test("placing a photograph in a frame removes it from the carousel", async ({ page }) => {
  await openEnvelopeWithFourPhotos(page);
  await expect(progressEvidenceCards(page)).toHaveCount(3);

  await page.evaluate(
    () => window.progressTimeLineEventDeveloperTools.placePhotoOnProgressTimeLineFrame("0130", "0130")
  );

  // Down to three photographs in the pool, so the carousel goes quiet again.
  await expect.poll(() => cardIds(page)).toEqual(["0270", "0320", "0520"]);
  await expect(progressEvidenceWindow(page).locator(".progress-evidence-carousel-counter")).toHaveText("1/3");
  await expect(progressEvidenceWindow(page).locator(".carousel-nav-next")).toBeDisabled();
});
