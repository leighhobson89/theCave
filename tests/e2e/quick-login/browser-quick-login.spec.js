// Quick login: after a manual login succeeds, the credentials that achieved it
// are remembered so they can be replayed with one click. The remembered level
// is a high-water mark and can never grant access above what was earned.
const { test, expect } = require("@playwright/test");
const {
  startNewGame,
  clickNewGame,
  openNetscape,
  closeComputer,
  openPolice,
  openArchives,
  policeLogin,
  policeLogOut,
  archivesLogin,
  archivesLogOut,
  policeStatus,
  archivesStatus,
  policeQuery,
  quickLoginButton,
  quickLoginRow,
  captureSaveStringViaMenu,
  loadSaveStringViaMenu,
} = require("../../support/game-helpers");

const POLICE = ".browser-page-police";
const ARCHIVES = ".browser-page-archives";

test("police quick login is hidden until a manual login succeeds", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await expect(quickLoginRow(page, POLICE)).toBeHidden();

  // A failed login must not enable it either.
  await policeLogin(page, "j.fletcher", "wrong-password");
  await expect(policeStatus(page)).toHaveText("Invalid login. Access remains Public (Level 0).");
  await expect(quickLoginRow(page, POLICE)).toBeHidden();

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");
  await expect(quickLoginRow(page, POLICE)).toBeVisible();
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 1)");
});

test("police quick login re-authenticates at the stored level after logging out", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  await policeLogOut(page);
  await expect(policeStatus(page)).toHaveText("Logged in as: Public (Level 0)");
  // Still offered after logging out -- that is the whole point of it.
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 1)");

  await quickLoginButton(page, POLICE).click();
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  // And the restored level genuinely gates records again.
  const query = policeQuery(page);
  await query.fill("thomas orourke");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("police quick login cannot grant a level above the one manually earned", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 1)");

  await policeLogOut(page);
  await quickLoginButton(page, POLICE).click();
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");

  // A Level 3 record must still be refused on quick-login Level 1 access.
  const query = policeQuery(page);
  await query.fill("pendant");
  await query.press("Enter");
  await expect(policeStatus(page)).toHaveText("One or more matching records were hidden by privilege restrictions.");
});

test("manually reaching a higher police level raises the quick login level", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 1)");

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");

  // Quick login now reaches the Level 3 record that was refused before.
  await policeLogOut(page);
  await quickLoginButton(page, POLICE).click();
  await expect(policeStatus(page)).toHaveText("Logged in as: T. Fairchild (Level 3)");

  const query = policeQuery(page);
  await query.fill("pendant");
  await query.press("Enter");
  await expect(page.locator(".browser-results-police tbody .browser-results-row")).toHaveCount(1);
});

test("the stored quick login level is a high-water mark and never drops", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");

  // Dropping back to a Level 1 login must not downgrade the remembered level.
  await policeLogin(page, "j.fletcher", "oscar123");
  await expect(policeStatus(page)).toHaveText("Logged in as: Constable James Fletcher (Level 1)");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");
});

test("archives quick subscriber login appears only after a manual subscriber login", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await expect(quickLoginRow(page, ARCHIVES)).toBeHidden();

  await archivesLogin(page, "t.mcleod", "apple1");
  await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");
  await expect(quickLoginButton(page, ARCHIVES)).toHaveText("Quick Subscriber Login");

  await archivesLogOut(page);
  await expect(archivesStatus(page)).toHaveText("Logged in as: Free");

  await quickLoginButton(page, ARCHIVES).click();
  await expect(archivesStatus(page)).toHaveText("Logged in as: Subscriber");

  // Subscriber-only article is reachable again.
  await page.locator("select[aria-label='Province selector']").selectOption("Ontario");
  await page.locator("input[aria-label='Archive keyword search']").fill("mcleod");
  await page.locator(ARCHIVES).getByRole("button", { name: "Find Records" }).click();
  await expect(page.locator(".browser-results-archives tbody .browser-results-row")).toHaveCount(1);
});

test("logging in as the free archives guest does not offer a quick subscriber login", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openArchives(page);

  await archivesLogin(page, "free", "free");
  await expect(archivesStatus(page)).toHaveText("Logged in as: Free");
  await expect(quickLoginRow(page, ARCHIVES)).toBeHidden();
});

test("quick login state round-trips through a real save and load", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);

  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");
  await closeComputer(page);

  const saveString = await captureSaveStringViaMenu(page);

  // The save must actually carry the quick-login state.
  const savedState = await page.evaluate(
    (s) => JSON.parse(LZString.decompressFromEncodedURIComponent(s)),
    saveString
  );
  expect(savedState.quickLoginState.police.accessLevel).toBe(3);

  // A New Game wipes it...
  await clickNewGame(page);
  await openNetscape(page);
  await openPolice(page);
  await expect(quickLoginRow(page, POLICE)).toBeHidden();
  await closeComputer(page);

  // ...and loading the save brings it back.
  await loadSaveStringViaMenu(page, saveString);

  await openNetscape(page);
  await openPolice(page);
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");
});

test("New Game clears quick login state banked in the previous game", async ({ page }) => {
  await startNewGame(page);
  await openNetscape(page);
  await openPolice(page);
  await policeLogin(page, "t.fairchild", "mapleLaw91");
  await expect(quickLoginButton(page, POLICE)).toHaveText("Quick Log in (Lvl 3)");
  await closeComputer(page);

  await page.keyboard.press("Escape");
  await clickNewGame(page);

  await openNetscape(page);
  await openPolice(page);
  await expect(policeStatus(page)).toHaveText("Logged in as: Public (Level 0)");
  await expect(quickLoginRow(page, POLICE)).toBeHidden();
});
