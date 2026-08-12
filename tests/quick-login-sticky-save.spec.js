// Covers the quick-login feature, the sticky (autosaved) game in localStorage,
// the Resume-after-refresh flow, the New Game overwrite confirmation, and the
// repositioned Canada Newspaper Archive subscriber login.
const { test, expect } = require("@playwright/test");

const STICKY_KEY = "theCave:sticky-save";

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

async function closeComputer(page) {
  await page.locator(".computer-window > .desktop-window-header .story-window-close").click();
}

async function openPolice(page) {
  await page.getByRole("button", { name: "Police Records" }).click();
}

async function openArchives(page) {
  await page.getByRole("button", { name: "Canada Archives" }).click();
}

async function policeLogin(page, username, password) {
  await page.locator("input[aria-label='Police username']").fill(username);
  await page.locator("input[aria-label='Police password']").fill(password);
  await page.locator(".browser-page-police").getByRole("button", { name: "Login", exact: true }).click();
}

async function archivesLogin(page, username, password) {
  await page.locator("input[aria-label='Archive username']").fill(username);
  await page.locator("input[aria-label='Archive password']").fill(password);
  await page.locator(".browser-page-archives").getByRole("button", { name: "Login", exact: true }).click();
}

function policeStatus(page) {
  return page.locator(".browser-page-police .browser-status-line").first();
}

function archivesStatus(page) {
  return page.locator(".browser-page-archives .browser-status-line").first();
}

function quickLoginButton(page, siteClass) {
  return page.locator(`${siteClass} .browser-button-quick-login`);
}

function quickLoginRow(page, siteClass) {
  return page.locator(`${siteClass} .browser-auth-actions-quick`);
}

// ---------------------------------------------------------------------------
// 1. Archives subscriber login placement
// ---------------------------------------------------------------------------

test("archives subscriber login right edge aligns with the Summary column", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  const geometry = await page.evaluate(() => {
    const auth = document.querySelector(".browser-archives-auth");
    const headers = Array.from(document.querySelectorAll(".browser-page-archives .browser-results-table thead th"));
    const summary = headers[headers.length - 1];
    const table = document.querySelector(".browser-page-archives .browser-results-table");
    const shell = document.querySelector(".browser-page-shell-archives");
    return {
      authRight: auth.getBoundingClientRect().right,
      authLeft: auth.getBoundingClientRect().left,
      summaryRight: summary.getBoundingClientRect().right,
      summaryText: summary.textContent,
      tableRight: table.getBoundingClientRect().right,
      shellRight: shell.getBoundingClientRect().right,
    };
  });

  expect(geometry.summaryText).toBe("Summary");
  // Same edge, allowing only for sub-pixel layout rounding.
  expect(Math.abs(geometry.authRight - geometry.summaryRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.authRight - geometry.tableRight)).toBeLessThanOrEqual(1);

  // The two edges must meet by the login panel moving inward, NOT by the
  // results table stretching out to the page edge: the right gutter stays.
  expect(geometry.shellRight - geometry.tableRight).toBeGreaterThan(200);
  expect(geometry.authLeft).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// 2. Police quick login
// ---------------------------------------------------------------------------

test("police quick login is hidden until a manual login succeeds", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await expect(quickLoginRow(page, ".browser-page-police")).toBeHidden();

  // A failed login must not enable it either.
  await policeLogin(page, "j.fletcher", "wrong-password");
  await expect(policeStatus(page)).toHaveText("Invalid login. Access remains Public (Level 0).");
  await expect(quickLoginRow(page, ".browser-page-police")).toBeHidden();

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");
  await expect(quickLoginRow(page, ".browser-page-police")).toBeVisible();
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 1)");
});

test("police quick login re-authenticates at the stored level after logging out", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  await page.locator(".browser-page-police").getByRole("button", { name: "Log Out" }).click();
  await expect(policeStatus(page)).toHaveText("Logged in as: Public (Level 0)");
  // Still offered after logging out -- that is the whole point of it.
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 1)");

  await quickLoginButton(page, ".browser-page-police").click();
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  // And the restored level genuinely gates records again.
  const query = page.locator("input[aria-label='Police search']");
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("police quick login cannot grant a level above the one manually earned", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 1)");

  await page.locator(".browser-page-police").getByRole("button", { name: "Log Out" }).click();
  await quickLoginButton(page, ".browser-page-police").click();
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  // A Level 3 record must still be refused on quick-login Level 1 access.
  const query = page.locator("input[aria-label='Police search']");
  await query.fill("pendant");
  await query.press("Enter");
  await expect(policeStatus(page)).toHaveText("One or more matching records were hidden by privilege restrictions.");
});

test("manually reaching a higher police level raises the quick login level", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 1)");

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");

  // Quick login now reaches the Level 3 record that was refused before.
  await page.locator(".browser-page-police").getByRole("button", { name: "Log Out" }).click();
  await quickLoginButton(page, ".browser-page-police").click();
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");

  const query = page.locator("input[aria-label='Police search']");
  await query.fill("pendant");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("the stored quick login level is a high-water mark and never drops", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");

  // Dropping back to a Level 1 login must not downgrade the remembered level.
  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");
});

// ---------------------------------------------------------------------------
// 3. Archives quick login
// ---------------------------------------------------------------------------

test("archives quick subscriber login appears only after a manual subscriber login", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await expect(quickLoginRow(page, ".browser-page-archives")).toBeHidden();

  await archivesLogin(page, "t.mcleod", "apple1");
  await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");
  await expect(quickLoginButton(page, ".browser-page-archives")).toHaveText("Quick Subscriber Login");

  await page.locator(".browser-page-archives").getByRole("button", { name: "Log Out" }).click();
  await expect(archivesStatus(page)).toHaveText("Logged in as: Free");

  await quickLoginButton(page, ".browser-page-archives").click();
  await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");

  // Subscriber-only article is reachable again.
  await page.locator("select[aria-label='Province selector']").selectOption("Ontario");
  await page.locator("input[aria-label='Archive keyword search']").fill("mcleod");
  await page.locator(".browser-page-archives").getByRole("button", { name: "Find Records" }).click();
  await expect(page.locator(".browser-results-archives tbody .browser-results-row")).toHaveCount(1);
});

test("logging in as the free archives guest does not offer a quick subscriber login", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await archivesLogin(page, "free", "free");
  await expect(archivesStatus(page)).toHaveText("Logged in as: Free");
  await expect(quickLoginRow(page, ".browser-page-archives")).toBeHidden();
});

// ---------------------------------------------------------------------------
// 4. Quick login inside the normal save/load system
// ---------------------------------------------------------------------------

test("quick login state round-trips through a real save and load", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");
  await closeComputer(page);

  await page.keyboard.press("Escape");
  await page.locator("#saveGame").click();
  const saveString = await page.locator("#loadSaveGameStringTextArea").inputValue();
  expect(saveString.length).toBeGreaterThan(0);
  await page.locator("#closeButtonSavePopup").click();

  // The save must actually carry the quick-login state.
  const savedState = await page.evaluate((s) => JSON.parse(LZString.decompressFromEncodedURIComponent(s)), saveString);
  expect(savedState.quickLoginState.police.accessLevel).toBe(3);

  // A New Game wipes it...
  await clickNewGame(page);
  await openNetscape(page);
  await openPolice(page);
  await expect(quickLoginRow(page, ".browser-page-police")).toBeHidden();
  await closeComputer(page);

  // ...and loading the save brings it back.
  await page.keyboard.press("Escape");
  await page.locator("#loadGame").click();
  await page.locator("#loadSaveGameStringTextArea").fill(saveString);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#loadStringButton").click();

  await openNetscape(page);
  await openPolice(page);
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");
});

// ---------------------------------------------------------------------------
// 5. Sticky save + autosave
// ---------------------------------------------------------------------------

test("starting a game seeds a sticky save under a namespaced localStorage key", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate((k) => window.localStorage.getItem(k), STICKY_KEY)).toBeNull();

  await clickNewGame(page);
  const stored = await page.evaluate((k) => window.localStorage.getItem(k), STICKY_KEY);
  expect(stored).toBeTruthy();

  // It is the same LZString format the copy/paste save uses.
  const parsed = await page.evaluate(
    (s) => JSON.parse(LZString.decompressFromEncodedURIComponent(s)),
    stored
  );
  expect(parsed).toHaveProperty("evidenceStore");
  expect(parsed).toHaveProperty("quickLoginState");
});

test("autosave rewrites the sticky save every 60 seconds with exactly one timer", async ({ page }) => {
  await page.addInitScript((key) => {
    window.__stickyWrites = 0;
    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (name, value) => {
      if (name === key) {
        window.__stickyWrites += 1;
      }
      return originalSetItem(name, value);
    };
  }, STICKY_KEY);

  await page.clock.install();
  await page.goto("/");
  await clickNewGame(page);

  // The immediate seed on New Game.
  expect(await page.evaluate(() => window.__stickyWrites)).toBe(1);

  await page.clock.runFor(60_000);
  expect(await page.evaluate(() => window.__stickyWrites)).toBe(2);

  await page.clock.runFor(60_000);
  expect(await page.evaluate(() => window.__stickyWrites)).toBe(3);

  // Exactly one write per interval proves a second timer was not stacked on
  // top of the first.
  await page.clock.runFor(180_000);
  expect(await page.evaluate(() => window.__stickyWrites)).toBe(6);
});

test("restarting a game does not stack duplicate autosave timers", async ({ page }) => {
  await page.addInitScript((key) => {
    window.__stickyWrites = 0;
    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (name, value) => {
      if (name === key) {
        window.__stickyWrites += 1;
      }
      return originalSetItem(name, value);
    };
  }, STICKY_KEY);

  await page.clock.install();
  await page.goto("/");

  // Three New Games in a row would stack three intervals without the guard.
  await clickNewGame(page);
  await page.keyboard.press("Escape");
  await clickNewGame(page);
  await page.keyboard.press("Escape");
  await clickNewGame(page);

  const seededWrites = await page.evaluate(() => window.__stickyWrites);
  await page.clock.runFor(60_000);
  const afterOneMinute = await page.evaluate(() => window.__stickyWrites);

  expect(afterOneMinute - seededWrites).toBe(1);
});

// ---------------------------------------------------------------------------
// 6. Resume after a browser refresh
// ---------------------------------------------------------------------------

test("refreshing the browser offers a highlighted Resume Game", async ({ page }) => {
  await page.goto("/");

  const resume = page.locator("#resumeFromMenu");
  await expect(resume).toHaveClass(/disabled/);
  await expect(resume).not.toHaveClass(/has-sticky-save/);

  await clickNewGame(page);
  await page.reload();

  await expect(resume).not.toHaveClass(/disabled/);
  await expect(resume).toHaveClass(/has-sticky-save/);
  await expect(page.locator("#menu")).toBeVisible();
});

test("Resume Game after a refresh restores the full game state including quick login", async ({ page }) => {
  await startNewGame(page);

  // Build up some state worth restoring.
  await page.locator("#notesFolder").click();
  await page.locator(".notes-editor-textarea").fill("pendant belongs to worthing");
  await page.locator(".notes-window > .desktop-window-header .story-window-close").click();

  await openNetscape(page);
  await openPolice(page);
  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");
  await closeComputer(page);

  await page.reload();
  await page.locator("#resumeFromMenu").click();

  // Back in the game, not the menu.
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#menu")).toBeHidden();

  // Notes survived.
  await page.locator("#notesFolder").click();
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("pendant belongs to worthing");
  await page.locator(".notes-window > .desktop-window-header .story-window-close").click();

  // Quick login survived, and the police session it granted survived too.
  await openNetscape(page);
  await openPolice(page);
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");
});

test("Resume still returns to an in-memory game without touching the sticky save", async ({ page }) => {
  await startNewGame(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();

  const resume = page.locator("#resumeFromMenu");
  await expect(resume).not.toHaveClass(/disabled/);
  // No refresh happened, so this is the plain "go back to my game" path and
  // should not be advertised as a recovered save.
  await expect(resume).not.toHaveClass(/has-sticky-save/);

  await resume.click();
  await expect(page.locator("#gameArea")).toBeVisible();
  await expect(page.locator("#menu")).toBeHidden();
});

test("archives subscriber login stays aligned when the viewport narrows", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await page.setViewportSize({ width: 1000, height: 900 });

  const geometry = await page.evaluate(() => {
    const auth = document.querySelector(".browser-archives-auth");
    const headers = Array.from(document.querySelectorAll(".browser-page-archives .browser-results-table thead th"));
    return {
      authRight: auth.getBoundingClientRect().right,
      summaryRight: headers[headers.length - 1].getBoundingClientRect().right,
    };
  });

  expect(Math.abs(geometry.authRight - geometry.summaryRight)).toBeLessThanOrEqual(1);
});

test("a malformed sticky save is discarded instead of breaking the menu", async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "this-is-not-a-valid-lzstring-save");
  }, STICKY_KEY);

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto("/");

  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#resumeFromMenu")).toHaveClass(/disabled/);
  expect(pageErrors).toEqual([]);

  // The unusable entry is cleared rather than left to fail again next load.
  expect(await page.evaluate((k) => window.localStorage.getItem(k), STICKY_KEY)).toBeNull();

  // A fresh game still starts normally, with no confirmation prompt.
  await page.locator("#newGame").click();
  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#gameArea")).toBeVisible();
});

test("sticky save does not disturb unrelated localStorage entries", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("unrelated:key", "keep-me");
  });

  await startNewGame(page);
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await expect(page.locator("#gameArea")).toBeVisible();

  expect(await page.evaluate(() => window.localStorage.getItem("unrelated:key"))).toBe("keep-me");
});

// ---------------------------------------------------------------------------
// 7. New Game confirmation
// ---------------------------------------------------------------------------

test("New Game starts immediately when there is no sticky save", async ({ page }) => {
  await page.goto("/");
  await page.locator("#newGame").click();

  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#gameArea")).toBeVisible();
});

test("New Game warns before overwriting an existing sticky save", async ({ page }) => {
  await startNewGame(page);
  await page.keyboard.press("Escape");

  await page.locator("#newGame").click();

  const confirmPopup = page.locator("#newGameConfirmPopup");
  await expect(confirmPopup).toBeVisible();
  await expect(confirmPopup).toContainText("Start a New Game?");
  await expect(confirmPopup).toContainText("overwrite your current saved game");
  // The game must not have restarted yet.
  await expect(page.locator("#menu")).toBeVisible();
});

test("cancelling New Game preserves the existing sticky save", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#notesFolder").click();
  await page.locator(".notes-editor-textarea").fill("do not lose this");
  await page.locator(".notes-window > .desktop-window-header .story-window-close").click();

  // Force the note into the sticky save rather than waiting for the timer.
  await page.evaluate(() => window.dispatchEvent(new Event("beforeunload")));
  const savedBefore = await page.evaluate((k) => window.localStorage.getItem(k), STICKY_KEY);

  await page.keyboard.press("Escape");
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmCancelButton").click();

  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#menu")).toBeVisible();
  expect(await page.evaluate((k) => window.localStorage.getItem(k), STICKY_KEY)).toBe(savedBefore);

  // The cancelled-away game is still resumable and still has the note.
  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await page.locator("#notesFolder").click();
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("do not lose this");
});

test("confirming New Game overwrites the sticky save and starts fresh", async ({ page }) => {
  await startNewGame(page);

  await page.locator("#notesFolder").click();
  await page.locator(".notes-editor-textarea").fill("old game note");
  await page.locator(".notes-window > .desktop-window-header .story-window-close").click();
  await page.evaluate(() => window.dispatchEvent(new Event("beforeunload")));

  await page.keyboard.press("Escape");
  await page.locator("#newGame").click();
  await page.locator("#newGameConfirmAcceptButton").click();

  await expect(page.locator("#newGameConfirmPopup")).toBeHidden();
  await expect(page.locator("#gameArea")).toBeVisible();

  // The new game replaced it: the note is gone here and after a refresh.
  await page.locator("#notesFolder").click();
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("");
  await page.locator(".notes-window > .desktop-window-header .story-window-close").click();

  await page.reload();
  await page.locator("#resumeFromMenu").click();
  await page.locator("#notesFolder").click();
  await expect(page.locator(".notes-editor-textarea")).toHaveValue("");
});

test("New Game clears quick login state banked in the previous game", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);
  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, ".browser-page-police")).toHaveText("Quick Log in (Lvl 3)");
  await closeComputer(page);

  await page.keyboard.press("Escape");
  await clickNewGame(page);

  await openNetscape(page);
  await openPolice(page);
  await expect(policeStatus(page)).toHaveText("Logged in as: Public (Level 0)");
  await expect(quickLoginRow(page, ".browser-page-police")).toBeHidden();
});
