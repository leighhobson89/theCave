import {
  getAshtrayHasExtraButt,
  getAshtrayHasLitCigarette,
  captureGameStatusForSaving,
  gameState,
  getEvidenceCustomName,
  getLanguage,
  getNotesActivePageIndex,
  getNotesPages,
  NOTES_PAGE_COUNT,
  PAINT_PAGE_COUNT,
  getPaintActivePageIndex,
  getPaintPages,
  resetAshtrayState,
  resetNotesPagesState,
  resetPaintPagesState,
  setElements,
  setAshtrayHasExtraButt,
  setAshtrayHasLitCigarette,
  setEvidenceCustomName,
  setEvidenceCustomNames,
  getElements,
  setBeginGameStatus,
  getGameInProgress,
  setGameInProgress,
  getGameVisibleActive,
  getMenuState,
  getLanguageSelected,
  setLanguageSelected,
  setLanguage,
  setNotesActivePageIndex,
  setNotesPages,
  setPaintActivePageIndex,
  setPaintPages,
  getNextDesktopWindowZIndex,
} from "./constantsAndGlobalVars.js";
import {
  createPhotoEvidence,
  createReportEvidence,
  getCurrentEvidence,
  getEvidenceCollection,
  getEvidenceIndex,
  getEvidenceStoreSnapshot,
  getEvidenceStorageKeys,
  initializeEvidenceStoreForNewGame,
  resolveEvidenceContentPath,
  setEvidenceIndex,
  stepEvidenceIndex,
} from "./evidenceManager.js";
import { setGameState, startGame } from "./game.js";
import { audioManager } from "./audioManager.js";
import { DesktopWindow } from "./desktopWindow.js";
import { initLocalization, localize } from "./localization.js";
import {
  loadGameOption,
  loadGame,
  pasteLoadStringFromClipboard,
  saveGame,
  copySaveStringToClipBoard,
} from "./saveLoadGame.js";

const storyTextCacheByLanguage = new Map();
const legacyTextCacheByPath = new Map();
const reportCatalogCacheByLanguage = new Map();
const photoCatalogCacheByLanguage = new Map();
const activeDesktopWindows = new Set();
const desktopWindowKinds = new WeakMap();
const storyWindowContentRefs = new WeakMap();
const photosWindowContentRefs = new WeakMap();
const reportsWindowContentRefs = new WeakMap();
const notesWindowContentRefs = new WeakMap();
const computerWindowContentRefs = new WeakMap();
const EVIDENCE_STORAGE_KEYS = getEvidenceStorageKeys();
const REPORT_PAPER_STYLE_CLASS_PREFIX = "report-paper-style-";
const PHOTO_PAPER_STYLE_CLASS_PREFIX = "photo-paper-style-";
const REPORTS_CATALOG_PATH_TEMPLATE = "./assets/reportsEvidences_{lang}.json";
const PHOTOS_CATALOG_PATH_TEMPLATE = "./assets/photos_evidences_{lang}.json";
const DEBUG_WINDOW_COLOR = "rgb(108, 255, 64)";
const NOTES_TAB_COLORS = [
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
let debugWindowController = null;
let computerWindowController = null;
let ashtrayAnimationTimeoutId = null;

function syncAshtrayVisualState() {
  const ashtrayElement = getElements().desktopAshtray;
  if (!ashtrayElement) {
    return;
  }

  ashtrayElement.classList.toggle("has-lit-cig", getAshtrayHasLitCigarette());
  ashtrayElement.classList.toggle("has-extra-butt", getAshtrayHasExtraButt());
  ashtrayElement.classList.remove("is-extinguishing", "is-relighting");
}

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  syncAshtrayVisualState();
  initializeAudioControls();
  initializeStoryWindowControls();
  updateDesktopCalendarDate();

  getElements().newGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    initializeEvidenceStoreForNewGame();
    setEvidenceCustomNames({});
    resetNotesPagesState();
    resetPaintPagesState();
    resetAshtrayState();
    syncAshtrayVisualState();
    setBeginGameStatus(true);
    if (!getGameInProgress()) {
      setGameInProgress(true);
    }
    disableActivateButton(
      getElements().resumeGameMenuButton,
      "active",
      "btn-primary"
    );
    disableActivateButton(
      getElements().saveGameButton,
      "active",
      "btn-primary"
    );
    setGameState(getGameVisibleActive());
    startGame(true);
    audioManager.startBackgroundMusicForGame();
    refreshAudioControlsDisplay();
  });

  getElements().resumeGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    if (gameState === getMenuState()) {
      setGameState(getGameVisibleActive());
    }
    startGame(false);
  });

  document.addEventListener("keydown", (event) => {
    if (
      isEvidenceDebugToggleKey(event) &&
      gameState === getGameVisibleActive() &&
      !isTypingIntoField(event)
    ) {
      event.preventDefault();
      toggleEvidenceDebugWindow();
      return;
    }

    if (event.key === "Escape" && gameState === getGameVisibleActive()) {
      setGameState(getMenuState());
    }
  });

  getElements().btnEnglish.addEventListener("click", async () => {
    audioManager.onUserGesture();
    await handleLanguageChange("en");
    setGameState(getMenuState());
  });

  getElements().btnSpanish.addEventListener("click", async () => {
    audioManager.onUserGesture();
    await handleLanguageChange("es");
    setGameState(getMenuState());
  });

  getElements().btnGerman.addEventListener("click", async () => {
    audioManager.onUserGesture();
    await handleLanguageChange("de");
    setGameState(getMenuState());
  });

  getElements().btnItalian.addEventListener("click", async () => {
    audioManager.onUserGesture();
    await handleLanguageChange("it");
    setGameState(getMenuState());
  });

  getElements().btnFrench.addEventListener("click", async () => {
    audioManager.onUserGesture();
    await handleLanguageChange("fr");
    setGameState(getMenuState());
  });

  getElements().saveGameButton.addEventListener("click", function () {
    audioManager.onUserGesture();
    getElements().overlay.classList.remove("d-none");
    saveGame(true);
  });

  getElements().loadGameButton.addEventListener("click", function () {
    audioManager.onUserGesture();
    getElements().overlay.classList.remove("d-none");
    loadGameOption();
  });

  getElements().copyButtonSavePopup.addEventListener("click", function () {
    audioManager.onUserGesture();
    copySaveStringToClipBoard();
  });

  getElements().pasteButtonLoadPopup.addEventListener("click", async function () {
    audioManager.onUserGesture();
    await pasteLoadStringFromClipboard();
  });

  getElements().closeButtonSavePopup.addEventListener("click", function () {
    audioManager.onUserGesture();
    getElements().saveLoadPopup.classList.add("d-none");
    getElements().overlay.classList.add("d-none");
  });

  getElements().loadStringButton.addEventListener("click", function () {
    audioManager.onUserGesture();
    loadGame(true)
      .then(() => {
        setElements();
        syncAshtrayVisualState();
        audioManager.syncFromSavedPreferences();
        refreshAudioControlsDisplay();
        getElements().saveLoadPopup.classList.add("d-none");
        document.getElementById("overlay").classList.add("d-none");
        setGameInProgress(true);
        setGameState(getGameVisibleActive());
        startGame(false);
        audioManager.startBackgroundMusicForGame();
      })
      .catch((error) => {
        console.error("Error loading game:", error);
      });
  });
  await handleLanguageChange(getLanguageSelected());
  setGameState(getMenuState());
});

async function setElementsLanguageText() {
  // Localization text
  getElements().menuTitle.innerHTML = `${localize(
    "menuTitle",
    getLanguage()
  )}`;
  getElements().newGameMenuButton.innerHTML = `${localize(
    "newGame",
    getLanguage()
  )}`;
  getElements().resumeGameMenuButton.innerHTML = `${localize(
    "resumeGame",
    getLanguage()
  )}`;
  getElements().loadGameButton.innerHTML = `${localize(
    "loadGame",
    getLanguage()
  )}`;
  getElements().saveGameButton.innerHTML = `${localize(
    "saveGame",
    getLanguage()
  )}`;
  getElements().loadStringButton.innerHTML = `${localize(
    "loadButton",
    getLanguage()
  )}`;
  if (getElements().pasteButtonLoadPopup) {
    getElements().pasteButtonLoadPopup.textContent = localize(
      "pasteButton",
      getLanguage()
    );
  }
  getElements().copyButtonSavePopup.innerHTML = `${localize(
    "copyButton",
    getLanguage()
  )}`;
  getElements().closeButtonSavePopup.innerHTML = `${localize(
    "closeButton",
    getLanguage()
  )}`;
  getElements().zoomReadout.innerHTML = `${localize(
    "zoomLabel",
    getLanguage()
  )} 3/5`;
  getElements().backgroundFolderLabel.textContent = localize(
    "backgroundStory",
    getLanguage(),
  );

  getElements().reportsFolderLabel.textContent = localize(
    "reports",
    getLanguage(),
  );

  getElements().photosFolderLabel.textContent = localize("photos", getLanguage());
  getElements().notesLabel.textContent = localize("notes", getLanguage());
  getElements().musicVolumeLabel.innerHTML = `${localize(
    "musicVolume",
    getLanguage()
  )}`;
  getElements().sfxVolumeLabel.innerHTML = `${localize("sfxVolume", getLanguage())}`;
  refreshMuteButtonLabel();
  refreshMusicTransportControls();
  refreshOpenWindowLocalization();
  updateDesktopCalendarDate();
}

function updateDesktopCalendarDate() {
  const calendarMonthElement = getElements().desktopCalendar?.querySelector(".calendar-month");
  const calendarDayElement = getElements().desktopCalendar?.querySelector(".calendar-day");

  if (!calendarMonthElement || !calendarDayElement) {
    return;
  }

  const now = new Date();
  const monthText = new Intl.DateTimeFormat(undefined, { month: "short" })
    .format(now)
    .replace(/\./g, "")
    .toUpperCase();

  calendarMonthElement.textContent = monthText;
  calendarDayElement.textContent = String(now.getDate());
}

function isTypingIntoField(event) {
  const eventTarget = event.target;
  if (!(eventTarget instanceof Element)) {
    return false;
  }

  return Boolean(
    eventTarget.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='plaintext-only']"
    )
  );
}

function isEvidenceDebugToggleKey(event) {
  return event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract";
}

function createEvidenceDebugWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("debug-window-content");

  const row = document.createElement("div");
  row.classList.add("debug-window-row");

  const label = document.createElement("div");
  label.classList.add("debug-window-label");
  label.textContent = "Log Evidences";

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("debug-window-button");
  button.textContent = "Log";

  row.append(label, button);
  container.appendChild(row);

  return {
    container,
    logButton: button,
  };
}

function buildResolvedEvidenceView(languageCode) {
  const resolvedView = {};
  Object.values(EVIDENCE_STORAGE_KEYS).forEach((storageKey) => {
    const collection = getEvidenceCollection(storageKey);
    const index = getEvidenceIndex(storageKey);

    resolvedView[storageKey] = {
      currentIndex: index,
      total: collection.length,
      items: collection.map((evidence) => ({
        ...evidence,
        resolvedPath: resolveEvidenceContentPath(evidence, languageCode),
      })),
    };
  });

  return resolvedView;
}

function logEvidenceDebugSnapshot() {
  const now = new Date().toISOString();
  const languageCode = getLanguage();
  const evidenceStoreSnapshot = getEvidenceStoreSnapshot();
  const resolvedEvidenceView = buildResolvedEvidenceView(languageCode);
  const savePayloadSnapshot = captureGameStatusForSaving();
  const serializedSavePayload = JSON.stringify(savePayloadSnapshot);

  let compressedSavePayload = null;
  if (window.LZString?.compressToEncodedURIComponent) {
    compressedSavePayload = window.LZString.compressToEncodedURIComponent(serializedSavePayload);
  }

  console.group(`[Evidence Debug] ${now}`);
  console.log("Language:", languageCode);
  console.log("Evidence store in memory (raw):", evidenceStoreSnapshot);
  console.log("Evidence store by collection with resolved paths:", resolvedEvidenceView);
  console.log("Save payload object (captureGameStatusForSaving):", savePayloadSnapshot);
  console.log("Save payload JSON length:", serializedSavePayload.length);

  if (compressedSavePayload !== null) {
    console.log("Compressed save length:", compressedSavePayload.length);
    console.log(
      "Compressed save preview:",
      `${compressedSavePayload.slice(0, 180)}${compressedSavePayload.length > 180 ? "..." : ""}`
    );
  } else {
    console.log("Compressed save preview unavailable: LZString global not found.");
  }

  console.groupEnd();
}

function openEvidenceDebugWindow() {
  if (!getElements().gameArea) {
    return;
  }

  const contentRefs = createEvidenceDebugWindowContentElements();
  contentRefs.logButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickSwitch");
    logEvidenceDebugSnapshot();
  });

  let nextController = null;
  nextController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["debug-window"],
    title: "Debug Tools",
    windowColor: DEBUG_WINDOW_COLOR,
    showCarouselNavigation: false,
    closeButtonAriaLabel: "Close debug window",
    onClose: () => {
      unregisterDesktopWindow(nextController);
      if (debugWindowController === nextController) {
        debugWindowController = null;
      }
      audioManager.playSfx("clickSwitch");
    },
  });

  nextController.setContent(contentRefs.container);
  nextController.scrollContainerElement = contentRefs.container;
  registerDesktopWindow(nextController, "debug");
  nextController.open({ resizable: true, showScrollbar: false });
  bringDesktopWindowToFront(nextController);

  debugWindowController = nextController;
  audioManager.playSfx("clickSwitch");
}

function toggleEvidenceDebugWindow() {
  if (debugWindowController?.rootElement) {
    debugWindowController.close();
    return;
  }

  openEvidenceDebugWindow();
}

export async function handleLanguageChange(languageCode) {
  setLanguageSelected(languageCode);
  await setupLanguageAndLocalization();
  setElementsLanguageText();
}

async function setupLanguageAndLocalization() {
  setLanguage(getLanguageSelected());
  await initLocalization(getLanguage());
}

export function disableActivateButton(button, action, activeClass) {
  switch (action) {
    case "active":
      button.classList.remove("disabled");
      button.classList.add(activeClass);
      break;
    case "disable":
      button.classList.remove(activeClass);
      button.classList.add("disabled");
      break;
  }
}

function initializeAudioControls() {
  refreshAudioControlsDisplay();

  getElements().muteToggleButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    const isMuted = audioManager.toggleMuted();
    refreshMuteButtonLabel();
    refreshMusicTransportControls();
    if (!isMuted) {
      audioManager.playSfx("clickSwitch");
    }
  });

  getElements().musicPlayPauseButton?.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.toggleMusicPlayback();
    audioManager.playSfx("clickSwitch");
    refreshMusicTransportControls();
  });

  getElements().musicNextButton?.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playNextRandomTrack();
    audioManager.playSfx("clickSwitch");
    refreshMusicTransportControls();
  });

  getElements().musicVolumeSlider.addEventListener("input", (event) => {
    audioManager.onUserGesture();
    const volume = Number(event.target.value) / 100;
    audioManager.setMusicVolume(volume);
    getElements().musicVolumeValue.textContent = `${event.target.value}%`;
    refreshMusicTransportControls();
  });

  getElements().sfxVolumeSlider.addEventListener("input", (event) => {
    audioManager.onUserGesture();
    const volume = Number(event.target.value) / 100;
    audioManager.setSfxVolume(volume);
    getElements().sfxVolumeValue.textContent = `${event.target.value}%`;
  });

  refreshMuteButtonLabel();
  refreshMusicTransportControls();
}

function refreshAudioControlsDisplay() {
  const musicPercent = Math.round(audioManager.musicVolume * 100);
  const sfxPercent = Math.round(audioManager.sfxVolume * 100);

  if (getElements().musicVolumeSlider) {
    getElements().musicVolumeSlider.value = String(musicPercent);
  }
  if (getElements().sfxVolumeSlider) {
    getElements().sfxVolumeSlider.value = String(sfxPercent);
  }
  if (getElements().musicVolumeValue) {
    getElements().musicVolumeValue.textContent = `${musicPercent}%`;
  }
  if (getElements().sfxVolumeValue) {
    getElements().sfxVolumeValue.textContent = `${sfxPercent}%`;
  }

  refreshMuteButtonLabel();
  refreshMusicTransportControls();
}

function refreshMuteButtonLabel() {
  const muteStateKey = audioManager.getMuted() ? "muteOn" : "muteOff";
  getElements().muteToggleButton.innerHTML = `${localize(
    "mute",
    getLanguage()
  )}: ${localize(muteStateKey, getLanguage())}`;
}

function refreshMusicTransportControls() {
  if (!getElements().musicPlayPauseButton || !getElements().musicNextButton) {
    return;
  }

  const isPlaying = audioManager.isMusicPlaying();
  getElements().musicPlayPauseButton.textContent = isPlaying ? "⏸" : "▶";
  getElements().musicPlayPauseButton.setAttribute(
    "aria-label",
    isPlaying ? "Pause music" : "Play music"
  );
  getElements().musicPlayPauseButton.title = isPlaying ? "Pause" : "Play";

  getElements().musicNextButton.textContent = "⏭";
  getElements().musicNextButton.setAttribute("aria-label", "Next track");
  getElements().musicNextButton.title = "Next";
}

function initializeStoryWindowControls() {
  if (!getElements().backgroundFolder || !getElements().photosFolder || !getElements().reportsFolder) {
    return;
  }

  getElements().backgroundFolder.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind("story")) {
      return;
    }

    openStoryWindow(false, false);
  });

  getElements().photosFolder.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind("photos")) {
      return;
    }

    openPhotosWindow();
  });

  getElements().reportsFolder.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind("reports")) {
      return;
    }

    openReportsWindow();
  });

  if (getElements().notesFolder) {
    getElements().notesFolder.addEventListener("click", () => {
      if (toggleExistingWindowsByKind("notes")) {
        return;
      }

      openNotesWindow();
    });
  }

  if (getElements().desktopCalendar) {
    getElements().desktopCalendar.addEventListener("click", () => {
      audioManager.onUserGesture();
      audioManager.playSfx("clickSwitch");
      setGameState(getMenuState());
    });
  }

  if (getElements().desktopAshtrayHotspot && getElements().desktopAshtray) {
    const activateAshtray = () => {
      audioManager.onUserGesture();
      audioManager.playSfx("clickButton");

      const ashtrayElement = getElements().desktopAshtray;
      if (!ashtrayElement) {
        return;
      }

      if (
        ashtrayElement.classList.contains("is-extinguishing")
        || ashtrayElement.classList.contains("is-relighting")
      ) {
        return;
      }

      if (ashtrayAnimationTimeoutId) {
        clearTimeout(ashtrayAnimationTimeoutId);
        ashtrayAnimationTimeoutId = null;
      }

      const hasLitCigarette = ashtrayElement.classList.contains("has-lit-cig");

      if (hasLitCigarette) {
        ashtrayElement.classList.add("is-extinguishing");

        ashtrayAnimationTimeoutId = window.setTimeout(() => {
          ashtrayElement.classList.remove("is-extinguishing");
          ashtrayElement.classList.remove("has-lit-cig");
          ashtrayElement.classList.add("has-extra-butt");
          setAshtrayHasLitCigarette(false);
          setAshtrayHasExtraButt(true);
          ashtrayAnimationTimeoutId = null;
        }, 620);

        return;
      }

      ashtrayElement.classList.add("has-lit-cig");
      ashtrayElement.classList.add("is-relighting");
      setAshtrayHasLitCigarette(true);

      ashtrayAnimationTimeoutId = window.setTimeout(() => {
        ashtrayElement.classList.remove("is-relighting");
        ashtrayAnimationTimeoutId = null;
      }, 620);
    };

    getElements().desktopAshtrayHotspot.addEventListener("click", activateAshtray);
  }

  if (getElements().desktopComputerHotspot || getElements().desktopComputerRig) {
    const computerTrigger = getElements().desktopComputerHotspot || getElements().desktopComputerRig;
    const openComputerRig = () => {
      audioManager.onUserGesture();
      audioManager.playSfx("clickButton");

      if (toggleExistingWindowsByKind("computer")) {
        return;
      }

      openComputerWindow();
    };

    computerTrigger.addEventListener("click", openComputerRig);
    computerTrigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openComputerRig();
    });
  }
}

function toggleExistingWindowsByKind(kind) {
  const matchingWindows = [];

  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) === kind) {
      matchingWindows.push(windowController);
    }
  });

  if (!matchingWindows.length) {
    return false;
  }

  matchingWindows.forEach((windowController) => {
    windowController.close();
  });

  return true;
}

function registerDesktopWindow(windowController, kind) {
  activeDesktopWindows.add(windowController);
  desktopWindowKinds.set(windowController, kind);

  if (windowController?.rootElement) {
    windowController.rootElement.addEventListener("pointerdown", () => {
      bringDesktopWindowToFront(windowController);
    });
  }
}

function unregisterDesktopWindow(windowController) {
  activeDesktopWindows.delete(windowController);
}

function bringDesktopWindowToFront(windowController) {
  if (!windowController?.rootElement) {
    return;
  }

  const nextZIndex = getNextDesktopWindowZIndex();
  windowController.rootElement.style.zIndex = String(nextZIndex);
}

function refreshOpenWindowLocalization() {
  activeDesktopWindows.forEach((windowController) => {
    const windowKind = desktopWindowKinds.get(windowController);

    if (windowKind === "story") {
      windowController.setTitle(localize("backgroundStory", getLanguage()));
      updateStoryWindowContent(windowController);
      return;
    }

    if (windowKind === "photos") {
      windowController.setTitle(localize("photos", getLanguage()));
      updatePhotosWindowContent(windowController);
      return;
    }

    if (windowKind === "reports") {
      windowController.setTitle(localize("reports", getLanguage()));
      updateReportsWindowContent(windowController);
      return;
    }

    if (windowKind === "notes") {
      windowController.setTitle(localize("notes", getLanguage()));
      return;
    }

    if (windowKind === "computer-notes") {
      windowController.setTitle(localize("notes", getLanguage()));
      return;
    }

    if (windowKind === "computer-paint") {
      windowController.setTitle("Paint");
      return;
    }

    if (windowKind === "computer-netscape") {
      windowController.setTitle("Netscape");
      return;
    }

    if (windowKind === "computer") {
      windowController.setTitle("Computer");
    }
  });
}

function updateComputerDesktopClock(refs) {
  if (!refs?.minuteHand || !refs?.hourHand || !refs?.secondHand || !refs?.dateText) {
    return;
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const secondAngle = seconds * 6;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const hourAngle = ((hours % 12) + minutes / 60) * 30;

  refs.secondHand.style.transform = `rotate(${secondAngle}deg)`;
  refs.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
  refs.hourHand.style.transform = `rotate(${hourAngle}deg)`;

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  refs.dateText.textContent = dateFormatter.format(now);
}

function createComputerWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("computer-desktop", "scrollbars-hidden");

  const header = document.createElement("div");
  header.classList.add("computer-desktop-header");
  header.textContent = "CAVE OS 1996";

  const subHeader = document.createElement("div");
  subHeader.classList.add("computer-desktop-subheader");
  subHeader.textContent = "ui://desktop";

  const iconsGrid = document.createElement("div");
  iconsGrid.classList.add("computer-icons-grid");

  const createIconButton = (labelText, className) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("computer-icon", className);
    button.setAttribute("aria-label", labelText);

    const pixelArt = document.createElement("span");
    pixelArt.classList.add("computer-icon-pixel", `${className}-pixel`);

    const label = document.createElement("span");
    label.classList.add("computer-icon-label");
    label.textContent = labelText;

    button.append(pixelArt, label);
    return button;
  };

  const notesIcon = createIconButton("Notes", "computer-icon-notes");
  const paintIcon = createIconButton("Paint", "computer-icon-paint");
  const netscapeIcon = createIconButton("Netscape", "computer-icon-netscape");

  const clockPanel = document.createElement("button");
  clockPanel.type = "button";
  clockPanel.classList.add("computer-clock-panel");
  clockPanel.setAttribute("aria-label", "Open main menu");
  clockPanel.title = "Open main menu";

  const analogClock = document.createElement("div");
  analogClock.classList.add("computer-analog-clock");

  const centerDot = document.createElement("span");
  centerDot.classList.add("computer-clock-center");

  const hourHand = document.createElement("span");
  hourHand.classList.add("computer-clock-hand", "computer-clock-hour");

  const minuteHand = document.createElement("span");
  minuteHand.classList.add("computer-clock-hand", "computer-clock-minute");

  const secondHand = document.createElement("span");
  secondHand.classList.add("computer-clock-hand", "computer-clock-second");

  analogClock.append(hourHand, minuteHand, secondHand, centerDot);

  const dateText = document.createElement("div");
  dateText.classList.add("computer-clock-date");

  const clockHint = document.createElement("div");
  clockHint.classList.add("computer-clock-hint");
  clockHint.textContent = "MENU";

  clockPanel.append(analogClock, dateText, clockHint);

  iconsGrid.append(notesIcon, paintIcon, netscapeIcon);
  container.append(header, subHeader, iconsGrid, clockPanel);

  const refs = {
    container,
    notesIcon,
    paintIcon,
    netscapeIcon,
    clockPanel,
    dateText,
    hourHand,
    minuteHand,
    secondHand,
    clockIntervalId: null,
    appWindows: new Set(),
  };

  updateComputerDesktopClock(refs);
  refs.clockIntervalId = window.setInterval(() => {
    updateComputerDesktopClock(refs);
  }, 1000);

  return refs;
}

function createComputerPaintWindowContentElements() {
  const PAINT_BACKGROUND_COLOR = "#041204";
  const PAINT_DEFAULT_COLOR = "#76ff62";
  const SNAPSHOT_TYPE = "image/webp";
  const SNAPSHOT_QUALITY = 0.82;

  const container = document.createElement("div");
  container.classList.add("caveos-paint-app");

  const toolbar = document.createElement("div");
  toolbar.classList.add("caveos-paint-toolbar");

  const toolButtons = [];
  const toolNames = ["pen", "line", "rect", "eraser", "fill"];

  toolNames.forEach((toolName, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("caveos-paint-tool");
    if (index === 0) {
      button.classList.add("is-active");
    }
    button.dataset.tool = toolName;
    button.textContent = toolName.toUpperCase();
    toolbar.appendChild(button);
    toolButtons.push(button);
  });

  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = "1";
  sizeInput.max = "18";
  sizeInput.value = "3";
  sizeInput.classList.add("caveos-paint-size");
  sizeInput.setAttribute("aria-label", "Brush size");

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#76ff62";
  colorInput.classList.add("caveos-paint-color");
  colorInput.setAttribute("aria-label", "Paint color");

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.classList.add("caveos-paint-tool", "caveos-paint-clear");
  clearButton.dataset.action = "clear";
  clearButton.textContent = "CLEAR";

  toolbar.append(sizeInput, colorInput, clearButton);

  const canvasColumn = document.createElement("div");
  canvasColumn.classList.add("caveos-paint-canvas-column");

  const canvasWrap = document.createElement("div");
  canvasWrap.classList.add("caveos-paint-canvas-wrap");

  const canvas = document.createElement("canvas");
  canvas.classList.add("caveos-paint-canvas");
  canvas.width = 1024;
  canvas.height = 640;
  canvasWrap.appendChild(canvas);

  canvasColumn.appendChild(canvasWrap);

  const tabsColumn = document.createElement("div");
  tabsColumn.classList.add("caveos-paint-tabs-column", "scrollbars-hidden");

  const tabsList = document.createElement("div");
  tabsList.classList.add("notes-tabs-list", "caveos-paint-tabs-list");
  tabsColumn.appendChild(tabsList);

  container.append(toolbar, canvasColumn, tabsColumn);

  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = PAINT_BACKGROUND_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = PAINT_DEFAULT_COLOR;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  let currentTool = "pen";
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let previewSnapshot = null;
  let renderToken = 0;

  const parseColor = (hexColor) => {
    const normalized = String(hexColor || "").trim();
    const match = /^#([0-9a-f]{6})$/i.exec(normalized);
    if (!match) {
      return [118, 255, 98, 255];
    }

    const value = match[1];
    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
      255,
    ];
  };

  const colorsEqual = (data, index, target) => (
    data[index] === target[0]
    && data[index + 1] === target[1]
    && data[index + 2] === target[2]
    && data[index + 3] === target[3]
  );

  const setPixelColor = (data, index, color) => {
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = color[3];
  };

  const floodFill = (startXCoord, startYCoord, fillColorHex) => {
    if (!context) {
      return;
    }

    const boundedX = Math.max(0, Math.min(canvas.width - 1, Math.floor(startXCoord)));
    const boundedY = Math.max(0, Math.min(canvas.height - 1, Math.floor(startYCoord)));
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const fillColor = parseColor(fillColorHex);
    const startIndex = (boundedY * canvas.width + boundedX) * 4;
    const targetColor = [
      data[startIndex],
      data[startIndex + 1],
      data[startIndex + 2],
      data[startIndex + 3],
    ];

    if (
      targetColor[0] === fillColor[0]
      && targetColor[1] === fillColor[1]
      && targetColor[2] === fillColor[2]
      && targetColor[3] === fillColor[3]
    ) {
      return;
    }

    const stack = [[boundedX, boundedY]];
    while (stack.length) {
      const next = stack.pop();
      if (!next) {
        continue;
      }

      const x = next[0];
      const y = next[1];
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
        continue;
      }

      const pixelIndex = (y * canvas.width + x) * 4;
      if (!colorsEqual(data, pixelIndex, targetColor)) {
        continue;
      }

      setPixelColor(data, pixelIndex, fillColor);
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    context.putImageData(imageData, 0, 0);
  };

  const fillCanvasBackground = () => {
    if (!context) {
      return;
    }

    context.globalCompositeOperation = "source-over";
    context.fillStyle = PAINT_BACKGROUND_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  const snapshotCurrentCanvas = () => {
    const pngFallbackDataUrl = canvas.toDataURL();
    try {
      const preferredDataUrl = canvas.toDataURL(SNAPSHOT_TYPE, SNAPSHOT_QUALITY);
      if (typeof preferredDataUrl === "string" && preferredDataUrl.startsWith("data:image/")) {
        return preferredDataUrl;
      }
    } catch (error) {
      // Fall through to PNG fallback.
    }

    return pngFallbackDataUrl;
  };

  const restoreCanvasSnapshot = (snapshot) => new Promise((resolve) => {
    fillCanvasBackground();
    if (!snapshot || !context) {
      applyToolStyles();
      resolve();
      return;
    }

    const nextToken = renderToken + 1;
    renderToken = nextToken;

    const image = new Image();
    image.onload = () => {
      if (renderToken !== nextToken) {
        resolve();
        return;
      }

      fillCanvasBackground();
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      applyToolStyles();
      resolve();
    };
    image.onerror = () => {
      if (renderToken === nextToken) {
        fillCanvasBackground();
        applyToolStyles();
      }
      resolve();
    };
    image.src = snapshot;
  });

  const readPaintPosition = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const applyToolStyles = () => {
    if (!context) {
      return;
    }

    const size = Math.max(1, Number.parseInt(sizeInput.value, 10) || 3);
    if (currentTool === "eraser") {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = PAINT_BACKGROUND_COLOR;
      context.fillStyle = PAINT_BACKGROUND_COLOR;
      context.lineWidth = size * 2;
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = colorInput.value;
      context.fillStyle = colorInput.value;
      context.lineWidth = size;
    }
  };

  const refs = {
    container,
    canvas,
    context,
    colorInput,
    sizeInput,
    tabsList,
    pageRows: [],
    activePageIndex: 0,
  };

  const persistActivePaintPageContent = () => {
    const pages = getPaintPages();
    if (!pages.length) {
      return;
    }

    const activeIndex = Math.min(
      pages.length - 1,
      Math.max(0, Number.parseInt(getPaintActivePageIndex(), 10) || 0)
    );
    const existingPage = pages[activeIndex] || {
      title: `Sketch ${activeIndex + 1}`,
      snapshot: "",
    };
    const nextSnapshot = snapshotCurrentCanvas();

    if (String(existingPage.snapshot || "") === nextSnapshot) {
      return;
    }

    pages[activeIndex] = {
      ...existingPage,
      snapshot: nextSnapshot,
    };

    setPaintPages(pages);
  };

  const refreshPaintPageCommitState = (pageRowRefs) => {
    if (!pageRowRefs?.titleInput || !pageRowRefs?.commitButton) {
      return;
    }

    const normalizedInput = String(pageRowRefs.titleInput.value || "").trim();
    const normalizedCommitted = String(pageRowRefs.committedTitle || "").trim();
    pageRowRefs.commitButton.disabled = !normalizedInput || normalizedInput === normalizedCommitted;
  };

  const commitPaintPageTitle = (pageRowRefs) => {
    if (!pageRowRefs) {
      return;
    }

    const nextTitle = String(pageRowRefs.titleInput.value || "").trim();
    if (!nextTitle) {
      pageRowRefs.titleInput.value = pageRowRefs.committedTitle;
      refreshPaintPageCommitState(pageRowRefs);
      return;
    }

    if (nextTitle === String(pageRowRefs.committedTitle || "").trim()) {
      pageRowRefs.commitButton.disabled = true;
      return;
    }

    const pages = getPaintPages();
    const existingPage = pages[pageRowRefs.pageIndex] || {
      title: `Sketch ${pageRowRefs.pageIndex + 1}`,
      snapshot: "",
    };

    pages[pageRowRefs.pageIndex] = {
      ...existingPage,
      title: nextTitle,
    };

    setPaintPages(pages);
    pageRowRefs.committedTitle = nextTitle;
    pageRowRefs.titleInput.value = nextTitle;
    pageRowRefs.commitButton.disabled = true;
  };

  const renderPaintWindowContent = async () => {
    const pages = getPaintPages();
    if (!pages.length) {
      fillCanvasBackground();
      return;
    }

    const activeIndex = Math.min(
      pages.length - 1,
      Math.max(0, Number.parseInt(getPaintActivePageIndex(), 10) || 0)
    );

    setPaintActivePageIndex(activeIndex);
    refs.activePageIndex = activeIndex;

    refs.pageRows.forEach((pageRowRefs) => {
      const pageData = pages[pageRowRefs.pageIndex] || {
        title: `Sketch ${pageRowRefs.pageIndex + 1}`,
        snapshot: "",
      };
      const normalizedTitle = String(pageData.title || "").trim() || `Sketch ${pageRowRefs.pageIndex + 1}`;
      const isActive = pageRowRefs.pageIndex === activeIndex;

      pageRowRefs.root.classList.toggle("is-active", isActive);
      pageRowRefs.activateButton.setAttribute("aria-pressed", String(isActive));
      pageRowRefs.activateButton.setAttribute("aria-label", `Open ${normalizedTitle}`);
      pageRowRefs.committedTitle = normalizedTitle;
      pageRowRefs.titleInput.value = normalizedTitle;
      pageRowRefs.commitButton.disabled = true;
    });

    await restoreCanvasSnapshot(String(pages[activeIndex]?.snapshot || ""));
  };

  const setActivePaintPage = async (requestedIndex) => {
    const boundedIndex = Math.min(
      PAINT_PAGE_COUNT - 1,
      Math.max(0, Number.parseInt(requestedIndex, 10) || 0)
    );

    persistActivePaintPageContent();
    setPaintActivePageIndex(boundedIndex);
    await renderPaintWindowContent();
  };

  for (let index = 0; index < PAINT_PAGE_COUNT; index += 1) {
    const row = document.createElement("div");
    row.classList.add("notes-page-tab-row", "caveos-paint-page-row");
    row.style.setProperty("--notes-tab-color", NOTES_TAB_COLORS[index % NOTES_TAB_COLORS.length]);

    const activateButton = document.createElement("button");
    activateButton.type = "button";
    activateButton.classList.add("notes-page-tab-activate", "caveos-paint-page-activate");
    activateButton.textContent = String(index + 1);

    const titleBar = document.createElement("div");
    titleBar.classList.add("evidence-title-bar", "notes-page-title-bar");

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.classList.add("evidence-title-input", "notes-page-title-input", "caveos-paint-page-title-input");
    titleInput.placeholder = `Sketch ${index + 1}`;
    titleInput.setAttribute("aria-label", `Title for sketch ${index + 1}`);

    const commitButton = document.createElement("button");
    commitButton.type = "button";
    commitButton.classList.add("evidence-title-commit", "notes-page-title-commit");
    commitButton.textContent = "✓";
    commitButton.setAttribute("aria-label", `Apply title for sketch ${index + 1}`);
    commitButton.disabled = true;

    titleBar.append(titleInput, commitButton);
    row.append(activateButton, titleBar);
    tabsList.appendChild(row);

    const pageRowRefs = {
      pageIndex: index,
      root: row,
      activateButton,
      titleInput,
      commitButton,
      committedTitle: `Sketch ${index + 1}`,
    };

    activateButton.addEventListener("click", async () => {
      await setActivePaintPage(index);
    });

    titleInput.addEventListener("input", () => {
      refreshPaintPageCommitState(pageRowRefs);
    });

    titleInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      commitPaintPageTitle(pageRowRefs);
    });

    commitButton.addEventListener("click", () => {
      commitPaintPageTitle(pageRowRefs);
    });

    refs.pageRows.push(pageRowRefs);
  }

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentTool = button.dataset.tool || "pen";
      toolButtons.forEach((candidate) => {
        candidate.classList.toggle("is-active", candidate === button);
      });
      applyToolStyles();
    });
  });

  clearButton.addEventListener("click", () => {
    if (!context) {
      return;
    }

    fillCanvasBackground();
    applyToolStyles();
    persistActivePaintPageContent();
  });

  const handlePointerMove = (event) => {
    if (!isDrawing || !context) {
      return;
    }

    const position = readPaintPosition(event);

    if (currentTool === "pen" || currentTool === "eraser") {
      context.beginPath();
      context.moveTo(lastX, lastY);
      context.lineTo(position.x, position.y);
      context.stroke();
      lastX = position.x;
      lastY = position.y;
      return;
    }

    if (!previewSnapshot) {
      return;
    }

    context.putImageData(previewSnapshot, 0, 0);
    context.beginPath();
    if (currentTool === "line") {
      context.moveTo(startX, startY);
      context.lineTo(position.x, position.y);
      context.stroke();
      return;
    }

    if (currentTool === "rect") {
      context.strokeRect(startX, startY, position.x - startX, position.y - startY);
    }
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (!context) {
      return;
    }

    const position = readPaintPosition(event);

    if (currentTool === "fill") {
      floodFill(position.x, position.y, colorInput.value);
      persistActivePaintPageContent();
      return;
    }

    applyToolStyles();

    isDrawing = true;
    startX = position.x;
    startY = position.y;
    lastX = position.x;
    lastY = position.y;
    previewSnapshot = context.getImageData(0, 0, canvas.width, canvas.height);

    if (currentTool === "pen" || currentTool === "eraser") {
      context.beginPath();
      context.moveTo(position.x, position.y);
      context.lineTo(position.x + 0.01, position.y + 0.01);
      context.stroke();
    }

    if (typeof event.pointerId === "number") {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer capture failures for non-primary/synthetic pointer events.
      }
    }
  });

  canvas.addEventListener("pointermove", handlePointerMove);

  const stopDraw = (event) => {
    if (!isDrawing) {
      return;
    }

    handlePointerMove(event);
    isDrawing = false;
    previewSnapshot = null;
    persistActivePaintPageContent();
    if (typeof event.pointerId === "number") {
      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        // Ignore pointer release failures when capture was never established.
      }
    }
  };

  canvas.addEventListener("pointerup", stopDraw);
  canvas.addEventListener("pointercancel", stopDraw);

  renderPaintWindowContent();

  return refs;
}

function createComputerNetscapeWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("caveos-browser-app");

  const topBar = document.createElement("div");
  topBar.classList.add("caveos-browser-topbar");
  topBar.textContent = "Netscape Navigator 3.0";

  const addressRow = document.createElement("div");
  addressRow.classList.add("caveos-browser-address-row");

  const label = document.createElement("span");
  label.textContent = "URL:";

  const fakeAddress = document.createElement("div");
  fakeAddress.classList.add("caveos-browser-address");
  fakeAddress.textContent = "http://cave-net.local/offline";

  addressRow.append(label, fakeAddress);

  const body = document.createElement("div");
  body.classList.add("caveos-browser-body");
  body.textContent = "No modem signal detected. Explore the cave to reconnect.";

  container.append(topBar, addressRow, body);
  return container;
}

function positionWindowWithinParent(rootElement, parentElement, widthScale = 1) {
  if (!(rootElement instanceof HTMLElement) || !(parentElement instanceof HTMLElement)) {
    return;
  }

  const parentWidth = parentElement.clientWidth;
  const parentHeight = parentElement.clientHeight;

  const baseWidth = rootElement.offsetWidth || Math.round(parentWidth * 0.88);
  const scaledWidth = Math.min(
    Math.round(baseWidth * Math.max(0.5, Number(widthScale) || 1)),
    Math.round(parentWidth * 0.96)
  );
  const nextHeight = Math.min(
    rootElement.offsetHeight || Math.round(parentHeight * 0.76),
    Math.round(parentHeight * 0.94)
  );

  const nextLeft = Math.max(0, Math.round((parentWidth - scaledWidth) / 2));
  const nextTop = Math.max(0, Math.round((parentHeight - nextHeight) / 2));

  rootElement.style.width = `${scaledWidth}px`;
  rootElement.style.height = `${nextHeight}px`;
  rootElement.style.left = `${nextLeft}px`;
  rootElement.style.top = `${nextTop}px`;
  rootElement.style.transform = "none";
}

function openComputerAppWindow({
  parentElement,
  kind,
  title,
  classNames = [],
  contentNode,
  appWindowSet,
  resizable = true,
  showScrollbar = false,
  centerWithinParent = true,
  widthScale = 1,
}) {
  if (!parentElement || !(contentNode instanceof Node)) {
    return null;
  }

  let appWindowController = null;
  appWindowController = new DesktopWindow({
    parentElement,
    classNames: ["caveos-app-window", ...classNames],
    title,
    showCarouselNavigation: false,
    closeButtonAriaLabel: `Close ${title} window`,
    onClose: () => {
      unregisterDesktopWindow(appWindowController);
      if (appWindowSet) {
        appWindowSet.delete(appWindowController);
      }
      audioManager.playSfx("clickSwitch");
    },
  });

  appWindowController.setContent(contentNode);
  appWindowController.scrollContainerElement = contentNode;
  registerDesktopWindow(appWindowController, kind);
  appWindowController.open({ resizable, showScrollbar });

  if (centerWithinParent) {
    positionWindowWithinParent(appWindowController.rootElement, parentElement, widthScale);
  }

  bringDesktopWindowToFront(appWindowController);

  if (appWindowSet) {
    appWindowSet.add(appWindowController);
  }

  return appWindowController;
}

async function getStoryText(language, forceReload = false) {
  const storyEvidence = getCurrentEvidence(EVIDENCE_STORAGE_KEYS.BACKGROUND_STORY);
  const storyLanguage = language || "en";
  const storyPath = storyEvidence
    ? resolveEvidenceContentPath(storyEvidence, storyLanguage)
    : `assets/story_${storyLanguage}.md`;

  if (!forceReload && storyTextCacheByLanguage.has(storyPath)) {
    return storyTextCacheByLanguage.get(storyPath);
  }

  try {
    const response = await fetch(storyPath);
    if (!response.ok) {
      throw new Error(`Failed to load story: ${response.status}`);
    }

    const storyText = await response.text();
    storyTextCacheByLanguage.set(storyPath, storyText);
    return storyText;
  } catch (error) {
    console.error("Error fetching story markdown:", error);
    const fallbackStory = "Unable to load story content.";
    storyTextCacheByLanguage.set(storyPath, fallbackStory);
    return fallbackStory;
  }
}

async function openStoryWindow(resizable = false, showScrollbar = true) {
  if (!getElements().gameArea) {
    return;
  }

  const storyPaperWrap = document.createElement("div");
  storyPaperWrap.classList.add("story-paper-wrap");

  const storyDocumentContent = document.createElement("div");
  storyDocumentContent.classList.add("story-document-content");

  const storyPaperclip = document.createElement("div");
  storyPaperclip.classList.add("story-paperclip");
  storyPaperclip.setAttribute("aria-hidden", "true");

  const storyDocumentText = document.createElement("div");
  storyDocumentText.classList.add("story-document-text");

  storyDocumentContent.append(storyPaperclip, storyDocumentText);
  storyPaperWrap.appendChild(storyDocumentContent);

  let storyWindowController = null;
  storyWindowController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window"],
    title: localize("backgroundStory", getLanguage()),
    showCarouselNavigation: false,
    closeButtonAriaLabel: "Close story window",
    onClose: () => {
      unregisterDesktopWindow(storyWindowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  storyWindowController.setContent(storyPaperWrap);
  storyWindowController.scrollContainerElement = storyDocumentContent;
  registerDesktopWindow(storyWindowController, "story");
  storyWindowContentRefs.set(storyWindowController, {
    storyDocumentContent,
    storyDocumentText,
  });

  storyWindowController.open({ resizable, showScrollbar });
  bringDesktopWindowToFront(storyWindowController);
  updateStoryWindowContent(storyWindowController, true);
}

async function updateStoryWindowContent(windowController, forceReload = false) {
  const refs = storyWindowContentRefs.get(windowController);
  if (!refs) {
    return;
  }

  refs.storyDocumentText.textContent = "Loading story...";
  const storyText = await getStoryText(getLanguage(), forceReload);
  refs.storyDocumentText.textContent = storyText;
  refs.storyDocumentContent.scrollTop = 0;
}

function applyReportPaperStyle(reportPaperWrapElement, paperStyle) {
  if (!reportPaperWrapElement) {
    return;
  }

  reportPaperWrapElement.className = "report-paper-wrap";

  const styleSuffix = String(paperStyle || "report-parchment").trim();
  if (!styleSuffix) {
    return;
  }

  reportPaperWrapElement.classList.add(`${REPORT_PAPER_STYLE_CLASS_PREFIX}${styleSuffix}`);
}

function getEvidenceDefaultTitle(evidence) {
  if (!evidence) {
    return "Untitled Evidence";
  }

  const candidate = String(evidence.defaultTitleString || evidence.name || "").trim();
  return candidate || "Untitled Evidence";
}

function getEvidenceDisplayTitle(evidence) {
  if (!evidence?.id) {
    return "Untitled Evidence";
  }

  const custom = getEvidenceCustomName(evidence.id);
  return custom || getEvidenceDefaultTitle(evidence);
}

function buildEvidenceWithCatalogDefaults(evidence, catalogEntry) {
  if (!evidence) {
    return evidence;
  }

  const nextEvidence = { ...evidence };
  const catalogTitle = sanitizeCatalogText(catalogEntry?.defaultTitleString).trim();
  const catalogPaperStyle = String(catalogEntry?.paperStyle || "").trim();

  if (catalogTitle) {
    nextEvidence.defaultTitleString = catalogTitle;
  }

  if (catalogPaperStyle) {
    nextEvidence.paperStyle = catalogPaperStyle;
  }

  return nextEvidence;
}

function normalizeLanguageCode(languageCode) {
  return String(languageCode || "en").trim() || "en";
}

function resolveCatalogPath(pathTemplate, languageCode) {
  const language = normalizeLanguageCode(languageCode);
  return String(pathTemplate || "").replaceAll("{lang}", language);
}

function getCatalogEntryIdFromEvidence(evidence) {
  const entryId = String(evidence?.source?.entryId || evidence?.name || "").trim();
  return entryId;
}

function normalizeCatalogEntries(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.entries)
      ? payload.entries
      : [];

  const index = new Map();
  entries.forEach((entry) => {
    const id = String(entry?.id || "").trim();
    if (!id) {
      return;
    }

    index.set(id, entry);
  });

  return index;
}

function sanitizeCatalogText(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

async function loadEvidenceCatalogByLanguage({
  cacheMap,
  languageCode,
  pathTemplate,
  fallbackTemplate,
  catalogLabel,
  forceReload = false,
}) {
  const language = normalizeLanguageCode(languageCode);
  const resolvedTemplate = String(pathTemplate || fallbackTemplate || "").trim();
  if (!resolvedTemplate) {
    return new Map();
  }

  const cacheKey = `${resolvedTemplate}|${language}`;
  if (!forceReload && cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  const tryLoad = async (targetLanguage) => {
    const catalogPath = resolveCatalogPath(resolvedTemplate, targetLanguage);
    const response = await fetch(catalogPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${catalogLabel} catalog: ${response.status}`);
    }

    const payload = await response.json();
    return normalizeCatalogEntries(payload);
  };

  try {
    const index = await tryLoad(language);
    cacheMap.set(cacheKey, index);
    return index;
  } catch (error) {
    if (language !== "en") {
      try {
        const fallbackIndex = await tryLoad("en");
        cacheMap.set(cacheKey, fallbackIndex);
        return fallbackIndex;
      } catch (fallbackError) {
        console.error(`Error fetching ${catalogLabel} catalog JSON:`, fallbackError);
      }
    } else {
      console.error(`Error fetching ${catalogLabel} catalog JSON:`, error);
    }

    const emptyIndex = new Map();
    cacheMap.set(cacheKey, emptyIndex);
    return emptyIndex;
  }
}

async function getReportCatalogEntry(evidence, languageCode, forceReload = false) {
  const catalogPathTemplate =
    evidence?.source?.catalogPathTemplate || REPORTS_CATALOG_PATH_TEMPLATE;
  const catalogIndex = await loadEvidenceCatalogByLanguage({
    cacheMap: reportCatalogCacheByLanguage,
    languageCode,
    pathTemplate: catalogPathTemplate,
    fallbackTemplate: REPORTS_CATALOG_PATH_TEMPLATE,
    catalogLabel: "report evidence",
    forceReload,
  });

  return catalogIndex.get(getCatalogEntryIdFromEvidence(evidence)) || null;
}

async function getPhotoCatalogEntry(evidence, languageCode, forceReload = false) {
  const catalogPathTemplate =
    evidence?.source?.catalogPathTemplate || PHOTOS_CATALOG_PATH_TEMPLATE;
  const catalogIndex = await loadEvidenceCatalogByLanguage({
    cacheMap: photoCatalogCacheByLanguage,
    languageCode,
    pathTemplate: catalogPathTemplate,
    fallbackTemplate: PHOTOS_CATALOG_PATH_TEMPLATE,
    catalogLabel: "photo evidence",
    forceReload,
  });

  return catalogIndex.get(getCatalogEntryIdFromEvidence(evidence)) || null;
}

async function resolvePhotoContentPath(evidence, languageCode) {
  const catalogEntry = await getPhotoCatalogEntry(evidence, languageCode);
  const localizedPhotoPath = String(catalogEntry?.photoPath || "").trim();
  if (localizedPhotoPath) {
    return localizedPhotoPath;
  }

  return resolveEvidenceContentPath(evidence, languageCode);
}

function resolveLegacyEvidenceDescriptionPath(evidence, languageCode) {
  const contentPath = resolveEvidenceContentPath(evidence, languageCode);
  if (!contentPath) {
    return "";
  }

  const normalizedPath = String(contentPath).trim();

  if (/_[a-z]{2}\.md$/i.test(normalizedPath)) {
    return normalizedPath.replace(/_([a-z]{2})\.md$/i, "Desc_$1.md");
  }

  if (/\.(png|jpe?g|webp|gif)$/i.test(normalizedPath)) {
    const lang = normalizeLanguageCode(languageCode);
    return normalizedPath.replace(/\.(png|jpe?g|webp|gif)$/i, `Desc_${lang}.md`);
  }

  if (/\.md$/i.test(normalizedPath)) {
    const lang = normalizeLanguageCode(languageCode);
    return normalizedPath.replace(/\.md$/i, `Desc_${lang}.md`);
  }

  return "";
}

async function getLegacyTextByPath(path, {
  forceReload = false,
  fallbackText = "",
  label = "content",
} = {}) {
  const resolvedPath = String(path || "").trim();
  if (!resolvedPath) {
    return fallbackText;
  }

  if (!forceReload && legacyTextCacheByPath.has(resolvedPath)) {
    return legacyTextCacheByPath.get(resolvedPath);
  }

  try {
    const response = await fetch(resolvedPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${label}: ${response.status}`);
    }

    const text = await response.text();
    legacyTextCacheByPath.set(resolvedPath, text);
    return text;
  } catch (error) {
    console.error(`Error fetching ${label}:`, error);
    legacyTextCacheByPath.set(resolvedPath, fallbackText);
    return fallbackText;
  }
}

async function getDescriptionTextByEvidence(
  evidence,
  languageCode,
  forceReload = false,
  preloadedCatalogEntry = null
) {
  const evidenceType = String(evidence?.type || "").trim();

  if (evidenceType === "report") {
    const reportEntry = preloadedCatalogEntry
      || await getReportCatalogEntry(evidence, languageCode, forceReload);
    const descriptionText = sanitizeCatalogText(reportEntry?.descriptionText).trim();
    if (descriptionText) {
      return descriptionText;
    }
  }

  if (evidenceType === "photo") {
    const photoEntry = preloadedCatalogEntry
      || await getPhotoCatalogEntry(evidence, languageCode, forceReload);
    const descriptionText = sanitizeCatalogText(photoEntry?.descriptionText).trim();
    if (descriptionText) {
      return descriptionText;
    }
  }

  const legacyDescriptionPath = resolveLegacyEvidenceDescriptionPath(evidence, languageCode);
  return getLegacyTextByPath(legacyDescriptionPath, {
    forceReload,
    fallbackText: "Description unavailable.",
    label: "description",
  });
}

function getDescriptionPaperStyleFromEvidence(evidence) {
  const requestedStyle = String(evidence?.descriptionPaperStyle || "").trim();
  if (requestedStyle) {
    return requestedStyle;
  }

  const sourceStyle = String(evidence?.paperStyle || "").trim();
  if (sourceStyle.startsWith("report-parchment")) {
    return sourceStyle;
  }

  switch (sourceStyle) {
    case "photo-mounted-ivory":
      return "report-parchment";
    case "photo-mounted-linen":
      return "report-parchment-ash";
    case "photo-mounted-chalk":
      return "report-parchment-sepia";
    case "photo-mounted-aged":
      return "report-parchment-char";
    default:
      return "report-parchment-moss";
  }
}

function syncEvidenceTitleWidth(refs, sourceElement) {
  if (!refs?.titleBarElement || !sourceElement) {
    return;
  }

  const width = Math.max(1, Math.round(sourceElement.getBoundingClientRect().width));
  refs.titleBarElement.style.width = `${width}px`;
}

function syncPhotoDescriptionHeight(refs, sourceElement) {
  if (!refs?.descriptionOuterElement || !sourceElement) {
    return;
  }

  const height = Math.max(1, Math.round(sourceElement.getBoundingClientRect().height));
  refs.descriptionOuterElement.style.height = `${height}px`;
}

function createEvidenceTitleBarElements() {
  const titleBar = document.createElement("div");
  titleBar.classList.add("evidence-title-bar");

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.classList.add("evidence-title-input");
  titleInput.placeholder = "Evidence title";
  titleInput.setAttribute("aria-label", "Evidence title");

  const commitButton = document.createElement("button");
  commitButton.type = "button";
  commitButton.classList.add("evidence-title-commit");
  commitButton.textContent = "✓";
  commitButton.disabled = true;
  commitButton.setAttribute("aria-label", "Apply evidence title");

  titleBar.append(titleInput, commitButton);

  return {
    titleBar,
    titleInput,
    commitButton,
    currentEvidenceId: "",
    currentCommittedTitle: "",
  };
}

function syncEvidenceTitleEditor(refs, evidence) {
  if (!refs?.titleInput || !refs?.commitButton) {
    return;
  }

  const displayTitle = getEvidenceDisplayTitle(evidence);
  refs.currentEvidenceId = evidence?.id ? String(evidence.id) : "";
  refs.currentCommittedTitle = displayTitle;
  refs.titleInput.value = displayTitle;
  refs.commitButton.disabled = true;
}

function wireEvidenceTitleEditor({ refs, storageKey, onCommitted }) {
  if (!refs?.titleInput || !refs?.commitButton) {
    return;
  }

  const refreshCommitDisabledState = () => {
    const normalizedInput = String(refs.titleInput.value || "").trim();
    const normalizedCommitted = String(refs.currentCommittedTitle || "").trim();
    refs.commitButton.disabled = !normalizedInput || normalizedInput === normalizedCommitted;
  };

  const commitTitle = () => {
    const currentEvidence = getCurrentEvidence(storageKey);
    if (!currentEvidence?.id) {
      return;
    }

    const normalizedInput = String(refs.titleInput.value || "").trim();
    if (!normalizedInput) {
      refs.titleInput.value = refs.currentCommittedTitle || getEvidenceDefaultTitle(currentEvidence);
      refreshCommitDisabledState();
      return;
    }

    if (normalizedInput === String(refs.currentCommittedTitle || "").trim()) {
      refs.commitButton.disabled = true;
      return;
    }

    setEvidenceCustomName(currentEvidence.id, normalizedInput);
    refs.currentCommittedTitle = normalizedInput;
    refs.currentEvidenceId = String(currentEvidence.id);
    refs.titleInput.value = normalizedInput;
    refs.commitButton.disabled = true;

    if (typeof onCommitted === "function") {
      onCommitted(currentEvidence);
    }
  };

  refs.titleInput.addEventListener("input", refreshCommitDisabledState);
  refs.titleInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitTitle();
  });

  refs.commitButton.addEventListener("click", () => {
    commitTitle();
  });
}

function persistActiveNotesPageContent(refs) {
  if (!refs?.textarea) {
    return;
  }

  const pages = getNotesPages();
  if (!pages.length) {
    return;
  }

  const activeIndex = Math.min(
    pages.length - 1,
    Math.max(0, Number.parseInt(getNotesActivePageIndex(), 10) || 0)
  );
  const existingPage = pages[activeIndex] || { title: `Page ${activeIndex + 1}`, content: "" };
  const nextContent = String(refs.textarea.value || "");

  if (String(existingPage.content || "") === nextContent) {
    return;
  }

  pages[activeIndex] = {
    ...existingPage,
    content: nextContent,
  };

  setNotesPages(pages);
}

function refreshNotesPageCommitState(pageRowRefs) {
  if (!pageRowRefs?.titleInput || !pageRowRefs?.commitButton) {
    return;
  }

  const normalizedInput = String(pageRowRefs.titleInput.value || "").trim();
  const normalizedCommitted = String(pageRowRefs.committedTitle || "").trim();
  pageRowRefs.commitButton.disabled = !normalizedInput || normalizedInput === normalizedCommitted;
}

function commitNotesPageTitle(refs, pageRowRefs) {
  if (!refs || !pageRowRefs) {
    return;
  }

  const nextTitle = String(pageRowRefs.titleInput.value || "").trim();
  if (!nextTitle) {
    pageRowRefs.titleInput.value = pageRowRefs.committedTitle;
    refreshNotesPageCommitState(pageRowRefs);
    return;
  }

  if (nextTitle === String(pageRowRefs.committedTitle || "").trim()) {
    pageRowRefs.commitButton.disabled = true;
    return;
  }

  const pages = getNotesPages();
  const existingPage = pages[pageRowRefs.pageIndex] || {
    title: `Page ${pageRowRefs.pageIndex + 1}`,
    content: "",
  };

  pages[pageRowRefs.pageIndex] = {
    ...existingPage,
    title: nextTitle,
  };

  setNotesPages(pages);
  pageRowRefs.committedTitle = nextTitle;
  pageRowRefs.titleInput.value = nextTitle;
  pageRowRefs.commitButton.disabled = true;
}

function renderNotesWindowContent(refs) {
  if (!refs?.textarea || !Array.isArray(refs.pageRows)) {
    return;
  }

  const pages = getNotesPages();
  if (!pages.length) {
    refs.textarea.value = "";
    return;
  }

  const activeIndex = Math.min(
    pages.length - 1,
    Math.max(0, Number.parseInt(getNotesActivePageIndex(), 10) || 0)
  );
  setNotesActivePageIndex(activeIndex);
  refs.activePageIndex = activeIndex;
  refs.textarea.value = String(pages[activeIndex]?.content || "");

  refs.pageRows.forEach((pageRowRefs) => {
    const pageData = pages[pageRowRefs.pageIndex] || {
      title: `Page ${pageRowRefs.pageIndex + 1}`,
      content: "",
    };
    const normalizedTitle = String(pageData.title || "").trim() || `Page ${pageRowRefs.pageIndex + 1}`;
    const isActive = pageRowRefs.pageIndex === activeIndex;

    pageRowRefs.root.classList.toggle("is-active", isActive);
    pageRowRefs.activateButton.setAttribute("aria-pressed", String(isActive));
    pageRowRefs.activateButton.setAttribute("aria-label", `Open ${normalizedTitle}`);
    pageRowRefs.committedTitle = normalizedTitle;
    pageRowRefs.titleInput.value = normalizedTitle;
    pageRowRefs.commitButton.disabled = true;
  });
}

function setActiveNotesPage(refs, requestedIndex) {
  if (!refs) {
    return;
  }

  const boundedIndex = Math.min(NOTES_PAGE_COUNT - 1, Math.max(0, Number.parseInt(requestedIndex, 10) || 0));
  persistActiveNotesPageContent(refs);
  setNotesActivePageIndex(boundedIndex);
  renderNotesWindowContent(refs);
  refs.textarea.focus();
}

function createNotesWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("notes-window-container");

  const editorColumn = document.createElement("div");
  editorColumn.classList.add("notes-editor-column");

  const textarea = document.createElement("textarea");
  textarea.classList.add("notes-editor-textarea", "scrollbars-hidden");
  textarea.spellcheck = false;
  textarea.placeholder = "Write notes...";
  textarea.setAttribute("aria-label", "Notes page content");

  editorColumn.appendChild(textarea);

  const tabsColumn = document.createElement("div");
  tabsColumn.classList.add("notes-tabs-column", "scrollbars-hidden");

  const tabsList = document.createElement("div");
  tabsList.classList.add("notes-tabs-list");
  tabsColumn.appendChild(tabsList);

  const refs = {
    container,
    textarea,
    tabsList,
    pageRows: [],
    activePageIndex: 0,
  };

  for (let index = 0; index < NOTES_PAGE_COUNT; index += 1) {
    const row = document.createElement("div");
    row.classList.add("notes-page-tab-row");
    row.style.setProperty("--notes-tab-color", NOTES_TAB_COLORS[index % NOTES_TAB_COLORS.length]);

    const activateButton = document.createElement("button");
    activateButton.type = "button";
    activateButton.classList.add("notes-page-tab-activate");
    activateButton.textContent = String(index + 1);

    const titleBar = document.createElement("div");
    titleBar.classList.add("evidence-title-bar", "notes-page-title-bar");

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.classList.add("evidence-title-input", "notes-page-title-input");
    titleInput.placeholder = `Page ${index + 1}`;
    titleInput.setAttribute("aria-label", `Title for notes page ${index + 1}`);

    const commitButton = document.createElement("button");
    commitButton.type = "button";
    commitButton.classList.add("evidence-title-commit", "notes-page-title-commit");
    commitButton.textContent = "✓";
    commitButton.setAttribute("aria-label", `Apply title for notes page ${index + 1}`);
    commitButton.disabled = true;

    titleBar.append(titleInput, commitButton);
    row.append(activateButton, titleBar);
    tabsList.appendChild(row);

    const pageRowRefs = {
      pageIndex: index,
      root: row,
      activateButton,
      titleInput,
      commitButton,
      committedTitle: `Page ${index + 1}`,
    };

    activateButton.addEventListener("click", () => {
      setActiveNotesPage(refs, index);
    });

    titleInput.addEventListener("input", () => {
      refreshNotesPageCommitState(pageRowRefs);
    });

    titleInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      commitNotesPageTitle(refs, pageRowRefs);
    });

    commitButton.addEventListener("click", () => {
      commitNotesPageTitle(refs, pageRowRefs);
    });

    refs.pageRows.push(pageRowRefs);
  }

  textarea.addEventListener("focusout", () => {
    persistActiveNotesPageContent(refs);
  });

  container.append(editorColumn, tabsColumn);
  return refs;
}

function createPhotosWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("photos-carousel-container");

  const titleEditorRefs = createEvidenceTitleBarElements();

  const mediaViewport = document.createElement("div");
  mediaViewport.classList.add("photos-media-viewport");

  const photoPaperWrap = document.createElement("div");
  photoPaperWrap.classList.add("photo-paper-wrap");

  const image = document.createElement("img");
  image.classList.add("photos-carousel-image");

  const emptyState = document.createElement("div");
  emptyState.classList.add("photos-carousel-empty", "d-none");

  const counter = document.createElement("div");
  counter.classList.add("photos-carousel-counter");

  const descriptionOuter = document.createElement("div");
  descriptionOuter.classList.add("evidence-description-outer");

  const descriptionPaperWrap = document.createElement("div");
  descriptionPaperWrap.classList.add("report-paper-wrap", "evidence-description-paper-wrap");

  const descriptionText = document.createElement("div");
  descriptionText.classList.add("evidence-description-text", "scrollbars-hidden");
  descriptionText.textContent = "Loading description...";

  descriptionPaperWrap.appendChild(descriptionText);
  descriptionOuter.appendChild(descriptionPaperWrap);

  photoPaperWrap.appendChild(image);
  mediaViewport.append(photoPaperWrap, emptyState, counter);
  container.append(titleEditorRefs.titleBar, mediaViewport, descriptionOuter);

  return {
    container,
    mediaViewport,
    titleBarElement: titleEditorRefs.titleBar,
    photoPaperWrap,
    image,
    emptyState,
    counter,
    descriptionOuterElement: descriptionOuter,
    descriptionPaperWrap,
    descriptionText,
    titleInput: titleEditorRefs.titleInput,
    commitButton: titleEditorRefs.commitButton,
    currentEvidenceId: titleEditorRefs.currentEvidenceId,
    currentCommittedTitle: titleEditorRefs.currentCommittedTitle,
    resizeObserver: null,
  };
}

function parsePixels(cssValue) {
  const numeric = Number.parseFloat(cssValue || "0");
  return Number.isFinite(numeric) ? numeric : 0;
}

function layoutPhotoMount(refs) {
  if (!refs?.container || !refs?.photoPaperWrap || !refs?.image) {
    return;
  }

  const imageElement = refs.image;
  const naturalWidth = imageElement.naturalWidth;
  const naturalHeight = imageElement.naturalHeight;

  if (!naturalWidth || !naturalHeight) {
    return;
  }

  const paperComputed = window.getComputedStyle(refs.photoPaperWrap);
  const padLeft = parsePixels(paperComputed.paddingLeft);
  const padRight = parsePixels(paperComputed.paddingRight);
  const padTop = parsePixels(paperComputed.paddingTop);
  const padBottom = parsePixels(paperComputed.paddingBottom);
  const borderLeft = parsePixels(paperComputed.borderLeftWidth);
  const borderRight = parsePixels(paperComputed.borderRightWidth);
  const borderTop = parsePixels(paperComputed.borderTopWidth);
  const borderBottom = parsePixels(paperComputed.borderBottomWidth);

  const availableWidth = refs.mediaViewport?.clientWidth || refs.container.clientWidth;
  const availableHeight = refs.mediaViewport?.clientHeight || refs.container.clientHeight;
  if (!availableWidth || !availableHeight) {
    return;
  }

  const maxMediaWidth = Math.max(
    1,
    availableWidth - padLeft - padRight - borderLeft - borderRight
  );
  const maxMediaHeight = Math.max(
    1,
    availableHeight - padTop - padBottom - borderTop - borderBottom
  );

  const scale = Math.min(maxMediaWidth / naturalWidth, maxMediaHeight / naturalHeight);
  const targetWidth = Math.max(1, Math.floor(naturalWidth * scale));
  const targetHeight = Math.max(1, Math.floor(naturalHeight * scale));

  imageElement.style.width = `${targetWidth}px`;
  imageElement.style.height = `${targetHeight}px`;
  syncEvidenceTitleWidth(refs, refs.photoPaperWrap);
  syncPhotoDescriptionHeight(refs, refs.photoPaperWrap);
}

function applyPhotoPaperStyle(photoPaperWrapElement, paperStyle) {
  if (!photoPaperWrapElement) {
    return;
  }

  photoPaperWrapElement.className = "photo-paper-wrap";

  const styleSuffix = String(paperStyle || "photo-mounted").trim();
  if (!styleSuffix) {
    return;
  }

  photoPaperWrapElement.classList.add(`${PHOTO_PAPER_STYLE_CLASS_PREFIX}${styleSuffix}`);
}

function createReportsWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("reports-carousel-container");

  const titleEditorRefs = createEvidenceTitleBarElements();

  const reportViewport = document.createElement("div");
  reportViewport.classList.add("reports-content-viewport");

  const reportPaperWrap = document.createElement("div");
  reportPaperWrap.classList.add("report-paper-wrap");

  const reportDocumentContent = document.createElement("div");
  reportDocumentContent.classList.add("report-document-content", "scrollbars-hidden");

  const reportDocumentText = document.createElement("div");
  reportDocumentText.classList.add("report-document-text");

  const emptyState = document.createElement("div");
  emptyState.classList.add("report-carousel-empty", "d-none");

  const counter = document.createElement("div");
  counter.classList.add("report-carousel-counter");

  const descriptionOuter = document.createElement("div");
  descriptionOuter.classList.add("evidence-description-outer");

  const descriptionPaperWrap = document.createElement("div");
  descriptionPaperWrap.classList.add("report-paper-wrap", "evidence-description-paper-wrap");

  const descriptionText = document.createElement("div");
  descriptionText.classList.add("evidence-description-text", "scrollbars-hidden");
  descriptionText.textContent = "Loading description...";

  descriptionPaperWrap.appendChild(descriptionText);
  descriptionOuter.appendChild(descriptionPaperWrap);

  reportDocumentContent.append(reportDocumentText, emptyState);
  reportPaperWrap.appendChild(reportDocumentContent);
  reportViewport.append(reportPaperWrap, counter);
  container.append(titleEditorRefs.titleBar, reportViewport, descriptionOuter);

  return {
    container,
    reportViewport,
    titleBarElement: titleEditorRefs.titleBar,
    reportPaperWrap,
    reportDocumentContent,
    reportDocumentText,
    emptyState,
    counter,
    descriptionOuterElement: descriptionOuter,
    descriptionPaperWrap,
    descriptionText,
    titleInput: titleEditorRefs.titleInput,
    commitButton: titleEditorRefs.commitButton,
    currentEvidenceId: titleEditorRefs.currentEvidenceId,
    currentCommittedTitle: titleEditorRefs.currentCommittedTitle,
    resizeObserver: null,
  };
}

async function updatePhotosWindowContent(windowController) {
  const refs = photosWindowContentRefs.get(windowController);
  if (!refs) {
    return;
  }

  const photoEvidences = getEvidenceCollection(EVIDENCE_STORAGE_KEYS.PHOTOS);
  refs.emptyState.textContent = `${localize("photos", getLanguage())}: 0/0`;

  if (!photoEvidences.length) {
    refs.image.classList.add("d-none");
    refs.emptyState.classList.remove("d-none");
    refs.counter.textContent = "0/0";

    if (windowController.previousButtonElement) {
      windowController.previousButtonElement.disabled = true;
    }
    if (windowController.nextButtonElement) {
      windowController.nextButtonElement.disabled = true;
    }

    refs.image.style.width = "";
    refs.image.style.height = "";
    refs.currentEvidenceId = "";
    refs.currentCommittedTitle = "";
    refs.titleInput.value = "";
    refs.commitButton.disabled = true;
    refs.descriptionText.textContent = "Description unavailable.";
    return;
  }

  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS));
  const currentIndex = getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS);
  const currentEvidence = photoEvidences[currentIndex];
  const languageCode = getLanguage();
  const renderToken = (refs.renderToken || 0) + 1;
  refs.renderToken = renderToken;

  refs.descriptionText.textContent = "Loading description...";

  const photoCatalogEntry = await getPhotoCatalogEntry(currentEvidence, languageCode);
  const effectiveEvidence = buildEvidenceWithCatalogDefaults(currentEvidence, photoCatalogEntry);
  const currentItem = String(
    photoCatalogEntry?.photoPath || resolveEvidenceContentPath(currentEvidence, languageCode)
  ).trim();
  const descriptionText = await getDescriptionTextByEvidence(
    currentEvidence,
    languageCode,
    false,
    photoCatalogEntry
  );

  if (refs.renderToken !== renderToken) {
    return;
  }

  syncEvidenceTitleEditor(refs, effectiveEvidence);
  applyPhotoPaperStyle(refs.photoPaperWrap, effectiveEvidence?.paperStyle);
  applyReportPaperStyle(refs.descriptionPaperWrap, getDescriptionPaperStyleFromEvidence(effectiveEvidence));

  refs.image.classList.remove("d-none");
  refs.emptyState.classList.add("d-none");
  refs.image.src = currentItem;
  refs.image.alt = `${localize("photos", languageCode)} ${currentIndex + 1}`;
  refs.counter.textContent = `${currentIndex + 1}/${photoEvidences.length}`;
  refs.descriptionText.textContent = descriptionText || "Description unavailable.";
  refs.descriptionText.scrollTop = 0;

  const applyLayout = () => {
    layoutPhotoMount(refs);
  };

  if (refs.image.complete && refs.image.naturalWidth > 0 && refs.image.naturalHeight > 0) {
    applyLayout();
  }

  refs.image.onload = applyLayout;

  if (windowController.previousButtonElement) {
    windowController.previousButtonElement.disabled = false;
  }
  if (windowController.nextButtonElement) {
    windowController.nextButtonElement.disabled = false;
  }

  refs.image.onerror = () => {
    refs.image.style.width = "";
    refs.image.style.height = "";
    refs.image.classList.add("d-none");
    refs.emptyState.classList.remove("d-none");
    refs.emptyState.textContent = `Missing image: ${currentItem}`;
  };

  syncEvidenceTitleWidth(refs, refs.photoPaperWrap);
  syncPhotoDescriptionHeight(refs, refs.photoPaperWrap);
}

async function getReportTextByEvidence(
  evidence,
  languageCode,
  forceReload = false,
  preloadedReportEntry = null
) {
  const reportEntry = preloadedReportEntry
    || await getReportCatalogEntry(evidence, languageCode, forceReload);
  const localizedReportText = sanitizeCatalogText(reportEntry?.reportText).trim();
  if (localizedReportText) {
    return localizedReportText;
  }

  const legacyReportPath = resolveEvidenceContentPath(evidence, languageCode);
  return getLegacyTextByPath(legacyReportPath, {
    forceReload,
    fallbackText: "placeholder report",
    label: "report markdown",
  });
}

async function updateReportsWindowContent(windowController) {
  const refs = reportsWindowContentRefs.get(windowController);
  if (!refs) {
    return;
  }

  const reportEvidences = getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS);

  if (!reportEvidences.length) {
    refs.reportDocumentText.textContent = "";
    refs.emptyState.classList.remove("d-none");
    refs.emptyState.textContent = `${localize("reports", getLanguage())}: 0/0`;
    refs.counter.textContent = "0/0";

    if (windowController.previousButtonElement) {
      windowController.previousButtonElement.disabled = true;
    }
    if (windowController.nextButtonElement) {
      windowController.nextButtonElement.disabled = true;
    }

    refs.currentEvidenceId = "";
    refs.currentCommittedTitle = "";
    refs.titleInput.value = "";
    refs.commitButton.disabled = true;
    refs.descriptionText.textContent = "Description unavailable.";
    return;
  }

  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS));
  const currentIndex = getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS);
  const currentEvidence = reportEvidences[currentIndex];
  const languageCode = getLanguage();
  const renderToken = (refs.renderToken || 0) + 1;
  refs.renderToken = renderToken;

  refs.emptyState.classList.add("d-none");
  refs.reportDocumentText.textContent = "Loading report...";
  refs.descriptionText.textContent = "Loading description...";

  const reportCatalogEntry = await getReportCatalogEntry(currentEvidence, languageCode);
  const effectiveEvidence = buildEvidenceWithCatalogDefaults(currentEvidence, reportCatalogEntry);
  const [reportText, descriptionText] = await Promise.all([
    getReportTextByEvidence(currentEvidence, languageCode, false, reportCatalogEntry),
    getDescriptionTextByEvidence(currentEvidence, languageCode, false, reportCatalogEntry),
  ]);

  if (refs.renderToken !== renderToken) {
    return;
  }

  syncEvidenceTitleEditor(refs, effectiveEvidence);
  applyReportPaperStyle(refs.reportPaperWrap, effectiveEvidence?.paperStyle);
  applyReportPaperStyle(refs.descriptionPaperWrap, getDescriptionPaperStyleFromEvidence(effectiveEvidence));
  syncEvidenceTitleWidth(refs, refs.reportPaperWrap);

  refs.reportDocumentText.textContent = reportText;
  refs.counter.textContent = `${currentIndex + 1}/${reportEvidences.length}`;
  refs.reportDocumentContent.scrollTop = 0;
  refs.descriptionText.textContent = descriptionText || "Description unavailable.";
  refs.descriptionText.scrollTop = 0;
  syncEvidenceTitleWidth(refs, refs.reportPaperWrap);

  if (windowController.previousButtonElement) {
    windowController.previousButtonElement.disabled = false;
  }
  if (windowController.nextButtonElement) {
    windowController.nextButtonElement.disabled = false;
  }
}

function showPreviousCarouselImage() {
  if (!getEvidenceCollection(EVIDENCE_STORAGE_KEYS.PHOTOS).length) {
    return;
  }

  stepEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, -1);
}

function showNextCarouselImage() {
  if (!getEvidenceCollection(EVIDENCE_STORAGE_KEYS.PHOTOS).length) {
    return;
  }

  stepEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, 1);
}

function showPreviousReport() {
  if (!getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS).length) {
    return;
  }

  stepEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, -1);
}

function showNextReport() {
  if (!getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS).length) {
    return;
  }

  stepEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, 1);
}

function openPhotosWindow() {
  if (!getElements().gameArea) {
    return;
  }

  let photosWindowController = null;
  photosWindowController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window", "photos-window"],
    title: localize("photos", getLanguage()),
    showCarouselNavigation: true,
    onNavigatePrevious: () => {
      showPreviousCarouselImage();
      updatePhotosWindowContent(photosWindowController);
    },
    onNavigateNext: () => {
      showNextCarouselImage();
      updatePhotosWindowContent(photosWindowController);
    },
    closeButtonAriaLabel: "Close photos window",
    onClose: () => {
      const refs = photosWindowContentRefs.get(photosWindowController);
      if (refs?.resizeObserver) {
        refs.resizeObserver.disconnect();
        refs.resizeObserver = null;
      }

      unregisterDesktopWindow(photosWindowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  const contentRefs = createPhotosWindowContentElements();
  wireEvidenceTitleEditor({
    refs: contentRefs,
    storageKey: EVIDENCE_STORAGE_KEYS.PHOTOS,
    onCommitted: () => {
      updatePhotosWindowContent(photosWindowController);
    },
  });
  photosWindowController.setContent(contentRefs.container);
  photosWindowController.scrollContainerElement = contentRefs.container;
  if (typeof ResizeObserver !== "undefined") {
    contentRefs.resizeObserver = new ResizeObserver(() => {
      layoutPhotoMount(contentRefs);
      syncEvidenceTitleWidth(contentRefs, contentRefs.photoPaperWrap);
      syncPhotoDescriptionHeight(contentRefs, contentRefs.photoPaperWrap);
    });
    contentRefs.resizeObserver.observe(contentRefs.mediaViewport);
    contentRefs.resizeObserver.observe(contentRefs.photoPaperWrap);
  }
  photosWindowContentRefs.set(photosWindowController, contentRefs);
  registerDesktopWindow(photosWindowController, "photos");

  updatePhotosWindowContent(photosWindowController);
  photosWindowController.open({ resizable: true, showScrollbar: false });
  bringDesktopWindowToFront(photosWindowController);
  audioManager.playSfx("clickSwitch");
}

function openReportsWindow() {
  if (!getElements().gameArea) {
    return;
  }

  let reportsWindowController = null;
  reportsWindowController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window", "reports-window"],
    title: localize("reports", getLanguage()),
    showCarouselNavigation: true,
    onNavigatePrevious: () => {
      showPreviousReport();
      updateReportsWindowContent(reportsWindowController);
    },
    onNavigateNext: () => {
      showNextReport();
      updateReportsWindowContent(reportsWindowController);
    },
    closeButtonAriaLabel: "Close reports window",
    onClose: () => {
      const refs = reportsWindowContentRefs.get(reportsWindowController);
      if (refs?.resizeObserver) {
        refs.resizeObserver.disconnect();
        refs.resizeObserver = null;
      }

      unregisterDesktopWindow(reportsWindowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  const contentRefs = createReportsWindowContentElements();
  wireEvidenceTitleEditor({
    refs: contentRefs,
    storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
    onCommitted: () => {
      updateReportsWindowContent(reportsWindowController);
    },
  });
  reportsWindowController.setContent(contentRefs.container);
  reportsWindowController.scrollContainerElement = contentRefs.reportDocumentContent;
  if (typeof ResizeObserver !== "undefined") {
    contentRefs.resizeObserver = new ResizeObserver(() => {
      syncEvidenceTitleWidth(contentRefs, contentRefs.reportPaperWrap);
    });
    contentRefs.resizeObserver.observe(contentRefs.reportViewport);
    contentRefs.resizeObserver.observe(contentRefs.reportPaperWrap);
  }
  reportsWindowContentRefs.set(reportsWindowController, contentRefs);
  registerDesktopWindow(reportsWindowController, "reports");

  updateReportsWindowContent(reportsWindowController);
  reportsWindowController.open({ resizable: true, showScrollbar: false });
  bringDesktopWindowToFront(reportsWindowController);
  audioManager.playSfx("clickSwitch");
}

function openNotesWindow(options = {}) {
  const {
    parentElement = getElements().gameArea,
    classNames = ["story-window", "notes-window"],
    windowKind = "notes",
    showCloseSfx = true,
    onWindowClose = null,
    centerWithinParent = false,
    widthScale = 1,
  } = options;

  if (!parentElement) {
    return;
  }

  let notesWindowController = null;
  notesWindowController = new DesktopWindow({
    parentElement,
    classNames,
    title: localize("notes", getLanguage()),
    showCarouselNavigation: false,
    closeButtonAriaLabel: "Close notes window",
    onClose: () => {
      const refs = notesWindowContentRefs.get(notesWindowController);
      if (refs) {
        persistActiveNotesPageContent(refs);
      }

      unregisterDesktopWindow(notesWindowController);
      if (typeof onWindowClose === "function") {
        onWindowClose(notesWindowController);
      }
      if (showCloseSfx) {
        audioManager.playSfx("clickSwitch");
      }
    },
  });

  const contentRefs = createNotesWindowContentElements();
  notesWindowController.setContent(contentRefs.container);
  notesWindowController.scrollContainerElement = contentRefs.textarea;
  notesWindowContentRefs.set(notesWindowController, contentRefs);
  registerDesktopWindow(notesWindowController, windowKind);

  renderNotesWindowContent(contentRefs);
  notesWindowController.open({ resizable: true, showScrollbar: false });

  if (centerWithinParent) {
    positionWindowWithinParent(notesWindowController.rootElement, parentElement, widthScale);
  }

  bringDesktopWindowToFront(notesWindowController);
  audioManager.playSfx("clickSwitch");
}

function openComputerWindow() {
  if (!getElements().gameArea) {
    return;
  }

  const contentRefs = createComputerWindowContentElements();

  const openMenuFromComputerClock = () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickSwitch");
    setGameState(getMenuState());
  };

  contentRefs.clockPanel.addEventListener("click", () => {
    openMenuFromComputerClock();
  });

  contentRefs.clockPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openMenuFromComputerClock();
  });

  contentRefs.notesIcon.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    if (!toggleExistingWindowsByKind("computer-notes")) {
      const notesWindow = openNotesWindow({
        parentElement: contentRefs.container,
        classNames: ["notes-window", "caveos-app-window", "caveos-notes-window"],
        windowKind: "computer-notes",
        centerWithinParent: true,
        onWindowClose: (windowController) => {
          contentRefs.appWindows.delete(windowController);
        },
      });
      if (notesWindow) {
        contentRefs.appWindows.add(notesWindow);
      }
    }
  });

  contentRefs.paintIcon.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind("computer-paint")) {
      return;
    }

    const paintRefs = createComputerPaintWindowContentElements();
    openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-paint",
      title: "Paint",
      classNames: ["caveos-paint-window"],
      contentNode: paintRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      widthScale: 1.1,
    });
  });

  contentRefs.netscapeIcon.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind("computer-netscape")) {
      return;
    }

    const netscapeContent = createComputerNetscapeWindowContentElements();
    openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-netscape",
      title: "Netscape",
      classNames: ["caveos-browser-window"],
      contentNode: netscapeContent,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
    });
  });

  let nextController = null;
  nextController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window", "computer-window"],
    title: "Computer",
    showCarouselNavigation: false,
    closeButtonAriaLabel: "Close computer window",
    onClose: () => {
      const refs = computerWindowContentRefs.get(nextController);
      if (refs?.appWindows?.size) {
        const windowsToClose = Array.from(refs.appWindows);
        windowsToClose.forEach((windowController) => {
          windowController.close();
        });
      }
      if (refs?.clockIntervalId) {
        clearInterval(refs.clockIntervalId);
        refs.clockIntervalId = null;
      }
      unregisterDesktopWindow(nextController);
      if (computerWindowController === nextController) {
        computerWindowController = null;
      }
      audioManager.playSfx("clickSwitch");
    },
  });

  nextController.setContent(contentRefs.container);
  nextController.scrollContainerElement = contentRefs.container;
  computerWindowContentRefs.set(nextController, contentRefs);
  registerDesktopWindow(nextController, "computer");
  nextController.open({ resizable: false, showScrollbar: false });

  if (nextController.rootElement) {
    nextController.marginRatio = 0;
    nextController.rootElement.style.width = "100vw";
    nextController.rootElement.style.height = "100vh";
    nextController.rootElement.style.left = "0";
    nextController.rootElement.style.top = "0";
    nextController.rootElement.style.transform = "none";
  }

  bringDesktopWindowToFront(nextController);
  computerWindowController = nextController;
  audioManager.playSfx("clickSwitch");
}

export function refreshAllPhotosWindows() {
  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) === "photos") {
      updatePhotosWindowContent(windowController);
    }
  });
}

export function refreshAllReportsWindows() {
  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) === "reports") {
      updateReportsWindowContent(windowController);
    }
  });
}

export function addPhotoToCarousel(path) {
  const evidence = createPhotoEvidence({
    photoPath: path,
    storageKey: EVIDENCE_STORAGE_KEYS.PHOTOS,
  });

  if (!evidence) {
    return -1;
  }

  const photoEvidences = getEvidenceCollection(EVIDENCE_STORAGE_KEYS.PHOTOS);
  const newIndex = photoEvidences.findIndex((item) => item.id === evidence.id);

  if (newIndex >= 0 && photoEvidences.length === 1) {
    setEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, 0);
  }

  refreshAllPhotosWindows();
  return newIndex;
}

export function addReportToCarousel(path) {
  const reportName = String(path || "")
    .trim()
    .replace(/^\.\/assets\/reports\//, "")
    .replace(/_[a-z]{2}\.md$/i, "")
    .replace(/\.md$/i, "");

  const evidence = createReportEvidence({
    reportName,
    storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  });

  if (!evidence) {
    return -1;
  }

  const reportEvidences = getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS);
  const newIndex = reportEvidences.findIndex((item) => item.id === evidence.id);

  if (newIndex >= 0 && reportEvidences.length === 1) {
    setEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, 0);
  }

  refreshAllReportsWindows();
  return newIndex;
}
  