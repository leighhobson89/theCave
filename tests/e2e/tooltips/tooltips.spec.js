// The game's hover tooltips (tooltipManager.js).
//
// Everything here drives a real mouse: a tooltip that only appears for a
// synthesized event would prove nothing, because the whole point of this layer
// is that the browser's own pointer machinery reaches it — over elements that
// swallow pointer events, over redrawn boards, over the drag gestures the
// noticeboard uses.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const { clickNewGame, startNewGame, openNoticeboard } = require("../../support/game-helpers");

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

function tooltip(page) {
  return page.locator(".game-tooltip");
}

// Hovers the centre of an element with a real pointer move and waits for the
// tooltip to appear. The move is made in two steps because a single jump can
// land inside the element without the browser generating the intermediate
// pointerover the layer listens for.
async function hover(page, locator) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y - 4);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(tooltip(page)).toBeVisible();
}

async function moveAway(page) {
  await page.mouse.move(2, 2);
}

// The flag buttons live on the title menu, so a language is chosen before the
// game starts rather than switched during it.
async function startNewGameInLanguage(page, buttonId) {
  await page.goto("/");
  await page.locator(`#${buttonId}`).click();
  await clickNewGame(page);
}

test("a titled control shows the game's own tooltip, and suppresses the browser's", async ({ page }) => {
  await startNewGame(page);

  const button = page.locator("#noticeboardButton");
  // Authored as an ordinary title attribute, which is what the layer works off.
  await expect(button).toHaveAttribute("title", localization.en.goToNoticeboardLabel);

  await hover(page, button);
  await expect(tooltip(page)).toHaveText(localization.en.goToNoticeboardLabel);

  // The native tooltip is suppressed the only way it can be: the title is
  // lifted off the element while ours is showing...
  await expect(button).not.toHaveAttribute("title", /.*/);

  // ...and put straight back, so the DOM the rest of the app sees is unchanged.
  await moveAway(page);
  await expect(tooltip(page)).toBeHidden();
  await expect(button).toHaveAttribute("title", localization.en.goToNoticeboardLabel);
});

test("tooltip text is the app's ordinary body size, not the platform's caption size", async ({ page }) => {
  await startNewGame(page);

  await hover(page, page.locator("#noticeboardButton"));

  const bodyFontSize = await page.evaluate(() => getComputedStyle(document.body).fontSize);
  const tooltipFontSize = await tooltip(page).evaluate((el) => getComputedStyle(el).fontSize);
  expect(tooltipFontSize).toBe(bodyFontSize);
  // 16px, i.e. well clear of the ~12px the platform draws its own tooltips at.
  expect(parseFloat(tooltipFontSize)).toBeGreaterThanOrEqual(16);
});

test("a tooltip follows the cursor and is never allowed off the screen", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  // A frame slot rather than one of the small chrome buttons: it is wide and
  // tall enough that the cursor can be walked right across it, which is what
  // makes both halves of this testable.
  const frame = page.locator("#progressTimeLineBoard .progress-timeline-frame").first();
  await frame.locator(".progress-timeline-frame-note-input").click();
  await page.keyboard.type("Seen at the depot");

  const slot = frame.locator(".progress-timeline-frame-slot");
  await hover(page, slot);

  const viewport = page.viewportSize();
  const box = await slot.boundingBox();
  const firstBox = await tooltip(page).boundingBox();

  // Sampled across the element, corners included, so at least one sample sits
  // where an unrepositioned tooltip would hang off an edge.
  const cursorPoints = [
    { x: box.x + box.width - 1, y: box.y + 1 },
    { x: box.x + box.width - 1, y: box.y + box.height - 1 },
    { x: box.x + 1, y: box.y + box.height - 1 },
  ];

  for (const point of cursorPoints) {
    await page.mouse.move(point.x, point.y);
    const tooltipBox = await tooltip(page).boundingBox();
    expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
    expect(tooltipBox.y).toBeGreaterThanOrEqual(0);
    expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
    expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(viewport.height);
  }

  // It tracked the cursor rather than staying where it first appeared.
  const lastBox = await tooltip(page).boundingBox();
  expect(Math.abs(lastBox.x - firstBox.x) + Math.abs(lastBox.y - firstBox.y)).toBeGreaterThan(0);
});

test("a tooltip against the right edge of the window is pushed back on screen", async ({ page }) => {
  await startNewGame(page);

  const viewport = page.viewportSize();
  const button = page.locator("#noticeboardButton");
  await hover(page, button);

  const box = await button.boundingBox();
  // The right-hand end of the control, which on this layout is a handful of
  // pixels from the window edge — no room at all for a tooltip drawn to the
  // right of the cursor, as the default placement would be.
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);

  const tooltipBox = await tooltip(page).boundingBox();
  expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
  expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
  // Placed to the left of the cursor, not merely clipped at the edge.
  expect(tooltipBox.x).toBeLessThan(box.x + box.width);
});

test("a long tooltip wraps to several lines instead of running off the screen", async ({ page }) => {
  await startNewGame(page);
  await openNoticeboard(page);

  // A player's note is the longest text any tooltip in the game can carry:
  // they can type as much as they like.
  const longNote =
    "Arnie was last seen leaving the depot just after eleven, and the watchman swears the gate was chained behind him";
  const frame = page.locator("#progressTimeLineBoard .progress-timeline-frame").first();
  await frame.locator(".progress-timeline-frame-note-input").click();
  await page.keyboard.type(longNote);

  await hover(page, frame.locator(".progress-timeline-frame-slot"));
  await expect(tooltip(page)).toHaveText(longNote);

  const viewport = page.viewportSize();
  const tooltipBox = await tooltip(page).boundingBox();
  const lineHeight = await tooltip(page).evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));

  // Wrapped, not one very long line.
  expect(tooltipBox.height).toBeGreaterThan(lineHeight * 1.5);
  expect(tooltipBox.width).toBeLessThanOrEqual(viewport.width * 0.85);
  expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
  expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
});

for (const language of LANGUAGES) {
  test(`tooltips are localized: the noticeboard toggle reads in ${language.code}`, async ({ page }) => {
    await startNewGameInLanguage(page, language.buttonId);

    await hover(page, page.locator("#noticeboardButton"));
    await expect(tooltip(page)).toHaveText(localization[language.code].goToNoticeboardLabel);
  });

  test(`a note the player typed is shown verbatim in ${language.code}, never translated`, async ({ page }) => {
    await startNewGameInLanguage(page, language.buttonId);
    await openNoticeboard(page);

    const note = "Arnie's brother, ask about the chain";
    const frame = page.locator("#progressTimeLineBoard .progress-timeline-frame").first();
    await frame.locator(".progress-timeline-frame-note-input").click();
    await page.keyboard.type(note);

    await moveAway(page);
    await hover(page, frame.locator(".progress-timeline-frame-slot"));
    await expect(tooltip(page)).toHaveText(note);
  });
}

// The clickable notification that offers to open a desk window: its hint was
// the one tooltip in the game still hardcoded in English.
for (const language of LANGUAGES) {
  test(`an actionable notification's hint tooltip reads in ${language.code}`, async ({ page }) => {
    await startNewGameInLanguage(page, language.buttonId);

    await page.evaluate(() =>
      window.receiveFacsimileReport({
        id: "tooltip-loc-fax",
        title: "TOOLTIP FIXTURE",
        reportText: "Body.",
        description: "Tooltip fixture.",
        evidenceName: "tooltip-loc-fax",
      })
    );

    const actionable = page.locator(".game-notification.is-actionable").first();
    await expect(actionable).toBeVisible();
    await hover(page, actionable);
    await expect(tooltip(page)).toHaveText(localization[language.code].notificationHintOpenFacsimile);
  });
}
