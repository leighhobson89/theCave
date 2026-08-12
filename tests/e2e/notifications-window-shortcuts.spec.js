// Notification toasts as shortcuts to the desk object they are about
// (facsimile, reports, photos), including closing the full-screen computer
// first, keyboard reachability, and never covering a window's close button.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  openNetscape,
  openZoomSearch,
  openFacsimile,
  facsimileWindow,
  notification,
  queueFacsimileReport,
  visitBrowserUrl,
} = require("../support/game-helpers");

test("facsimile notification opens the facsimile window and runs the normal opened flow", async ({ page }) => {
  await startNewGame(page);
  await queueFacsimileReport(page);

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveClass(/is-actionable/);
  await toast.click();

  const facsimile = facsimileWindow(page);
  await expect(facsimile).toBeVisible();

  // Opening then closing is what commits a read fax to evidence; the shortcut
  // must go through that same path, not a side door.
  await facsimile.locator(".story-window-close").click();
  await expect(facsimile).toBeHidden();

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
  await expect(facsimileWindow(page)).toBeVisible();
});

test("report notification closes the computer and opens the reports folder", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  // Opening the Fairchild listing awards a Report evidence -> report toast.
  await openZoomSearch(page);
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
  await openZoomSearch(page);
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

  await expect(facsimileWindow(page)).toHaveCount(1);
  await expect(page.locator(".game-notification")).toHaveCount(0);
});

test("a notification for an already-open window surfaces it rather than closing it", async ({ page }) => {
  await startNewGame(page);

  // Open the facsimile by hand first.
  await openFacsimile(page);
  await expect(facsimileWindow(page)).toBeVisible();

  await queueFacsimileReport(page);
  const toast = notification(page);
  await expect(toast).toBeVisible();
  await toast.click();

  // Still exactly one, still open -- the notification must not toggle it shut.
  await expect(facsimileWindow(page)).toHaveCount(1);
  await expect(facsimileWindow(page)).toBeVisible();
});

test("notifications are reachable by keyboard", async ({ page }) => {
  await startNewGame(page);
  await queueFacsimileReport(page);

  const toast = notification(page);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("role", "button");
  await toast.focus();
  await page.keyboard.press("Enter");

  await expect(facsimileWindow(page)).toBeVisible();
});

test("clickable notifications never cover window close buttons", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);

  // The honey dew page awards two photos and fires a fax, so several toasts
  // stack up at once -- the worst case for overlap.
  await visitBrowserUrl(page, "http://honeydewcavingclub.com");
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
