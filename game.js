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
  ZOOM_LEVELS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  NOTICEBOARD_WORLD_HEIGHT,
  PARALLAX_FACTOR,
  SCENE_FADE_DURATION_MS,
  LANGUAGE_BUTTON_KEYS_BY_CODE,
  getGameplayInteractionsInitialized,
  setGameplayInteractionsInitialized,
  getCurrentZoomIndex,
  setCurrentZoomIndex,
  getPanX,
  setPanX,
  getPanY,
  setPanY,
  getIsDragging,
  setIsDragging,
  getDragStartX,
  setDragStartX,
  getDragStartY,
  setDragStartY,
  getDragOriginPanX,
  setDragOriginPanX,
  getDragOriginPanY,
  setDragOriginPanY,
  getDesktopObjectAudioBound,
  setDesktopObjectAudioBound,
  getZoomReadoutFadeTimeoutId,
  setZoomReadoutFadeTimeoutId,
  getSceneTransitionInProgress,
  setSceneTransitionInProgress,
} from "./constantsAndGlobalVars.js";

export { LANGUAGE_BUTTON_KEYS_BY_CODE, updateNoticeboardButtonLabel };

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

// The noticeboard scene is far taller than the desk, so the height panning is
// clamped against depends on which scene is showing. Using one shared world
// height would leave most of the corkboard unreachable.
function getActiveWorldHeight() {
  return getActiveGameplayState() === getNoticeboardState()
    ? NOTICEBOARD_WORLD_HEIGHT
    : WORLD_HEIGHT;
}

function clampPan() {
  const rect = getViewportRect();
  const zoom = ZOOM_LEVELS[getCurrentZoomIndex()];
  const scaledWidth = WORLD_WIDTH * zoom;
  const scaledHeight = getActiveWorldHeight() * zoom;

  const minPanX = Math.min(0, rect.width - scaledWidth);
  const minPanY = Math.min(0, rect.height - scaledHeight);
  const maxPanX = 0;
  const maxPanY = 0;

  setPanX(Math.min(maxPanX, Math.max(minPanX, getPanX())));
  setPanY(Math.min(maxPanY, Math.max(minPanY, getPanY())));
}

function updateZoomReadout() {
  if (!getElements().zoomReadout) {
    return;
  }

  getElements().zoomReadout.textContent = `${localize("zoomLabel", getLanguage())} ${getCurrentZoomIndex() + 1}/${ZOOM_LEVELS.length}`;
}

function showZoomReadoutTransient() {
  if (!getElements().zoomReadout) {
    return;
  }

  getElements().zoomReadout.classList.add("is-visible");

  if (getZoomReadoutFadeTimeoutId() !== null) {
    window.clearTimeout(getZoomReadoutFadeTimeoutId());
  }

  setZoomReadoutFadeTimeoutId(window.setTimeout(() => {
    getElements().zoomReadout.classList.remove("is-visible");
  }, 1500));
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
    const currentScreenX = getPanX() + x * zoom;
    const currentScreenY = getPanY() + y * zoom;

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
  const languageCode = getLanguage();
  const labelKey = activeGameplayState === getDesktopState() ? "goToNoticeboardLabel" : "goToDesktopLabel";
  const label = localize(labelKey, languageCode);
  noticeboardButton.setAttribute("aria-label", label);
  noticeboardButton.title = label;
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

  const zoom = ZOOM_LEVELS[getCurrentZoomIndex()];
  clampPan();

  const activeGameplayState = getActiveGameplayState();
  if (activeGameplayState === getDesktopState()) {
    desktopWorld.style.transform = `translate(${getPanX()}px, ${getPanY()}px) scale(${zoom})`;
    desktopParallax.style.transform = `translate(${getPanX() * PARALLAX_FACTOR}px, ${getPanY() * PARALLAX_FACTOR}px) scale(${0.9 + zoom * 0.03})`;
    updateTableLegPerspective(zoom);
  } else if (activeGameplayState === getNoticeboardState()) {
    noticeboardScene.style.transform = `translate(${getPanX()}px, ${getPanY()}px) scale(${zoom})`;
  }

  updateZoomReadout();
}

function focusWorldAtCenter() {
  const rect = getViewportRect();
  const zoom = ZOOM_LEVELS[getCurrentZoomIndex()];
  const scaledWidth = WORLD_WIDTH * zoom;
  const scaledHeight = getActiveWorldHeight() * zoom;

  setPanX((rect.width - scaledWidth) / 2);
  setPanY((rect.height - scaledHeight) / 2);
  clampPan();
}

function handleWheelZoom(event) {
  audioManager.onUserGesture();
  event.preventDefault();

  const previousZoom = ZOOM_LEVELS[getCurrentZoomIndex()];
  if (event.deltaY > 0) {
    setCurrentZoomIndex(Math.max(0, getCurrentZoomIndex() - 1));
  } else {
    setCurrentZoomIndex(Math.min(ZOOM_LEVELS.length - 1, getCurrentZoomIndex() + 1));
  }

  if (ZOOM_LEVELS[getCurrentZoomIndex()] === previousZoom) {
    return;
  }

  const rect = getViewportRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const worldX = (cx - getPanX()) / previousZoom;
  const worldY = (cy - getPanY()) / previousZoom;
  const nextZoom = ZOOM_LEVELS[getCurrentZoomIndex()];

  setPanX(cx - worldX * nextZoom);
  setPanY(cy - worldY * nextZoom);
  showZoomReadoutTransient();
  applySceneTransform();
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  audioManager.onUserGesture();

  setIsDragging(true);
  setDragStartX(event.clientX);
  setDragStartY(event.clientY);
  setDragOriginPanX(getPanX());
  setDragOriginPanY(getPanY());

  if (getElements().desktopViewport) {
    getElements().desktopViewport.classList.add("is-dragging");
  }
}

function handlePointerMove(event) {
  if (!getIsDragging()) {
    return;
  }

  const deltaX = event.clientX - getDragStartX();
  const deltaY = event.clientY - getDragStartY();
  setPanX(getDragOriginPanX() + deltaX);
  setPanY(getDragOriginPanY() + deltaY);
  applySceneTransform();
}

function cancelDrag() {
  setIsDragging(false);
  if (getElements().desktopViewport) {
    getElements().desktopViewport.classList.remove("is-dragging");
  }
}

function handlePointerUp() {
  cancelDrag();
}

function handlePointerLeave() {
  if (!getIsDragging()) {
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
  if (getSceneTransitionInProgress()) {
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
  if (getDesktopObjectAudioBound()) {
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

  setDesktopObjectAudioBound(true);
}

function initializeGameplayInteractions() {
  if (getGameplayInteractionsInitialized() || !getElements().desktopViewport) {
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

  setGameplayInteractionsInitialized(true);
}

// Pans the noticeboard so `element` sits in the middle of the viewport. The
// board is taller than the screen at every zoom level, so anything that wants to
// draw the player's attention to a particular frame has to bring it into view
// rather than assume it is already there.
export function focusNoticeboardOnElement(element, { horizontalAnchor = 0.5, verticalAnchor = 0.5 } = {}) {
  if (!element || getActiveGameplayState() !== getNoticeboardState()) {
    return false;
  }

  const viewportRect = getViewportRect();
  const elementRect = element.getBoundingClientRect();

  // Worked out as a delta between two on-screen rectangles rather than from
  // offsetLeft/offsetTop. The board is absolutely positioned and centred with a
  // translate(-50%, -50%), and the scene carries the zoom on its own transform,
  // so offset coordinates do not describe where anything actually is.
  // The anchors say where in the viewport the element should end up, as
  // fractions of its width and height. The envelope window is docked bottom
  // left, so callers wanting a frame to stay clear of it aim right rather than
  // centre. Pan clamping means a frame in the bottom row cannot always be
  // lifted above the window, so avoiding it horizontally is the reliable axis.
  const anchorX = Math.min(0.9, Math.max(0.1, horizontalAnchor));
  const anchorY = Math.min(0.9, Math.max(0.1, verticalAnchor));
  const deltaX = (viewportRect.left + viewportRect.width * anchorX) - (elementRect.left + elementRect.width / 2);
  const deltaY = (viewportRect.top + viewportRect.height * anchorY) - (elementRect.top + elementRect.height / 2);

  setPanX(getPanX() + deltaX);
  setPanY(getPanY() + deltaY);
  applySceneTransform();
  return true;
}

export function startGame(resetView = false) {
  initializeGameplayInteractions();

  if (resetView) {
    setCurrentZoomIndex(0);
    focusWorldAtCenter();
  }

  updateSceneVisibility();
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

  const elements = getElements();

  switch (newState) {
    case getMenuState(): {
      elements.menu.classList.remove("d-none");
      elements.menu.classList.add("d-flex");
      elements.gameArea.classList.remove("d-flex");
      elements.gameArea.classList.add("d-none");

      const activeLanguage = getLanguage();
      LANGUAGE_BUTTON_KEYS_BY_CODE.forEach((elementKey, languageCode) => {
        elements[elementKey].classList.toggle("active", languageCode === activeLanguage);
      });

      if (getGameInProgress()) {
        elements.resumeGameMenuButton.classList.remove("disabled");
        elements.resumeGameMenuButton.classList.add("btn-primary");
        elements.saveGameButton.classList.remove("disabled");
        elements.saveGameButton.classList.add("btn-primary");
        elements.copyButtonSavePopup.innerHTML = localize("copyButton", activeLanguage);
        elements.closeButtonSavePopup.innerHTML = localize("closeButton", activeLanguage);
      }
      break;
    }

    case getDesktopState():
    case getNoticeboardState():
      elements.menu.classList.remove("d-flex");
      elements.menu.classList.add("d-none");
      elements.gameArea.classList.remove("d-none");
      elements.gameArea.classList.add("d-flex");
      updateSceneVisibility();
      break;
  }

  updateZoomReadout();
}

export async function transitionGameplayScene(targetState) {
  if (!isGameplayState(targetState) || getSceneTransitionInProgress()) {
    return;
  }

  if (targetState === getActiveGameplayState()) {
    return;
  }

  setSceneTransitionInProgress(true);

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
    setSceneTransitionInProgress(false);
  }
}
