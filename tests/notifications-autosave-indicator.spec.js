// Covers clicking a notification as a shortcut to the desk object it is about
// (facsimile, reports, photos -- always closing the full-screen computer first),
// and the autosave indicator driven by the real 60s sticky autosave.
const { test, expect } = require("@playwright/test");

async function clickNewGame(page) {
  await page.locator("#newGame").click();
  const confirmPopup = page.locator("#newGameConfirmPopup");
  if (!(await confirmPopup.evaluate((el) => el.classList.contains("d-none")))) {
    await page.locator("#newGameConfirmAcceptButton").click();
  }
}

async function startNewGame(page) {
  await page.goto("/");
  await clickNewGame(page);
}

async function openNetscape(page) {
  await page.locator("#desktopComputerHotspot").click();
  await page.getByRole("button", { name: "Netscape" }).click();
}

function notification(page) {
  return page.locator(".game-notification").first();
}

async function queueFacsimileReport(page) {
  await page.evaluate(() => window.receiveConfiguredFacsimileReport({
    id: "test-notification-fax",
    source: {
      kind: "report-localized-catalog-entry",
      languageAware: true,
      catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
      entryId: "missingReport",
    },
    storageKey: "reports",
    titleKey: "reports",
    evidenceName: "missingReport",
  }));
}

// ---------------------------------------------------------------------------
// Notification -> window shortcuts
// ---------------------------------------------------------------------------

test("facsimile notification opens the facsimile window and runs the normal opened flow", async ({ page }) => {
  await startNewGame(page);
  await queueFacsimileReport(page);

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveClass(/is-actionable/);
  await toast.click();

  const facsimileWindow = page.locator(".facsimile-window");
  await expect(facsimileWindow).toBeVisible();

  // Opening then closing is what commits a read fax to evidence; the shortcut
  // must go through that same path, not a side door.
  await facsimileWindow.locator(".story-window-close").click();
  await expect(facsimileWindow).toBeHidden();

  await page.locator("#reportsFolder").click();
  await expect(page.locator(".reports-window .report-document-text").first())
    .toContainText("MISSING PERSON INVESTIGATION");
});

test("facsimile notification closes the computer before opening the facsimile", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await expect(page.locator(".computer-window")).toBeVisible();

  await queueFacsimileReport(page);

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await toast.click();

  // Computer gone, facsimile up -- never both.
  await expect(page.locator(".computer-window")).toHaveCount(0);
  await expect(page.locator(".caveos-browser-window")).toHaveCount(0);
  await expect(page.locator(".facsimile-window")).toBeVisible();
});

test("report notification closes the computer and opens the reports folder", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  // Opening the Fairchild listing awards a Report evidence -> report toast.
  await page.getByRole("button", { name: "ZoomSearch" }).click();
  await page.locator("input[aria-label='ZoomSearch query']").fill("fairchild");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator(".browser-results-table tbody tr", { hasText: "J & T Fairchild" }).first().click();

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Report");
  await toast.click();

  await expect(page.locator(".computer-window")).toHaveCount(0);
  await expect(page.locator(".reports-window")).toBeVisible();
  await expect(page.locator(".reports-window .report-document-text").first())
    .toContainText("05-33-22-02-03");
});

test("photo notification closes the computer and opens the photos folder", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  // John Baxley's page awards a Photo evidence -> photo toast.
  await page.getByRole("button", { name: "ZoomSearch" }).click();
  await page.locator("input[aria-label='ZoomSearch query']").fill("john baxley");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator(".browser-results-table tbody tr").first().click();

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Photo");
  await toast.click();

  await expect(page.locator(".computer-window")).toHaveCount(0);
  await expect(page.locator(".photos-window")).toBeVisible();

  // Deliberately identical to opening the folder by hand: the carousel stays on
  // its current index rather than jumping to the new photo. The award did land
  // though -- two starting photos plus the one just earned.
  await expect(page.locator(".photos-window .photos-carousel-counter")).toHaveText("1/3");
});

test("clicking a notification dismisses it and does not double-open its window", async ({ page }) => {
  await startNewGame(page);
  await queueFacsimileReport(page);

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await toast.click();

  await expect(page.locator(".facsimile-window")).toHaveCount(1);
  await expect(page.locator(".game-notification")).toHaveCount(0);
});

test("a notification for an already-open window surfaces it rather than closing it", async ({ page }) => {
  await startNewGame(page);

  // Open the facsimile by hand first.
  await page.locator("#desktopFacsimileHotspot").click();
  await expect(page.locator(".facsimile-window")).toBeVisible();

  await queueFacsimileReport(page);
  const toast = notification(page);
  await expect(toast).toBeVisible();
  await toast.click();

  // Still exactly one, still open -- the notification must not toggle it shut.
  await expect(page.locator(".facsimile-window")).toHaveCount(1);
  await expect(page.locator(".facsimile-window")).toBeVisible();
});

test("notifications are reachable by keyboard", async ({ page }) => {
  await startNewGame(page);
  await queueFacsimileReport(page);

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("role", "button");
  await toast.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".facsimile-window")).toBeVisible();
});

test("clickable notifications never cover window close buttons", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  // The honey dew page awards two photos and fires a fax, so several toasts
  // stack up at once -- the worst case for overlap.
  const browserAddress = page.locator("input[aria-label='Browser address']");
  await browserAddress.fill("http://honeydewcavingclub.com");
  await browserAddress.press("Enter");
  await expect(notification(page)).toBeVisible();

  // Closing a window must not be blocked by a toast sitting on top of its X.
  // (This regressed once: toasts shared the top-right corner with every window
  // close button, and Playwright silently retried the click for 15s.)
  const started = Date.now();
  await page.getByRole("button", { name: "Close Netscape Navigator 3.0 window" }).click();
  await page.getByRole("button", { name: "Close computer window" }).click();
  expect(Date.now() - started).toBeLessThan(5000);
  await expect(page.locator(".computer-window")).toHaveCount(0);

  const overlaps = await page.evaluate(() => {
    const host = document.querySelector(".notification-host").getBoundingClientRect();
    return Array.from(document.querySelectorAll(".story-window-close, .settings-toggle"))
      .map((button) => button.getBoundingClientRect())
      .filter((box) => box.width > 0)
      .some((box) => (
        box.left < host.right && box.right > host.left
        && box.top < host.bottom && box.bottom > host.top
      ));
  });
  expect(overlaps).toBe(false);
});

// ---------------------------------------------------------------------------
// Autosave indicator
// ---------------------------------------------------------------------------

test("the autosave indicator appears on a real autosave and fades away", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  const indicator = page.locator(".autosave-indicator");
  // Not present before any autosave has run.
  await expect(indicator).toHaveCount(0);

  await page.clock.runFor(60_000);
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveClass(/is-visible/);

  // Stays up, then fades out on its own.
  await page.clock.runFor(1_000);
  await expect(indicator).toHaveClass(/is-visible/);

  await page.clock.runFor(2_000);
  await expect(indicator).not.toHaveClass(/is-visible/);
  await expect(indicator).toBeHidden();
});

test("the autosave indicator is a floppy disk with a spinner, bottom-left, above everything", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);
  await page.clock.runFor(60_000);

  const indicator = page.locator(".autosave-indicator");
  await expect(indicator).toBeVisible();

  // Floppy disk drawn as SVG, plus a spinner element that is actually animating.
  await expect(page.locator(".autosave-indicator-disk")).toHaveCount(1);
  await expect(page.locator(".autosave-indicator-disk-shutter")).toHaveCount(1);
  await expect(page.locator(".autosave-indicator-spinner")).toHaveCount(1);

  const info = await page.evaluate(() => {
    const el = document.querySelector(".autosave-indicator");
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const spinner = getComputedStyle(document.querySelector(".autosave-indicator-spinner"));
    const highestOtherZIndex = Math.max(
      ...Array.from(document.querySelectorAll("*"))
        .filter((node) => !node.closest(".autosave-indicator"))
        .map((node) => Number.parseInt(getComputedStyle(node).zIndex, 10))
        .filter((value) => Number.isFinite(value))
    );

    return {
      left: Math.round(box.left),
      bottomGap: Math.round(window.innerHeight - box.bottom),
      zIndex: Number.parseInt(style.zIndex, 10),
      highestOtherZIndex,
      fade: style.transitionDuration,
      spinnerAnimation: spinner.animationName,
      // Anchored to the viewport, not to a game window.
      parentTag: el.parentElement.tagName,
      position: style.position,
    };
  });

  expect(info.left).toBe(40);
  expect(info.bottomGap).toBe(40);
  expect(info.position).toBe("fixed");
  expect(info.parentTag).toBe("BODY");
  expect(info.zIndex).toBeGreaterThan(info.highestOtherZIndex);
  expect(info.fade.startsWith("0.75s")).toBe(true);
  expect(info.spinnerAnimation).toBe("autosave-spin");
});

test("rapid autosaves reuse the single indicator instead of stacking", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  // Several autosave ticks back to back.
  await page.clock.runFor(60_000);
  await expect(page.locator(".autosave-indicator")).toHaveCount(1);

  await page.clock.runFor(60_000);
  await page.clock.runFor(60_000);
  await page.clock.runFor(60_000);

  await expect(page.locator(".autosave-indicator")).toHaveCount(1);
  // Still showing, because each save restarted the visible window.
  await expect(page.locator(".autosave-indicator")).toHaveClass(/is-visible/);
});

test("the autosave indicator shows regardless of which window is open", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  // With the full-screen computer open.
  await page.locator("#desktopComputerHotspot").click();
  await expect(page.locator(".computer-window")).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(page.locator(".autosave-indicator")).toBeVisible();
  await page.clock.runFor(3_000);

  // And from the menu, which hides #gameArea entirely.
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  await page.clock.runFor(60_000);
  await expect(page.locator(".autosave-indicator")).toBeVisible();
});
