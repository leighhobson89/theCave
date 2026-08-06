import {
  createPhotoEvidence,
  createReportEvidence,
  getEvidenceCollection,
  getEvidenceIndex,
  getEvidenceStorageKeys,
  getEvidenceStoreSnapshot,
  initializeEvidenceStoreForNewGame,
  resolveEvidenceContentPath,
  setEvidenceIndex,
  setEvidenceStoreSnapshot,
  setPhotoCollectionFromPaths,
  setReportCollectionFromPaths,
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
const EVIDENCE_STORAGE_KEYS = getEvidenceStorageKeys();

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

let currentDesktopWindowZIndex = DESKTOP_WINDOW_BASE_Z_INDEX;

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

  // Legacy compatibility fields for older loaders/tools.
  gameState.currentCarouselIndex = getCurrentCarouselIndex();
  gameState.carouselItems = getCarouselItems();
  gameState.currentReportCarouselIndex = getCurrentReportCarouselIndex();
  gameState.reportCarouselItems = getReportCarouselItems();

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

      if (!setEvidenceStoreSnapshot(gameState.evidenceStore)) {
        initializeEvidenceStoreForNewGame();

        if (Array.isArray(gameState.carouselItems)) {
          setCarouselItems(gameState.carouselItems);
          setCurrentCarouselIndex(gameState.currentCarouselIndex ?? 0);
        }

        if (Array.isArray(gameState.reportCarouselItems)) {
          setReportCarouselItems(gameState.reportCarouselItems);
          setCurrentReportCarouselIndex(gameState.currentReportCarouselIndex ?? 0);
        }
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

export function getCurrentCarouselIndex() {
  return getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS);
}

export function setCurrentCarouselIndex(value) {
  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, value);
}

export function getCarouselItems() {
  return getEvidenceCollection(EVIDENCE_STORAGE_KEYS.PHOTOS).map((evidence) =>
    resolveEvidenceContentPath(evidence, getLanguage())
  );
}

export function getCurrentReportCarouselIndex() {
  return getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS);
}

export function setCurrentReportCarouselIndex(value) {
  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, value);
}

export function getReportCarouselItems() {
  return getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS).map((evidence) =>
    resolveEvidenceContentPath(evidence, getLanguage())
  );
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

export function setCarouselItems(items) {
  setPhotoCollectionFromPaths(items);
}

export function setReportCarouselItems(items) {
  setReportCollectionFromPaths(items);
}

export function addCarouselItem(path) {
  const evidence = createPhotoEvidence({ photoPath: path });
  if (!evidence) {
    return -1;
  }

  return getEvidenceCollection(EVIDENCE_STORAGE_KEYS.PHOTOS).findIndex((item) => item.id === evidence.id);
}

export function addReportCarouselItem(path) {
  const normalizedInput = String(path || "").trim();
  const reportName = normalizedInput
    .replace(/^\.\/assets\/reports\//, "")
    .replace(/_[a-z]{2}\.md$/i, "")
    .replace(/\.md$/i, "");

  if (!reportName) {
    return -1;
  }

  const evidence = createReportEvidence({
    reportName,
    storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  });

  return getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS).findIndex((item) => item.id === evidence.id);
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
