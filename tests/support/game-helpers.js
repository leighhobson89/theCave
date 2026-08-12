// Shared page-driving helpers for the end-to-end suite.
//
// Every helper drives the app the way a player would (real clicks, real
// buttons) rather than reaching into module internals, so a spec that uses
// them still fails when the UI it depends on breaks. The few helpers that do
// import app modules directly (readAddressHistory, captureSaveString) are
// named so it is obvious they bypass the UI.
const { expect } = require("@playwright/test");

// Must match STICKY_SAVE_STORAGE_KEY in constantsAndGlobalVars.js.
const STICKY_SAVE_KEY = "theCave:sticky-save";

// ---------------------------------------------------------------------------
// Starting a game
// ---------------------------------------------------------------------------

// New Game asks for confirmation whenever an autosaved (sticky) game already
// exists, which is true any time a game has been started earlier in the same
// browser context. Accepting keeps the plain "just start a new game" semantics.
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

// ---------------------------------------------------------------------------
// Desk objects and the CaveOS computer
// ---------------------------------------------------------------------------

async function openComputer(page) {
  await page.locator("#desktopComputerHotspot").click();
}

async function openNetscape(page) {
  await openComputer(page);
  await page.getByRole("button", { name: "Netscape" }).click();
}

async function openPaint(page) {
  await openComputer(page);
  await page.getByRole("button", { name: "Paint" }).click();
}

// The computer window covers the viewport, so it must be closed from its own
// title-bar button rather than the desk hotspot.
async function closeComputer(page) {
  await page.locator(".computer-window > .desktop-window-header .story-window-close").click();
}

async function openNotes(page) {
  await page.locator("#notesFolder").click();
}

async function closeNotes(page) {
  await page.locator(".notes-window > .desktop-window-header .story-window-close").click();
}

async function openFacsimile(page) {
  await page.locator("#desktopFacsimileHotspot").click();
}

function facsimileWindow(page) {
  return page.locator(".facsimile-window");
}

async function closeFacsimile(page) {
  await facsimileWindow(page).locator(".story-window-close").click();
}

// ---------------------------------------------------------------------------
// Netscape sites
// ---------------------------------------------------------------------------

async function openPolice(page) {
  await page.getByRole("button", { name: "Police Records" }).click();
}

async function openArchives(page) {
  await page.getByRole("button", { name: "Canada Archives" }).click();
}

async function openZoomSearch(page) {
  await page.getByRole("button", { name: "ZoomSearch" }).click();
}

async function openLibrary(page) {
  await page.getByRole("button", { name: "Library" }).click();
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

async function policeLogOut(page) {
  await page.locator(".browser-page-police").getByRole("button", { name: "Log Out" }).click();
}

async function archivesLogOut(page) {
  await page.locator(".browser-page-archives").getByRole("button", { name: "Log Out" }).click();
}

function policeStatus(page) {
  return page.locator(".browser-page-police .browser-status-line").first();
}

function archivesStatus(page) {
  return page.locator(".browser-page-archives .browser-status-line").first();
}

function policeQuery(page) {
  return page.locator("input[aria-label='Police search']");
}

function browserAddress(page) {
  return page.locator("input[aria-label='Browser address']");
}

async function visitBrowserUrl(page, url) {
  const address = browserAddress(page);
  await address.fill(url);
  await address.press("Enter");
}

function quickLoginButton(page, siteClass) {
  return page.locator(`${siteClass} .browser-button-quick-login`);
}

function quickLoginRow(page, siteClass) {
  return page.locator(`${siteClass} .browser-auth-actions-quick`);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function notification(page) {
  return page.locator(".game-notification").first();
}

// Queues the real "missing person report" catalog entry through the same
// configured-facsimile path the game uses, so the resulting notification is
// indistinguishable from one the game produced itself.
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
// Evidence store inspection (via the in-game debug window)
// ---------------------------------------------------------------------------

// Starts collecting console messages. The debug window dumps the raw evidence
// store to the console, which is the only route to it that does not require
// importing app modules into the page.
function captureConsoleEntries(page) {
  const consoleEntries = [];
  page.on("console", async (message) => {
    const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => null)));
    consoleEntries.push({ text: message.text(), values });
  });
  return consoleEntries;
}

// Opens the debug window ("-" hotkey), clicks its dump button, and returns the
// most recent raw evidence store logged to the console.
async function dumpEvidenceStore(page, consoleEntries) {
  await page.keyboard.press("-");
  await expect(page.locator(".debug-window")).toBeVisible();
  await page.locator(".debug-window .debug-window-button").click();

  await expect
    .poll(async () => consoleEntries.some((entry) => entry.text.includes("Evidence store in memory (raw):")))
    .toBe(true);

  const evidenceDebugEntry = consoleEntries
    .filter((entry) => entry.text.includes("Evidence store in memory (raw):"))
    .at(-1);
  expect(evidenceDebugEntry).toBeTruthy();

  return evidenceDebugEntry?.values?.[1];
}

// Resolves one collection ("reports" / "photos") of a raw evidence store dump
// into the full evidence objects it points at.
function evidenceEntriesIn(rawStore, collectionName) {
  return Array.isArray(rawStore?.collections?.[collectionName])
    ? rawStore.collections[collectionName]
        .map((id) => rawStore?.evidencesById?.[String(id)])
        .filter(Boolean)
    : [];
}

// ---------------------------------------------------------------------------
// Save / load
// ---------------------------------------------------------------------------

// Drives the real Save popup and returns the save string the player would copy.
async function captureSaveStringViaMenu(page) {
  await page.keyboard.press("Escape");
  await page.locator("#saveGame").click();
  const saveString = await page.locator("#loadSaveGameStringTextArea").inputValue();
  expect(saveString.length).toBeGreaterThan(0);
  await page.locator("#closeButtonSavePopup").click();
  return saveString;
}

// Drives the real Load popup, accepting the confirmation dialog it raises.
async function loadSaveStringViaMenu(page, saveString) {
  await page.keyboard.press("Escape");
  await page.locator("#loadGame").click();
  await page.locator("#loadSaveGameStringTextArea").fill(saveString);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#loadStringButton").click();
}

// Counts writes to the sticky-save localStorage key. Must be installed before
// the first navigation.
async function installStickyWriteCounter(page) {
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
  }, STICKY_SAVE_KEY);
}

function readStickyWriteCount(page) {
  return page.evaluate(() => window.__stickyWrites);
}

function readStickySave(page) {
  return page.evaluate((key) => window.localStorage.getItem(key), STICKY_SAVE_KEY);
}

module.exports = {
  STICKY_SAVE_KEY,
  archivesLogOut,
  archivesLogin,
  archivesStatus,
  browserAddress,
  captureConsoleEntries,
  captureSaveStringViaMenu,
  clickNewGame,
  closeComputer,
  closeFacsimile,
  closeNotes,
  dumpEvidenceStore,
  evidenceEntriesIn,
  facsimileWindow,
  installStickyWriteCounter,
  loadSaveStringViaMenu,
  notification,
  openArchives,
  openComputer,
  openFacsimile,
  openLibrary,
  openNetscape,
  openNotes,
  openPaint,
  openPolice,
  openZoomSearch,
  policeLogOut,
  policeLogin,
  policeQuery,
  policeStatus,
  queueFacsimileReport,
  quickLoginButton,
  quickLoginRow,
  readStickySave,
  readStickyWriteCount,
  startNewGame,
  visitBrowserUrl,
};
