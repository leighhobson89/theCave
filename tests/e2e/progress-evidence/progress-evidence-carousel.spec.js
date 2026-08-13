// The progress evidence carousel: stepping in both directions (with the same
// wraparound the Reports and Photos carousels have), and the animated slide +
// fade that distinguishes it from them — the strip visibly moves and changes
// opacity rather than the cards swapping instantly.
const { test, expect } = require("@playwright/test");
const {
  activateProgressEvidence,
  openNoticeboard,
  openProgressEvidenceEnvelope,
  progressEvidenceCards,
  progressEvidenceWindow,
  setProgressEvidenceDeveloperEnabled,
  startNewGame,
} = require("../../support/game-helpers");

const ELIGIBLE_IDS = ["00001", "00002", "00003", "00004"];

function cardIds(page) {
  return progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => card.dataset.progressEvidenceId)
  );
}

function track(page) {
  return progressEvidenceWindow(page).locator(".progress-evidence-track");
}

async function openEnvelopeWithFourItems(page) {
  await startNewGame(page);

  for (const progressEvidenceId of ELIGIBLE_IDS) {
    await activateProgressEvidence(page, progressEvidenceId);
    await setProgressEvidenceDeveloperEnabled(page, progressEvidenceId, true);
  }

  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);
}

test("the carousel steps forward and back through the collection, wrapping at each end", async ({ page }) => {
  await openEnvelopeWithFourItems(page);

  const window = progressEvidenceWindow(page);
  const counter = window.locator(".progress-evidence-carousel-counter");
  const previousButton = window.locator(".carousel-nav-prev");
  const nextButton = window.locator(".carousel-nav-next");

  await expect(counter).toHaveText("1/4");
  expect(await cardIds(page)).toEqual(["00001", "00002", "00003"]);
  await expect(previousButton).toBeEnabled();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect(counter).toHaveText("2/4");
  await expect.poll(() => cardIds(page)).toEqual(["00002", "00003", "00004"]);

  await nextButton.click();
  await expect(counter).toHaveText("3/4");
  await expect.poll(() => cardIds(page)).toEqual(["00003", "00004", "00001"]);

  // Back the other way, and past the start so the index wraps to the end.
  await previousButton.click();
  await expect(counter).toHaveText("2/4");
  await expect.poll(() => cardIds(page)).toEqual(["00002", "00003", "00004"]);

  await previousButton.click();
  await expect(counter).toHaveText("1/4");
  await expect.poll(() => cardIds(page)).toEqual(["00001", "00002", "00003"]);

  await previousButton.click();
  await expect(counter).toHaveText("4/4");
  await expect.poll(() => cardIds(page)).toEqual(["00004", "00001", "00002"]);
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
    const steppingCardIds = cards.map((card) => card.dataset.progressEvidenceId);
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
      leavingCardId: leavingCard.dataset.progressEvidenceId,
      enteringCardId: enteringCard.dataset.progressEvidenceId,
      leavingMinimumOpacity,
      enteringMaximumOpacity,
      stationaryMinimumOpacity,
      translateXDelta: endTranslateX - startTranslateX,
    };
  }, navButtonClass);
}

test("stepping next moves the strip along by one card, not by all three", async ({ page }) => {
  await openEnvelopeWithFourItems(page);

  const transition = await stepAndSampleTransition(page, ".carousel-nav-next");

  // Four cards during the step: the one leaving, the two shuffling along, and
  // the one arriving.
  expect(transition.steppingClasses).toContain("is-stepping-next");
  expect(transition.steppingCardIds).toEqual(["00001", "00002", "00003", "00004"]);
  expect(transition.leavingCardId).toBe("00001");
  expect(transition.enteringCardId).toBe("00004");

  // The strip travels left, by one card slot rather than the whole strip.
  expect(transition.translateXDelta).toBeLessThan(0);

  // Only the two end cards change opacity; the pair shuffling across stays
  // fully visible throughout, which is what makes it read as a shuffle.
  expect(transition.leavingMinimumOpacity).toBeLessThan(1);
  expect(transition.enteringMaximumOpacity).toBeGreaterThan(0);
  expect(transition.stationaryMinimumOpacity).toBe(1);

  // Settled: three cards again, shifted along by exactly one.
  await expect.poll(() => cardIds(page)).toEqual(["00002", "00003", "00004"]);
  await expect(progressEvidenceCards(page)).toHaveCount(3);
  await expect(track(page)).not.toHaveClass(/is-stepping/);
});

test("stepping previous moves the strip the other way, again by one card", async ({ page }) => {
  await openEnvelopeWithFourItems(page);

  const transition = await stepAndSampleTransition(page, ".carousel-nav-prev");

  // The mirror image: the arriving card is prepended and the last one leaves.
  expect(transition.steppingClasses).toContain("is-stepping-prev");
  expect(transition.steppingCardIds).toEqual(["00004", "00001", "00002", "00003"]);
  expect(transition.leavingCardId).toBe("00003");
  expect(transition.enteringCardId).toBe("00004");

  expect(transition.translateXDelta).toBeGreaterThan(0);
  expect(transition.leavingMinimumOpacity).toBeLessThan(1);
  expect(transition.enteringMaximumOpacity).toBeGreaterThan(0);
  expect(transition.stationaryMinimumOpacity).toBe(1);

  await expect.poll(() => cardIds(page)).toEqual(["00004", "00001", "00002"]);
  await expect(progressEvidenceCards(page)).toHaveCount(3);
});

test("the two cards that stay on screen keep their places rather than being replaced", async ({ page }) => {
  await openEnvelopeWithFourItems(page);
  expect(await cardIds(page)).toEqual(["00001", "00002", "00003"]);

  const slotsBefore = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  await progressEvidenceWindow(page).locator(".carousel-nav-next").click();
  await expect.poll(() => cardIds(page)).toEqual(["00002", "00003", "00004"]);

  const slotsAfter = await progressEvidenceCards(page).evaluateAll(
    (cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left))
  );

  // 00002 and 00003 have each moved one slot to the left: the position 00002
  // now occupies is the one 00001 held, and 00003 sits where 00002 was.
  expect(slotsAfter).toEqual(slotsBefore);
});

test("the carousel navigation is disabled while there is nothing to show", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);
  await openProgressEvidenceEnvelope(page);

  await expect(progressEvidenceWindow(page).locator(".carousel-nav-prev")).toBeDisabled();
  await expect(progressEvidenceWindow(page).locator(".carousel-nav-next")).toBeDisabled();
});
