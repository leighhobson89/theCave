// Netscape site authentication: guest defaults, privilege gating of records,
// credential validation, log out, and session lifetime across navigation,
// closing the computer, save/load and New Game.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  clickNewGame,
  openNetscape,
  closeComputer,
  openPolice,
  openArchives,
  openZoomSearch,
  policeLogin,
  policeLogOut,
  archivesLogin,
  archivesLogOut,
  policeStatus,
  archivesStatus,
  policeQuery,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../support/game-helpers");

test("police site logs in by default, gates records by privilege, and unlocks on login", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const status = policeStatus(page);
  await expect(status).toHaveText("Logged in as: Public (Level 0)");

  const query = policeQuery(page);
  await query.fill("james fletcher");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);

  // Level 1 record is hidden for the default public account.
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(status).toHaveText("One or more matching records were hidden by privilege restrictions.");

  // Bad credentials keep the guest level.
  await policeLogin(page, "j.fletcher", "wrong");
  await expect(status).toHaveText("Invalid login. Access remains Public (Level 0).");

  // Correct credentials raise the level and reveal the record.
  await page.locator("input[aria-label='Police password']").fill("oscar123");
  await page.locator(".browser-page-police").getByRole("button", { name: "Login" }).click();
  await expect(status).toHaveText("Logged in as: Constable James Fletcher (Level 1)");
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("credentials are case sensitive for both username and password", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const status = policeStatus(page);

  // Wrong case in the username must be rejected.
  await policeLogin(page, "J. FLETCHER", "oscar123");
  await expect(status).toHaveText("Invalid login. Access remains Public (Level 0).");

  // Wrong case in the password must be rejected.
  await policeLogin(page, "j.fletcher", "OSCAR123");
  await expect(status).toHaveText("Invalid login. Access remains Public (Level 0).");

  // Exact case succeeds. Surrounding whitespace is still tolerated.
  await policeLogin(page, "  j.fletcher  ", "oscar123");
  await expect(status).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  // Archives is case sensitive too.
  await openArchives(page);
  await archivesLogin(page, "T.mcleod", "apple1");
  await expect(archivesStatus(page)).toHaveText("Invalid login. Access remains Free.");

  await page.locator("input[aria-label='Archive username']").fill("t.mcleod");
  await page.locator(".browser-page-archives").getByRole("button", { name: "Login" }).click();
  await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");
});

test("login survives re-navigation and closing the computer", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const status = policeStatus(page);
  await policeLogin(page, "b.whitmore", "ironVeins15");
  await expect(status).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");

  // Navigating away and back keeps the session.
  await openZoomSearch(page);
  await openPolice(page);
  await expect(status).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");

  // Closing the whole computer and reopening keeps it too.
  await closeComputer(page);
  await openNetscape(page);
  await openPolice(page);
  await expect(status).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");

  // The level is genuinely retained, not just the label.
  const query = policeQuery(page);
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("log out returns to the site's guest account and re-gates records", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const status = policeStatus(page);
  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(status).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  await policeLogOut(page);
  await expect(status).toHaveText("Logged in as: Public (Level 0)");
  await expect(page.locator("input[aria-label='Police username']")).toHaveValue("");
  await expect(page.locator("input[aria-label='Police password']")).toHaveValue("");

  // The level-1 record is gated again.
  const query = policeQuery(page);
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(status).toHaveText("One or more matching records were hidden by privilege restrictions.");

  // Logging out persists across a computer close, same as logging in.
  await closeComputer(page);
  await openNetscape(page);
  await openPolice(page);
  await expect(status).toHaveText("Logged in as: Public (Level 0)");

  // Archives logs out to Free.
  await openArchives(page);
  await archivesLogin(page, "t.mcleod", "apple1");
  await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");
  await archivesLogOut(page);
  await expect(archivesStatus(page)).toHaveText("Logged in as: Free");
});

test("website logins persist through a real save/load round trip, and New Game clears them", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  const status = policeStatus(page);
  await policeLogin(page, "b.whitmore", "ironVeins15");
  await expect(status).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");
  await closeComputer(page);

  // Drive the real Save popup, exactly as the player would.
  const saveString = await captureSaveStringViaMenu(page);

  // New Game must not leave the previous login behind.
  await clickNewGame(page);
  await openNetscape(page);
  await openPolice(page);
  await expect(status).toHaveText("Logged in as: Public (Level 0)");
  await closeComputer(page);

  // Loading the earlier save through the real Load popup restores the login.
  await loadSaveStringViaMenu(page, saveString);

  await openNetscape(page);
  await openPolice(page);
  await expect(status).toHaveText("Logged in as: Mr Brian Whitmore (Level 2)");

  // And the restored level genuinely still gates records.
  const query = policeQuery(page);
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});
