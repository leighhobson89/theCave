import {
  getEvidenceStoreSnapshot,
  initializeEvidenceStoreForNewGame,
  setEvidenceStoreSnapshot,
} from "./evidenceManager.js";
import {
  getProgressEvidenceSnapshot,
  setProgressEvidenceSnapshot,
} from "./progressEvidenceManager.js";
import {
  getProgressTimeLineEventSnapshot,
  setProgressTimeLineEventSnapshot,
} from "./progressTimeLineEventManager.js";

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

// Desktop viewport / scene navigation (game.js)
export const ZOOM_LEVELS = [0.60, 0.65, 0.85, 1];
export const WORLD_WIDTH = 2600;
export const WORLD_HEIGHT = 1800;
export const PARALLAX_FACTOR = 0.1;
export const SCENE_FADE_DURATION_MS = 750;

// Menu language flag buttons, keyed by the language code they select (game.js, ui.js).
export const LANGUAGE_BUTTON_KEYS_BY_CODE = new Map([
  ["en", "btnEnglish"],
  ["es", "btnSpanish"],
  ["de", "btnGerman"],
  ["it", "btnItalian"],
  ["fr", "btnFrench"],
]);

// Desktop chrome / windows / notifications (ui.js)
export const REPORT_PAPER_STYLE_CLASS_PREFIX = "report-paper-style-";
export const PHOTO_PAPER_STYLE_CLASS_PREFIX = "photo-paper-style-";
export const PHOTO_FRAME_ASPECT_RATIO = 16 / 9;
export const PHOTO_FRAME_MAX_WIDTH = 760;
export const PHOTO_FRAME_MAX_HEIGHT = Math.round(PHOTO_FRAME_MAX_WIDTH / PHOTO_FRAME_ASPECT_RATIO);
export const DEBUG_WINDOW_COLOR = "rgb(108, 255, 64)";
export const NOTES_TAB_COLORS = [
  "#ffe2e2",
  "#ffe9d6",
  "#fff3c7",
  "#eef7bf",
  "#d9f7d2",
  "#d2f4ef",
  "#d9ebff",
  "#e5deff",
  "#f4dbff",
  "#ffdff0",
];
export const NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS = 3000;
export const AUTOSAVE_INDICATOR_VISIBLE_MS = 1600;
export const AUTOSAVE_INDICATOR_FADE_MS = 750;
export const NEW_GAME_WELCOME_FAX_DELAY_MS = 10000;
export const NEW_GAME_MISSING_REPORT_FAX_DELAY_MS = 30000;

// Sticky save (stickySave.js)
export const STICKY_SAVE_STORAGE_KEY = "theCave:sticky-save";
export const STICKY_AUTOSAVE_INTERVAL_MS = 60000;

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

// Quick login, keyed by websiteId ("police", "archives").
//
// Once the player manually authenticates above a site's public default level,
// the credentials that achieved it are remembered so they can be replayed with
// one click. Replaying goes back through the site's normal authenticate path
// rather than writing a session directly, so quick login can never grant a
// level the player did not actually earn manually. Only a *higher* level ever
// overwrites what is stored, so the button tracks the high-water mark.
let quickLoginState = {};

function readQuickLoginEntry(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const username = String(value.username ?? "").trim();
  const password = String(value.password ?? "");
  const accessLevel = Number(value.accessLevel);
  if (!username || !password || !Number.isFinite(accessLevel)) {
    return null;
  }

  return {
    username,
    password,
    accessLevel,
    accessLabel: String(value.accessLabel ?? "").trim(),
  };
}

let currentDesktopWindowZIndex = DESKTOP_WINDOW_BASE_Z_INDEX;

// Desktop viewport / scene navigation (game.js)
let gameplayInteractionsInitialized = false;
let currentZoomIndex = 0;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginPanX = 0;
let dragOriginPanY = 0;
let desktopObjectAudioBound = false;
let zoomReadoutFadeTimeoutId = null;
let sceneTransitionInProgress = false;

// Desktop chrome / windows / notifications (ui.js)
let ashtrayAnimationTimeoutId = null;
let facsimileFeedAnimationTimeoutId = null;
let evidenceMilestoneTriggersInitialized = false;
let nextRecordOpenFaxTriggerId = 1;
let recordOpenFaxTriggersInitialized = false;
let notificationReleaseIntervalId = null;
let autosaveIndicatorHideTimeoutId = null;
let autosaveIndicatorRemoveTimeoutId = null;
let newGameWelcomeFaxTimeoutId = null;
let newGameMissingReportFaxTimeoutId = null;

// Sticky save (stickySave.js)
let autosaveIntervalId = null;
let unloadFlushHandler = null;

// Web content registry (webContentRegistry.js)
let lastSelectedArchiveProvince = "Saskatchewan";

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
    progressEvidenceEnvelope: document.getElementById("progressEvidenceEnvelope"),
    progressEvidenceEnvelopeLabel: document.getElementById("progressEvidenceEnvelopeLabel"),
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
    newGameConfirmPopup: document.getElementById("newGameConfirmPopup"),
    newGameConfirmTitle: document.getElementById("newGameConfirmTitle"),
    newGameConfirmBody: document.getElementById("newGameConfirmBody"),
    newGameConfirmCancelButton: document.getElementById("newGameConfirmCancelButton"),
    newGameConfirmAcceptButton: document.getElementById("newGameConfirmAcceptButton"),
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
  // Just the activated progressEvidenceIds; the website/fax definitions
  // themselves are code (progressEvidenceManager.js) and are never duplicated
  // into the save.
  gameState.progressEvidence = getProgressEvidenceSnapshot();
  // Which photograph is in which frame, plus which frames have been validated
  // and locked. The frames and photographs themselves are content
  // (progressTimeLineEventManager.js) and are never duplicated here.
  gameState.progressTimeLineEvents = getProgressTimeLineEventSnapshot();
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
  gameState.quickLoginState = getQuickLoginState();
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
      // A save written before progress evidence existed has no field here;
      // setProgressEvidenceSnapshot() treats that as "nothing activated yet"
      // rather than failing, so older saves keep loading. It also de-duplicates,
      // so a hand-edited save cannot introduce repeated ids.
      setProgressEvidenceSnapshot(gameState.progressEvidence);
      // A save written before the timeline board existed has no field here;
      // setProgressTimeLineEventSnapshot() treats that as "nothing placed yet"
      // rather than failing. Each placement's correctness is recomputed against
      // the live registry on the way in, so re-authoring a frame's answer can
      // never leave a stale "correct" baked into an old save.
      setProgressTimeLineEventSnapshot(gameState.progressTimeLineEvents);
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
      setQuickLoginState(gameState.quickLoginState);
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

// `titlePrefix` lets the caller (ui.js, which knows the current language) seed
// fresh pages with a localized default title ("Página 1" etc.) at New Game
// time. Omitting it keeps the English default, e.g. for internal fallbacks.
export function resetNotesPagesState(titlePrefix) {
  notesPages = buildDefaultPages({ ...NOTES_PAGE_SPEC, titlePrefix: titlePrefix || NOTES_PAGE_SPEC.titlePrefix });
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

export function resetPaintPagesState(titlePrefix) {
  paintPages = buildDefaultPages({ ...PAINT_PAGE_SPEC, titlePrefix: titlePrefix || PAINT_PAGE_SPEC.titlePrefix });
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

export function getQuickLoginState() {
  const snapshot = {};
  Object.keys(quickLoginState).forEach((websiteId) => {
    const entry = readQuickLoginEntry(quickLoginState[websiteId]);
    if (entry) {
      snapshot[websiteId] = entry;
    }
  });

  return snapshot;
}

export function setQuickLoginState(value) {
  const nextState = {};
  if (value && typeof value === "object") {
    Object.keys(value).forEach((rawWebsiteId) => {
      const websiteId = String(rawWebsiteId).trim().toLowerCase();
      const entry = readQuickLoginEntry(value[rawWebsiteId]);
      if (websiteId && entry) {
        nextState[websiteId] = entry;
      }
    });
  }

  quickLoginState = nextState;
}

export function getQuickLoginEntry(websiteId) {
  const key = String(websiteId || "").trim().toLowerCase();
  return key ? readQuickLoginEntry(quickLoginState[key]) : null;
}

// Stores `entry` only when it beats the level already recorded for the site,
// which is what keeps the remembered level a high-water mark. Returns true when
// the stored entry actually changed.
export function recordQuickLogin(websiteId, entry) {
  const key = String(websiteId || "").trim().toLowerCase();
  const nextEntry = readQuickLoginEntry(entry);
  if (!key || !nextEntry) {
    return false;
  }

  const existing = readQuickLoginEntry(quickLoginState[key]);
  if (existing && existing.accessLevel >= nextEntry.accessLevel) {
    return false;
  }

  quickLoginState[key] = nextEntry;
  return true;
}

export function resetQuickLoginState() {
  quickLoginState = {};
}

export function getPoliceQuickLoginEnabled() {
  return getQuickLoginEntry("police") !== null;
}

export function getHighestPoliceLoginLevel() {
  return getQuickLoginEntry("police")?.accessLevel ?? 0;
}

export function getNewspaperQuickLoginEnabled() {
  return getQuickLoginEntry("archives") !== null;
}

//---- game.js: desktop viewport / scene state ----

export function getGameplayInteractionsInitialized() {
  return gameplayInteractionsInitialized;
}

export function setGameplayInteractionsInitialized(value) {
  gameplayInteractionsInitialized = value === true;
}

export function getCurrentZoomIndex() {
  return currentZoomIndex;
}

export function setCurrentZoomIndex(value) {
  currentZoomIndex = value;
}

export function getPanX() {
  return panX;
}

export function setPanX(value) {
  panX = value;
}

export function getPanY() {
  return panY;
}

export function setPanY(value) {
  panY = value;
}

export function getIsDragging() {
  return isDragging;
}

export function setIsDragging(value) {
  isDragging = value === true;
}

export function getDragStartX() {
  return dragStartX;
}

export function setDragStartX(value) {
  dragStartX = value;
}

export function getDragStartY() {
  return dragStartY;
}

export function setDragStartY(value) {
  dragStartY = value;
}

export function getDragOriginPanX() {
  return dragOriginPanX;
}

export function setDragOriginPanX(value) {
  dragOriginPanX = value;
}

export function getDragOriginPanY() {
  return dragOriginPanY;
}

export function setDragOriginPanY(value) {
  dragOriginPanY = value;
}

export function getDesktopObjectAudioBound() {
  return desktopObjectAudioBound;
}

export function setDesktopObjectAudioBound(value) {
  desktopObjectAudioBound = value === true;
}

export function getZoomReadoutFadeTimeoutId() {
  return zoomReadoutFadeTimeoutId;
}

export function setZoomReadoutFadeTimeoutId(value) {
  zoomReadoutFadeTimeoutId = value;
}

export function getSceneTransitionInProgress() {
  return sceneTransitionInProgress;
}

export function setSceneTransitionInProgress(value) {
  sceneTransitionInProgress = value === true;
}

//---- ui.js: desktop chrome / windows / notifications state ----

export function getAshtrayAnimationTimeoutId() {
  return ashtrayAnimationTimeoutId;
}

export function setAshtrayAnimationTimeoutId(value) {
  ashtrayAnimationTimeoutId = value;
}

export function getFacsimileFeedAnimationTimeoutId() {
  return facsimileFeedAnimationTimeoutId;
}

export function setFacsimileFeedAnimationTimeoutId(value) {
  facsimileFeedAnimationTimeoutId = value;
}

export function getEvidenceMilestoneTriggersInitialized() {
  return evidenceMilestoneTriggersInitialized;
}

export function setEvidenceMilestoneTriggersInitialized(value) {
  evidenceMilestoneTriggersInitialized = value === true;
}

export function getNextRecordOpenFaxTriggerId() {
  return nextRecordOpenFaxTriggerId;
}

export function setNextRecordOpenFaxTriggerId(value) {
  nextRecordOpenFaxTriggerId = value;
}

export function getRecordOpenFaxTriggersInitialized() {
  return recordOpenFaxTriggersInitialized;
}

export function setRecordOpenFaxTriggersInitialized(value) {
  recordOpenFaxTriggersInitialized = value === true;
}

export function getNotificationReleaseIntervalId() {
  return notificationReleaseIntervalId;
}

export function setNotificationReleaseIntervalId(value) {
  notificationReleaseIntervalId = value;
}

export function getAutosaveIndicatorHideTimeoutId() {
  return autosaveIndicatorHideTimeoutId;
}

export function setAutosaveIndicatorHideTimeoutId(value) {
  autosaveIndicatorHideTimeoutId = value;
}

export function getAutosaveIndicatorRemoveTimeoutId() {
  return autosaveIndicatorRemoveTimeoutId;
}

export function setAutosaveIndicatorRemoveTimeoutId(value) {
  autosaveIndicatorRemoveTimeoutId = value;
}

export function getNewGameWelcomeFaxTimeoutId() {
  return newGameWelcomeFaxTimeoutId;
}

export function setNewGameWelcomeFaxTimeoutId(value) {
  newGameWelcomeFaxTimeoutId = value;
}

export function getNewGameMissingReportFaxTimeoutId() {
  return newGameMissingReportFaxTimeoutId;
}

export function setNewGameMissingReportFaxTimeoutId(value) {
  newGameMissingReportFaxTimeoutId = value;
}

//---- stickySave.js: autosave timer state ----

export function getAutosaveIntervalId() {
  return autosaveIntervalId;
}

export function setAutosaveIntervalId(value) {
  autosaveIntervalId = value;
}

export function getUnloadFlushHandler() {
  return unloadFlushHandler;
}

export function setUnloadFlushHandler(value) {
  unloadFlushHandler = value;
}

//---- webContentRegistry.js: archive site UI state ----

export function getLastSelectedArchiveProvince() {
  return lastSelectedArchiveProvince;
}

export function setLastSelectedArchiveProvince(value) {
  lastSelectedArchiveProvince = value;
}
