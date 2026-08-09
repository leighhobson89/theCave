import { localize } from "./localization.js";
import { audioManager } from "./audioManager.js";
import {
  setGameStateVariable,
  getMenuState,
  getDesktopState,
  getNoticeboardState,
  getActiveGameplayState,
  setActiveGameplayState,
  isGameplayState,
  getElements,
  getLanguage,
  getGameInProgress,
  gameState,
} from "./constantsAndGlobalVars.js";

const ZOOM_LEVELS = [0.60, 0.65, 0.85, 1];
const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1800;
const PARALLAX_FACTOR = 0.1;
const SCENE_FADE_DURATION_MS = 750;

let gameplayInteractionsInitialized = false;
let currentZoomIndex = 0;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginPanX = 0;
let dragOriginPanY = 0;
let desktopObjectAudioBound = false;
let zoomReadoutFadeTimeoutId = null;
let sceneTransitionInProgress = false;

function waitForMs(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

  getElements().zoomReadout.textContent = `${localize("zoomLabel", getLanguage())} ${currentZoomIndex + 1}/${ZOOM_LEVELS.length}`;
}

function showZoomReadoutTransient() {
  if (!getElements().zoomReadout) {
    return;
  }

  getElements().zoomReadout.classList.add("is-visible");

  if (zoomReadoutFadeTimeoutId !== null) {
    window.clearTimeout(zoomReadoutFadeTimeoutId);
  }

  zoomReadoutFadeTimeoutId = window.setTimeout(() => {
    getElements().zoomReadout.classList.remove("is-visible");
  }, 1500);
}

function updateTableLegPerspective(zoom) {
  const legs = [
    { element: getElements().tableLegTopLeft, x: 279, y: 229 },
    { element: getElements().tableLegTopRight, x: WORLD_WIDTH - 279, y: 229 },
    { element: getElements().tableLegBottomLeft, x: 279, y: WORLD_HEIGHT - 229 },
    { element: getElements().tableLegBottomRight, x: WORLD_WIDTH - 279, y: WORLD_HEIGHT - 229 },
  ];

  if (!legs.every((item) => item.element)) {
    return;
  }

  const rect = getViewportRect();
  const scaledWidth = WORLD_WIDTH * zoom;
  const scaledHeight = WORLD_HEIGHT * zoom;
  const minPanX = Math.min(0, rect.width - scaledWidth);
  const minPanY = Math.min(0, rect.height - scaledHeight);
  const centerPanX = minPanX / 2;
  const centerPanY = minPanY / 2;
  const maxPanTravel = Math.hypot(
    Math.max(1, Math.abs(minPanX - centerPanX)),
    Math.max(1, Math.abs(minPanY - centerPanY))
  );
  const viewportCenterX = rect.width / 2;
  const viewportCenterY = rect.height / 2;

  legs.forEach(({ element, x, y }) => {
    const centeredScreenX = centerPanX + x * zoom;
    const centeredScreenY = centerPanY + y * zoom;
    const currentScreenX = panX + x * zoom;
    const currentScreenY = panY + y * zoom;

    const centeredDistance = Math.hypot(
      centeredScreenX - viewportCenterX,
      centeredScreenY - viewportCenterY
    );
    const currentDistance = Math.hypot(
      currentScreenX - viewportCenterX,
      currentScreenY - viewportCenterY
    );

    const awayFromCorner = clampNumber(
      (currentDistance - centeredDistance) / maxPanTravel,
      0,
      1
    );
    const legExtend = 1 + awayFromCorner * 1.9;
    const legSquash = 1 - awayFromCorner * 0.16;
    const sheen = 0.55 + awayFromCorner * 0.45;

    element.style.setProperty("--leg-extend", legExtend.toFixed(3));
    element.style.setProperty("--leg-squash", legSquash.toFixed(3));
    element.style.setProperty("--leg-sheen", sheen.toFixed(3));
  });
}

function updateNoticeboardButtonLabel() {
  const noticeboardButton = getElements().noticeboardButton;
  if (!noticeboardButton) {
    return;
  }

  const activeGameplayState = getActiveGameplayState();
  if (activeGameplayState === getDesktopState()) {
    noticeboardButton.setAttribute("aria-label", "Go To Noticeboard");
    noticeboardButton.title = "Go To Noticeboard";
    return;
  }

  noticeboardButton.setAttribute("aria-label", "Go To Desktop");
  noticeboardButton.title = "Go To Desktop";
}

function updateSceneVisibility() {
  const desktopViewport = getElements().desktopViewport;
  const desktopWorld = getElements().deskWorld;
  const desktopParallax = getElements().deskParallax;
  const noticeboardScene = getElements().noticeboardScene;

  const activeGameplayState = getActiveGameplayState();
  const isDesktopSceneActive = activeGameplayState === getDesktopState();
  const isNoticeboardSceneActive = activeGameplayState === getNoticeboardState();

  if (desktopViewport) {
    desktopViewport.dataset.activeScene = isNoticeboardSceneActive ? "noticeboard" : "desktop";
  }

  if (desktopWorld) {
    desktopWorld.classList.toggle("is-scene-hidden", !isDesktopSceneActive);
  }

  if (desktopParallax) {
    desktopParallax.classList.toggle("is-scene-hidden", !isDesktopSceneActive);
  }

  if (noticeboardScene) {
    noticeboardScene.classList.toggle("is-scene-hidden", !isNoticeboardSceneActive);
  }

  updateNoticeboardButtonLabel();
}

function applySceneTransform() {
  const desktopWorld = getElements().deskWorld;
  const desktopParallax = getElements().deskParallax;
  const noticeboardScene = getElements().noticeboardScene;

  if (!desktopWorld || !desktopParallax || !noticeboardScene) {
    return;
  }

  const zoom = ZOOM_LEVELS[currentZoomIndex];
  clampPan();

  const activeGameplayState = getActiveGameplayState();
  if (activeGameplayState === getDesktopState()) {
    desktopWorld.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    desktopParallax.style.transform = `translate(${panX * PARALLAX_FACTOR}px, ${panY * PARALLAX_FACTOR}px) scale(${0.9 + zoom * 0.03})`;
    updateTableLegPerspective(zoom);
  } else if (activeGameplayState === getNoticeboardState()) {
    noticeboardScene.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

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
  audioManager.onUserGesture();
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
  showZoomReadoutTransient();
  applySceneTransform();
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  audioManager.onUserGesture();

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
  applySceneTransform();
}

function cancelDrag() {
  isDragging = false;
  if (getElements().desktopViewport) {
    getElements().desktopViewport.classList.remove("is-dragging");
  }
}

function handlePointerUp() {
  cancelDrag();
}

function handlePointerLeave() {
  if (!isDragging) {
    return;
  }

  cancelDrag();
}

function handlePointerCancel() {
  cancelDrag();
}

function handleWindowBlur() {
  cancelDrag();
}

function handleVisibilityChange() {
  if (document.hidden) {
    cancelDrag();
  }
}

function toggleSettingsMenu() {
  if (!getElements().settingsItems || !getElements().settingsToggle) {
    return;
  }

  const willExpand = getElements().settingsItems.classList.contains("d-none");
  getElements().settingsItems.classList.toggle("d-none", !willExpand);
  getElements().settingsToggle.setAttribute("aria-expanded", String(willExpand));
  audioManager.playSfx("clickSwitch");
}

async function handleNoticeboardButtonClick() {
  if (sceneTransitionInProgress) {
    return;
  }

  audioManager.onUserGesture();
  audioManager.playSfx("clickSwitch");

  const currentScene = getActiveGameplayState();
  const nextScene = currentScene === getDesktopState()
    ? getNoticeboardState()
    : getDesktopState();

  await transitionGameplayScene(nextScene);
}

function bindDesktopObjectAudio() {
  if (desktopObjectAudioBound) {
    return;
  }

  const selectors = [".desk-book", "#notesFolder", "#desktopCalendar"];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.addEventListener("click", () => {
        audioManager.onUserGesture();
        audioManager.playSfx("clickButton");
      });
    });
  });

  desktopObjectAudioBound = true;
}

function initializeGameplayInteractions() {
  if (gameplayInteractionsInitialized || !getElements().desktopViewport) {
    return;
  }

  getElements().desktopViewport.addEventListener("wheel", handleWheelZoom, { passive: false });
  getElements().desktopViewport.addEventListener("pointerdown", handlePointerDown);
  getElements().desktopViewport.addEventListener("pointermove", handlePointerMove);
  getElements().desktopViewport.addEventListener("pointerup", handlePointerUp);
  getElements().desktopViewport.addEventListener("pointerleave", handlePointerLeave);
  getElements().desktopViewport.addEventListener("pointercancel", handlePointerCancel);
  window.addEventListener("blur", handleWindowBlur);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", applySceneTransform);

  if (getElements().settingsToggle) {
    getElements().settingsToggle.addEventListener("click", toggleSettingsMenu);
  }

  if (getElements().noticeboardButton) {
    getElements().noticeboardButton.addEventListener("click", () => {
      void handleNoticeboardButtonClick();
    });
  }

  bindDesktopObjectAudio();

  gameplayInteractionsInitialized = true;
}

export function startGame(resetView = false) {
  initializeGameplayInteractions();

  if (resetView) {
    currentZoomIndex = 0;
    focusWorldAtCenter();
  }

  updateSceneVisibility();
  applySceneTransform();
}

export function gameLoop() {
  applySceneTransform();
}

export function setGameState(newState) {
  console.log("Setting game state to " + newState);

  if (newState === getMenuState() && isGameplayState(gameState)) {
    setActiveGameplayState(gameState);
  }

  if (newState === getDesktopState() || newState === getNoticeboardState()) {
    setActiveGameplayState(newState);
  }

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

      switch (getLanguage()) {
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

    case getDesktopState():
    case getNoticeboardState():
      getElements().menu.classList.remove("d-flex");
      getElements().menu.classList.add("d-none");
      getElements().gameArea.classList.remove("d-none");
      getElements().gameArea.classList.add("d-flex");
      updateSceneVisibility();
      break;
  }

  updateZoomReadout();
}

export async function transitionGameplayScene(targetState) {
  if (!isGameplayState(targetState) || sceneTransitionInProgress) {
    return;
  }

  if (targetState === getActiveGameplayState()) {
    return;
  }

  sceneTransitionInProgress = true;

  try {
    cancelDrag();

    const fadeOverlay = getElements().sceneFadeOverlay;
    if (!(fadeOverlay instanceof HTMLElement)) {
      setGameState(targetState);
      startGame(false);
      return;
    }

    fadeOverlay.classList.add("is-active");
    // Kick opacity transition on next frame so the browser can animate from 0 -> 1.
    requestAnimationFrame(() => {
      fadeOverlay.classList.add("is-opaque");
    });

    await waitForMs(SCENE_FADE_DURATION_MS);

    setGameState(targetState);
    startGame(false);

    fadeOverlay.classList.remove("is-opaque");
    await waitForMs(SCENE_FADE_DURATION_MS);

    fadeOverlay.classList.remove("is-active");
  } finally {
    sceneTransitionInProgress = false;
  }
}
