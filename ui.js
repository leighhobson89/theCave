import {
  captureGameStatusForSaving,
  gameState,
  getLanguage,
  setElements,
  getElements,
  setBeginGameStatus,
  getGameInProgress,
  setGameInProgress,
  getGameVisibleActive,
  getMenuState,
  getLanguageSelected,
  setLanguageSelected,
  setLanguage,
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
  saveGame,
  copySaveStringToClipBoard,
} from "./saveLoadGame.js";

const storyTextCacheByLanguage = new Map();
const reportTextCacheByPath = new Map();
const activeDesktopWindows = new Set();
const desktopWindowKinds = new WeakMap();
const storyWindowContentRefs = new WeakMap();
const photosWindowContentRefs = new WeakMap();
const reportsWindowContentRefs = new WeakMap();
const EVIDENCE_STORAGE_KEYS = getEvidenceStorageKeys();
const REPORT_PAPER_STYLE_CLASS_PREFIX = "report-paper-style-";
const PHOTO_PAPER_STYLE_CLASS_PREFIX = "photo-paper-style-";
const DEBUG_WINDOW_COLOR = "rgb(108, 255, 64)";
let debugWindowController = null;

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  initializeAudioControls();
  initializeStoryWindowControls();

  getElements().newGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    initializeEvidenceStoreForNewGame();
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
        getElements().saveLoadPopup.classList.add("d-none");
        document.getElementById("overlay").classList.add("d-none");
        setGameState(getMenuState());
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
  getElements().evidenceLabel.textContent = localize("evidence", getLanguage());
  getElements().musicVolumeLabel.innerHTML = `${localize(
    "musicVolume",
    getLanguage()
  )}`;
  getElements().sfxVolumeLabel.innerHTML = `${localize("sfxVolume", getLanguage())}`;
  refreshMuteButtonLabel();
  refreshOpenWindowLocalization();
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
  const musicPercent = Math.round(audioManager.musicVolume * 100);
  const sfxPercent = Math.round(audioManager.sfxVolume * 100);

  getElements().musicVolumeSlider.value = String(musicPercent);
  getElements().sfxVolumeSlider.value = String(sfxPercent);
  getElements().musicVolumeValue.textContent = `${musicPercent}%`;
  getElements().sfxVolumeValue.textContent = `${sfxPercent}%`;

  getElements().muteToggleButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    const isMuted = audioManager.toggleMuted();
    refreshMuteButtonLabel();
    if (!isMuted) {
      audioManager.playSfx("clickSwitch");
    }
  });

  getElements().musicVolumeSlider.addEventListener("input", (event) => {
    audioManager.onUserGesture();
    const volume = Number(event.target.value) / 100;
    audioManager.setMusicVolume(volume);
    getElements().musicVolumeValue.textContent = `${event.target.value}%`;
  });

  getElements().sfxVolumeSlider.addEventListener("input", (event) => {
    audioManager.onUserGesture();
    const volume = Number(event.target.value) / 100;
    audioManager.setSfxVolume(volume);
    getElements().sfxVolumeValue.textContent = `${event.target.value}%`;
  });

  refreshMuteButtonLabel();
}

function refreshMuteButtonLabel() {
  const muteStateKey = audioManager.getMuted() ? "muteOn" : "muteOff";
  getElements().muteToggleButton.innerHTML = `${localize(
    "mute",
    getLanguage()
  )}: ${localize(muteStateKey, getLanguage())}`;
}

function initializeStoryWindowControls() {
  if (!getElements().backgroundFolder || !getElements().photosFolder || !getElements().reportsFolder) {
    return;
  }

  getElements().backgroundFolder.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    openStoryWindow(false, false);
  });

  getElements().photosFolder.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    openPhotosWindow();
  });

  getElements().reportsFolder.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    openReportsWindow();
  });
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
    }
  });
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

function createPhotosWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("photos-carousel-container");

  const photoPaperWrap = document.createElement("div");
  photoPaperWrap.classList.add("photo-paper-wrap");

  const image = document.createElement("img");
  image.classList.add("photos-carousel-image");

  const emptyState = document.createElement("div");
  emptyState.classList.add("photos-carousel-empty", "d-none");

  const counter = document.createElement("div");
  counter.classList.add("photos-carousel-counter");

  photoPaperWrap.appendChild(image);
  container.append(photoPaperWrap, emptyState, counter);

  return {
    container,
    photoPaperWrap,
    image,
    emptyState,
    counter,
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

  const availableWidth = refs.container.clientWidth;
  const availableHeight = refs.container.clientHeight;
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

  reportDocumentContent.append(reportDocumentText, emptyState);
  reportPaperWrap.appendChild(reportDocumentContent);
  container.append(reportPaperWrap, counter);

  return {
    container,
    reportPaperWrap,
    reportDocumentContent,
    reportDocumentText,
    emptyState,
    counter,
  };
}

function updatePhotosWindowContent(windowController) {
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
    return;
  }

  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS));
  const currentIndex = getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS);
  const currentEvidence = photoEvidences[currentIndex];
  const currentItem = resolveEvidenceContentPath(currentEvidence, getLanguage());
  applyPhotoPaperStyle(refs.photoPaperWrap, currentEvidence?.paperStyle);

  refs.image.classList.remove("d-none");
  refs.emptyState.classList.add("d-none");
  refs.image.src = currentItem;
  refs.image.alt = `${localize("photos", getLanguage())} ${currentIndex + 1}`;
  refs.counter.textContent = `${currentIndex + 1}/${photoEvidences.length}`;

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
}

async function getReportTextByPath(path, forceReload = false) {
  const reportPath = path || "";

  if (!forceReload && reportTextCacheByPath.has(reportPath)) {
    return reportTextCacheByPath.get(reportPath);
  }

  try {
    const response = await fetch(reportPath);
    if (!response.ok) {
      throw new Error(`Failed to load report: ${response.status}`);
    }

    const reportText = await response.text();
    reportTextCacheByPath.set(reportPath, reportText);
    return reportText;
  } catch (error) {
    console.error("Error fetching report markdown:", error);
    const fallbackReport = "placeholder report";
    reportTextCacheByPath.set(reportPath, fallbackReport);
    return fallbackReport;
  }
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
    return;
  }

  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS));
  const currentIndex = getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS);
  const currentEvidence = reportEvidences[currentIndex];
  const currentReportPath = resolveEvidenceContentPath(currentEvidence, getLanguage());

  applyReportPaperStyle(refs.reportPaperWrap, currentEvidence?.paperStyle);

  refs.emptyState.classList.add("d-none");
  refs.reportDocumentText.textContent = "Loading report...";

  const reportText = await getReportTextByPath(currentReportPath);
  refs.reportDocumentText.textContent = reportText;
  refs.counter.textContent = `${currentIndex + 1}/${reportEvidences.length}`;
  refs.reportDocumentContent.scrollTop = 0;

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
  photosWindowController.setContent(contentRefs.container);
  photosWindowController.scrollContainerElement = contentRefs.container;
  if (typeof ResizeObserver !== "undefined") {
    contentRefs.resizeObserver = new ResizeObserver(() => {
      layoutPhotoMount(contentRefs);
    });
    contentRefs.resizeObserver.observe(contentRefs.container);
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
      unregisterDesktopWindow(reportsWindowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  const contentRefs = createReportsWindowContentElements();
  reportsWindowController.setContent(contentRefs.container);
  reportsWindowController.scrollContainerElement = contentRefs.reportDocumentContent;
  reportsWindowContentRefs.set(reportsWindowController, contentRefs);
  registerDesktopWindow(reportsWindowController, "reports");

  updateReportsWindowContent(reportsWindowController);
  reportsWindowController.open({ resizable: true, showScrollbar: false });
  bringDesktopWindowToFront(reportsWindowController);
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
  