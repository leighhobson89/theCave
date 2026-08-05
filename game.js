import { localize } from "./localization.js";
import {
  setGameStateVariable,
  getMenuState,
  getGameVisibleActive,
  getElements,
  getLanguage,
  getGameInProgress,
  gameState,
} from "./constantsAndGlobalVars.js";

//--------------------------------------------------------------------------------------------------------

const ZOOM_LEVELS = [0.65, 0.85, 1, 1.2, 1.45];
const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1800;
const PARALLAX_FACTOR = 0.4;

let desktopInitialized = false;
let currentZoomIndex = 2;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginPanX = 0;
let dragOriginPanY = 0;

function getViewportRect() {
  if (!getElements().desktopViewport) {
    return { width: 0, height: 0 };
  }

  return getElements().desktopViewport.getBoundingClientRect();
}

function clampPan() {
  const rect = getViewportRect();
  const zoom = ZOOM_LEVELS[currentZoomIndex];
  const scaledWidth = WORLD_WIDTH * zoom;
  const scaledHeight = WORLD_HEIGHT * zoom;

  const minPanX = Math.min(0, rect.width - scaledWidth);
  const minPanY = Math.min(0, rect.height - scaledHeight);
  const maxPanX = 0;
  const maxPanY = 0;

  panX = Math.min(maxPanX, Math.max(minPanX, panX));
  panY = Math.min(maxPanY, Math.max(minPanY, panY));
}

function updateZoomReadout() {
  if (!getElements().zoomReadout) {
    return;
  }

  getElements().zoomReadout.textContent = `${localize("zoomLabel", getLanguage())} ${currentZoomIndex + 1}/5`;
}

function applyDesktopTransform() {
  if (!getElements().deskWorld || !getElements().deskParallax) {
    return;
  }

  const zoom = ZOOM_LEVELS[currentZoomIndex];
  clampPan();

  getElements().deskWorld.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  getElements().deskParallax.style.transform = `translate(${panX * PARALLAX_FACTOR}px, ${panY * PARALLAX_FACTOR}px) scale(${0.95 + zoom * 0.06})`;
  updateZoomReadout();
}

function focusWorldAtCenter() {
  const rect = getViewportRect();
  const zoom = ZOOM_LEVELS[currentZoomIndex];
  const scaledWidth = WORLD_WIDTH * zoom;
  const scaledHeight = WORLD_HEIGHT * zoom;

  panX = (rect.width - scaledWidth) / 2;
  panY = (rect.height - scaledHeight) / 2;
  clampPan();
}

function handleWheelZoom(event) {
  event.preventDefault();

  const previousZoom = ZOOM_LEVELS[currentZoomIndex];
  if (event.deltaY > 0) {
    currentZoomIndex = Math.max(0, currentZoomIndex - 1);
  } else {
    currentZoomIndex = Math.min(ZOOM_LEVELS.length - 1, currentZoomIndex + 1);
  }

  if (ZOOM_LEVELS[currentZoomIndex] === previousZoom) {
    return;
  }

  const rect = getViewportRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const worldX = (cx - panX) / previousZoom;
  const worldY = (cy - panY) / previousZoom;
  const nextZoom = ZOOM_LEVELS[currentZoomIndex];

  panX = cx - worldX * nextZoom;
  panY = cy - worldY * nextZoom;
  applyDesktopTransform();
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  isDragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOriginPanX = panX;
  dragOriginPanY = panY;

  if (getElements().desktopViewport) {
    getElements().desktopViewport.classList.add("is-dragging");
  }
}

function handlePointerMove(event) {
  if (!isDragging) {
    return;
  }

  const deltaX = event.clientX - dragStartX;
  const deltaY = event.clientY - dragStartY;
  panX = dragOriginPanX + deltaX;
  panY = dragOriginPanY + deltaY;
  applyDesktopTransform();
}

function handlePointerUp() {
  isDragging = false;
  if (getElements().desktopViewport) {
    getElements().desktopViewport.classList.remove("is-dragging");
  }
}

function toggleSettingsMenu() {
  if (!getElements().settingsItems || !getElements().settingsToggle) {
    return;
  }

  const willExpand = getElements().settingsItems.classList.contains("d-none");
  getElements().settingsItems.classList.toggle("d-none", !willExpand);
  getElements().settingsToggle.setAttribute("aria-expanded", String(willExpand));
}

function initializeDesktopInteractions() {
  if (desktopInitialized || !getElements().desktopViewport) {
    return;
  }

  getElements().desktopViewport.addEventListener("wheel", handleWheelZoom, { passive: false });
  getElements().desktopViewport.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("resize", applyDesktopTransform);

  if (getElements().settingsToggle) {
    getElements().settingsToggle.addEventListener("click", toggleSettingsMenu);
  }

  desktopInitialized = true;
}

export function startGame(resetView = false) {
  initializeDesktopInteractions();

  if (resetView) {
    currentZoomIndex = 2;
    focusWorldAtCenter();
  }

  applyDesktopTransform();
}

export function gameLoop() {
  applyDesktopTransform();
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
    case getGameVisibleActive():
      getElements().menu.classList.remove("d-flex");
      getElements().menu.classList.add("d-none");
      getElements().gameArea.classList.remove("d-none");
      getElements().gameArea.classList.add("d-flex");
      break;
  }

  updateZoomReadout();
}
