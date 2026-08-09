import {
  getEvidenceStoreSnapshot,
  initializeEvidenceStoreForNewGame,
  setEvidenceStoreSnapshot,
} from "./evidenceManager.js";

//DEBUG
export let debugFlag = false;
export let debugOptionFlag = false;
export let stateLoading = false;

//ELEMENTS
let elements;
let localization = {};
let language = "en";
let languageSelected = "en";
let oldLanguage = "en";

//CONSTANTS
export let gameState;
export const GAME_CANVAS_WIDTH = 1280;
export const GAME_CANVAS_HEIGHT = 720;
export const GAME_ASPECT_RATIO = GAME_CANVAS_WIDTH / GAME_CANVAS_HEIGHT;

export const MENU_STATE = "menuState";
export const GAME_VISIBLE_ACTIVE = "gameVisibleActive";
export const DESKTOP_WINDOW_BASE_Z_INDEX = 45;
export const NOTES_PAGE_COUNT = 10;
export const PAINT_PAGE_COUNT = 10;

//GLOBAL VARIABLES

//FLAGS
let audioMuted;
let musicVolumePreference = 0.1;
let sfxVolumePreference = 0.85;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;

let autoSaveOn = false;
export let pauseAutoSaveCountdown = true;
let evidenceCustomNames = {};
let notesPages = buildDefaultNotesPages();
let notesActivePageIndex = 0;
let paintPages = buildDefaultPaintPages();
let paintActivePageIndex = 0;
let ashtrayHasLitCigarette = true;
let ashtrayHasExtraButt = false;
let browserAddressHistory = [];

let currentDesktopWindowZIndex = DESKTOP_WINDOW_BASE_Z_INDEX;

function buildDefaultNotesPages() {
  return Array.from({ length: NOTES_PAGE_COUNT }, (_, index) => ({
    title: `Page ${index + 1}`,
    content: "",
  }));
}

function buildDefaultPaintPages() {
  return Array.from({ length: PAINT_PAGE_COUNT }, (_, index) => ({
    title: `Sketch ${index + 1}`,
    snapshot: "",
  }));
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
    desktopComputerRig: document.getElementById("desktopComputerRig"),
    desktopComputerHotspot: document.getElementById("desktopComputerHotspot"),
    settingsToggle: document.getElementById("settingsToggle"),
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
  };
}

export function setGameStateVariable(value) {
  gameState = value;
}

export function getGameStateVariable() {
  return gameState;
}

export function getElements() {
  return elements;
}

export function getLanguageChangedFlag() {
  return languageChangedFlag;
}

export function setLanguageChangedFlag(value) {
  languageChangedFlag = value;
}

export function resetAllVariables() {
  // GLOBAL VARIABLES
  // FLAGS
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
  gameState.browserAddressHistory = getBrowserAddressHistory();

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
      setBrowserAddressHistory(gameState.browserAddressHistory);

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

export function setOldLanguage(value) {
  oldLanguage = value;
}

export function getOldLanguage() {
  return oldLanguage;
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

export function setBrowserAddressHistory(value) {
  if (!Array.isArray(value)) {
    browserAddressHistory = [];
    return;
  }

  const deduped = [];
  const seen = new Set();

  value.forEach((entry) => {
    const normalized = String(entry ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    deduped.push(normalized);
  });

  browserAddressHistory = deduped.slice(-10);
}

export function getBrowserAddressHistory() {
  return Array.isArray(browserAddressHistory)
    ? [...browserAddressHistory]
    : [];
}

export function getMenuState() {
  return MENU_STATE;
}

export function getGameVisibleActive() {
  return GAME_VISIBLE_ACTIVE;
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

export function getDesktopWindowBaseZIndex() {
  return DESKTOP_WINDOW_BASE_Z_INDEX;
}

export function getCurrentDesktopWindowZIndex() {
  return currentDesktopWindowZIndex;
}

export function setCurrentDesktopWindowZIndex(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return;
  }

  currentDesktopWindowZIndex = Math.max(parsed, DESKTOP_WINDOW_BASE_Z_INDEX);
}

export function getNextDesktopWindowZIndex() {
  currentDesktopWindowZIndex += 1;
  return currentDesktopWindowZIndex;
}

export function getCanvasWidth() {
  return GAME_CANVAS_WIDTH;
}

export function getCanvasHeight() {
  return GAME_CANVAS_HEIGHT;
}

export function getCanvasAspectRatio() {
  return GAME_ASPECT_RATIO;
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
  return notesPages.map((page) => ({
    title: String(page?.title || "").trim(),
    content: String(page?.content || ""),
  }));
}

export function setNotesPages(value) {
  const sourcePages = Array.isArray(value) ? value : [];
  const defaults = buildDefaultNotesPages();

  notesPages = defaults.map((defaultPage, index) => {
    const inputPage = sourcePages[index] || {};
    const normalizedTitle = String(inputPage?.title || "").trim();

    return {
      title: normalizedTitle || defaultPage.title,
      content: String(inputPage?.content || ""),
    };
  });
}

export function resetNotesPagesState() {
  notesPages = buildDefaultNotesPages();
  notesActivePageIndex = 0;
}

export function getPaintPages() {
  return paintPages.map((page) => ({
    title: String(page?.title || "").trim(),
    snapshot: String(page?.snapshot || ""),
  }));
}

export function setPaintPages(value) {
  const sourcePages = Array.isArray(value) ? value : [];
  const defaults = buildDefaultPaintPages();

  paintPages = defaults.map((defaultPage, index) => {
    const inputPage = sourcePages[index] || {};
    const normalizedTitle = String(inputPage?.title || "").trim();

    return {
      title: normalizedTitle || defaultPage.title,
      snapshot: String(inputPage?.snapshot || ""),
    };
  });
}

export function resetPaintPagesState() {
  paintPages = buildDefaultPaintPages();
  paintActivePageIndex = 0;
}

export function getPaintActivePageIndex() {
  return paintActivePageIndex;
}

export function setPaintActivePageIndex(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    paintActivePageIndex = 0;
    return;
  }

  paintActivePageIndex = Math.min(PAINT_PAGE_COUNT - 1, Math.max(0, parsed));
}

export function getNotesActivePageIndex() {
  return notesActivePageIndex;
}

export function setNotesActivePageIndex(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    notesActivePageIndex = 0;
    return;
  }

  notesActivePageIndex = Math.min(NOTES_PAGE_COUNT - 1, Math.max(0, parsed));
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
