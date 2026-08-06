import {
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
  getCarouselItems,
  getCurrentCarouselIndex,
  setCurrentCarouselIndex,
  setCarouselItems,
  getDefaultStartingCarouselItems,
  addCarouselItem,
  getNextDesktopWindowZIndex,
  getReportCarouselItems,
  getCurrentReportCarouselIndex,
  setCurrentReportCarouselIndex,
  setReportCarouselItems,
  getDefaultStartingReportCarouselItems,
  addReportCarouselItem,
} from "./constantsAndGlobalVars.js";
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
const photosWindowContentRefs = new WeakMap();
const reportsWindowContentRefs = new WeakMap();

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  initializeAudioControls();
  initializeStoryWindowControls();

  getElements().newGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    setCarouselItems(getDefaultStartingCarouselItems());
    setCurrentCarouselIndex(0);
    setReportCarouselItems(getDefaultStartingReportCarouselItems());
    setCurrentReportCarouselIndex(0);
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
  const storyLanguage = language || "en";

  if (!forceReload && storyTextCacheByLanguage.has(storyLanguage)) {
    return storyTextCacheByLanguage.get(storyLanguage);
  }

  try {
    const response = await fetch(`assets/story_${storyLanguage}.md`);
    if (!response.ok) {
      throw new Error(`Failed to load story: ${response.status}`);
    }

    const storyText = await response.text();
    storyTextCacheByLanguage.set(storyLanguage, storyText);
    return storyText;
  } catch (error) {
    console.error("Error fetching story markdown:", error);
    const fallbackStory = "Unable to load story content.";
    storyTextCacheByLanguage.set(storyLanguage, fallbackStory);
    return fallbackStory;
  }
}

async function openStoryWindow(resizable = false, showScrollbar = true) {
  if (!getElements().gameArea) {
    return;
  }

  const storyText = await getStoryText(getLanguage(), true);
  const storyPaperWrap = document.createElement("div");
  storyPaperWrap.classList.add("story-paper-wrap");

  const storyDocumentContent = document.createElement("div");
  storyDocumentContent.classList.add("story-document-content");

  const storyPaperclip = document.createElement("div");
  storyPaperclip.classList.add("story-paperclip");
  storyPaperclip.setAttribute("aria-hidden", "true");

  const storyDocumentText = document.createElement("div");
  storyDocumentText.classList.add("story-document-text");
  storyDocumentText.textContent = storyText;

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

  storyWindowController.open({ resizable, showScrollbar });
  bringDesktopWindowToFront(storyWindowController);
  storyDocumentContent.scrollTop = 0;
}

function createPhotosWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("photos-carousel-container");

  const image = document.createElement("img");
  image.classList.add("photos-carousel-image");

  const emptyState = document.createElement("div");
  emptyState.classList.add("photos-carousel-empty", "d-none");

  const counter = document.createElement("div");
  counter.classList.add("photos-carousel-counter");

  container.append(image, emptyState, counter);

  return {
    container,
    image,
    emptyState,
    counter,
  };
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

  const carouselItems = getCarouselItems();
  refs.emptyState.textContent = `${localize("photos", getLanguage())}: 0/0`;

  if (!carouselItems.length) {
    refs.image.classList.add("d-none");
    refs.emptyState.classList.remove("d-none");
    refs.counter.textContent = "0/0";

    if (windowController.previousButtonElement) {
      windowController.previousButtonElement.disabled = true;
    }
    if (windowController.nextButtonElement) {
      windowController.nextButtonElement.disabled = true;
    }
    return;
  }

  setCurrentCarouselIndex(getCurrentCarouselIndex());
  const currentIndex = getCurrentCarouselIndex();
  const currentItem = carouselItems[currentIndex];

  refs.image.classList.remove("d-none");
  refs.emptyState.classList.add("d-none");
  refs.image.src = currentItem;
  refs.image.alt = `${localize("photos", getLanguage())} ${currentIndex + 1}`;
  refs.counter.textContent = `${currentIndex + 1}/${carouselItems.length}`;

  if (windowController.previousButtonElement) {
    windowController.previousButtonElement.disabled = false;
  }
  if (windowController.nextButtonElement) {
    windowController.nextButtonElement.disabled = false;
  }

  refs.image.onerror = () => {
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

  const reportItems = getReportCarouselItems();

  if (!reportItems.length) {
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

  setCurrentReportCarouselIndex(getCurrentReportCarouselIndex());
  const currentIndex = getCurrentReportCarouselIndex();
  const currentReportPath = reportItems[currentIndex];

  refs.emptyState.classList.add("d-none");
  refs.reportDocumentText.textContent = "Loading report...";

  const reportText = await getReportTextByPath(currentReportPath);
  refs.reportDocumentText.textContent = reportText;
  refs.counter.textContent = `${currentIndex + 1}/${reportItems.length}`;
  refs.reportDocumentContent.scrollTop = 0;

  if (windowController.previousButtonElement) {
    windowController.previousButtonElement.disabled = false;
  }
  if (windowController.nextButtonElement) {
    windowController.nextButtonElement.disabled = false;
  }
}

function showPreviousCarouselImage() {
  if (!getCarouselItems().length) {
    return;
  }

  setCurrentCarouselIndex(getCurrentCarouselIndex() - 1);
}

function showNextCarouselImage() {
  if (!getCarouselItems().length) {
    return;
  }

  setCurrentCarouselIndex(getCurrentCarouselIndex() + 1);
}

function showPreviousReport() {
  if (!getReportCarouselItems().length) {
    return;
  }

  setCurrentReportCarouselIndex(getCurrentReportCarouselIndex() - 1);
}

function showNextReport() {
  if (!getReportCarouselItems().length) {
    return;
  }

  setCurrentReportCarouselIndex(getCurrentReportCarouselIndex() + 1);
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
      unregisterDesktopWindow(photosWindowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  const contentRefs = createPhotosWindowContentElements();
  photosWindowController.setContent(contentRefs.container);
  photosWindowController.scrollContainerElement = contentRefs.container;
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
  const newIndex = addCarouselItem(path);

  if (newIndex >= 0 && getCarouselItems().length === 1) {
    setCurrentCarouselIndex(0);
  }

  refreshAllPhotosWindows();
  return newIndex;
}

export function addReportToCarousel(path) {
  const newIndex = addReportCarouselItem(path);

  if (newIndex >= 0 && getReportCarouselItems().length === 1) {
    setCurrentReportCarouselIndex(0);
  }

  refreshAllReportsWindows();
  return newIndex;
}
  