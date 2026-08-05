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

//GLOBAL VARIABLES

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;

let autoSaveOn = false;
export let pauseAutoSaveCountdown = true;

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
    loadSaveGameStringTextArea: document.getElementById("loadSaveGameStringTextArea"),
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
    bookOne: document.getElementById("bookOne"),
    storyWindow: document.getElementById("storyWindow"),
    storyWindowHeader: document.getElementById("storyWindowHeader"),
    storyWindowTitle: document.getElementById("storyWindowTitle"),
    storyWindowClose: document.getElementById("storyWindowClose"),
    storyWindowResizeHandle: document.getElementById("storyWindowResizeHandle"),
    storyDocumentContent: document.getElementById("storyDocumentContent"),
    storyDocumentText: document.getElementById("storyDocumentText"),
    zoomReadout: document.getElementById("zoomReadout"),
    evidenceLabel: document.getElementById("evidenceLabel"),
    settingsToggle: document.getElementById("settingsToggle"),
    settingsItems: document.getElementById("settingsItems"),
    muteToggleButton: document.getElementById("muteToggleButton"),
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

  return gameState;
}
export function restoreGameStatus(gameState) {
  return new Promise((resolve, reject) => {
    try {
      // Game variables

      // Flags

      // UI elements

      setLanguage(gameState.language);

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

export function getCanvasWidth() {
  return GAME_CANVAS_WIDTH;
}

export function getCanvasHeight() {
  return GAME_CANVAS_HEIGHT;
}

export function getCanvasAspectRatio() {
  return GAME_ASPECT_RATIO;
}
