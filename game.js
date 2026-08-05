import { localize } from "./localization.js";
import {
  setGameStateVariable,
  getMenuState,
  getGameVisiblePaused,
  getGameVisibleActive,
  getElements,
  getLanguage,
  getGameInProgress,
  gameState,
} from "./constantsAndGlobalVars.js";

//--------------------------------------------------------------------------------------------------------

let counterValue = 0;
let counterIntervalId = null;

function updateCounterUI() {
  if (getElements().counterValue) {
    getElements().counterValue.textContent = String(counterValue);
  }
}

function ensureCounterLoop() {
  if (counterIntervalId !== null) {
    return;
  }

  counterIntervalId = window.setInterval(() => {
    if (gameState !== getGameVisibleActive()) {
      return;
    }

    counterValue += 1;
    updateCounterUI();
  }, 1000);
}

function updatePauseResumeButtonLabel() {
  if (!getElements().pauseResumeGameButton) {
    return;
  }

  const key = gameState === getGameVisiblePaused() ? "resume" : "pause";
  getElements().pauseResumeGameButton.innerHTML = `${localize(key, getLanguage())}`;
}

export function startGame(resetCounter = false) {
  if (resetCounter) {
    counterValue = 0;
    updateCounterUI();
  }

  ensureCounterLoop();
  gameLoop();
}

export function gameLoop() {
  updateCounterUI();
  updatePauseResumeButtonLabel();
}

export function setGameState(newState) {
  console.log("Setting game state to " + newState);
  setGameStateVariable(newState);

  switch (newState) {
    case getMenuState():
      getElements().menu.classList.remove("d-none");
      getElements().menu.classList.add("d-flex");
      getElements().gameArea.classList.remove("d-flex");
      getElements().gameArea.classList.add("d-none");

      const languageButtons = [
        getElements().btnEnglish,
        getElements().btnSpanish,
        getElements().btnGerman,
        getElements().btnItalian,
        getElements().btnFrench,
      ];
      languageButtons.forEach((button) => {
        button.classList.remove("active");
      });

      const currentLanguage = getLanguage();
      switch (currentLanguage) {
        case "en":
          getElements().btnEnglish.classList.add("active");
          break;
        case "es":
          getElements().btnSpanish.classList.add("active");
          break;
        case "de":
          getElements().btnGerman.classList.add("active");
          break;
        case "it":
          getElements().btnItalian.classList.add("active");
          break;
        case "fr":
          getElements().btnFrench.classList.add("active");
          break;
      }

      if (getGameInProgress()) {
        getElements().resumeGameMenuButton.classList.remove("disabled");
        getElements().resumeGameMenuButton.classList.add("btn-primary");
        getElements().saveGameButton.classList.remove("disabled");
        getElements().saveGameButton.classList.add("btn-primary");
        getElements().copyButtonSavePopup.innerHTML = `${localize(
          "copyButton",
          getLanguage()
        )}`;
        getElements().closeButtonSavePopup.innerHTML = `${localize(
          "closeButton",
          getLanguage()
        )}`;
      }
      break;
    case getGameVisiblePaused():
      getElements().menu.classList.remove("d-flex");
      getElements().menu.classList.add("d-none");
      getElements().gameArea.classList.remove("d-none");
      getElements().gameArea.classList.add("d-flex");
      getElements().returnToMenuButton.innerHTML = `${localize(
        "menuTitle",
        getLanguage()
      )}`;
      break;
    case getGameVisibleActive():
      getElements().menu.classList.remove("d-flex");
      getElements().menu.classList.add("d-none");
      getElements().gameArea.classList.remove("d-none");
      getElements().gameArea.classList.add("d-flex");
      getElements().returnToMenuButton.innerHTML = `${localize(
        "menuTitle",
        getLanguage()
      )}`;
      break;
  }

  updatePauseResumeButtonLabel();
}
