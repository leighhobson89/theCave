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
let storyWindowController = null;

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  initializeAudioControls();
  initializeStoryWindowControls();

  getElements().newGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
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
  getElements().bookOne.innerHTML = `${localize("backgroundStory", getLanguage())}`;
  getElements().storyWindowTitle.innerHTML = `${localize(
    "backgroundStory",
    getLanguage()
  )}`;
  getElements().evidenceLabel.innerHTML = `${localize("evidence", getLanguage())}`;
  getElements().musicVolumeLabel.innerHTML = `${localize(
    "musicVolume",
    getLanguage()
  )}`;
  getElements().sfxVolumeLabel.innerHTML = `${localize("sfxVolume", getLanguage())}`;
  refreshMuteButtonLabel();
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
  if (
    !getElements().bookOne ||
    !getElements().storyWindow ||
    !getElements().storyWindowHeader ||
    !getElements().storyWindowResizeHandle ||
    !getElements().storyWindowClose
  ) {
    return;
  }

  storyWindowController = new DesktopWindow({
    rootElement: getElements().storyWindow,
    headerElement: getElements().storyWindowHeader,
    resizeHandleElement: getElements().storyWindowResizeHandle,
    scrollContainerElement: getElements().storyDocumentContent,
  });

  getElements().bookOne.addEventListener("click", () => {
    openStoryWindow(false, false);
  });

  getElements().storyWindowClose.addEventListener("click", (event) => {
    event.stopPropagation();
    closeStoryWindow();
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
  if (!getElements().storyDocumentContent || !getElements().storyDocumentText) {
    return;
  }

  const storyText = await getStoryText(getLanguage(), true);
  getElements().storyDocumentText.textContent = storyText;

  if (storyWindowController) {
    storyWindowController.open({ resizable, showScrollbar });
  } else {
    getElements().storyWindow.classList.remove("d-none");
    getElements().storyDocumentContent.classList.toggle("scrollbars-hidden", !showScrollbar);
  }

  getElements().storyDocumentContent.scrollTop = 0;
}

function closeStoryWindow() {
  if (!getElements().storyWindow) {
    return;
  }

  if (storyWindowController) {
    storyWindowController.close();
  } else {
    getElements().storyWindow.classList.add("d-none");
  }

  audioManager.playSfx("clickSwitch");
}
  