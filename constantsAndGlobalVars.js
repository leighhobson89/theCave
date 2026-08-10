import {
  getEvidenceStoreSnapshot,
  initializeEvidenceStoreForNewGame,
  setEvidenceStoreSnapshot,
} from "./evidenceManager.js";

//ELEMENTS
let elements;
let localization = {};
let language = "en";
let languageSelected = "en";

//CONSTANTS
export let gameState;

export const MENU_STATE = "menuState";
export const DESKTOP_STATE = "desktopState";
export const NOTICEBOARD_STATE = "noticeboardState";
export const DESKTOP_WINDOW_BASE_Z_INDEX = 45;
const BROWSER_ADDRESS_HISTORY_LIMIT = 10;
export const NOTES_PAGE_COUNT = 10;
export const PAINT_PAGE_COUNT = 10;

// Notes and Paint share one paged-document model; they differ only in how many
// pages they hold, the default page title, and the field that stores the body.
const NOTES_PAGE_SPEC = { count: NOTES_PAGE_COUNT, titlePrefix: "Page", bodyKey: "content" };
const PAINT_PAGE_SPEC = { count: PAINT_PAGE_COUNT, titlePrefix: "Sketch", bodyKey: "snapshot" };

function buildDefaultPages({ count, titlePrefix, bodyKey }) {
  return Array.from({ length: count }, (_, index) => ({
    title: `${titlePrefix} ${index + 1}`,
    [bodyKey]: "",
  }));
}

function readPages(pages, { bodyKey }) {
  return pages.map((page) => ({
    title: String(page?.title || "").trim(),
    [bodyKey]: String(page?.[bodyKey] || ""),
  }));
}

function writePages(value, spec) {
  const sourcePages = Array.isArray(value) ? value : [];

  return buildDefaultPages(spec).map((defaultPage, index) => {
    const inputPage = sourcePages[index] || {};

    return {
      title: String(inputPage?.title || "").trim() || defaultPage.title,
      [spec.bodyKey]: String(inputPage?.[spec.bodyKey] || ""),
    };
  });
}

function clampPageIndex(value, pageCount) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(pageCount - 1, Math.max(0, parsed));
}

//GLOBAL VARIABLES

//FLAGS
let audioMuted;
let musicVolumePreference = 0.1;
let sfxVolumePreference = 0.85;
let beginGameState = true;
let gameInProgress = false;

let evidenceCustomNames = {};
let notesPages = buildDefaultPages(NOTES_PAGE_SPEC);
let notesActivePageIndex = 0;
let paintPages = buildDefaultPages(PAINT_PAGE_SPEC);
let paintActivePageIndex = 0;
let ashtrayHasLitCigarette = true;
let ashtrayHasExtraButt = false;
let facsimileState = {
  pendingReports: [],
  consumedReportIds: [],
};
let browserAddressHistory = [];
let activeGameplayState = DESKTOP_STATE;

let currentDesktopWindowZIndex = DESKTOP_WINDOW_BASE_Z_INDEX;

// webContentManager is a factory (createWebContentManager), not a singleton
// module like evidenceManager, and its one instance is owned by ui.js. ui.js
// registers a snapshot/restore provider here once at startup so save/load can
// reach it without ui.js and constantsAndGlobalVars.js importing each other.
let webContentSessionsProvider = null;

export function registerWebContentSessionsProvider(provider) {
  webContentSessionsProvider = provider
    && typeof provider.getSnapshot === "function"
    && typeof provider.restoreSnapshot === "function"
    ? provider
    : null;
}

//GETTER SETTER METHODS
export function setElements() {
  elements = {
    appShell: document.getElementById("appShell"),
    menu: document.getElementById("menu"),
    menuTitle: document.getElementById("menuTitle"),
    newGameMenuButton: document.getElementById("newGame"),
    resumeGameMenuButton: document.getElementById("resumeFromMenu"),
    loadGameButton: document.getElementById("loadGame"),
    saveGameButton: document.getElementById("saveGame"),
    saveLoadPopup: document.getElementById("loadSaveGameStringPopup"),
    loadSaveGameStringTextArea: document.getElementById(
      "loadSaveGameStringTextArea",
    ),
    loadStringButton: document.getElementById("loadStringButton"),
    textAreaLabel: document.getElementById("textAreaLabel"),
    gameArea: document.getElementById("gameArea"),
    desktopViewport: document.getElementById("desktopViewport"),
    noticeboardScene: document.getElementById("noticeboardScene"),
    deskParallax: document.getElementById("deskParallax"),
    deskWorld: document.getElementById("deskWorld"),
    deskTable: document.getElementById("deskTable"),
    tableLegTopLeft: document.getElementById("tableLegTopLeft"),
    tableLegTopRight: document.getElementById("tableLegTopRight"),
    tableLegBottomLeft: document.getElementById("tableLegBottomLeft"),
    tableLegBottomRight: document.getElementById("tableLegBottomRight"),
    backgroundFolder: document.getElementById("backgroundFolder"),
    backgroundFolderLabel: document.getElementById("backgroundFolderLabel"),
    reportsFolder: document.getElementById("reportsFolder"),
    reportsFolderLabel: document.getElementById("reportsFolderLabel"),
    photosFolder: document.getElementById("photosFolder"),
    photosFolderLabel: document.getElementById("photosFolderLabel"),
    zoomReadout: document.getElementById("zoomReadout"),
    notesFolder: document.getElementById("notesFolder"),
    notesLabel: document.getElementById("notesLabel"),
    desktopCalendar: document.getElementById("desktopCalendar"),
    desktopAshtray: document.getElementById("desktopAshtray"),
    desktopAshtrayHotspot: document.getElementById("desktopAshtrayHotspot"),
    desktopFacsimileRig: document.getElementById("desktopFacsimileRig"),
    desktopFacsimileHotspot: document.getElementById("desktopFacsimileHotspot"),
    desktopFacsimile: document.getElementById("desktopFacsimile"),
    desktopComputerRig: document.getElementById("desktopComputerRig"),
    desktopComputerHotspot: document.getElementById("desktopComputerHotspot"),
    settingsToggle: document.getElementById("settingsToggle"),
    noticeboardButton: document.getElementById("noticeboardButton"),
    settingsItems: document.getElementById("settingsItems"),
    muteToggleButton: document.getElementById("muteToggleButton"),
    musicPlayPauseButton: document.getElementById("musicPlayPauseButton"),
    musicNextButton: document.getElementById("musicNextButton"),
    musicVolumeLabel: document.getElementById("musicVolumeLabel"),
    musicVolumeSlider: document.getElementById("musicVolumeSlider"),
    musicVolumeValue: document.getElementById("musicVolumeValue"),
    sfxVolumeLabel: document.getElementById("sfxVolumeLabel"),
    sfxVolumeSlider: document.getElementById("sfxVolumeSlider"),
    sfxVolumeValue: document.getElementById("sfxVolumeValue"),
    btnEnglish: document.getElementById("btnEnglish"),
    btnSpanish: document.getElementById("btnSpanish"),
    btnFrench: document.getElementById("btnFrench"),
    btnGerman: document.getElementById("btnGerman"),
    btnItalian: document.getElementById("btnItalian"),
    copyButtonSavePopup: document.getElementById("copyButtonSavePopup"),
    pasteButtonLoadPopup: document.getElementById("pasteButtonLoadPopup"),
    closeButtonSavePopup: document.getElementById("closeButtonSavePopup"),
    overlay: document.getElementById("overlay"),
    sceneFadeOverlay: document.getElementById("sceneFadeOverlay"),
  };
}

export function setGameStateVariable(value) {
  gameState = value;
}

export function getElements() {
  return elements;
}

export function captureGameStatusForSaving() {
  let gameState = {};

  // Game variables

  // Flags

  // UI elements

  gameState.language = getLanguage();
  gameState.audioMuted = getAudioMuted();
  gameState.musicVolumePreference = getMusicVolumePreference();
  gameState.sfxVolumePreference = getSfxVolumePreference();
  gameState.evidenceStore = getEvidenceStoreSnapshot();
  gameState.evidenceCustomNames = getEvidenceCustomNames();
  gameState.notesPages = getNotesPages();
  gameState.notesActivePageIndex = getNotesActivePageIndex();
  gameState.paintPages = getPaintPages();
  gameState.paintActivePageIndex = getPaintActivePageIndex();
  gameState.ashtrayHasLitCigarette = getAshtrayHasLitCigarette();
  gameState.ashtrayHasExtraButt = getAshtrayHasExtraButt();
  gameState.facsimileState = getFacsimileState();
  gameState.browserAddressHistory = getBrowserAddressHistory();
  gameState.webContentSessions = webContentSessionsProvider
    ? webContentSessionsProvider.getSnapshot()
    : {};
  gameState.activeGameplayState = getActiveGameplayState();
  gameState.currentScene = getActiveGameplayState();

  return gameState;
}

export function restoreGameStatus(gameState) {
  return new Promise((resolve, reject) => {
    try {
      // Game variables

      // Flags

      // UI elements

      setLanguage(gameState.language || "en");
      setAudioMuted(gameState.audioMuted === true);
      setMusicVolumePreference(gameState.musicVolumePreference);
      setSfxVolumePreference(gameState.sfxVolumePreference);
      setEvidenceCustomNames(gameState.evidenceCustomNames || {});
      setNotesPages(gameState.notesPages);
      setNotesActivePageIndex(gameState.notesActivePageIndex ?? 0);
      setPaintPages(gameState.paintPages);
      setPaintActivePageIndex(gameState.paintActivePageIndex ?? 0);
      setAshtrayHasLitCigarette(gameState.ashtrayHasLitCigarette);
      setAshtrayHasExtraButt(gameState.ashtrayHasExtraButt);
      setFacsimileState(gameState.facsimileState);
      setBrowserAddressHistory(gameState.browserAddressHistory);
      if (webContentSessionsProvider) {
        webContentSessionsProvider.restoreSnapshot(gameState.webContentSessions || {});
      }
      setActiveGameplayState(
        gameState.activeGameplayState
        || gameState.currentScene
        || DESKTOP_STATE
      );

      if (!setEvidenceStoreSnapshot(gameState.evidenceStore)) {
        initializeEvidenceStoreForNewGame();
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function setLocalization(value) {
  localization = value;
}

export function getLocalization() {
  return localization;
}

export function setLanguage(value) {
  language = value;
}

export function getLanguage() {
  return language;
}

export function setAudioMuted(value) {
  audioMuted = value;
}

export function getAudioMuted() {
  return audioMuted;
}

export function setMusicVolumePreference(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return;
  }

  musicVolumePreference = Math.max(0, Math.min(1, parsed));
}

export function getMusicVolumePreference() {
  return musicVolumePreference;
}

export function setSfxVolumePreference(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return;
  }

  sfxVolumePreference = Math.max(0, Math.min(1, parsed));
}

export function getSfxVolumePreference() {
  return sfxVolumePreference;
}

// A history entry is either a bare URL string or `{ url, replay }` when the page
// can be re-opened by replaying a site search. Returns null for unusable entries.
function cloneBrowserAddressEntry(entry) {
  if (entry && typeof entry === "object") {
    const url = String(entry.url ?? "").trim();
    if (!url) {
      return null;
    }

    return entry.replay && typeof entry.replay === "object"
      ? { url, replay: { ...entry.replay } }
      : { url };
  }

  return String(entry ?? "").trim() || null;
}

// Stores the history newest-last, de-duplicated by URL: revisiting a page moves
// its entry to the most-recent position (carrying the newer replay data) rather
// than appending a second copy. Without this a repeatedly visited URL would eat
// several of the limited slots and push real history out.
export function setBrowserAddressHistory(value) {
  const entriesByUrl = new Map();

  (Array.isArray(value) ? value : []).forEach((rawEntry) => {
    const entry = cloneBrowserAddressEntry(rawEntry);
    if (!entry) {
      return;
    }

    const url = typeof entry === "object" ? entry.url : entry;
    entriesByUrl.delete(url);
    entriesByUrl.set(url, entry);
  });

  browserAddressHistory = Array.from(entriesByUrl.values()).slice(-BROWSER_ADDRESS_HISTORY_LIMIT);
}

export function getBrowserAddressHistory() {
  if (!Array.isArray(browserAddressHistory)) {
    return [];
  }

  return browserAddressHistory.map(cloneBrowserAddressEntry).filter(Boolean);
}

export function getMenuState() {
  return MENU_STATE;
}

export function getDesktopState() {
  return DESKTOP_STATE;
}

export function getNoticeboardState() {
  return NOTICEBOARD_STATE;
}

export function isGameplayState(value) {
  return value === DESKTOP_STATE || value === NOTICEBOARD_STATE;
}

export function getActiveGameplayState() {
  return activeGameplayState;
}

export function setActiveGameplayState(value) {
  if (!isGameplayState(value)) {
    activeGameplayState = DESKTOP_STATE;
    return;
  }

  activeGameplayState = value;
}

export function getLanguageSelected() {
  return languageSelected;
}

export function setLanguageSelected(value) {
  languageSelected = value;
}

export function getBeginGameStatus() {
  return beginGameState;
}

export function setBeginGameStatus(value) {
  beginGameState = value;
}

export function getGameInProgress() {
  return gameInProgress;
}

export function setGameInProgress(value) {
  gameInProgress = value;
}

export function getNextDesktopWindowZIndex() {
  currentDesktopWindowZIndex += 1;
  return currentDesktopWindowZIndex;
}

export function setEvidenceCustomNames(value) {
  const nextMap = {};
  if (value && typeof value === "object") {
    Object.keys(value).forEach((rawKey) => {
      const normalizedKey = String(rawKey).trim();
      const normalizedValue = String(value[rawKey] ?? "").trim();
      if (!normalizedKey || !normalizedValue) {
        return;
      }

      nextMap[normalizedKey] = normalizedValue;
    });
  }

  evidenceCustomNames = nextMap;
}

export function getEvidenceCustomNames() {
  return { ...evidenceCustomNames };
}

export function setEvidenceCustomName(evidenceId, customName) {
  const key = String(evidenceId || "").trim();
  if (!key) {
    return;
  }

  const value = String(customName ?? "").trim();
  if (!value) {
    delete evidenceCustomNames[key];
    return;
  }

  evidenceCustomNames[key] = value;
}

export function getEvidenceCustomName(evidenceId) {
  const key = String(evidenceId || "").trim();
  if (!key) {
    return "";
  }

  return evidenceCustomNames[key] || "";
}

export function getNotesPages() {
  return readPages(notesPages, NOTES_PAGE_SPEC);
}

export function setNotesPages(value) {
  notesPages = writePages(value, NOTES_PAGE_SPEC);
}

export function resetNotesPagesState() {
  notesPages = buildDefaultPages(NOTES_PAGE_SPEC);
  notesActivePageIndex = 0;
}

export function getNotesActivePageIndex() {
  return notesActivePageIndex;
}

export function setNotesActivePageIndex(value) {
  notesActivePageIndex = clampPageIndex(value, NOTES_PAGE_COUNT);
}

export function getPaintPages() {
  return readPages(paintPages, PAINT_PAGE_SPEC);
}

export function setPaintPages(value) {
  paintPages = writePages(value, PAINT_PAGE_SPEC);
}

export function resetPaintPagesState() {
  paintPages = buildDefaultPages(PAINT_PAGE_SPEC);
  paintActivePageIndex = 0;
}

export function getPaintActivePageIndex() {
  return paintActivePageIndex;
}

export function setPaintActivePageIndex(value) {
  paintActivePageIndex = clampPageIndex(value, PAINT_PAGE_COUNT);
}

export function getAshtrayHasLitCigarette() {
  return ashtrayHasLitCigarette === true;
}

export function setAshtrayHasLitCigarette(value) {
  ashtrayHasLitCigarette = value !== false;
}

export function getAshtrayHasExtraButt() {
  return ashtrayHasExtraButt === true;
}

export function setAshtrayHasExtraButt(value) {
  ashtrayHasExtraButt = value === true;
}

export function resetAshtrayState() {
  ashtrayHasLitCigarette = true;
  ashtrayHasExtraButt = false;
}

// Accepts either the current `pendingReports` array or the legacy single
// `pendingReport` field written by older saves.
function readPendingReportsInput(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value.pendingReports)) {
    return value.pendingReports;
  }

  return value.pendingReport && typeof value.pendingReport === "object"
    ? [value.pendingReport]
    : [];
}

export function setFacsimileState(value) {
  const pendingReportsById = new Map();

  readPendingReportsInput(value).forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const id = String(item.id || "").trim();
    if (!id || pendingReportsById.has(id)) {
      return;
    }

    pendingReportsById.set(id, {
      ...item,
      id,
      title: String(item.title || "").trim(),
      reportText: String(item.reportText || ""),
      description: String(item.description || ""),
      paperStyle: String(item.paperStyle || "").trim(),
      evidenceName: String(item.evidenceName || "").trim(),
      createdAt: String(item.createdAt || "").trim(),
    });
  });

  facsimileState = {
    pendingReports: Array.from(pendingReportsById.values()),
    consumedReportIds: Array.isArray(value?.consumedReportIds)
      ? value.consumedReportIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [],
  };
}

export function getFacsimileState() {
  const pendingReports = Array.isArray(facsimileState.pendingReports)
    ? facsimileState.pendingReports.map((item) => ({ ...item }))
    : [];

  return {
    pendingReport: pendingReports[0] ? { ...pendingReports[0] } : null,
    pendingReports,
    consumedReportIds: Array.isArray(facsimileState.consumedReportIds)
      ? [...facsimileState.consumedReportIds]
      : [],
  };
}

export function resetFacsimileState() {
  facsimileState = {
    pendingReports: [],
    consumedReportIds: [],
  };
}
