import {
  gameState,
  getLanguage,
  setElements,
  getElements,
  setBeginGameStatus,
  getGameInProgress,
  setGameInProgress,
  getGameVisiblePaused,
  getBeginGameStatus,
  getGameVisibleActive,
  getMenuState,
  getLanguageSelected,
  setLanguageSelected,
  setLanguage,
} from "./constantsAndGlobalVars.js";
import { setGameState, startGame } from "./game.js";
import { initLocalization, localize } from "./localization.js";
import {
  loadGameOption,
  loadGame,
  saveGame,
  copySaveStringToClipBoard,
} from "./saveLoadGame.js";

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  getElements().newGameMenuButton.addEventListener("click", () => {
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
    if (gameState === getMenuState()) {
      setGameState(getGameVisibleActive());
    }
    startGame(false);
  });

  getElements().returnToMenuButton.addEventListener("click", () => {
    setGameState(getMenuState());
  });

  getElements().pauseResumeGameButton.addEventListener("click", () => {
    if (gameState === getGameVisibleActive()) {
      setGameState(getGameVisiblePaused());
      return;
    }

    if (gameState === getGameVisiblePaused()) {
      setGameState(getGameVisibleActive());
    }
  });

  getElements().btnEnglish.addEventListener("click", async () => {
    await handleLanguageChange("en");
    setGameState(getMenuState());
  });

  getElements().btnSpanish.addEventListener("click", async () => {
    await handleLanguageChange("es");
    setGameState(getMenuState());
  });

  getElements().btnGerman.addEventListener("click", async () => {
    await handleLanguageChange("de");
    setGameState(getMenuState());
  });

  getElements().btnItalian.addEventListener("click", async () => {
    await handleLanguageChange("it");
    setGameState(getMenuState());
  });

  getElements().btnFrench.addEventListener("click", async () => {
    await handleLanguageChange("fr");
    setGameState(getMenuState());
  });

  getElements().saveGameButton.addEventListener("click", function () {
    getElements().overlay.classList.remove("d-none");
    saveGame(true);
  });

  getElements().loadGameButton.addEventListener("click", function () {
    getElements().overlay.classList.remove("d-none");
    loadGameOption();
  });

  getElements().copyButtonSavePopup.addEventListener("click", function () {
    copySaveStringToClipBoard();
  });

  getElements().closeButtonSavePopup.addEventListener("click", function () {
    getElements().saveLoadPopup.classList.add("d-none");
    getElements().overlay.classList.add("d-none");
  });

  getElements().loadStringButton.addEventListener("click", function () {
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
  getElements().counterLabel.innerHTML = `${localize(
    "counterLabel",
    getLanguage()
  )}`;

  if (gameState === getGameVisiblePaused()) {
    getElements().pauseResumeGameButton.innerHTML = `${localize(
      "resume",
      getLanguage()
    )}`;
  } else {
    getElements().pauseResumeGameButton.innerHTML = `${localize(
      "pause",
      getLanguage()
    )}`;
  }

  getElements().returnToMenuButton.innerHTML = `${localize(
    "menuTitle",
    getLanguage()
  )}`;
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
  