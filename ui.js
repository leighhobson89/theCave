import {
  getAshtrayHasExtraButt,
  getAshtrayHasLitCigarette,
  getFacsimileState,
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
  resetFacsimileState,
  resetNotesPagesState,
  resetPaintPagesState,
  setElements,
  setAshtrayHasExtraButt,
  setAshtrayHasLitCigarette,
  setFacsimileState,
  setEvidenceCustomName,
  setEvidenceCustomNames,
  getElements,
  setBeginGameStatus,
  getGameInProgress,
  setGameInProgress,
  getDesktopState,
  getActiveGameplayState,
  isGameplayState,
  getMenuState,
  getLanguageSelected,
  setLanguageSelected,
  setLanguage,
  setNotesActivePageIndex,
  setNotesPages,
  setPaintActivePageIndex,
  setPaintPages,
  getBrowserAddressHistory,
  setBrowserAddressHistory,
  getNextDesktopWindowZIndex,
  registerWebContentSessionsProvider,
  getQuickLoginEntry,
  recordQuickLogin,
  resetQuickLoginState,
  restoreGameStatus,
  REPORT_PAPER_STYLE_CLASS_PREFIX,
  PHOTO_PAPER_STYLE_CLASS_PREFIX,
  PHOTO_FRAME_ASPECT_RATIO,
  PHOTO_FRAME_MAX_WIDTH,
  PHOTO_FRAME_MAX_HEIGHT,
  DEBUG_WINDOW_COLOR,
  NOTES_TAB_COLORS,
  NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS,
  AUTOSAVE_INDICATOR_VISIBLE_MS,
  AUTOSAVE_INDICATOR_FADE_MS,
  NEW_GAME_WELCOME_FAX_DELAY_MS,
  NEW_GAME_MISSING_REPORT_FAX_DELAY_MS,
  getAshtrayAnimationTimeoutId,
  setAshtrayAnimationTimeoutId,
  getFacsimileFeedAnimationTimeoutId,
  setFacsimileFeedAnimationTimeoutId,
  getEvidenceMilestoneTriggersInitialized,
  setEvidenceMilestoneTriggersInitialized,
  getNextRecordOpenFaxTriggerId,
  setNextRecordOpenFaxTriggerId,
  getRecordOpenFaxTriggersInitialized,
  setRecordOpenFaxTriggersInitialized,
  getNotificationReleaseIntervalId,
  setNotificationReleaseIntervalId,
  getAutosaveIndicatorHideTimeoutId,
  setAutosaveIndicatorHideTimeoutId,
  getAutosaveIndicatorRemoveTimeoutId,
  setAutosaveIndicatorRemoveTimeoutId,
  getNewGameWelcomeFaxTimeoutId,
  setNewGameWelcomeFaxTimeoutId,
  getNewGameMissingReportFaxTimeoutId,
  setNewGameMissingReportFaxTimeoutId,
} from "./constantsAndGlobalVars.js";
import {
  clearStickySave,
  hasStickySave,
  readStickySave,
  startStickyAutosave,
  writeStickySave,
} from "./stickySave.js";
import {
  addEvidenceTrigger,
  createEvidence,
  getCurrentEvidence,
  getEvidenceCollection,
  getEvidenceCount,
  getEvidenceIndex,
  getEvidenceStoreSnapshot,
  getEvidenceStorageKeys,
  initializeEvidenceStoreForNewGame,
  PHOTOS_CATALOG_PATH_TEMPLATE,
  REPORTS_CATALOG_PATH_TEMPLATE,
  resolveEvidenceContentPath,
  setEvidenceIndex,
  stepEvidenceIndex,
} from "./evidenceManager.js";
import {
  activateProgressEvidence,
  activateProgressEvidenceForItem,
  getEligibleProgressEvidence,
  getProgressEvidence,
  getProgressEvidenceEntries,
  getProgressEvidenceIdForItem,
  isProgressEvidenceActivated,
  loadProgressEvidenceDefinitions,
  PROGRESS_EVIDENCE_SERVICES,
  resetProgressEvidence,
  setProgressEvidenceDeveloperEnabled,
} from "./progressEvidenceManager.js";
import {
  getBoardProgressTimeLineEvents,
  getCorrectlyPlacedProgressTimeLineFrameIds,
  getEnvelopeProgressTimeLinePhotos,
  getLockedProgressTimeLineFrameIds,
  getProgressTimeLineEventDescription,
  getProgressTimeLineEventEntries,
  getProgressTimeLineEventNote,
  getProgressTimeLineEventPlacements,
  getProgressTimeLineFramePlacement,
  isProgressTimeLineFrameLocked,
  isProgressTimeLinePhotoUnlocked,
  loadProgressTimeLineEventDefinitions,
  parseProgressTimeLineEventYear,
  placePhotoOnProgressTimeLineFrame,
  resetProgressTimeLineEventPlacements,
  resolveProgressTimeLineEventImagePath,
  returnProgressTimeLinePhotoToEnvelope,
  setProgressTimeLineEventNote,
} from "./progressTimeLineEventManager.js";
import { LANGUAGE_BUTTON_KEYS_BY_CODE, focusNoticeboardOnElement, resetGameplayCameraToDefault, setGameState, startGame, updateNoticeboardButtonLabel } from "./game.js";
import { audioManager } from "./audioManager.js";
import { initLocalization, localize } from "./localization.js";
import { DesktopWindow } from "./desktopWindow.js";
import { installGameTooltips } from "./tooltipManager.js";
import {
  CAVEOS_THEME_IDS,
  getCaveOsTheme,
  setCaveOsTheme,
  resetCaveOsTheme,
} from "./constantsAndGlobalVars.js";
import {
  getProgressEvidenceEnvelopePosition,
  setProgressEvidenceEnvelopePosition,
} from "./constantsAndGlobalVars.js";
import {
  loadGameOption,
  loadGame,
  pasteLoadStringFromClipboard,
  saveGame,
  copySaveStringToClipBoard,
} from "./saveLoadGame.js";
import { createWebContentManager } from "./webContentManager.js";
import {
  unlockEchotrailFileName,
  getEchotrailUnlockedFileNames,
  resetEchotrailUnlockedFileNames,
} from "./constantsAndGlobalVars.js";
import {
  buildEchotrailLibrary,
  normalizeEchotrailFileName,
} from "./echotrailManager.js";
import {
  appendDelimitedLinkText,
  createContentDivider,
  createImageGallery,
  normalizeLines,
  registerDefaultWebContentSites,
} from "./webContentRegistry.js";

const storyTextCacheByLanguage = new Map();
const reportCatalogCacheByLanguage = new Map();
const photoCatalogCacheByLanguage = new Map();
const activeDesktopWindows = new Set();
const desktopWindowKinds = new WeakMap();
const storyWindowContentRefs = new WeakMap();
const photosWindowContentRefs = new WeakMap();
const reportsWindowContentRefs = new WeakMap();
const notesWindowContentRefs = new WeakMap();
const computerWindowContentRefs = new WeakMap();
const calculatorWindowContentRefs = new WeakMap();
const snakeWindowContentRefs = new WeakMap();
const minesweeperWindowContentRefs = new WeakMap();
const sudokuWindowContentRefs = new WeakMap();
const tetrisWindowContentRefs = new WeakMap();
const echotrailWindowContentRefs = new WeakMap();
const facsimileWindowContentRefs = new WeakMap();
const progressEvidenceWindowContentRefs = new WeakMap();
// Track lengths, keyed by source path, read once from each file's metadata and
// kept for the rest of the session. Module-level rather than per-window so
// closing and reopening the library does not re-read six files; the duration of
// an mp3 cannot change while the game runs.
const echotrailDurationsBySource = new Map();
const EVIDENCE_STORAGE_KEYS = getEvidenceStorageKeys();
let debugWindowController = null;
const recordOpenFaxTriggers = new Map();
const notificationQueue = [];
let notificationHostElement = null;

const webContentManager = createWebContentManager({
  awardEvidence: awardWebContentEvidence,
  // Quick-login credentials are game-state, not UI state: they live in
  // constantsAndGlobalVars so they ride along in every save.
  quickLogin: {
    get: (websiteId) => getQuickLoginEntry(websiteId),
    record: (websiteId, entry) => recordQuickLogin(websiteId, entry),
  },
  // Read fresh on every fetch (not captured once), so a language switch
  // mid-game is picked up on the site's next load rather than reusing content
  // fetched for a previous language.
  getLanguage: () => getLanguage(),
});

registerDefaultWebContentSites(webContentManager);

// Website logins (Police Records, Canada Archives) persist into the save file.
registerWebContentSessionsProvider({
  getSnapshot: () => webContentManager.getSessionsSnapshot(),
  restoreSnapshot: (snapshot) => webContentManager.restoreSessionsSnapshot(snapshot),
});

function ensureNotificationHostElement() {
  if (notificationHostElement?.isConnected) {
    return notificationHostElement;
  }

  const host = document.createElement("div");
  host.classList.add("notification-host");
  host.setAttribute("aria-live", "polite");
  host.setAttribute("aria-atomic", "false");
  document.body.appendChild(host);
  notificationHostElement = host;
  return host;
}

// Autosave indicator -------------------------------------------------------
//
// Lives directly on <body> like the notification host, not inside #gameArea,
// so it shows in every scene -- desktop, noticeboard, menu, with the computer
// or any window open -- and is unaffected by scene switching.
//
// Fade in and fade out are both 0.75s, driven by one CSS transition; the
// element is created once and reused, so overlapping saves can never stack
// two indicators.
let autosaveIndicatorElement = null;

function ensureAutosaveIndicatorElement() {
  if (autosaveIndicatorElement?.isConnected) {
    return autosaveIndicatorElement;
  }

  const indicator = document.createElement("div");
  indicator.classList.add("autosave-indicator");
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-live", "polite");
  indicator.innerHTML = `
    <span class="autosave-indicator-icon" aria-hidden="true">
      <span class="autosave-indicator-spinner"></span>
      <svg class="autosave-indicator-disk" viewBox="0 0 24 24" focusable="false">
        <path class="autosave-indicator-disk-body" d="M4 3h13l4 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
        <path class="autosave-indicator-disk-shutter" d="M8 3h7v6H8z"/>
        <rect class="autosave-indicator-disk-slot" x="12" y="4.2" width="1.8" height="4"/>
        <path class="autosave-indicator-disk-label" d="M6.5 13h11v8h-11z"/>
        <path class="autosave-indicator-disk-lines" d="M8.5 15.5h7M8.5 18h4.5"/>
      </svg>
    </span>
    <span class="autosave-indicator-text"></span>
  `;

  document.body.appendChild(indicator);
  autosaveIndicatorElement = indicator;
  refreshAutosaveIndicatorLanguage();
  return indicator;
}

// The indicator element is created once and reused for the rest of the
// session (see comment above), so a language change needs its own refresh
// hook rather than relying on the element being rebuilt.
function refreshAutosaveIndicatorLanguage() {
  const textElement = autosaveIndicatorElement?.querySelector(".autosave-indicator-text");
  if (textElement) {
    textElement.textContent = localize("savingInProgress", getLanguage());
  }
}

// Safe to call at any time and at any frequency: a save arriving while the
// indicator is still up simply restarts its visible window on the one element.
export function showAutosaveIndicator() {
  const indicator = ensureAutosaveIndicatorElement();

  if (getAutosaveIndicatorHideTimeoutId() !== null) {
    window.clearTimeout(getAutosaveIndicatorHideTimeoutId());
    setAutosaveIndicatorHideTimeoutId(null);
  }
  if (getAutosaveIndicatorRemoveTimeoutId() !== null) {
    window.clearTimeout(getAutosaveIndicatorRemoveTimeoutId());
    setAutosaveIndicatorRemoveTimeoutId(null);
  }

  indicator.classList.add("is-visible");

  setAutosaveIndicatorHideTimeoutId(window.setTimeout(() => {
    indicator.classList.remove("is-visible");
    setAutosaveIndicatorHideTimeoutId(null);

    // The spinner keeps running behind an opacity transition otherwise; park
    // it once the fade-out has finished.
    setAutosaveIndicatorRemoveTimeoutId(window.setTimeout(() => {
      indicator.classList.remove("is-active");
      setAutosaveIndicatorRemoveTimeoutId(null);
    }, AUTOSAVE_INDICATOR_FADE_MS));
  }, AUTOSAVE_INDICATOR_VISIBLE_MS));

  indicator.classList.add("is-active");
}

// One place that knows the autosave should light up the indicator, so the
// three start points (New Game, Load, Resume) cannot disagree.
function beginStickyAutosave() {
  startStickyAutosave({ onAutosave: showAutosaveIndicator });
}

function normalizeNotificationType(type) {
  const normalizedType = String(type || "info").trim().toLowerCase();
  if (
    normalizedType === "error"
    || normalizedType === "reward"
    || normalizedType === "fax-system"
    || normalizedType === "fax-intel"
    || normalizedType === "fax-credentials"
    || normalizedType === "fax-urgent"
  ) {
    return normalizedType;
  }

  return "info";
}

function releaseNextNotificationFromQueue() {
  if (!notificationQueue.length) {
    if (getNotificationReleaseIntervalId()) {
      clearInterval(getNotificationReleaseIntervalId());
      setNotificationReleaseIntervalId(null);
    }
    return;
  }

  const next = notificationQueue.shift();
  if (!next) {
    return;
  }

  const host = ensureNotificationHostElement();
  const notificationElement = document.createElement("div");
  notificationElement.classList.add("game-notification", `game-notification-${next.type}`);
  notificationElement.textContent = next.text;
  host.appendChild(notificationElement);

  let dismiss = () => {};

  // A notification that names a desk target becomes a shortcut to it. The host
  // is `pointer-events: none`, so only these opt back in to receiving clicks.
  if (next.target && NOTIFICATION_TARGETS[next.target]) {
    notificationElement.classList.add("is-actionable");
    notificationElement.setAttribute("role", "button");
    notificationElement.setAttribute("tabindex", "0");
    // Resolved per notification rather than once at module load, so the hint is
    // in whatever language is current when it appears.
    const targetHint = resolveNotificationTargetHint(next.target);
    notificationElement.setAttribute("title", targetHint);
    notificationElement.setAttribute("aria-label", `${next.text}. ${targetHint}`);

    const activate = () => {
      // Dismiss first so the notification cannot be double-fired while the
      // window it asked for is opening.
      dismiss();
      openNotificationTarget(next.target);
    };

    notificationElement.addEventListener("click", activate);
    notificationElement.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      activate();
    });
  }

  requestAnimationFrame(() => {
    notificationElement.classList.add("is-visible");
  });

  if (next.sound) {
    audioManager.playSfx(next.sound);
  }

  const hideDelay = Math.max(200, next.time);
  let removeTimeoutId = null;
  const hideTimeoutId = window.setTimeout(() => {
    notificationElement.classList.remove("is-visible");
    removeTimeoutId = window.setTimeout(() => {
      notificationElement.remove();
    }, 260);
  }, hideDelay);

  dismiss = () => {
    window.clearTimeout(hideTimeoutId);
    if (removeTimeoutId !== null) {
      window.clearTimeout(removeTimeoutId);
    }
    notificationElement.classList.remove("is-visible");
    window.setTimeout(() => {
      notificationElement.remove();
    }, 260);
  };
}

function ensureNotificationQueueReleaseLoop() {
  if (getNotificationReleaseIntervalId()) {
    return;
  }

  releaseNextNotificationFromQueue();
  setNotificationReleaseIntervalId(window.setInterval(() => {
    releaseNextNotificationFromQueue();
  }, NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS));
}

// `target` is optional and names a desk object the notification is about
// ("facsimile", "reports", "photos"). When given, the notification becomes
// clickable and acts as a shortcut to that window.
export function showNotifcation(type, text, time, sound = false, target = "") {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    return;
  }

  const parsedTime = Number(time);
  const normalizedTarget = String(target || "").trim().toLowerCase();
  const notification = {
    type: normalizeNotificationType(type),
    text: normalizedText,
    time: Number.isFinite(parsedTime) ? Math.max(200, parsedTime) : 2500,
    sound: typeof sound === "string" && sound.trim() ? sound.trim() : false,
    target: NOTIFICATION_TARGETS[normalizedTarget] ? normalizedTarget : "",
  };

  notificationQueue.push(notification);
  ensureNotificationQueueReleaseLoop();
}

window.showNotifcation = showNotifcation;

window.receiveFacsimileReport = function receiveFacsimileReport(reportPayload) {
  return queueFacsimileReport(reportPayload, { animateFeed: true });
};

window.receiveLocalizedFacsimileReport = function receiveLocalizedFacsimileReport(faxConfig) {
  return queueConfiguredFacsimileReport(faxConfig, { animateFeed: true });
};

window.receiveConfiguredFacsimileReport = function receiveConfiguredFacsimileReport(faxConfig) {
  return queueConfiguredFacsimileReport(faxConfig, { animateFeed: true });
};

window.addEventListener("cave-facsimile-report", (event) => {
  const reportPayload = event?.detail && typeof event.detail === "object"
    ? event.detail.report || event.detail
    : null;

  if (!reportPayload) {
    return;
  }

  queueFacsimileReport(reportPayload, { animateFeed: true });
});

function syncAshtrayVisualState() {
  const ashtrayElement = getElements().desktopAshtray;
  if (!ashtrayElement) {
    return;
  }

  ashtrayElement.classList.toggle("has-lit-cig", getAshtrayHasLitCigarette());
  ashtrayElement.classList.toggle("has-extra-butt", getAshtrayHasExtraButt());
  ashtrayElement.classList.remove("is-extinguishing", "is-relighting");
}

// The smoke-plume loop (styles.css) is infinite and keeps running while
// hidden behind opacity: 0, so relighting after any length of time would
// otherwise resume it mid-cycle instead of showing a first puff. Restarting
// each plume's animation right as the cigarette relights is what makes a
// wisp of smoke visibly kick off the moment it catches — setting
// `animation: none` inline, forcing layout so the browser actually notices,
// then clearing it lets the element's own CSS animation start over from 0%.
function restartAshtraySmokePlumes(ashtrayElement) {
  const plumes = ashtrayElement.querySelectorAll(".smoke-plume");
  plumes.forEach((plume) => {
    plume.style.animation = "none";
  });

  // Reading a layout property forces the browser to apply the "none" above
  // before it is removed, without which the two writes would coalesce and
  // the animation would never actually stop.
  void ashtrayElement.offsetWidth;

  plumes.forEach((plume) => {
    plume.style.animation = "";
  });
}

function getFacsimilePendingReports() {
  const facsimile = getFacsimileState();
  return Array.isArray(facsimile?.pendingReports)
    ? facsimile.pendingReports
      .filter((item) => item && typeof item === "object")
      .map((item) => ({ ...item }))
    : [];
}

// `String(value).trim()`, falling back to `fallback` when the result is blank.
function trimmedOr(value, fallback) {
  return String(value ?? "").trim() || fallback;
}

// Normalizes the catalog-lookup descriptor carried by a fax payload. Shared by
// the raw-report and configured-fax entry points, which accept the same shape.
function normalizeFacsimileSource(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  return {
    ...source,
    kind: String(source.kind || "").trim(),
    entryId: String(source.entryId || "").trim(),
    catalogPathTemplate: String(source.catalogPathTemplate || "").trim(),
    languageAware: source.languageAware !== false,
  };
}

function sanitizeFacsimileReport(report) {
  if (!report || typeof report !== "object") {
    return null;
  }

  const id = String(report.id || report.name || "").trim();
  if (!id) {
    return null;
  }

  const defaultTitle = resolveLocalizedText("facsimileDefaultTitle", "Facsimile Report");
  const defaultDescription = resolveLocalizedText("facsimileDefaultDescription", "Received via facsimile machine.");

  return {
    id,
    title: trimmedOr(report.title || report.defaultTitleString, defaultTitle),
    reportText: String(report.reportText || report.content || "").replace(/\r\n/g, "\n").trim(),
    description: trimmedOr(report.description, defaultDescription),
    evidenceName: trimmedOr(report.evidenceName, `facsimile-${id}`),
    paperStyle: trimmedOr(report.paperStyle, "report-parchment"),
    source: normalizeFacsimileSource(report.source),
    storageKey: trimmedOr(report.storageKey, EVIDENCE_STORAGE_KEYS.REPORTS),
    titleKey: trimmedOr(report.titleKey, "reports"),
    // Informational faxes (e.g. the new-game welcome message) can opt out of
    // becoming Reports evidence by setting `awardsEvidence: false`. Defaults
    // to true so every existing caller keeps its current behaviour.
    awardsEvidence: report.awardsEvidence !== false,
    createdAt: new Date().toISOString(),
  };
}

function isFacsimileReportConsumed(reportId) {
  const normalizedId = String(reportId || "").trim();
  if (!normalizedId) {
    return false;
  }

  const facsimile = getFacsimileState();
  const consumed = Array.isArray(facsimile?.consumedReportIds) ? facsimile.consumedReportIds : [];
  return consumed.includes(normalizedId);
}

function queueFacsimileReport(reportPayload, options = {}) {
  const normalizedReport = sanitizeFacsimileReport(reportPayload);
  if (!normalizedReport) {
    return false;
  }

  if (isFacsimileReportConsumed(normalizedReport.id)) {
    return false;
  }

  const pendingReports = getFacsimilePendingReports();
  const isAlreadyPending = pendingReports.some((item) => String(item?.id || "").trim() === normalizedReport.id);
  if (isAlreadyPending) {
    return false;
  }

  const facsimile = getFacsimileState();
  setFacsimileState({
    pendingReports: [...pendingReports, normalizedReport],
    consumedReportIds: Array.isArray(facsimile?.consumedReportIds)
      ? facsimile.consumedReportIds
      : [],
  });

  queueFacsimileArrivalNotification(normalizedReport, options);

  // Progress evidence is recorded when the message is opened and consumed
  // (commitReadFacsimileReportToEvidence()), not on arrival — see that
  // function for the activation call.
  syncFacsimileVisualState({ animateFeed: options.animateFeed !== false });
  refreshOpenFacsimileWindows();
  return true;
}

function resolveFacsimileNotificationTypeByMessageType(messageType) {
  const normalizedType = String(messageType || "intel").trim().toLowerCase();
  if (normalizedType === "urgent") {
    return "fax-urgent";
  }
  if (normalizedType === "credentials") {
    return "fax-credentials";
  }
  if (normalizedType === "system") {
    return "fax-system";
  }

  return "fax-intel";
}

function queueFacsimileArrivalNotification(report, options = {}) {
  if (options?.notify === false) {
    return;
  }

  const notificationOptions = options?.notification && typeof options.notification === "object"
    ? options.notification
    : report?.notification && typeof report.notification === "object"
      ? report.notification
      : {};

  const notificationType = String(notificationOptions.type || "").trim() || resolveFacsimileNotificationTypeByMessageType(
    notificationOptions.messageType || report?.messageType
  );
  // "Incoming facsimile" is the app's own chrome, not the fax's contents, so it
  // is localized. The report's *title* is authored content and is shown exactly
  // as written — a fax that arrives in-fiction says what its author typed.
  const incomingLabel = resolveLocalizedText("facsimileIncomingNotification", "Incoming facsimile");
  const notificationTitle = String(report?.title || "").trim();
  const notificationText = String(notificationOptions.text || "").trim()
    || (notificationTitle ? `${incomingLabel}: ${notificationTitle}` : incomingLabel);
  const notificationDuration = Number(notificationOptions.durationMs);
  const notificationSound = String(notificationOptions.sound || "").trim() || "fax";

  showNotifcation(
    notificationType,
    notificationText,
    Number.isFinite(notificationDuration) ? notificationDuration : 4200,
    notificationSound,
    "facsimile"
  );
}

function resolveLocalizedText(key, fallback = "") {
  const localized = String(localize(key, getLanguage()) || "").trim();
  if (!localized || localized === key) {
    return fallback || key;
  }

  return localized;
}

function buildFacsimileReportFromConfig(config = {}) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const id = String(config.id || "").trim();
  if (!id) {
    return null;
  }

  const source = normalizeFacsimileSource(config.source);

  // Catalog-backed faxes deliberately leave title/description blank here so the
  // localized catalog entry can supply them later.
  const isCatalogBacked = source?.kind === "report-localized-catalog-entry";
  const resolveOptionalText = (explicitValue, localizationKey, fallbackKey, fallbackText) => {
    const explicit = String(explicitValue || "").trim();
    if (explicit || isCatalogBacked) {
      return explicit;
    }

    return resolveLocalizedText(localizationKey || fallbackKey, fallbackText);
  };

  let reportText = String(config.reportText || "").replace(/\r\n/g, "\n").trim();
  if (!reportText && Array.isArray(config.reportTextLineKeys)) {
    reportText = config.reportTextLineKeys
      .map((key) => resolveLocalizedText(key, ""))
      .join("\n")
      .trim();
  }
  if (!reportText && config.reportTextKey) {
    reportText = resolveLocalizedText(config.reportTextKey, "");
  }

  return {
    id,
    title: resolveOptionalText(config.title, config.titleKey, "facsimileDefaultTitle", "Facsimile Report"),
    reportText,
    description: resolveOptionalText(
      config.description,
      config.descriptionKey,
      "facsimileDefaultDescription",
      "Received via facsimile machine."
    ),
    evidenceName: trimmedOr(config.evidenceName, `facsimile-${id}`),
    paperStyle: trimmedOr(config.paperStyle, "report-parchment"),
    source,
    storageKey: trimmedOr(config.storageKey, EVIDENCE_STORAGE_KEYS.REPORTS),
    titleKey: trimmedOr(config.titleKey, "reports"),
    awardsEvidence: config.awardsEvidence !== false,
    messageType: trimmedOr(config.messageType, "intel").toLowerCase(),
    notification: config?.notification && typeof config.notification === "object"
      ? {
        ...config.notification,
        type: String(config.notification.type || "").trim(),
        text: String(config.notification.text || "").trim(),
        sound: String(config.notification.sound || "").trim(),
        durationMs: Number(config.notification.durationMs),
      }
      : null,
  };
}

async function queueConfiguredFacsimileReport(faxConfig, options = {}) {
  const faxReport = buildFacsimileReportFromConfig(faxConfig);
  if (!faxReport) {
    return false;
  }

  if (
    faxReport.source?.kind === "report-localized-catalog-entry"
    && faxReport.source.entryId
    && faxReport.source.catalogPathTemplate
  ) {
    const reportCatalogEntry = await getReportCatalogEntry(faxReport, getLanguage(), false);
    if (reportCatalogEntry) {
      const catalogTitle = sanitizeCatalogText(reportCatalogEntry?.defaultTitleString).trim();
      const catalogReportText = sanitizeCatalogText(reportCatalogEntry?.reportText).trim();
      const catalogDescription = sanitizeCatalogText(reportCatalogEntry?.descriptionText).trim();
      const catalogPaperStyle = String(reportCatalogEntry?.paperStyle || "").trim();

      if (catalogTitle && !faxReport.title) {
        faxReport.title = catalogTitle;
      }
      if (catalogReportText && !faxReport.reportText) {
        faxReport.reportText = catalogReportText;
      }
      if (catalogDescription && !faxReport.description) {
        faxReport.description = catalogDescription;
      }
      if (catalogPaperStyle && !faxReport.paperStyle) {
        faxReport.paperStyle = catalogPaperStyle;
      }
    }
  }

  return queueFacsimileReport(faxReport, {
    ...options,
    notification: faxReport.notification || options?.notification,
  });
}

function registerEvidenceMilestoneFaxTrigger({
  predicate,
  faxConfig,
  once = true,
  animateFeed = true,
} = {}) {
  if (typeof predicate !== "function" || !faxConfig || typeof faxConfig !== "object") {
    return null;
  }

  return addEvidenceTrigger({
    predicate,
    action: () => {
      queueConfiguredFacsimileReport(faxConfig, { animateFeed }).catch((error) => {
        console.error("Failed to queue configured facsimile report:", error);
      });
    },
    once,
  });
}

const WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG = {
  id: "fax-whitmore-police-credentials",
  source: {
    kind: "report-localized-catalog-entry",
    languageAware: true,
    catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
    entryId: "fax-whitmore-police-credentials",
  },
  storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  titleKey: "reports",
  evidenceName: "facsimile-whitmore-police-credentials",
  messageType: "credentials",
  notification: {
    messageType: "credentials",
  },
};

// Sent ~10s after a new game starts. Purely informational — it never becomes
// Reports evidence (see `awardsEvidence: false`), it just orients the player.
const NEW_GAME_WELCOME_FAX_CONFIG = {
  id: "fax-welcome-arnie-tragedy",
  source: {
    kind: "report-localized-catalog-entry",
    languageAware: true,
    catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
    entryId: "fax-welcome-arnie-tragedy",
  },
  storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  titleKey: "reports",
  evidenceName: "facsimile-welcome-arnie-tragedy",
  messageType: "intel",
  awardsEvidence: false,
};

// Sent ~30s after the welcome fax (~40s after a new game starts). This is
// what puts the missing person report into the Reports folder; it is no
// longer a new-game default (see DEFAULT_EVIDENCE_BLUEPRINTS).
const MISSING_REPORT_FAX_CONFIG = {
  id: "fax-missing-person-report",
  source: {
    kind: "report-localized-catalog-entry",
    languageAware: true,
    catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
    entryId: "missingReport",
  },
  storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  titleKey: "reports",
  evidenceName: "missingReport",
  messageType: "urgent",
};

// Cancels any pending intro-fax timers from a previous new-game click so a
// player who restarts before the sequence completes can't stack duplicates
// or have a stale timer fire into a fresh evidence store.
function cancelScheduledNewGameIntroFacsimiles() {
  if (getNewGameWelcomeFaxTimeoutId() !== null) {
    window.clearTimeout(getNewGameWelcomeFaxTimeoutId());
    setNewGameWelcomeFaxTimeoutId(null);
  }
  if (getNewGameMissingReportFaxTimeoutId() !== null) {
    window.clearTimeout(getNewGameMissingReportFaxTimeoutId());
    setNewGameMissingReportFaxTimeoutId(null);
  }
}

// Schedules the two scripted faxes that open a new game: a welcome/orientation
// message, followed by the fax that delivers the missing person report.
function scheduleNewGameIntroFacsimiles() {
  cancelScheduledNewGameIntroFacsimiles();

  setNewGameWelcomeFaxTimeoutId(window.setTimeout(() => {
    setNewGameWelcomeFaxTimeoutId(null);
    queueConfiguredFacsimileReport(NEW_GAME_WELCOME_FAX_CONFIG, { animateFeed: true }).catch((error) => {
      console.error("Failed to queue new-game welcome facsimile:", error);
    });
  }, NEW_GAME_WELCOME_FAX_DELAY_MS));

  setNewGameMissingReportFaxTimeoutId(window.setTimeout(() => {
    setNewGameMissingReportFaxTimeoutId(null);
    queueConfiguredFacsimileReport(MISSING_REPORT_FAX_CONFIG, { animateFeed: true }).catch((error) => {
      console.error("Failed to queue new-game missing-report facsimile:", error);
    });
  }, NEW_GAME_WELCOME_FAX_DELAY_MS + NEW_GAME_MISSING_REPORT_FAX_DELAY_MS));
}

function initializeEvidenceMilestoneTriggers() {
  if (getEvidenceMilestoneTriggersInitialized()) {
    return;
  }

  registerEvidenceMilestoneFaxTrigger({
    predicate: (evidence) => {
      if (!evidence || typeof evidence !== "object") {
        return false;
      }

      const storageKey = String(evidence.storageKey || "").trim();
      if (storageKey !== EVIDENCE_STORAGE_KEYS.PHOTOS) {
        return false;
      }

      const evidenceName = String(evidence.name || "").trim();
      const photoPath = String(evidence?.source?.photoPath || "").trim();
      return evidenceName === "standalone-honeydewcavingclub"
        || photoPath === "./assets/photos/minemap.png";
    },
    faxConfig: WHITMORE_MINEMAP_MILESTONE_FAX_CONFIG,
    once: true,
    animateFeed: true,
  });

  setEvidenceMilestoneTriggersInitialized(true);
}

// Sent when the player opens (selects) Arthur Whitmore's police record —
// Brian Whitmore again, this time with Level 3 credentials.
const WHITMORE_LEVEL3_MILESTONE_FAX_CONFIG = {
  id: "fax-whitmore-level3-credentials",
  source: {
    kind: "report-localized-catalog-entry",
    languageAware: true,
    catalogPathTemplate: "./assets/{lang}/reports_evidences.json",
    entryId: "fax-whitmore-level3-credentials",
  },
  storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  titleKey: "reports",
  evidenceName: "facsimile-whitmore-level3-credentials",
  messageType: "credentials",
  notification: {
    messageType: "credentials",
  },
};

// Fires a configured fax when the player opens a specific web record — e.g.
// clicking through to a police record's detail view, as opposed to merely
// searching for it. Complements `registerEvidenceMilestoneFaxTrigger`, which
// keys off evidence acquisition instead.
function registerRecordOpenFaxTrigger({
  websiteId,
  recordId,
  faxConfig,
  once = true,
  animateFeed = true,
} = {}) {
  const normalizedWebsiteId = String(websiteId || "").trim().toLowerCase();
  const normalizedRecordId = String(recordId || "").trim().toLowerCase();
  if (!normalizedWebsiteId || !normalizedRecordId || !faxConfig || typeof faxConfig !== "object") {
    return null;
  }

  const triggerId = getNextRecordOpenFaxTriggerId();
  setNextRecordOpenFaxTriggerId(triggerId + 1);
  recordOpenFaxTriggers.set(triggerId, {
    websiteId: normalizedWebsiteId,
    recordId: normalizedRecordId,
    faxConfig,
    once,
    animateFeed,
  });
  return triggerId;
}

// Handles `caveos-browser-record-opened`, dispatched by makeSelectableResults()
// in webContentRegistry.js whenever a search result row is selected. The
// website id travels in `detail.replay.siteId` (every site's getReplayDetail
// supplies one) rather than as a top-level field.
function handleBrowserRecordOpenedForFaxTriggers(detail) {
  const openedWebsiteId = String(detail?.replay?.siteId || "").trim().toLowerCase();
  const openedRecordId = String(detail?.recordId || "").trim().toLowerCase();
  if (!openedWebsiteId || !openedRecordId) {
    return;
  }

  recordOpenFaxTriggers.forEach((trigger, triggerId) => {
    if (trigger.websiteId !== openedWebsiteId || trigger.recordId !== openedRecordId) {
      return;
    }

    queueConfiguredFacsimileReport(trigger.faxConfig, { animateFeed: trigger.animateFeed }).catch((error) => {
      console.error("Failed to queue record-open facsimile report:", error);
    });

    if (trigger.once !== false) {
      recordOpenFaxTriggers.delete(triggerId);
    }
  });
}

function initializeWebRecordFaxTriggers() {
  if (getRecordOpenFaxTriggersInitialized()) {
    return;
  }

  registerRecordOpenFaxTrigger({
    websiteId: "police",
    recordId: "arthurwhitmore",
    faxConfig: WHITMORE_LEVEL3_MILESTONE_FAX_CONFIG,
    once: true,
    animateFeed: true,
  });

  setRecordOpenFaxTriggersInitialized(true);
}

function commitReadFacsimileReportToEvidence(report) {
  const normalizedReport = sanitizeFacsimileReport(report);
  if (!normalizedReport || isFacsimileReportConsumed(normalizedReport.id)) {
    return false;
  }

  const awardsEvidence = normalizedReport.awardsEvidence !== false;

  if (awardsEvidence) {
    const existingReports = getEvidenceCollection(EVIDENCE_STORAGE_KEYS.REPORTS);
    const alreadyCreated = existingReports.some((entry) => {
      const entryName = String(entry?.name || "").trim();
      return entryName && entryName === normalizedReport.evidenceName;
    });

    if (!alreadyCreated) {
      const evidenceSource = normalizedReport.source
        ? { ...normalizedReport.source }
        : {
          kind: "facsimile-inline-report",
          languageAware: false,
          entryId: normalizedReport.id,
        };

      const evidencePayload = {
        type: "report",
        storageKey: normalizedReport.storageKey || EVIDENCE_STORAGE_KEYS.REPORTS,
        titleKey: normalizedReport.titleKey || "reports",
        name: normalizedReport.evidenceName,
        defaultTitleString: normalizedReport.title,
        paperStyle: normalizedReport.paperStyle,
        source: evidenceSource,
      };

      if (String(evidenceSource?.kind || "").trim() !== "report-localized-catalog-entry") {
        evidencePayload.reportText = normalizedReport.reportText;
        evidencePayload.description = normalizedReport.description;
      }

      createEvidence({
        ...evidencePayload,
      });
    }
  }

  const facsimile = getFacsimileState();
  const consumedIds = Array.isArray(facsimile?.consumedReportIds)
    ? facsimile.consumedReportIds
    : [];
  const uniqueConsumedIds = consumedIds.includes(normalizedReport.id)
    ? consumedIds
    : [...consumedIds, normalizedReport.id];

  const remainingPendingReports = getFacsimilePendingReports().filter(
    (item) => String(item?.id || "").trim() !== normalizedReport.id
  );

  setFacsimileState({
    pendingReports: remainingPendingReports,
    consumedReportIds: uniqueConsumedIds,
  });

  // The milestone for a fax is the machine being opened and the message
  // consumed (closing the window or stepping past it), not merely arriving.
  activateProgressEvidenceForFacsimileReport(normalizedReport.id);

  syncFacsimileVisualState({ animateFeed: false });
  refreshOpenFacsimileWindows();

  if (awardsEvidence) {
    showNotifcation(
      "reward",
      `${resolveLocalizedText("notificationEvidenceUnlockedPrefix", "New")} ${resolveLocalizedText("evidenceTypeReport", "Report")} ${resolveLocalizedText("notificationEvidenceUnlockedSuffix", "Evidence unlocked in your Evidence folder!")}`,
      4000,
      "evidenceGain",
      "reports"
    );
  }

  return true;
}

function syncFacsimileVisualState(options = {}) {
  const facsimileElement = getElements().desktopFacsimile;
  const facsimileRig = getElements().desktopFacsimileRig;
  const hasPendingMessage = getFacsimilePendingReports().length > 0;

  if (facsimileElement) {
    facsimileElement.classList.toggle("has-pending-message", hasPendingMessage);
  }

  if (facsimileRig) {
    facsimileRig.classList.toggle("has-pending-message", hasPendingMessage);
  }

  if (!facsimileElement || !options.animateFeed || !hasPendingMessage) {
    return;
  }

  facsimileElement.classList.remove("is-receiving");
  void facsimileElement.offsetWidth;
  facsimileElement.classList.add("is-receiving");

  if (getFacsimileFeedAnimationTimeoutId()) {
    window.clearTimeout(getFacsimileFeedAnimationTimeoutId());
  }

  setFacsimileFeedAnimationTimeoutId(window.setTimeout(() => {
    facsimileElement.classList.remove("is-receiving");
    setFacsimileFeedAnimationTimeoutId(null);
  }, 1900));
}

function refreshOpenFacsimileWindows() {
  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) !== "facsimile") {
      return;
    }

    updateFacsimileWindowContent(windowController);
  });
}

function awardWebContentEvidence(evidenceDescriptor, context = {}) {
  const evidenceDescriptors = Array.isArray(evidenceDescriptor)
    ? evidenceDescriptor
    : [evidenceDescriptor];

  const websiteId = String(context?.websiteId || "").trim().toLowerCase();
  const isWebService = websiteId === "zoomsearch"
    || websiteId === "library"
    || websiteId === "police"
    || websiteId === "archives"
    || websiteId === "standalone";

  let awardedAny = false;

  evidenceDescriptors.forEach((descriptor) => {
    if (!descriptor || typeof descriptor !== "object") {
      return;
    }

    const targetStorageKey = String(descriptor.storageKey || "").trim() || EVIDENCE_STORAGE_KEYS.REPORTS;
    const existingCollection = getEvidenceCollection(targetStorageKey);
    const incomingName = String(descriptor.name || "").trim();
    const incomingType = String(descriptor.type || "").trim();
    const incomingSourceKind = String(descriptor?.source?.kind || "").trim();
    const incomingSourcePath = String(descriptor?.source?.path || "").trim();
    const incomingSourceEntryId = String(descriptor?.source?.entryId || "").trim();

    const alreadyExists = existingCollection.some((existingEvidence) => {
      if (!existingEvidence || typeof existingEvidence !== "object") {
        return false;
      }

      const existingName = String(existingEvidence.name || "").trim();
      const existingType = String(existingEvidence.type || "").trim();
      const existingSourceKind = String(existingEvidence?.source?.kind || "").trim();
      const existingSourcePath = String(existingEvidence?.source?.path || "").trim();
      const existingSourceEntryId = String(existingEvidence?.source?.entryId || "").trim();

      const matchesByEntryId = incomingSourceEntryId && existingSourceEntryId === incomingSourceEntryId;
      const matchesByPath = incomingSourcePath && existingSourcePath === incomingSourcePath;
      const matchesByIdentity = incomingName && existingName === incomingName && incomingType && existingType === incomingType;
      const matchesBySourceKindAndName =
        incomingSourceKind
        && existingSourceKind === incomingSourceKind
        && incomingName
        && existingName === incomingName;

      return matchesByEntryId || matchesByPath || matchesByIdentity || matchesBySourceKindAndName;
    });

    if (alreadyExists) {
      return;
    }

    const storedEvidenceDescriptor = {
      ...descriptor,
      source: descriptor?.source ? { ...descriptor.source } : descriptor?.source,
    };

    if (isCatalogBackedPhotoEvidence(storedEvidenceDescriptor)) {
      delete storedEvidenceDescriptor.description;
      delete storedEvidenceDescriptor.photoCaption;
    }

    createEvidence(storedEvidenceDescriptor);

    const evidenceType = String(descriptor?.type || "").trim().toLowerCase();
    if (isWebService && (evidenceType === "photo" || evidenceType === "report")) {
      const evidenceTypeLabel = evidenceType === "photo"
        ? resolveLocalizedText("evidenceTypePhoto", "Photo")
        : resolveLocalizedText("evidenceTypeReport", "Report");
      showNotifcation(
        "reward",
        `${resolveLocalizedText("notificationEvidenceUnlockedPrefix", "New")} ${evidenceTypeLabel} ${resolveLocalizedText("notificationEvidenceUnlockedSuffix", "Evidence unlocked in your Evidence folder!")}`,
        4000,
        "evidenceGain",
        evidenceType === "photo" ? "photos" : "reports"
      );
    }

    awardedAny = true;
  });

  return awardedAny;
}

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  // Before anything renders: the tooltip layer works off `title` attributes by
  // delegation, so it covers whatever the app draws later without those call
  // sites having to opt in.
  installGameTooltips();
  // The progress evidence registry lives entirely in assets/progressEvidence.json
  // (which the web content builder also writes), so it has to be loaded before
  // anything can activate progress evidence.
  await loadProgressEvidenceDefinitions();
  // The timeline frames are content too, and the board cannot render until they
  // are registered. Loaded alongside the progress evidence registry rather than
  // lazily on first noticeboard visit, so a restored save has somewhere to put
  // its placements immediately.
  await loadProgressTimeLineEventDefinitions();
  renderProgressTimeLineBoard();
  initializeProgressEvidenceEnvelopeDrag();
  applyProgressEvidenceEnvelopePosition();
  initializeEvidenceMilestoneTriggers();
  initializeWebRecordFaxTriggers();
  document.addEventListener("caveos-browser-record-opened", (event) => {
    handleBrowserRecordOpenedForFaxTriggers(event?.detail);
    // Opening a website record is one of the milestones that records progress
    // evidence. Keyed off the same detail fields as the fax triggers.
    activateProgressEvidenceForWebRecord(event?.detail);
  });
  syncAshtrayVisualState();
  syncFacsimileVisualState({ animateFeed: false });
  initializeAudioControls();
  initializeStoryWindowControls();
  updateDesktopCalendarDate();

  getElements().newGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    // Starting over would overwrite the autosaved game, so ask first whenever
    // there is actually something to lose.
    if (hasStickySave()) {
      openNewGameConfirmPopup();
      return;
    }

    beginNewGame();
  });

  getElements().newGameConfirmCancelButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    // Cancelling leaves the sticky save completely untouched.
    closeNewGameConfirmPopup();
  });

  getElements().newGameConfirmAcceptButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    closeNewGameConfirmPopup();
    clearStickySave();
    beginNewGame();
  });

  getElements().resumeGameMenuButton.addEventListener("click", async () => {
    audioManager.onUserGesture();
    if (getElements().resumeGameMenuButton.classList.contains("disabled")) {
      return;
    }

    // Nothing in memory yet means this is a resume after a refresh, so the
    // sticky save has to be rehydrated before the scene is shown.
    if (!getGameInProgress() && !(await restoreStickySaveIntoGame())) {
      return;
    }

    if (gameState === getMenuState()) {
      setGameState(getActiveGameplayState());
    }
    // Resume is an arrival at the scene, exactly like the noticeboard toggle
    // is, so the camera resets to that scene's default rather than reappearing
    // wherever an earlier session left it.
    resetGameplayCameraToDefault();
    startGame(false);
  });

  document.addEventListener("keydown", (event) => {
    if (
      isEvidenceDebugToggleKey(event) &&
      isGameplayState(gameState) &&
      !isTypingIntoField(event)
    ) {
      event.preventDefault();
      toggleEvidenceDebugWindow();
      return;
    }

    if (event.key === "Escape" && isGameplayState(gameState)) {
      setGameState(getMenuState());
    }
  });

  LANGUAGE_BUTTON_KEYS_BY_CODE.forEach((elementKey, languageCode) => {
    getElements()[elementKey].addEventListener("click", async () => {
      audioManager.onUserGesture();
      await handleLanguageChange(languageCode);
      setGameState(getMenuState());
    });
  });

  getElements().saveGameButton.addEventListener("click", function () {
    audioManager.onUserGesture();
    getElements().overlay.classList.remove("d-none");
    saveGame();
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
    loadGame()
      .then(() => {
        // A loaded save carries its own evidence/facsimile state; don't let a
        // still-pending new-game intro fax timer inject into it.
        cancelScheduledNewGameIntroFacsimiles();
        setElements();
        syncAshtrayVisualState();
        syncFacsimileVisualState({ animateFeed: false });
        // The computer can be open at the moment a save is pasted in, so the
        // loaded theme is pushed onto any window already on screen rather than
        // only being picked up the next time one opens.
        refreshCaveOsTheme();
        audioManager.syncFromSavedPreferences();
        refreshAudioControlsDisplay();
        getElements().saveLoadPopup.classList.add("d-none");
        document.getElementById("overlay").classList.add("d-none");
        setGameInProgress(true);
        setStickySaveHighlight(false);
        setGameState(getActiveGameplayState());
        // Loading is an arrival at the scene too: reset to that scene's
        // default camera rather than whatever pan the save's own JSON, or an
        // earlier session, happened to leave behind.
        resetGameplayCameraToDefault();
        startGame(false);
        audioManager.startBackgroundMusicForGame();
        // A pasted save becomes the game in play, so it also becomes what a
        // refresh should resume.
        writeStickySave();
        beginStickyAutosave();
      })
      .catch((error) => {
        console.error("Error loading game:", error);
      });
  });
  await handleLanguageChange(getLanguageSelected());
  setGameState(getMenuState());
  // Done last: setGameState(menu) only enables Resume for an in-memory game, so
  // the sticky-save offer has to be applied on top of it.
  refreshStickySaveResumeOffer();
});

// Everything New Game resets, in one place so the button and the confirmation
// dialog cannot drift apart.
function beginNewGame() {
  initializeEvidenceStoreForNewGame();
  setEvidenceCustomNames({});
  resetNotesPagesState(localize("notesPageDefaultTitlePrefix", getLanguage()));
  resetPaintPagesState(localize("paintPageDefaultTitlePrefix", getLanguage()));
  resetAshtrayState();
  // A new game is a fresh machine: the OS goes back to its factory look, and
  // the media library back to the six tracks that ship on it.
  resetCaveOsTheme();
  refreshCaveOsTheme();
  resetEchotrailUnlockedFileNames();
  audioManager.refreshGameMusicTracks(getEchotrailUnlockedFileNames());
  audioManager.stopEchotrailPlayback();
  refreshOpenEchotrailWindows();
  resetFacsimileState();
  resetProgressEvidence();
  // Empties every frame on the corkboard. The frames themselves are content and
  // stay put — only what the player put in them is cleared.
  resetProgressTimeLineEventPlacements();
  renderProgressTimeLineBoard();
  // The envelope goes back to its CSS anchor: where the player left it is
  // progress, not content.
  setProgressEvidenceEnvelopePosition(null);
  applyProgressEvidenceEnvelopePosition();
  resetQuickLoginState();
  webContentManager.clearSessions();
  syncAshtrayVisualState();
  syncFacsimileVisualState({ animateFeed: false });
  scheduleNewGameIntroFacsimiles();
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
  setStickySaveHighlight(false);
  setGameState(getDesktopState());
  startGame(true);
  audioManager.startBackgroundMusicForGame();
  refreshAudioControlsDisplay();
  // Seed the sticky save immediately rather than waiting up to a minute, so a
  // refresh straight after starting resumes this game and not the previous one.
  writeStickySave();
  beginStickyAutosave();
}

function openNewGameConfirmPopup() {
  getElements().newGameConfirmPopup.classList.remove("d-none");
  getElements().overlay.classList.remove("d-none");
  getElements().newGameConfirmCancelButton.focus();
}

function closeNewGameConfirmPopup() {
  getElements().newGameConfirmPopup.classList.add("d-none");
  getElements().overlay.classList.add("d-none");
}

function setStickySaveHighlight(isHighlighted) {
  getElements().resumeGameMenuButton.classList.toggle("has-sticky-save", isHighlighted);
}

// Makes Resume usable and obvious when a previous session is sitting in
// localStorage. No-op once a game is already running in memory.
function refreshStickySaveResumeOffer() {
  if (getGameInProgress() || !hasStickySave()) {
    return;
  }

  disableActivateButton(
    getElements().resumeGameMenuButton,
    "active",
    "btn-primary"
  );
  setStickySaveHighlight(true);
}

// Rehydrates the autosaved game. Mirrors the load-from-string path so both
// routes leave the app in the same state.
async function restoreStickySaveIntoGame() {
  const savedState = readStickySave();
  if (!savedState) {
    setStickySaveHighlight(false);
    return false;
  }

  try {
    await restoreGameStatus(savedState);
  } catch (error) {
    console.error("Error restoring sticky save:", error);
    // A save we cannot read is worse than none: drop it so the broken offer
    // does not persist across reloads.
    clearStickySave();
    setStickySaveHighlight(false);
    disableActivateButton(
      getElements().resumeGameMenuButton,
      "disable",
      "btn-primary"
    );
    return false;
  }

  cancelScheduledNewGameIntroFacsimiles();
  setElements();
  await handleLanguageChange(getLanguage());
  syncAshtrayVisualState();
  syncFacsimileVisualState({ animateFeed: false });
  // The restored placements have to be drawn back into the frames; setElements()
  // above has just re-read the scene, so the board is rebuilt from scratch.
  renderProgressTimeLineBoard();
  initializeProgressEvidenceEnvelopeDrag();
  applyProgressEvidenceEnvelopePosition();
  refreshCaveOsTheme();
  // The loaded save may name files the rotation has never seen, so the eligible
  // track list is re-derived before the background music is started below.
  audioManager.refreshGameMusicTracks(getEchotrailUnlockedFileNames());
  refreshOpenEchotrailWindows();
  audioManager.syncFromSavedPreferences();
  refreshAudioControlsDisplay();
  setGameInProgress(true);
  setBeginGameStatus(false);
  disableActivateButton(
    getElements().saveGameButton,
    "active",
    "btn-primary"
  );
  setStickySaveHighlight(false);
  audioManager.startBackgroundMusicForGame();
  beginStickyAutosave();
  return true;
}

// Static chrome whose text is a straight localization lookup, keyed by the
// getElements() property to write into.
const LOCALIZED_STATIC_TEXT_BY_ELEMENT_KEY = {
  menuTitle: "menuTitle",
  newGameMenuButton: "newGame",
  resumeGameMenuButton: "resumeGame",
  loadGameButton: "loadGame",
  saveGameButton: "saveGame",
  loadStringButton: "loadButton",
  pasteButtonLoadPopup: "pasteButton",
  copyButtonSavePopup: "copyButton",
  closeButtonSavePopup: "closeButton",
  backgroundFolderLabel: "theArnieTragedy",
  reportsFolderLabel: "reports",
  photosFolderLabel: "photos",
  notesLabel: "notes",
  progressEvidenceEnvelopeLabel: "progressEvidenceEnvelopeLabel",
  musicVolumeLabel: "musicVolume",
  sfxVolumeLabel: "sfxVolume",
  newGameConfirmTitle: "newGameConfirmTitle",
  newGameConfirmBody: "newGameConfirmBody",
  newGameConfirmCancelButton: "cancelButton",
  newGameConfirmAcceptButton: "startNewGameButton",
};

// Static chrome whose aria-label is a straight localization lookup.
const LOCALIZED_ARIA_LABEL_BY_ELEMENT_KEY = {
  desktopViewport: "desktopViewportAriaLabel",
  deskWorld: "desktopWorkspaceAriaLabel",
  backgroundFolder: "theArnieTragedy",
  notesFolder: "notesFolderAriaLabel",
  desktopCalendar: "desktopCalendarAriaLabel",
  desktopAshtray: "ashtrayAriaLabel",
  desktopAshtrayHotspot: "ashtrayButtonAriaLabel",
  desktopFacsimileRig: "facsimileRigAriaLabel",
  desktopFacsimileHotspot: "openFacsimileAriaLabel",
  desktopComputerHotspot: "openComputerAriaLabel",
  noticeboardScene: "noticeboardWorkspaceAriaLabel",
  progressEvidenceEnvelope: "openProgressEvidenceEnvelopeAriaLabel",
  floatingSettings: "settingsMenuAriaLabel",
};

// Static chrome whose aria-label AND title are the same localization lookup.
// noticeboardButton is deliberately absent: its label depends on which scene
// is active (see updateNoticeboardButtonLabel in game.js), not a fixed key.
const LOCALIZED_ARIA_LABEL_AND_TITLE_BY_ELEMENT_KEY = {
  settingsToggle: "musicSettingsLabel",
};

function setElementsLanguageText() {
  const elements = getElements();
  const languageCode = getLanguage();

  Object.entries(LOCALIZED_STATIC_TEXT_BY_ELEMENT_KEY).forEach(([elementKey, localizationKey]) => {
    const element = elements[elementKey];
    if (element) {
      element.textContent = localize(localizationKey, languageCode);
    }
  });

  Object.entries(LOCALIZED_ARIA_LABEL_BY_ELEMENT_KEY).forEach(([elementKey, localizationKey]) => {
    const element = elements[elementKey];
    if (element) {
      element.setAttribute("aria-label", localize(localizationKey, languageCode));
    }
  });

  Object.entries(LOCALIZED_ARIA_LABEL_AND_TITLE_BY_ELEMENT_KEY).forEach(([elementKey, localizationKey]) => {
    const element = elements[elementKey];
    if (element) {
      const localizedText = localize(localizationKey, languageCode);
      element.setAttribute("aria-label", localizedText);
      element.title = localizedText;
    }
  });

  elements.zoomReadout.textContent = `${localize("zoomLabel", languageCode)} 3/5`;

  updateNoticeboardButtonLabel();
  refreshMuteButtonLabel();
  refreshMusicTransportControls();
  refreshOpenWindowLocalization();
  refreshAutosaveIndicatorLanguage();
  updateDesktopCalendarDate();
}

function updateDesktopCalendarDate() {
  const calendarMonthElement = getElements().desktopCalendar?.querySelector(".calendar-month");
  const calendarDayElement = getElements().desktopCalendar?.querySelector(".calendar-day");

  if (!calendarMonthElement || !calendarDayElement) {
    return;
  }

  const now = new Date();
  const monthText = getDesktopCalendarMonthFormatter(getLanguage())
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
  console.log("Progress evidence activated (raw):", getProgressEvidence());
  console.log("Progress evidence registry (both flags per item):", getProgressEvidenceEntries());
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

  // ECHOTRAIL carries a music volume slider of its own, driving the same
  // setting. Whichever one the player moved, the other has to follow.
  refreshOpenEchotrailVolume();
  refreshMuteButtonLabel();
  refreshMusicTransportControls();
}

function refreshOpenEchotrailVolume() {
  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) === "computer-echotrail") {
      echotrailWindowContentRefs.get(windowController)?.refreshVolume?.();
    }
  });
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

  const languageCode = getLanguage();
  const isPlaying = audioManager.isMusicPlaying();
  getElements().musicPlayPauseButton.textContent = isPlaying ? "⏸" : "▶";
  getElements().musicPlayPauseButton.setAttribute(
    "aria-label",
    isPlaying ? localize("pauseMusicAriaLabel", languageCode) : localize("playMusicAriaLabel", languageCode)
  );
  getElements().musicPlayPauseButton.title = isPlaying ? localize("pause", languageCode) : localize("play", languageCode);

  getElements().musicNextButton.textContent = "⏭";
  getElements().musicNextButton.setAttribute("aria-label", localize("nextTrackAriaLabel", languageCode));
  getElements().musicNextButton.title = localize("next", languageCode);
}

function initializeStoryWindowControls() {
  if (!getElements().backgroundFolder || !getElements().photosFolder || !getElements().reportsFolder) {
    return;
  }

  [
    { element: getElements().backgroundFolder, kind: "story", open: () => openStoryWindow(false, false) },
    { element: getElements().photosFolder, kind: "photos", open: openPhotosWindow },
    { element: getElements().reportsFolder, kind: "reports", open: openReportsWindow },
  ].forEach(({ element, kind, open }) => {
    element.addEventListener("click", () => {
      audioManager.onUserGesture();
      audioManager.playSfx("clickButton");

      if (toggleExistingWindowsByKind(kind)) {
        return;
      }

      open();
    });
  });

  // The notes folder deliberately has no click sound of its own: bindDesktopObjectAudio
  // in game.js already plays one for #notesFolder.
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
    // Must agree with --ashtray-stub-duration / --ashtray-relight-duration in
    // styles.css: these timeouts are what clear is-extinguishing/is-relighting
    // again once the CSS animations they trigger have actually finished.
    const ASHTRAY_STUB_ANIMATION_MS = 720;
    const ASHTRAY_RELIGHT_ANIMATION_MS = 760;

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

      if (getAshtrayAnimationTimeoutId()) {
        clearTimeout(getAshtrayAnimationTimeoutId());
        setAshtrayAnimationTimeoutId(null);
      }

      const hasLitCigarette = ashtrayElement.classList.contains("has-lit-cig");

      if (hasLitCigarette) {
        ashtrayElement.classList.add("is-extinguishing");

        setAshtrayAnimationTimeoutId(window.setTimeout(() => {
          ashtrayElement.classList.remove("is-extinguishing");
          ashtrayElement.classList.remove("has-lit-cig");
          ashtrayElement.classList.add("has-extra-butt");
          setAshtrayHasLitCigarette(false);
          setAshtrayHasExtraButt(true);
          setAshtrayAnimationTimeoutId(null);
        }, ASHTRAY_STUB_ANIMATION_MS));

        return;
      }

      ashtrayElement.classList.add("has-lit-cig");
      ashtrayElement.classList.add("is-relighting");
      setAshtrayHasLitCigarette(true);
      restartAshtraySmokePlumes(ashtrayElement);

      setAshtrayAnimationTimeoutId(window.setTimeout(() => {
        ashtrayElement.classList.remove("is-relighting");
        setAshtrayAnimationTimeoutId(null);
      }, ASHTRAY_RELIGHT_ANIMATION_MS));
    };

    getElements().desktopAshtrayHotspot.addEventListener("click", activateAshtray);
  }

  wireDesktopObjectTrigger({
    triggerElement: getElements().desktopFacsimileHotspot || getElements().desktopFacsimileRig,
    windowKind: "facsimile",
    openWindow: openFacsimileWindow,
  });

  wireDesktopObjectTrigger({
    triggerElement: getElements().desktopComputerHotspot || getElements().desktopComputerRig,
    windowKind: "computer",
    openWindow: openComputerWindow,
  });

  // The manila EVIDENCE envelope on the noticeboard. It toggles like a desk
  // object, and openProgressEvidenceWindow() re-reads the eligible progress
  // evidence every time rather than reusing what was shown last.
  wireDesktopObjectTrigger({
    triggerElement: getElements().progressEvidenceEnvelope,
    windowKind: "progress-evidence",
    openWindow: openProgressEvidenceWindow,
  });
}

// Desk objects (facsimile, computer) toggle their window on click or on
// Enter/Space when focused.
function wireDesktopObjectTrigger({ triggerElement, windowKind, openWindow }) {
  if (!triggerElement) {
    return;
  }

  const toggleWindow = () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind(windowKind)) {
      return;
    }

    openWindow();
  };

  triggerElement.addEventListener("click", toggleWindow);
  triggerElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleWindow();
  });
}

function findExistingWindowsByKind(kind) {
  const matchingWindows = [];

  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) === kind) {
      matchingWindows.push(windowController);
    }
  });

  return matchingWindows;
}

function toggleExistingWindowsByKind(kind) {
  const matchingWindows = findExistingWindowsByKind(kind);

  if (!matchingWindows.length) {
    return false;
  }

  matchingWindows.forEach((windowController) => {
    windowController.close();
  });

  return true;
}

// Desk targets a notification can send the player to. Each reuses the exact
// opener the desk object itself uses, so a notification click has the same
// game-state consequences as opening the window by hand (for the facsimile,
// that includes marking the pending message read on open and committing it to
// evidence on close).
const NOTIFICATION_TARGETS = {
  facsimile: {
    kind: "facsimile",
    open: () => openFacsimileWindow(),
    hintKey: "notificationHintOpenFacsimile",
    hintFallback: "Open the facsimile machine",
  },
  reports: {
    kind: "reports",
    open: () => openReportsWindow(),
    hintKey: "notificationHintOpenReports",
    hintFallback: "Open the reports folder",
  },
  photos: {
    kind: "photos",
    open: () => openPhotosWindow(),
    hintKey: "notificationHintOpenPhotos",
    hintFallback: "Open the photos folder",
  },
};

// The hover hint on an actionable notification, in the current language. The
// English text stays here as the fallback for the same reason every other
// resolveLocalizedText() call keeps one: a missing key should read as English
// rather than surface a raw localization key to the player.
function resolveNotificationTargetHint(target) {
  const targetDefinition = NOTIFICATION_TARGETS[target];
  if (!targetDefinition) {
    return "";
  }

  return resolveLocalizedText(targetDefinition.hintKey, targetDefinition.hintFallback);
}

// Notification click: close the computer if it is open, then open (or surface)
// the requested window. The computer is full-screen, so leaving it open would
// bury whatever the notification just opened.
function openNotificationTarget(target) {
  const targetDefinition = NOTIFICATION_TARGETS[target];
  if (!targetDefinition || !isGameplayState(gameState)) {
    return;
  }

  audioManager.onUserGesture();
  audioManager.playSfx("clickButton");

  // Closing the computer window also closes its child app windows (Netscape,
  // Notes, Paint) via its own onClose handler.
  toggleExistingWindowsByKind("computer");

  // Unlike the desk objects, a notification never toggles the target shut: if
  // it is already open, just raise it.
  const alreadyOpen = findExistingWindowsByKind(targetDefinition.kind);
  if (alreadyOpen.length) {
    bringDesktopWindowToFront(alreadyOpen[alreadyOpen.length - 1]);
    return;
  }

  targetDefinition.open();
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

// How each open desktop window re-titles and re-renders itself after a language
// change. `titleKey` goes through localize(); `title` is a fixed product name.
// Kinds absent from this table (currently "debug") are left untouched.
const DESKTOP_WINDOW_LOCALIZATION_BY_KIND = {
  story: { titleKey: "theArnieTragedy", closeButtonAriaLabelKey: "closeStoryWindowAriaLabel", refresh: updateStoryWindowContent },
  photos: { titleKey: "photos", closeButtonAriaLabelKey: "closePhotosWindowAriaLabel", carousel: true, refresh: updatePhotosWindowContent },
  reports: { titleKey: "reports", closeButtonAriaLabelKey: "closeReportsWindowAriaLabel", carousel: true, refresh: updateReportsWindowContent },
  notes: { titleKey: "notes", closeButtonAriaLabelKey: "closeNotesWindowAriaLabel" },
  "computer-notes": { titleKey: "notes", closeButtonAriaLabelKey: "closeNotesWindowAriaLabel" },
  "computer-paint": { titleKey: "computerPaintIconLabel", closeButtonAriaLabelKey: "closePaintWindowAriaLabel" },
  "computer-calculator": {
    titleKey: "computerCalculatorWindowTitle",
    closeButtonAriaLabelKey: "closeCalculatorWindowAriaLabel",
    refresh: refreshCalculatorWindowContent,
  },
  "computer-snake": {
    titleKey: "computerSnakeWindowTitle",
    closeButtonAriaLabelKey: "closeSnakeWindowAriaLabel",
    refresh: refreshSnakeWindowContent,
  },
  "computer-minesweeper": {
    titleKey: "computerMinesweeperWindowTitle",
    closeButtonAriaLabelKey: "closeMinesweeperWindowAriaLabel",
    refresh: refreshMinesweeperWindowContent,
  },
  "computer-sudoku": {
    titleKey: "computerSudokuWindowTitle",
    closeButtonAriaLabelKey: "closeSudokuWindowAriaLabel",
    refresh: refreshSudokuWindowContent,
  },
  "computer-tetris": {
    titleKey: "computerTetrisWindowTitle",
    closeButtonAriaLabelKey: "closeTetrisWindowAriaLabel",
    refresh: refreshTetrisWindowContent,
  },
  // Titled with a literal rather than a key: ECHOTRAIL is the machine's own
  // branding, in the same category as Netscape below.
  "computer-echotrail": {
    title: "ECHOTRAIL",
    closeButtonAriaLabelKey: "closeEchotrailWindowAriaLabel",
    refresh: refreshEchotrailWindowContent,
  },
  // The folder windows re-title, but their contents are icons rebuilt from
  // scratch every time the folder opens, so there is nothing to refresh.
  "computer-folder-utilities": {
    titleKey: "computerUtilitiesFolderLabel",
    closeButtonAriaLabelKey: "closeUtilitiesFolderWindowAriaLabel",
  },
  "computer-folder-games": {
    titleKey: "computerGamesFolderLabel",
    closeButtonAriaLabelKey: "closeGamesFolderWindowAriaLabel",
  },
  "computer-netscape": { title: "Netscape Navigator 3.0", closeButtonAriaLabelKey: "closeNetscapeWindowAriaLabel" },
  facsimile: { titleKey: "facsimileWindowTitle", closeButtonAriaLabelKey: "closeFacsimileWindowAriaLabel", refresh: updateFacsimileWindowContent },
  "progress-evidence": {
    titleKey: "progressEvidenceWindowTitle",
    closeButtonAriaLabelKey: "closeProgressEvidenceWindowAriaLabel",
    carousel: true,
    refresh: updateProgressEvidenceWindowContent,
  },
  computer: {
    titleKey: "computerWindowTitle",
    closeButtonAriaLabelKey: "closeComputerWindowAriaLabel",
    refresh: refreshComputerWindowThemePicker,
  },
};

// The theme picker in the computer window's title bar: its "Theme" label and
// every option name were resolved in the language that was current when the
// window opened, so a mid-session switch has to rewrite them.
function refreshComputerWindowThemePicker(windowController) {
  const refs = computerWindowContentRefs.get(windowController);
  if (!refs?.themeSelect) {
    return;
  }

  const languageCode = getLanguage();

  if (refs.themePickerLabel) {
    refs.themePickerLabel.textContent = localize("caveOsThemeSelectLabel", languageCode);
  }

  Array.from(refs.themeSelect.options).forEach((option) => {
    const labelKey = CAVEOS_THEME_LABEL_KEY_BY_ID[option.value];
    if (labelKey) {
      option.textContent = localize(labelKey, languageCode);
    }
  });

  refs.themeSelect.value = getCaveOsTheme();
}

// A mid-session language change reaches inside an open calculator: its ERROR
// text and key aria-labels were resolved when the window was built.
function refreshCalculatorWindowContent(windowController) {
  calculatorWindowContentRefs.get(windowController)?.relocalize?.();
}

// Snake's score line, hints and board aria-label are all localized.
function refreshSnakeWindowContent(windowController) {
  snakeWindowContentRefs.get(windowController)?.relocalize?.();
}

function refreshMinesweeperWindowContent(windowController) {
  minesweeperWindowContentRefs.get(windowController)?.relocalize?.();
}

function refreshSudokuWindowContent(windowController) {
  sudokuWindowContentRefs.get(windowController)?.relocalize?.();
}

function refreshTetrisWindowContent(windowController) {
  tetrisWindowContentRefs.get(windowController)?.relocalize?.();
}

// ECHOTRAIL's column headings, file-type descriptions and transport labels are
// localized — and two of those are sort keys, so this can reorder the list.
function refreshEchotrailWindowContent(windowController) {
  echotrailWindowContentRefs.get(windowController)?.relocalize?.();
}

function refreshOpenWindowLocalization() {
  const languageCode = getLanguage();

  activeDesktopWindows.forEach((windowController) => {
    const windowKind = desktopWindowKinds.get(windowController);
    const localization = DESKTOP_WINDOW_LOCALIZATION_BY_KIND[windowKind];
    if (!localization) {
      return;
    }

    windowController.setTitle(
      localization.titleKey
        ? localize(localization.titleKey, languageCode)
        : localization.title
    );

    if (localization.closeButtonAriaLabelKey) {
      windowController.setCloseButtonAriaLabel(localize(localization.closeButtonAriaLabelKey, languageCode));
    }

    if (localization.carousel) {
      windowController.setCarouselAriaLabels({
        previous: localize("previousImageAriaLabel", languageCode),
        next: localize("nextImageAriaLabel", languageCode),
      });
    }

    localization.refresh?.(windowController);
  });
}

// Cached per language rather than built once: the clock ticks every second and
// Intl formatter construction is comparatively expensive, but the formatted
// month abbreviation must follow the player's selected language, not whatever
// locale the system happens to be in.
const COMPUTER_CLOCK_DATE_FORMATTER_BY_LANGUAGE = new Map();

function getComputerClockDateFormatter(languageCode) {
  if (!COMPUTER_CLOCK_DATE_FORMATTER_BY_LANGUAGE.has(languageCode)) {
    COMPUTER_CLOCK_DATE_FORMATTER_BY_LANGUAGE.set(
      languageCode,
      new Intl.DateTimeFormat(languageCode, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    );
  }

  return COMPUTER_CLOCK_DATE_FORMATTER_BY_LANGUAGE.get(languageCode);
}

const DESKTOP_CALENDAR_MONTH_FORMATTER_BY_LANGUAGE = new Map();

function getDesktopCalendarMonthFormatter(languageCode) {
  if (!DESKTOP_CALENDAR_MONTH_FORMATTER_BY_LANGUAGE.has(languageCode)) {
    DESKTOP_CALENDAR_MONTH_FORMATTER_BY_LANGUAGE.set(
      languageCode,
      new Intl.DateTimeFormat(languageCode, { month: "short" })
    );
  }

  return DESKTOP_CALENDAR_MONTH_FORMATTER_BY_LANGUAGE.get(languageCode);
}

function updateComputerDesktopClock(refs) {
  if (!refs?.minuteHand || !refs?.hourHand || !refs?.secondHand || !refs?.dateText) {
    return;
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  refs.secondHand.style.transform = `rotate(${seconds * 6}deg)`;
  refs.minuteHand.style.transform = `rotate(${(minutes + seconds / 60) * 6}deg)`;
  refs.hourHand.style.transform = `rotate(${((hours % 12) + minutes / 60) * 30}deg)`;

  refs.dateText.textContent = getComputerClockDateFormatter(getLanguage()).format(now);
}

// ---------------------------------------------------------------------------
// CaveOS themes
//
// A theme is a reskin of the operating system only: the CaveOS desktop, its
// icons, and the chrome of every app window inside it (Notes, Paint,
// Calculator, and Netscape's toolbar and address bar). It deliberately stops
// at the fictional websites rendered *inside* Netscape — those are 1996 web
// pages the player reads as evidence, and each is meant to look like a
// different place on the web rather than like the machine it is viewed on.
//
// Mechanically it is one class on the computer window's root element. Every
// themed rule in styles.css reads CSS custom properties, and each
// `caveos-theme-*` class just redefines those properties; because the app
// windows are DOM children of the computer window, they inherit the switch for
// free. Nothing about window geometry is themed — sizes and positions are set
// in script (see positionWindowWithinParent) and must not move when the look
// changes.
// ---------------------------------------------------------------------------

const CAVEOS_THEME_LABEL_KEY_BY_ID = {
  terminal: "caveOsThemeTerminal",
  amber: "caveOsThemeAmber",
  redmond: "caveOsThemeRedmond",
  platinum: "caveOsThemePlatinum",
  hotdog: "caveOsThemeHotdog",
};

function caveOsThemeClassName(themeId) {
  return `caveos-theme-${themeId}`;
}

// Puts the current theme's class on an already-open computer window, removing
// whichever one it had. Safe to call with a window that has none yet.
function applyCaveOsThemeToWindow(windowController) {
  const rootElement = windowController?.rootElement;
  if (!rootElement) {
    return;
  }

  CAVEOS_THEME_IDS.forEach((themeId) => {
    rootElement.classList.remove(caveOsThemeClassName(themeId));
  });

  rootElement.classList.add(caveOsThemeClassName(getCaveOsTheme()));
}

// Re-skins every open computer window. Called both when the player picks a
// theme and after a load, where the window may already be on screen.
function refreshCaveOsTheme() {
  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) !== "computer") {
      return;
    }

    applyCaveOsThemeToWindow(windowController);
    syncCaveOsThemeSelect(windowController);
  });
}

function syncCaveOsThemeSelect(windowController) {
  const themeSelect = computerWindowContentRefs.get(windowController)?.themeSelect;
  if (themeSelect) {
    themeSelect.value = getCaveOsTheme();
  }
}

// The theme picker that lives in the computer window's title bar. Built as a
// plain <select>: the era styling comes entirely from CSS, and a native control
// keeps it keyboard-operable and correctly sized in every language without
// re-implementing a listbox.
function createCaveOsThemeSelect() {
  const languageCode = getLanguage();

  const wrapper = document.createElement("div");
  wrapper.classList.add("caveos-theme-picker");

  const label = document.createElement("label");
  label.classList.add("caveos-theme-picker-label");
  label.textContent = localize("caveOsThemeSelectLabel", languageCode);

  const select = document.createElement("select");
  select.classList.add("caveos-theme-select");
  select.id = "caveOsThemeSelect";
  label.setAttribute("for", select.id);

  CAVEOS_THEME_IDS.forEach((themeId) => {
    const option = document.createElement("option");
    option.value = themeId;
    option.textContent = localize(CAVEOS_THEME_LABEL_KEY_BY_ID[themeId], languageCode);
    select.appendChild(option);
  });

  select.value = getCaveOsTheme();

  select.addEventListener("change", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickSwitch");
    setCaveOsTheme(select.value);
    // Read back rather than trusting the option: setCaveOsTheme() rejects
    // anything it does not recognise, and the control must show what actually
    // took effect.
    select.value = getCaveOsTheme();
    refreshCaveOsTheme();
  });

  wrapper.append(label, select);
  return { wrapper, select, label };
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

  const languageCode = getLanguage();
  const notesIcon = createIconButton(localize("computerNotesIconLabel", languageCode), "computer-icon-notes");
  // ECHOTRAIL is the machine's own media library, so — like CAVE OS itself and
  // like Netscape — its name is branding and stays in English in every
  // language. Only the window's furniture around it is localized.
  const echotrailIcon = createIconButton("ECHOTRAIL", "computer-icon-echotrail");
  const netscapeIcon = createIconButton("Netscape", "computer-icon-netscape");

  // Folders, not apps: these open on a double click (see the handlers in
  // openComputerWindow) rather than the single click every app icon uses. The
  // hint is carried as a title so the tooltip layer explains the difference on
  // hover rather than leaving the player to discover it.
  const utilitiesFolderIcon = createIconButton(
    localize("computerUtilitiesFolderLabel", languageCode),
    "computer-icon-folder"
  );
  utilitiesFolderIcon.classList.add("computer-icon-folder-utilities");
  utilitiesFolderIcon.title = localize("computerFolderOpenHint", languageCode);

  const gamesFolderIcon = createIconButton(
    localize("computerGamesFolderLabel", languageCode),
    "computer-icon-folder"
  );
  gamesFolderIcon.classList.add("computer-icon-folder-games");
  gamesFolderIcon.title = localize("computerFolderOpenHint", languageCode);

  const clockPanel = document.createElement("button");
  clockPanel.type = "button";
  clockPanel.classList.add("computer-clock-panel");
  clockPanel.setAttribute("aria-label", localize("openMainMenuAriaLabel", languageCode));
  clockPanel.title = localize("openMainMenuAriaLabel", languageCode);

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
  clockHint.textContent = localize("computerMenuHint", languageCode);

  clockPanel.append(analogClock, dateText, clockHint);

  // Folders first, then the three loose apps. All five sit on one row wherever
  // there is room for them; the grid only wraps on a screen too narrow to hold
  // five columns (see .computer-icons-grid in styles.css).
  iconsGrid.append(utilitiesFolderIcon, gamesFolderIcon, notesIcon, echotrailIcon, netscapeIcon);
  container.append(header, subHeader, iconsGrid, clockPanel);

  const refs = {
    container,
    notesIcon,
    echotrailIcon,
    netscapeIcon,
    utilitiesFolderIcon,
    gamesFolderIcon,
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

// Paint's canvas colours for the theme currently in play, read off the live
// computer window so the two never drift from what the CSS says.
//
// Resolved once per Paint window rather than watched: a page is stored as a
// flat image, so the pixels of anything already drawn cannot follow a later
// theme change. Fixing the pair at open time is what keeps the eraser painting
// the same colour as the canvas it is erasing on — the alternative, re-reading
// live, would have the eraser cutting theme-coloured holes in artwork drawn
// under a different one.
function resolveCaveOsPaintPalette() {
  const fallback = { canvas: "#041204", ink: "#76ff62" };
  const computerWindowElement = document.querySelector(".computer-window");
  if (!computerWindowElement) {
    return fallback;
  }

  const computedStyle = getComputedStyle(computerWindowElement);
  const canvasColor = computedStyle.getPropertyValue("--caveos-paint-canvas").trim();
  const inkColor = computedStyle.getPropertyValue("--caveos-paint-ink").trim();

  return {
    canvas: canvasColor || fallback.canvas,
    ink: inkColor || fallback.ink,
  };
}

function createComputerPaintWindowContentElements() {
  const paintPalette = resolveCaveOsPaintPalette();
  const PAINT_BACKGROUND_COLOR = paintPalette.canvas;
  const PAINT_DEFAULT_COLOR = paintPalette.ink;
  const SNAPSHOT_TYPE = "image/webp";
  const SNAPSHOT_QUALITY = 0.82;

  const container = document.createElement("div");
  container.classList.add("caveos-paint-app");

  const toolbar = document.createElement("div");
  toolbar.classList.add("caveos-paint-toolbar");

  const languageCode = getLanguage();
  const toolButtons = [];
  const toolNames = ["pen", "line", "rect", "eraser", "fill"];
  // dataset.tool stays the English identifier (read by the tool-switch
  // handler below); only the visible label is localized.
  const toolLabelKeys = {
    pen: "paintToolPen",
    line: "paintToolLine",
    rect: "paintToolRect",
    eraser: "paintToolEraser",
    fill: "paintToolFill",
  };

  toolNames.forEach((toolName, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("caveos-paint-tool");
    if (index === 0) {
      button.classList.add("is-active");
    }
    button.dataset.tool = toolName;
    button.textContent = localize(toolLabelKeys[toolName], languageCode);
    toolbar.appendChild(button);
    toolButtons.push(button);
  });

  const sizeInput = document.createElement("input");
  sizeInput.type = "range";
  sizeInput.min = "1";
  sizeInput.max = "18";
  sizeInput.value = "3";
  sizeInput.classList.add("caveos-paint-size");
  sizeInput.setAttribute("aria-label", localize("paintBrushSizeAriaLabel", languageCode));

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = PAINT_DEFAULT_COLOR;
  colorInput.classList.add("caveos-paint-color");
  colorInput.setAttribute("aria-label", localize("paintColorAriaLabel", languageCode));

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.classList.add("caveos-paint-tool", "caveos-paint-clear");
  clearButton.dataset.action = "clear";
  clearButton.textContent = localize("paintClearButton", languageCode);

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

  // Packs an [r, g, b, a] quad into the same native 32-bit word layout that
  // ImageData uses, so pixel tests become one integer compare instead of four
  // byte compares. Going through a shared buffer keeps this endian-correct.
  const packRgba = (rgba) => {
    const word = new Uint32Array(1);
    new Uint8ClampedArray(word.buffer).set(rgba);
    return word[0];
  };

  // Scanline flood fill over a Uint32 view of the bitmap. The previous
  // implementation pushed a fresh [x, y] array for every visited pixel, so
  // filling a large region of the 1024x640 canvas allocated millions of small
  // arrays. This walks whole horizontal spans and queues plain integer indices.
  const floodFill = (startXCoord, startYCoord, fillColorHex) => {
    if (!context) {
      return;
    }

    const { width, height } = canvas;
    const startX = Math.max(0, Math.min(width - 1, Math.floor(startXCoord)));
    const startY = Math.max(0, Math.min(height - 1, Math.floor(startYCoord)));

    const imageData = context.getImageData(0, 0, width, height);
    // Uint8ClampedArray and Uint32Array share the buffer, so writes through the
    // 32-bit view land straight back in the ImageData.
    const pixels = new Uint32Array(imageData.data.buffer);

    const fillColor = packRgba(parseColor(fillColorHex));
    const targetColor = pixels[startY * width + startX];
    if (targetColor === fillColor) {
      return;
    }

    const stack = [startY * width + startX];

    while (stack.length) {
      const seed = stack.pop();
      if (pixels[seed] !== targetColor) {
        continue;
      }

      const rowStart = Math.floor(seed / width) * width;
      const rowEnd = rowStart + width;

      let spanStart = seed;
      while (spanStart > rowStart && pixels[spanStart - 1] === targetColor) {
        spanStart -= 1;
      }

      let spanEnd = seed;
      while (spanEnd + 1 < rowEnd && pixels[spanEnd + 1] === targetColor) {
        spanEnd += 1;
      }

      let aboveQueued = false;
      let belowQueued = false;

      for (let index = spanStart; index <= spanEnd; index += 1) {
        pixels[index] = fillColor;

        const above = index - width;
        if (above >= 0 && pixels[above] === targetColor) {
          if (!aboveQueued) {
            stack.push(above);
            aboveQueued = true;
          }
        } else {
          aboveQueued = false;
        }

        const below = index + width;
        if (below < pixels.length && pixels[below] === targetColor) {
          if (!belowQueued) {
            stack.push(below);
            belowQueued = true;
          }
        } else {
          belowQueued = false;
        }
      }
    }

    context.putImageData(imageData, 0, 0);
  };

  // The ground the page currently on screen was painted on, which is what the
  // eraser has to restore and what Clear repaints. It starts as the theme's
  // canvas colour, but a page drawn under a different theme keeps ITS ground:
  // the snapshot is a flat image, so erasing to the current theme's colour
  // would cut differently-coloured holes in older artwork.
  let pageBackgroundColor = PAINT_BACKGROUND_COLOR;

  // Recovers the ground of a restored page by sampling its top-left pixel.
  // Every page begins as a full-bleed fill of one colour, so that pixel is the
  // page's ground unless the player has painted over that exact corner — a
  // small enough risk to accept for the benefit of erasing correctly on art
  // drawn under another theme.
  const readCanvasGroundColor = () => {
    if (!context) {
      return PAINT_BACKGROUND_COLOR;
    }

    try {
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      const toHex = (channel) => channel.toString(16).padStart(2, "0");
      return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
    } catch (error) {
      // A tainted canvas cannot be sampled; the theme colour is the best guess.
      return PAINT_BACKGROUND_COLOR;
    }
  };

  const fillCanvasBackground = (backgroundColor = PAINT_BACKGROUND_COLOR) => {
    if (!context) {
      return;
    }

    pageBackgroundColor = backgroundColor;
    context.globalCompositeOperation = "source-over";
    context.fillStyle = backgroundColor;
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
      // After the artwork is on the canvas, not before: this page keeps the
      // ground it was drawn on, whatever theme was in play at the time.
      pageBackgroundColor = readCanvasGroundColor();
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
      // Paints back to this page's own ground — never a hardcoded white, and
      // never the current theme's colour when the page was drawn under another.
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = pageBackgroundColor;
      context.fillStyle = pageBackgroundColor;
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
    persistActivePageBody(PAINT_PAGE_MODEL, snapshotCurrentCanvas());
  };

  const renderPaintWindowContent = async () => {
    const pages = getPaintPages();
    if (!pages.length) {
      fillCanvasBackground();
      return;
    }

    const activeIndex = resolveActivePageIndex(PAINT_PAGE_MODEL, pages);
    setPaintActivePageIndex(activeIndex);
    refs.activePageIndex = activeIndex;

    syncPageTabRows(PAINT_PAGE_MODEL, refs.pageRows, pages, activeIndex);

    await restoreCanvasSnapshot(String(pages[activeIndex]?.snapshot || ""));
  };

  const setActivePaintPage = async (requestedIndex) => {
    persistActivePaintPageContent();
    setPaintActivePageIndex(clampToPageCount(PAINT_PAGE_MODEL, requestedIndex));
    await renderPaintWindowContent();
  };

  refs.pageRows = createPageTabRows(PAINT_PAGE_MODEL, tabsList, (pageIndex) => {
    void setActivePaintPage(pageIndex);
  });

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

// A plain four-function calculator, in the shape every desk calculator of the
// period had: one display, a digit pad, an operator column.
//
// The arithmetic is deliberately the simple immediate-execution kind those
// machines used, NOT precedence-aware evaluation: pressing 2 + 3 × 4 gives 20,
// because each operator key resolves whatever is already pending before
// starting the next one. That is what a 1996 desk calculator did, and it keeps
// the whole thing to two pieces of state.
//
// Nothing here is persisted. The calculator is a tool the player uses while
// working something out, not progress, so a fresh window starts at zero — the
// same way closing and reopening a real one does.
function createComputerCalculatorWindowContentElements() {
  const DISPLAY_MAX_LENGTH = 12;

  const languageCode = getLanguage();

  const container = document.createElement("div");
  container.classList.add("caveos-calculator-app");

  const display = document.createElement("div");
  display.classList.add("caveos-calculator-display");
  // A live region: the display is the only feedback a keypress gives, so a
  // screen reader has to hear it change without the focus moving there.
  display.setAttribute("role", "status");
  display.setAttribute("aria-live", "polite");
  display.setAttribute("aria-label", localize("calculatorDisplayAriaLabel", languageCode));

  const keypad = document.createElement("div");
  keypad.classList.add("caveos-calculator-keypad");

  // accumulator holds the running total, pendingOperator the key that is
  // waiting on it. isEnteringNewNumber marks the moment after an operator or
  // equals, where the next digit starts a fresh number rather than appending.
  let displayValue = "0";
  let accumulator = null;
  let pendingOperator = null;
  let isEnteringNewNumber = true;
  let isShowingError = false;

  function renderDisplay() {
    display.textContent = isShowingError
      ? localize("calculatorErrorText", getLanguage())
      : displayValue;
  }

  function resetAll() {
    displayValue = "0";
    accumulator = null;
    pendingOperator = null;
    isEnteringNewNumber = true;
    isShowingError = false;
    renderDisplay();
  }

  // Keeps the display inside its width without ever showing a number that is
  // not the real answer: exponent notation for magnitudes that cannot fit, and
  // trailing zeroes trimmed off a rounded decimal.
  function formatResult(value) {
    if (!Number.isFinite(value)) {
      return null;
    }

    if (Number.isInteger(value) && Math.abs(value) < 1e12) {
      return String(value);
    }

    const magnitude = Math.abs(value);
    if (magnitude !== 0 && (magnitude >= 1e12 || magnitude < 1e-6)) {
      return value.toExponential(5);
    }

    return String(Number(value.toPrecision(DISPLAY_MAX_LENGTH - 1)));
  }

  function applyPendingOperator(rightOperand) {
    if (pendingOperator === null || accumulator === null) {
      return rightOperand;
    }

    switch (pendingOperator) {
      case "add":
        return accumulator + rightOperand;
      case "subtract":
        return accumulator - rightOperand;
      case "multiply":
        return accumulator * rightOperand;
      case "divide":
        // Not guarded here: division by zero produces Infinity, which
        // formatResult() rejects and the caller turns into the ERROR state.
        return accumulator / rightOperand;
      default:
        return rightOperand;
    }
  }

  function pressDigit(digit) {
    if (isShowingError) {
      resetAll();
    }

    if (isEnteringNewNumber) {
      displayValue = digit;
      isEnteringNewNumber = false;
    } else if (displayValue.replace(/[-.]/g, "").length < DISPLAY_MAX_LENGTH) {
      displayValue = displayValue === "0" ? digit : displayValue + digit;
    }

    renderDisplay();
  }

  function pressDecimal() {
    if (isShowingError) {
      resetAll();
    }

    if (isEnteringNewNumber) {
      displayValue = "0.";
      isEnteringNewNumber = false;
    } else if (!displayValue.includes(".")) {
      displayValue += ".";
    }

    renderDisplay();
  }

  function pressNegate() {
    if (isShowingError || displayValue === "0") {
      return;
    }

    displayValue = displayValue.startsWith("-")
      ? displayValue.slice(1)
      : `-${displayValue}`;
    renderDisplay();
  }

  function pressOperator(operator) {
    if (isShowingError) {
      return;
    }

    const currentValue = Number(displayValue);

    // Two operators in a row just change which one is pending, rather than
    // folding the displayed number in a second time.
    if (!isEnteringNewNumber) {
      const result = applyPendingOperator(currentValue);
      const formatted = formatResult(result);
      if (formatted === null) {
        isShowingError = true;
        accumulator = null;
        pendingOperator = null;
        isEnteringNewNumber = true;
        renderDisplay();
        return;
      }

      displayValue = formatted;
      accumulator = Number(formatted);
    } else if (accumulator === null) {
      accumulator = currentValue;
    }

    pendingOperator = operator;
    isEnteringNewNumber = true;
    renderDisplay();
  }

  function pressEquals() {
    if (isShowingError) {
      return;
    }

    const result = applyPendingOperator(Number(displayValue));
    const formatted = formatResult(result);

    if (formatted === null) {
      isShowingError = true;
      accumulator = null;
      pendingOperator = null;
      isEnteringNewNumber = true;
      renderDisplay();
      return;
    }

    displayValue = formatted;
    accumulator = null;
    pendingOperator = null;
    isEnteringNewNumber = true;
    renderDisplay();
  }

  // Every key: the symbol drawn on it, an optional localized accessible name
  // (digits and the decimal point read fine on their own), and what it does.
  // Operator glyphs are the typographic ones a calculator uses, not the ASCII
  // stand-ins: a 1996 machine had × and ÷ printed on the keys.
  const KEY_DEFINITIONS = [
    { symbol: "7", action: () => pressDigit("7"), className: "is-digit" },
    { symbol: "8", action: () => pressDigit("8"), className: "is-digit" },
    { symbol: "9", action: () => pressDigit("9"), className: "is-digit" },
    { symbol: "÷", labelKey: "calculatorDivideAriaLabel", action: () => pressOperator("divide"), className: "is-operator" },
    { symbol: "4", action: () => pressDigit("4"), className: "is-digit" },
    { symbol: "5", action: () => pressDigit("5"), className: "is-digit" },
    { symbol: "6", action: () => pressDigit("6"), className: "is-digit" },
    { symbol: "×", labelKey: "calculatorMultiplyAriaLabel", action: () => pressOperator("multiply"), className: "is-operator" },
    { symbol: "1", action: () => pressDigit("1"), className: "is-digit" },
    { symbol: "2", action: () => pressDigit("2"), className: "is-digit" },
    { symbol: "3", action: () => pressDigit("3"), className: "is-digit" },
    { symbol: "−", labelKey: "calculatorSubtractAriaLabel", action: () => pressOperator("subtract"), className: "is-operator" },
    { symbol: "0", action: () => pressDigit("0"), className: "is-digit" },
    { symbol: ".", labelKey: "calculatorDecimalAriaLabel", action: () => pressDecimal(), className: "is-digit" },
    { symbol: "±", labelKey: "calculatorNegateAriaLabel", action: () => pressNegate(), className: "is-digit" },
    { symbol: "+", labelKey: "calculatorAddAriaLabel", action: () => pressOperator("add"), className: "is-operator" },
    { symbol: "C", labelKey: "calculatorClearAriaLabel", action: () => resetAll(), className: "is-clear" },
    { symbol: "=", labelKey: "calculatorEqualsAriaLabel", action: () => pressEquals(), className: "is-equals" },
  ];

  const keyButtons = [];

  KEY_DEFINITIONS.forEach((definition) => {
    const key = document.createElement("button");
    key.type = "button";
    key.classList.add("caveos-calculator-key", definition.className);
    key.textContent = definition.symbol;
    key.dataset.calculatorKey = definition.symbol;

    if (definition.labelKey) {
      key.setAttribute("aria-label", localize(definition.labelKey, languageCode));
      key.dataset.calculatorLabelKey = definition.labelKey;
    }

    key.addEventListener("click", () => {
      audioManager.onUserGesture();
      audioManager.playSfx("clickButton");
      definition.action();
    });

    keypad.appendChild(key);
    keyButtons.push(key);
  });

  container.append(display, keypad);
  renderDisplay();

  return {
    container,
    display,
    keyButtons,
    // Re-reads every string the window built from the old language. Only the
    // ERROR text and the key aria-labels are localized; the digits and
    // operator glyphs are language-independent by nature.
    relocalize: () => {
      const nextLanguageCode = getLanguage();
      display.setAttribute("aria-label", localize("calculatorDisplayAriaLabel", nextLanguageCode));
      keyButtons.forEach((key) => {
        const labelKey = key.dataset.calculatorLabelKey;
        if (labelKey) {
          key.setAttribute("aria-label", localize(labelKey, nextLanguageCode));
        }
      });
      renderDisplay();
    },
  };
}

// ECHOTRAIL — the machine's media library, in the "Details" view a 1996 file
// explorer would have used: a small icon per row and everything else given over
// to the columns.
//
// Two things here are worth knowing before reading the code.
//
// The rows are *derived*, never stored. What a file is called, who it is
// credited to and whether the game's own music may play it are all decided by
// echotrailManager.js from the filename alone, so a track added by a story
// trigger ten hours in goes through exactly the same rules as the six that ship
// with the machine.
//
// Playback is owned by audioManager, not by this window. That is deliberate: a
// track the player chose keeps playing when they close the library and get on
// with the game, which is the whole point of having one. Reopening the window
// re-attaches to whatever is already playing rather than starting again.
function createComputerEchotrailWindowContentElements() {
  const languageCode = getLanguage();

  // Durations are read from the files themselves, and cached across window
  // openings — the metadata for a track cannot change while the game runs, and
  // re-reading six files every time the library opens is wasted work.
  const container = document.createElement("div");
  container.classList.add("caveos-echotrail-app");

  /* --- transport ------------------------------------------------------- */

  const transport = document.createElement("div");
  transport.classList.add("caveos-echotrail-transport");

  const createTransportButton = (className, glyph, ariaLabelKey) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("caveos-echotrail-button", className);
    button.setAttribute("aria-label", localize(ariaLabelKey, languageCode));
    button.dataset.ariaLabelKey = ariaLabelKey;

    const glyphElement = document.createElement("span");
    glyphElement.classList.add("caveos-echotrail-button-glyph");
    glyphElement.setAttribute("aria-hidden", "true");
    glyphElement.textContent = glyph;

    button.appendChild(glyphElement);
    return button;
  };

  const previousButton = createTransportButton(
    "caveos-echotrail-previous",
    "◀◀",
    "echotrailPreviousAriaLabel"
  );
  const playButton = createTransportButton(
    "caveos-echotrail-play",
    "▶",
    "echotrailPlayAriaLabel"
  );
  const nextButton = createTransportButton(
    "caveos-echotrail-next",
    "▶▶",
    "echotrailNextAriaLabel"
  );

  const nowPlaying = document.createElement("div");
  nowPlaying.classList.add("caveos-echotrail-now-playing");

  // The counter. A button rather than a readout because it does something:
  // clicking it swaps between time elapsed and time remaining, the way a
  // hi-fi's display does. Which mode it is in is the player's preference and is
  // deliberately not persisted — it is a glance, not a setting.
  const clock = document.createElement("button");
  clock.type = "button";
  clock.classList.add("caveos-echotrail-clock");

  const clockTime = document.createElement("span");
  clockTime.classList.add("caveos-echotrail-clock-time");

  clock.appendChild(clockTime);

  // Music volume, mirroring the slider in the sound settings menu. Both drive
  // the same audioManager.setMusicVolume, and each refreshes the other, so the
  // two can never drift apart. SFX is deliberately absent: this is a music
  // player, and the sound menu remains the place for everything else.
  const volumeWrap = document.createElement("div");
  volumeWrap.classList.add("caveos-echotrail-volume");

  const volumeIcon = document.createElement("span");
  volumeIcon.classList.add("caveos-echotrail-volume-icon");
  volumeIcon.setAttribute("aria-hidden", "true");

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "100";
  volumeSlider.step = "1";
  volumeSlider.classList.add("caveos-echotrail-volume-slider");
  volumeSlider.setAttribute("aria-label", localize("echotrailMusicVolumeAriaLabel", languageCode));

  const volumeValue = document.createElement("span");
  volumeValue.classList.add("caveos-echotrail-volume-value");

  volumeWrap.append(volumeIcon, volumeSlider, volumeValue);

  transport.append(previousButton, playButton, nextButton, clock, nowPlaying, volumeWrap);

  /* --- the details list ------------------------------------------------ */

  const listShell = document.createElement("div");
  listShell.classList.add("caveos-echotrail-list-shell");

  const table = document.createElement("table");
  table.classList.add("caveos-echotrail-list");
  table.setAttribute("aria-label", localize("echotrailLibraryAriaLabel", languageCode));

  // Every column sorts. `sortValue` is what the comparison actually runs on,
  // which is not always what the cell shows: Length sorts on seconds so 9:59
  // comes before 10:00, and Author sorts on the rendered text so the localized
  // "unknown" groups with itself in whatever language is in play.
  const COLUMNS = [
    { id: "name", labelKey: "echotrailColumnName" },
    { id: "length", labelKey: "echotrailColumnLength", numeric: true },
    { id: "author", labelKey: "echotrailColumnAuthor" },
    { id: "type", labelKey: "echotrailColumnFileType" },
  ];

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headerCellsById = new Map();

  COLUMNS.forEach((column) => {
    const headerCell = document.createElement("th");
    headerCell.scope = "col";
    headerCell.classList.add("caveos-echotrail-column", `caveos-echotrail-column-${column.id}`);

    // A real button inside the header, so the column is reachable and operable
    // from the keyboard rather than being a click-only affordance.
    const headerButton = document.createElement("button");
    headerButton.type = "button";
    headerButton.classList.add("caveos-echotrail-column-button");
    headerButton.dataset.column = column.id;

    const headerLabel = document.createElement("span");
    headerLabel.classList.add("caveos-echotrail-column-label");
    headerLabel.textContent = localize(column.labelKey, languageCode);

    // The sort arrow. Hidden from assistive tech, which reads aria-sort on the
    // header cell instead and would otherwise announce the glyph as well.
    const headerArrow = document.createElement("span");
    headerArrow.classList.add("caveos-echotrail-column-arrow");
    headerArrow.setAttribute("aria-hidden", "true");

    headerButton.append(headerLabel, headerArrow);
    headerCell.appendChild(headerButton);
    headerRow.appendChild(headerCell);
    headerCellsById.set(column.id, { headerCell, headerLabel, headerArrow, labelKey: column.labelKey });
  });

  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  tbody.classList.add("caveos-echotrail-rows");

  table.append(thead, tbody);
  listShell.appendChild(table);

  container.append(transport, listShell);

  /* --- state ------------------------------------------------------------ */

  let sortColumnId = "name";
  let sortAscending = true;
  // The filename the player last clicked. Distinct from what is playing: the
  // player can line up a row and press Play, exactly as in a file explorer.
  let selectedFileName = "";
  let rowsByFileName = new Map();
  let unsubscribeFromAudio = null;
  // The counter's mode. Starts on elapsed, which is what a player glancing at a
  // track that has just started wants to know.
  let showsRemaining = false;
  let clockIntervalId = null;

  const currentLanguage = () => getLanguage();

  const localizeFileType = (entry) => localize(
    entry.kind === "video" ? "echotrailFileTypeVideo" : "echotrailFileTypeAudio",
    currentLanguage()
  );

  const localizeAuthor = (entry) => entry.author
    || localize("echotrailUnknownAuthor", currentLanguage());

  // mm:ss, or the placeholder while the file's metadata is still loading. A
  // track over an hour long would read 61:30 rather than 1:01:30, which is what
  // the era's players did and is unambiguous for anything in this library.
  const formatLength = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return localize("echotrailLengthUnknown", currentLanguage());
    }

    const wholeSeconds = Math.round(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
  };

  const readLibrary = () => buildEchotrailLibrary(getEchotrailUnlockedFileNames());

  const sortValueFor = (entry, columnId) => {
    if (columnId === "length") {
      const duration = echotrailDurationsBySource.get(entry.sourcePath);
      // Unknown lengths sort to the end in both directions rather than
      // pretending to be zero, which would park them at the top of an
      // ascending sort as though they were the shortest tracks.
      return Number.isFinite(duration) ? duration : Number.POSITIVE_INFINITY;
    }

    if (columnId === "author") {
      return localizeAuthor(entry).toLocaleLowerCase(currentLanguage());
    }

    if (columnId === "type") {
      return localizeFileType(entry).toLocaleLowerCase(currentLanguage());
    }

    return entry.displayName.toLocaleLowerCase(currentLanguage());
  };

  const sortedLibrary = () => {
    const entries = readLibrary();
    const column = COLUMNS.find(({ id }) => id === sortColumnId) || COLUMNS[0];

    return entries.sort((first, second) => {
      const firstValue = sortValueFor(first, column.id);
      const secondValue = sortValueFor(second, column.id);

      let comparison;
      if (column.numeric) {
        comparison = firstValue === secondValue ? 0 : (firstValue < secondValue ? -1 : 1);
      } else {
        comparison = String(firstValue).localeCompare(String(secondValue), currentLanguage());
      }

      // Ties fall back to the display name, so a re-sort on a column full of
      // equal values (Author, with one house artist) is stable and does not
      // shuffle the rows about under the player.
      if (comparison === 0) {
        return first.displayName.localeCompare(second.displayName, currentLanguage());
      }

      return sortAscending ? comparison : -comparison;
    });
  };

  /* --- rendering -------------------------------------------------------- */

  // Kicks off a metadata-only load for any track whose length is still unknown,
  // and repaints the affected cell when it arrives. Metadata-only means the
  // browser fetches the header rather than the whole file.
  const ensureDurationsLoaded = (entries) => {
    entries.forEach((entry) => {
      if (echotrailDurationsBySource.has(entry.sourcePath)) {
        return;
      }

      // Marked before the load starts so a second render while the first is
      // still in flight does not queue the same file again.
      echotrailDurationsBySource.set(entry.sourcePath, null);

      const probe = new Audio();
      probe.preload = "metadata";
      probe.addEventListener("loadedmetadata", () => {
        echotrailDurationsBySource.set(entry.sourcePath, probe.duration);
        const row = rowsByFileName.get(entry.fileName);
        if (row) {
          row.lengthCell.textContent = formatLength(probe.duration);
        }
        // A length arriving while the list is sorted by Length has to take its
        // place, or the row would sit in the wrong position until the next
        // sort.
        if (sortColumnId === "length") {
          renderRows();
        }
      });
      probe.addEventListener("error", () => {
        // Leaves the placeholder in place. A file whose metadata will not load
        // is still listed and still playable — the player finds out when they
        // press play, exactly as they would in a real file explorer.
        echotrailDurationsBySource.set(entry.sourcePath, Number.NaN);
      });
      probe.src = entry.sourcePath;
    });
  };

  const renderHeaders = () => {
    headerCellsById.forEach(({ headerCell, headerLabel, headerArrow, labelKey }, columnId) => {
      headerLabel.textContent = localize(labelKey, currentLanguage());

      const isSorted = columnId === sortColumnId;
      headerCell.classList.toggle("is-sorted", isSorted);
      // aria-sort is how the sort state is actually announced; the arrow glyph
      // below is the sighted equivalent and is hidden from assistive tech.
      if (isSorted) {
        headerCell.setAttribute("aria-sort", sortAscending ? "ascending" : "descending");
        headerArrow.textContent = sortAscending ? "▲" : "▼";
      } else {
        headerCell.setAttribute("aria-sort", "none");
        headerArrow.textContent = "";
      }
    });
  };

  // A counter is not a length: 0:00 is a real reading at the start of a track,
  // whereas an unknown *length* has to say so. formatLength() renders the
  // placeholder for zero, which is right for the column and wrong here.
  const formatClock = (seconds) => {
    const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const minutes = Math.floor(wholeSeconds / 60);
    return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
  };

  // The counter, redrawn several times a second while something is playing.
  // Read from the audio element rather than tracked here, so it is the position
  // the browser is actually at and cannot drift.
  const renderClock = () => {
    const language = currentLanguage();
    const audio = audioManager.echotrailAudio;
    const duration = Number(audio?.duration);
    const elapsed = Number(audio?.currentTime);

    clock.classList.toggle("is-remaining", showsRemaining);
    clock.setAttribute(
      "aria-label",
      localize(
        showsRemaining ? "echotrailClockRemainingAriaLabel" : "echotrailClockElapsedAriaLabel",
        language
      )
    );

    if (!audio || !Number.isFinite(elapsed)) {
      clockTime.textContent = formatClock(0);
      return;
    }

    if (!showsRemaining) {
      clockTime.textContent = formatClock(elapsed);
      return;
    }

    // Remaining needs a duration; until the metadata lands there is nothing
    // honest to count down from, so the placeholder stands rather than a wrong
    // number that would tick.
    if (!Number.isFinite(duration)) {
      clockTime.textContent = localize("echotrailLengthUnknown", language);
      return;
    }

    // Leading minus, the way a hi-fi shows a countdown.
    clockTime.textContent = `-${formatClock(duration - elapsed)}`;
  };

  const renderVolume = () => {
    const percent = Math.round(audioManager.musicVolume * 100);
    volumeSlider.value = String(percent);
    volumeValue.textContent = `${percent}%`;
    volumeSlider.setAttribute("aria-label", localize("echotrailMusicVolumeAriaLabel", currentLanguage()));
  };

  const renderTransport = () => {
    const language = currentLanguage();
    const { source, isPlaying, isLoaded } = audioManager.getEchotrailState();

    playButton.classList.toggle("is-playing", isPlaying);
    // One button with two jobs, so its accessible name has to say which job it
    // is currently offering rather than staying "Play" while it means "Pause".
    const playLabelKey = isPlaying ? "echotrailPauseAriaLabel" : "echotrailPlayAriaLabel";
    playButton.dataset.ariaLabelKey = playLabelKey;
    playButton.setAttribute("aria-label", localize(playLabelKey, language));
    playButton.querySelector(".caveos-echotrail-button-glyph").textContent = isPlaying ? "❚❚" : "▶";

    const playingEntry = isLoaded
      ? readLibrary().find((entry) => entry.sourcePath === source)
      : null;

    nowPlaying.textContent = playingEntry
      ? `${localize("echotrailNowPlayingLabel", language)}: ${playingEntry.displayName}`
      : localize("echotrailNothingPlaying", language);

    rowsByFileName.forEach((row, fileName) => {
      row.rowElement.classList.toggle(
        "is-playing",
        Boolean(playingEntry) && playingEntry.fileName === fileName
      );
    });
  };

  const renderRows = () => {
    const entries = sortedLibrary();
    ensureDurationsLoaded(entries);

    tbody.replaceChildren();
    rowsByFileName = new Map();

    entries.forEach((entry) => {
      const rowElement = document.createElement("tr");
      rowElement.classList.add("caveos-echotrail-row");
      rowElement.dataset.fileName = entry.fileName;
      // Focusable so the list can be walked and played from the keyboard; the
      // row is the thing being selected, so the row is what takes focus.
      rowElement.tabIndex = 0;

      const nameCell = document.createElement("td");
      nameCell.classList.add("caveos-echotrail-cell", "caveos-echotrail-cell-name");

      // The "small icon" half of Details view: everything else on the row is
      // text, so this is the only thing carrying the file's kind visually.
      const icon = document.createElement("span");
      icon.classList.add("caveos-echotrail-row-icon", `is-${entry.kind}`);
      icon.setAttribute("aria-hidden", "true");

      const nameText = document.createElement("span");
      nameText.classList.add("caveos-echotrail-row-name");
      nameText.textContent = entry.displayName;

      nameCell.append(icon, nameText);

      const lengthCell = document.createElement("td");
      lengthCell.classList.add("caveos-echotrail-cell", "caveos-echotrail-cell-length");
      const knownDuration = echotrailDurationsBySource.get(entry.sourcePath);
      lengthCell.textContent = formatLength(knownDuration);

      const authorCell = document.createElement("td");
      authorCell.classList.add("caveos-echotrail-cell", "caveos-echotrail-cell-author");
      authorCell.textContent = localizeAuthor(entry);

      const typeCell = document.createElement("td");
      typeCell.classList.add("caveos-echotrail-cell", "caveos-echotrail-cell-type");
      typeCell.textContent = localizeFileType(entry);

      rowElement.append(nameCell, lengthCell, authorCell, typeCell);
      tbody.appendChild(rowElement);

      rowsByFileName.set(entry.fileName, { rowElement, lengthCell, authorCell, typeCell, nameText });
    });

    renderSelection();
    renderTransport();
  };

  const renderSelection = () => {
    rowsByFileName.forEach((row, fileName) => {
      const isSelected = fileName === selectedFileName;
      row.rowElement.classList.toggle("is-selected", isSelected);
      row.rowElement.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  };

  /* --- playback --------------------------------------------------------- */

  const playEntry = (entry) => {
    if (!entry) {
      return;
    }

    selectedFileName = entry.fileName;
    audioManager.onUserGesture();
    audioManager.playEchotrailTrack(entry.sourcePath);
    renderSelection();
  };

  // Which row the transport treats as "here": what is playing if anything is,
  // otherwise what the player has selected. Falls back to the top of the list
  // so the very first press of Play or Next does something sensible.
  const currentIndex = (entries) => {
    const { source, isLoaded } = audioManager.getEchotrailState();
    if (isLoaded) {
      const playingIndex = entries.findIndex((entry) => entry.sourcePath === source);
      if (playingIndex !== -1) {
        return playingIndex;
      }
    }

    return entries.findIndex((entry) => entry.fileName === selectedFileName);
  };

  // Steps through the list *as currently sorted*, which is what the player is
  // looking at — sorting by Author and pressing Next has to follow that order,
  // not the underlying file order.
  const step = (offset) => {
    const entries = sortedLibrary();
    if (!entries.length) {
      return;
    }

    const index = currentIndex(entries);
    const nextIndex = index === -1
      ? (offset > 0 ? 0 : entries.length - 1)
      : (index + offset + entries.length) % entries.length;

    playEntry(entries[nextIndex]);
  };

  /* --- wiring ----------------------------------------------------------- */

  headerCellsById.forEach(({ headerCell }, columnId) => {
    headerCell.querySelector(".caveos-echotrail-column-button").addEventListener("click", () => {
      audioManager.onUserGesture();
      audioManager.playSfx("clickButton");

      // Clicking the sorted column reverses it; clicking any other column sorts
      // by it ascending. Exactly what an explorer of the era did.
      if (sortColumnId === columnId) {
        sortAscending = !sortAscending;
      } else {
        sortColumnId = columnId;
        sortAscending = true;
      }

      renderHeaders();
      renderRows();
    });
  });

  // One listener on the body rather than one per row: the rows are rebuilt on
  // every sort, and per-row listeners would have to be rebuilt with them.
  tbody.addEventListener("click", (event) => {
    const rowElement = event.target instanceof HTMLElement
      ? event.target.closest(".caveos-echotrail-row")
      : null;
    if (!rowElement) {
      return;
    }

    selectedFileName = rowElement.dataset.fileName || "";
    renderSelection();
  });

  tbody.addEventListener("dblclick", (event) => {
    const rowElement = event.target instanceof HTMLElement
      ? event.target.closest(".caveos-echotrail-row")
      : null;
    if (!rowElement) {
      return;
    }

    const entry = sortedLibrary().find(
      ({ fileName }) => fileName === rowElement.dataset.fileName
    );
    playEntry(entry);
  });

  // Enter plays the focused row, matching the double click. Without it the list
  // is reachable from the keyboard but not usable from it.
  tbody.addEventListener("keydown", (event) => {
    const rowElement = event.target instanceof HTMLElement
      ? event.target.closest(".caveos-echotrail-row")
      : null;
    if (!rowElement || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    selectedFileName = rowElement.dataset.fileName || "";

    if (event.key === "Enter") {
      const entry = sortedLibrary().find(
        ({ fileName }) => fileName === rowElement.dataset.fileName
      );
      playEntry(entry);
      return;
    }

    renderSelection();
  });

  playButton.addEventListener("click", () => {
    audioManager.onUserGesture();

    // Nothing loaded yet, so Play means "start what is selected" rather than
    // "resume" — and with nothing selected either, it starts at the top.
    if (!audioManager.getEchotrailState().isLoaded) {
      const entries = sortedLibrary();
      const index = currentIndex(entries);
      playEntry(entries[index === -1 ? 0 : index]);
      return;
    }

    audioManager.toggleEchotrailPlayback();
  });

  previousButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    step(-1);
  });

  nextButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    step(1);
  });

  clock.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickSwitch");
    showsRemaining = !showsRemaining;
    renderClock();
  });

  volumeSlider.addEventListener("input", (event) => {
    audioManager.onUserGesture();
    audioManager.setMusicVolume(Number(event.target.value) / 100);
    renderVolume();
    // Pushes the same value to the sound settings menu's own slider, so the two
    // controls always read the same number.
    refreshAudioControlsDisplay();
  });

  // Playback the window did not initiate still has to show here: a track
  // reaching its end and handing the music back to the game, or the library
  // being reopened while something is already playing.
  unsubscribeFromAudio = audioManager.addEchotrailListener(() => {
    renderTransport();
    renderClock();
  });

  // The counter needs its own tick: the audio manager only announces state
  // changes, and a track playing steadily is precisely a period with no state
  // change at all. Four times a second is smooth enough to read as a running
  // clock without redrawing more than the seconds digit ever needs.
  clockIntervalId = setInterval(renderClock, 250);

  renderHeaders();
  renderRows();
  renderClock();
  renderVolume();

  return {
    container,
    // Called by the window's onClose. The subscription and the counter's tick
    // are torn down — an interval outliving its window would redraw a detached
    // element forever — but the track itself deliberately keeps playing,
    // because closing the library is not the same as stopping the music.
    destroy: () => {
      unsubscribeFromAudio?.();
      unsubscribeFromAudio = null;
      if (clockIntervalId) {
        clearInterval(clockIntervalId);
        clockIntervalId = null;
      }
    },
    // Called when the sound settings menu moves the music volume, so this
    // window's own slider follows it rather than showing a stale number.
    refreshVolume: renderVolume,
    relocalize: () => {
      table.setAttribute("aria-label", localize("echotrailLibraryAriaLabel", currentLanguage()));
      [previousButton, playButton, nextButton].forEach((button) => {
        button.setAttribute("aria-label", localize(button.dataset.ariaLabelKey, currentLanguage()));
      });
      renderClock();
      renderVolume();
      renderHeaders();
      // Re-rendered rather than patched: File Type and the unknown author are
      // localized *and* are sort keys, so a language switch can legitimately
      // change the row order.
      renderRows();
    },
  };
}

// Snake, on a fixed 24x18 cell board.
//
// Drawn to a canvas rather than built from elements: the board redraws every
// tick, and 432 divs being restyled eight times a second is a great deal of
// layout work for something a single fillRect loop does for nothing. The
// canvas is a fixed pixel size and scaled by CSS, so the game is identical at
// every window size.
//
// Nothing is persisted, for the same reason the calculator is not: it is a
// diversion on the desk machine, not progress. Closing the window ends the
// game, and the interval with it.
function createComputerSnakeWindowContentElements() {
  const COLUMNS = 24;
  const ROWS = 18;
  const CELL_SIZE = 20;
  // Eight steps a second — quick enough to demand attention, slow enough that a
  // player can react at the far end of the board.
  const TICK_MS = 125;

  const languageCode = getLanguage();

  const container = document.createElement("div");
  container.classList.add("caveos-snake-app");
  // Focusable so the board can take arrow keys the moment it opens, without
  // stealing them from the rest of the OS while it is closed.
  container.tabIndex = 0;
  container.setAttribute("role", "application");
  container.setAttribute("aria-label", localize("snakeBoardAriaLabel", languageCode));

  const statusBar = document.createElement("div");
  statusBar.classList.add("caveos-snake-status");

  const scoreText = document.createElement("span");
  scoreText.classList.add("caveos-snake-score");

  const hintText = document.createElement("span");
  hintText.classList.add("caveos-snake-hint");

  statusBar.append(scoreText, hintText);

  const boardWrap = document.createElement("div");
  boardWrap.classList.add("caveos-snake-board-wrap");

  const canvas = document.createElement("canvas");
  canvas.classList.add("caveos-snake-board");
  canvas.width = COLUMNS * CELL_SIZE;
  canvas.height = ROWS * CELL_SIZE;
  boardWrap.appendChild(canvas);

  container.append(statusBar, boardWrap);

  const context = canvas.getContext("2d");

  let snake = [];
  let direction = { x: 1, y: 0 };
  // Where the next tick will actually go. Queued rather than applied straight
  // away so two keys pressed inside one tick cannot double back through the
  // snake's own neck.
  let queuedDirection = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let score = 0;
  let isRunning = false;
  let isGameOver = false;
  let tickIntervalId = null;

  // Read fresh each redraw so the board follows a theme change mid-game.
  const readPalette = () => readCaveOsPaletteTokens({
    board: ["--caveos-paint-canvas", "#041204"],
    snake: ["--caveos-fg", "#70ff5c"],
    food: ["--caveos-accent", "#7cff64"],
    grid: ["--caveos-border", "rgba(97, 255, 88, 0.5)"],
  });

  function placeFood() {
    const freeCells = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLUMNS; x += 1) {
        if (!snake.some((segment) => segment.x === x && segment.y === y)) {
          freeCells.push({ x, y });
        }
      }
    }

    // A full board means the player has won; leave the last food where it is
    // rather than looping forever looking for a cell that does not exist.
    if (!freeCells.length) {
      return;
    }

    food = freeCells[Math.floor(Math.random() * freeCells.length)];
  }

  function renderStatus() {
    const currentLanguage = getLanguage();
    scoreText.textContent = `${localize("snakeScoreLabel", currentLanguage)}: ${score}`;

    if (isGameOver) {
      hintText.textContent = `${localize("snakeGameOverText", currentLanguage)} — ${localize("snakeRestartHint", currentLanguage)}`;
      return;
    }

    hintText.textContent = isRunning ? "" : localize("snakeStartHint", currentLanguage);
  }

  function draw() {
    if (!context) {
      return;
    }

    const palette = readPalette();

    context.fillStyle = palette.board;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = palette.grid;
    context.lineWidth = 1;
    for (let x = 1; x < COLUMNS; x += 1) {
      context.beginPath();
      context.moveTo(x * CELL_SIZE + 0.5, 0);
      context.lineTo(x * CELL_SIZE + 0.5, canvas.height);
      context.stroke();
    }
    for (let y = 1; y < ROWS; y += 1) {
      context.beginPath();
      context.moveTo(0, y * CELL_SIZE + 0.5);
      context.lineTo(canvas.width, y * CELL_SIZE + 0.5);
      context.stroke();
    }

    context.fillStyle = palette.food;
    context.fillRect(
      food.x * CELL_SIZE + 3,
      food.y * CELL_SIZE + 3,
      CELL_SIZE - 6,
      CELL_SIZE - 6
    );

    context.fillStyle = palette.snake;
    snake.forEach((segment, index) => {
      // The head is drawn full-size and the body inset, so the direction of
      // travel is readable at a glance.
      const inset = index === 0 ? 1 : 2;
      context.fillRect(
        segment.x * CELL_SIZE + inset,
        segment.y * CELL_SIZE + inset,
        CELL_SIZE - inset * 2,
        CELL_SIZE - inset * 2
      );
    });

    if (isGameOver) {
      context.fillStyle = "rgba(0, 0, 0, 0.55)";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function stopTicking() {
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
  }

  function endGame() {
    stopTicking();
    isRunning = false;
    isGameOver = true;
    audioManager.playSfx("clickSwitch");
    renderStatus();
    draw();
  }

  function tick() {
    direction = queuedDirection;

    const head = snake[0];
    const nextHead = { x: head.x + direction.x, y: head.y + direction.y };

    const hitWall = nextHead.x < 0
      || nextHead.y < 0
      || nextHead.x >= COLUMNS
      || nextHead.y >= ROWS;

    // The tail cell is excluded: it moves out of the way this same tick, so
    // running into where it *was* is not a collision.
    const hitSelf = snake
      .slice(0, snake.length - 1)
      .some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

    if (hitWall || hitSelf) {
      endGame();
      return;
    }

    snake.unshift(nextHead);

    if (nextHead.x === food.x && nextHead.y === food.y) {
      score += 1;
      audioManager.playSfx("clickButton");
      placeFood();
      renderStatus();
    } else {
      snake.pop();
    }

    draw();
  }

  function resetGame() {
    const startY = Math.floor(ROWS / 2);
    snake = [
      { x: 4, y: startY },
      { x: 3, y: startY },
      { x: 2, y: startY },
    ];
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    isGameOver = false;
    isRunning = false;
    placeFood();
    renderStatus();
    draw();
  }

  function startGame() {
    resetGame();
    isRunning = true;
    renderStatus();
    stopTicking();
    tickIntervalId = window.setInterval(tick, TICK_MS);
  }

  const DIRECTION_BY_KEY = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
  };

  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      audioManager.onUserGesture();
      if (!isRunning) {
        startGame();
      }
      return;
    }

    const nextDirection = DIRECTION_BY_KEY[event.key] || DIRECTION_BY_KEY[event.key?.toLowerCase?.()];
    if (!nextDirection) {
      return;
    }

    // Swallowed even when the game is not running, so the arrow keys never
    // scroll the window behind the board.
    event.preventDefault();

    if (!isRunning) {
      return;
    }

    // A reversal onto the neck would be an instant self-collision, so it is
    // ignored rather than allowed to kill the player for a mis-key.
    if (nextDirection.x === -direction.x && nextDirection.y === -direction.y) {
      return;
    }

    queuedDirection = nextDirection;
  });

  // Clicking the board hands it the keyboard back after the player has been
  // somewhere else in the OS.
  container.addEventListener("pointerdown", () => {
    container.focus();
  });

  resetGame();

  return {
    container,
    canvas,
    focus: () => container.focus(),
    // Called by the window's onClose: an interval outliving its window would
    // keep ticking against a detached canvas forever.
    destroy: stopTicking,
    relocalize: () => {
      container.setAttribute("aria-label", localize("snakeBoardAriaLabel", getLanguage()));
      renderStatus();
    },
  };
}

// The games below share Snake's shape: a factory returning { container,
// relocalize } plus whatever the window needs to drive them (focus, destroy).
// Each reads the CaveOS theme tokens at paint time rather than caching them, so
// a theme change mid-game repaints the board along with the rest of the OS.
function readCaveOsPaletteTokens(tokensByName) {
  const computerWindowElement = document.querySelector(".computer-window");
  const computedStyle = computerWindowElement
    ? getComputedStyle(computerWindowElement)
    : null;

  const palette = {};
  Object.entries(tokensByName).forEach(([name, [token, fallback]]) => {
    const value = computedStyle?.getPropertyValue(token).trim();
    palette[name] = value || fallback;
  });

  return palette;
}

function createComputerMinesweeperWindowContentElements() {
  // The 1996 "Beginner" board, unchanged: nine by nine with ten mines.
  const COLUMNS = 9;
  const ROWS = 9;
  const MINE_COUNT = 10;
  const CELL_COUNT = COLUMNS * ROWS;

  const languageCode = getLanguage();

  const container = document.createElement("div");
  container.classList.add("caveos-minesweeper-app");

  const statusBar = document.createElement("div");
  statusBar.classList.add("caveos-minesweeper-status");

  const minesText = document.createElement("span");
  minesText.classList.add("caveos-minesweeper-mines");

  const stateText = document.createElement("span");
  stateText.classList.add("caveos-minesweeper-state");

  // Right-clicking is the era-correct way to plant a flag, but it is not
  // available to every pointer or to the keyboard, so the same action is also a
  // mode this button toggles.
  const flagModeButton = document.createElement("button");
  flagModeButton.type = "button";
  flagModeButton.classList.add("caveos-minesweeper-flag-toggle");
  flagModeButton.setAttribute("aria-pressed", "false");

  const newGameButton = document.createElement("button");
  newGameButton.type = "button";
  newGameButton.classList.add("caveos-minesweeper-new-game");

  statusBar.append(minesText, stateText, flagModeButton, newGameButton);

  const board = document.createElement("div");
  board.classList.add("caveos-minesweeper-board");
  board.setAttribute("role", "grid");
  board.setAttribute("aria-label", localize("minesweeperBoardAriaLabel", languageCode));
  board.style.setProperty("--minesweeper-columns", String(COLUMNS));

  container.append(statusBar, board);

  let cells = [];
  let isFlagMode = false;
  let minesArePlaced = false;
  let isGameOver = false;
  let hasWon = false;

  const indexOf = (column, row) => row * COLUMNS + column;

  const forEachNeighbour = (index, visit) => {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset === 0 && columnOffset === 0) {
          continue;
        }

        const neighbourColumn = column + columnOffset;
        const neighbourRow = row + rowOffset;
        if (
          neighbourColumn < 0
          || neighbourRow < 0
          || neighbourColumn >= COLUMNS
          || neighbourRow >= ROWS
        ) {
          continue;
        }

        visit(indexOf(neighbourColumn, neighbourRow));
      }
    }
  };

  // Mines are laid *after* the first click, with that cell and its neighbours
  // excluded. That is what makes the opening move always safe and usually open
  // a whole region, the way the original did.
  function placeMines(safeIndex) {
    const forbidden = new Set([safeIndex]);
    forEachNeighbour(safeIndex, (neighbourIndex) => forbidden.add(neighbourIndex));

    const candidates = [];
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (!forbidden.has(index)) {
        candidates.push(index);
      }
    }

    for (let laid = 0; laid < MINE_COUNT && candidates.length; laid += 1) {
      const pick = Math.floor(Math.random() * candidates.length);
      cells[candidates[pick]].hasMine = true;
      candidates.splice(pick, 1);
    }

    cells.forEach((cell, index) => {
      let count = 0;
      forEachNeighbour(index, (neighbourIndex) => {
        if (cells[neighbourIndex].hasMine) {
          count += 1;
        }
      });
      cell.neighbourMines = count;
    });

    minesArePlaced = true;
  }

  function flagCount() {
    return cells.filter((cell) => cell.isFlagged).length;
  }

  function renderCell(cell) {
    const { button } = cell;
    button.classList.toggle("is-revealed", cell.isRevealed);
    button.classList.toggle("is-flagged", cell.isFlagged && !cell.isRevealed);
    button.classList.toggle("is-mine", cell.isRevealed && cell.hasMine);

    if (cell.isRevealed) {
      if (cell.hasMine) {
        button.textContent = "*";
        button.removeAttribute("data-count");
        return;
      }

      button.textContent = cell.neighbourMines ? String(cell.neighbourMines) : "";
      button.setAttribute("data-count", String(cell.neighbourMines));
      return;
    }

    button.removeAttribute("data-count");
    button.textContent = cell.isFlagged ? "⚑" : "";
  }

  function renderStatus() {
    const currentLanguage = getLanguage();

    minesText.textContent = `${localize("minesweeperMinesLabel", currentLanguage)}: ${Math.max(MINE_COUNT - flagCount(), 0)}`;
    flagModeButton.textContent = localize("minesweeperFlagModeButton", currentLanguage);
    newGameButton.textContent = localize("minesweeperNewGameButton", currentLanguage);
    newGameButton.setAttribute("aria-label", localize("minesweeperNewGameButton", currentLanguage));

    if (hasWon) {
      stateText.textContent = localize("minesweeperWonText", currentLanguage);
      return;
    }

    if (isGameOver) {
      stateText.textContent = localize("minesweeperLostText", currentLanguage);
      return;
    }

    stateText.textContent = minesArePlaced ? "" : localize("minesweeperStartHint", currentLanguage);
  }

  function revealAllMines() {
    cells.forEach((cell) => {
      if (cell.hasMine) {
        cell.isRevealed = true;
        cell.isFlagged = false;
        renderCell(cell);
      }
    });
  }

  function checkForWin() {
    const revealedSafeCells = cells.filter((cell) => cell.isRevealed && !cell.hasMine).length;
    if (revealedSafeCells !== CELL_COUNT - MINE_COUNT) {
      return;
    }

    hasWon = true;
    isGameOver = true;
    audioManager.playSfx("clickButton");

    // Every remaining hidden cell is a mine, so flag them for the player rather
    // than leaving the board looking unfinished.
    cells.forEach((cell) => {
      if (!cell.isRevealed) {
        cell.isFlagged = true;
        renderCell(cell);
      }
    });
  }

  // Iterative rather than recursive: an empty region on a full board can be
  // most of it, and a stack is cheaper than ninety frames.
  function revealFrom(startIndex) {
    const pending = [startIndex];

    while (pending.length) {
      const index = pending.pop();
      const cell = cells[index];
      if (cell.isRevealed || cell.isFlagged) {
        continue;
      }

      cell.isRevealed = true;
      renderCell(cell);

      if (cell.neighbourMines === 0 && !cell.hasMine) {
        forEachNeighbour(index, (neighbourIndex) => {
          if (!cells[neighbourIndex].isRevealed) {
            pending.push(neighbourIndex);
          }
        });
      }
    }
  }

  function toggleFlag(index) {
    const cell = cells[index];
    if (isGameOver || cell.isRevealed) {
      return;
    }

    cell.isFlagged = !cell.isFlagged;
    audioManager.playSfx("clickSwitch");
    renderCell(cell);
    renderStatus();
  }

  function revealCell(index) {
    const cell = cells[index];
    if (isGameOver || cell.isRevealed || cell.isFlagged) {
      return;
    }

    if (!minesArePlaced) {
      placeMines(index);
    }

    if (cell.hasMine) {
      cell.isRevealed = true;
      isGameOver = true;
      audioManager.playSfx("clickSwitch");
      revealAllMines();
      renderStatus();
      return;
    }

    audioManager.playSfx("clickButton");
    revealFrom(index);
    checkForWin();
    renderStatus();
  }

  function buildBoard() {
    board.replaceChildren();
    cells = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("caveos-minesweeper-cell");
      button.dataset.index = String(index);
      button.setAttribute(
        "aria-label",
        `${localize("minesweeperCellAriaLabel", getLanguage())} ${Math.floor(index / COLUMNS) + 1}, ${(index % COLUMNS) + 1}`
      );

      const cell = {
        button,
        hasMine: false,
        neighbourMines: 0,
        isRevealed: false,
        isFlagged: false,
      };

      button.addEventListener("click", () => {
        audioManager.onUserGesture();
        if (isFlagMode) {
          toggleFlag(index);
          return;
        }
        revealCell(index);
      });

      button.addEventListener("contextmenu", (event) => {
        // The browser menu would cover the board, and a right click here means
        // "flag" — the same as it did in 1996.
        event.preventDefault();
        audioManager.onUserGesture();
        toggleFlag(index);
      });

      cells.push(cell);
      board.appendChild(button);
      renderCell(cell);
    }
  }

  function resetGame() {
    minesArePlaced = false;
    isGameOver = false;
    hasWon = false;
    buildBoard();
    renderStatus();
  }

  flagModeButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickSwitch");
    isFlagMode = !isFlagMode;
    flagModeButton.setAttribute("aria-pressed", String(isFlagMode));
    flagModeButton.classList.toggle("is-active", isFlagMode);
  });

  newGameButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    resetGame();
  });

  resetGame();

  return {
    container,
    board,
    relocalize: () => {
      const currentLanguage = getLanguage();
      board.setAttribute("aria-label", localize("minesweeperBoardAriaLabel", currentLanguage));
      cells.forEach((cell, index) => {
        cell.button.setAttribute(
          "aria-label",
          `${localize("minesweeperCellAriaLabel", currentLanguage)} ${Math.floor(index / COLUMNS) + 1}, ${(index % COLUMNS) + 1}`
        );
      });
      renderStatus();
    },
  };
}

function createComputerSudokuWindowContentElements() {
  const SIZE = 9;
  const CELL_COUNT = SIZE * SIZE;

  // One known-good puzzle. Every game the player sees is this grid run through
  // a random sequence of validity-preserving transformations — digit
  // relabelling, row and column shuffles within their bands, band and stack
  // shuffles, an optional transpose. Each of those is a bijection on sudoku
  // grids, so the result is an isomorphic puzzle: still solvable, and still
  // uniquely so. That is far safer than hand-writing more grids and hoping they
  // are sound.
  const BASE_PUZZLE = [
    "53..7....",
    "6..195...",
    ".98....6.",
    "8...6...3",
    "4..8.3..1",
    "7...2...6",
    ".6....28.",
    "...419..5",
    "....8..79",
  ].join("");

  const shuffled = (values) => {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const pick = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[pick]] = [copy[pick], copy[index]];
    }
    return copy;
  };

  // A full row order: the three bands in a random order, and the three rows
  // inside each band shuffled among themselves. Applied to columns too.
  const buildLineOrder = () => shuffled([0, 1, 2])
    .flatMap((band) => shuffled([0, 1, 2]).map((line) => band * 3 + line));

  function generatePuzzle() {
    const digitMap = new Map();
    shuffled(["1", "2", "3", "4", "5", "6", "7", "8", "9"])
      .forEach((digit, index) => digitMap.set(String(index + 1), digit));

    const rowOrder = buildLineOrder();
    const columnOrder = buildLineOrder();
    const shouldTranspose = Math.random() < 0.5;

    const transform = (grid) => {
      const result = new Array(CELL_COUNT);
      for (let row = 0; row < SIZE; row += 1) {
        for (let column = 0; column < SIZE; column += 1) {
          const source = grid[rowOrder[row] * SIZE + columnOrder[column]];
          const value = source === "." ? "." : digitMap.get(source);
          const target = shouldTranspose ? column * SIZE + row : row * SIZE + column;
          result[target] = value;
        }
      }
      return result;
    };

    return transform(BASE_PUZZLE);
  }

  const languageCode = getLanguage();

  const container = document.createElement("div");
  container.classList.add("caveos-sudoku-app");

  const statusBar = document.createElement("div");
  statusBar.classList.add("caveos-sudoku-status");

  const stateText = document.createElement("span");
  stateText.classList.add("caveos-sudoku-state");

  const newGameButton = document.createElement("button");
  newGameButton.type = "button";
  newGameButton.classList.add("caveos-sudoku-new-game");

  statusBar.append(stateText, newGameButton);

  const board = document.createElement("div");
  board.classList.add("caveos-sudoku-board");
  board.setAttribute("role", "grid");
  board.setAttribute("aria-label", localize("sudokuBoardAriaLabel", languageCode));

  // A keypad as well as the keyboard: the window is played with a mouse as
  // often as not, and a 1996 puzzle app would have offered both.
  const keypad = document.createElement("div");
  keypad.classList.add("caveos-sudoku-keypad");

  container.append(statusBar, board, keypad);

  let puzzle = [];
  let entries = [];
  let cellButtons = [];
  let selectedIndex = 0;
  let isSolved = false;

  const isGiven = (index) => puzzle[index] !== ".";
  const valueAt = (index) => (isGiven(index) ? puzzle[index] : entries[index]);

  // A value conflicts when the same digit already sits in its row, its column
  // or its box. Givens are checked too, so a wrong entry lights up next to the
  // clue it contradicts rather than on its own.
  function conflictingIndices() {
    const conflicts = new Set();

    const scanGroup = (indices) => {
      const seenByValue = new Map();
      indices.forEach((index) => {
        const value = valueAt(index);
        if (!value || value === ".") {
          return;
        }

        if (!seenByValue.has(value)) {
          seenByValue.set(value, []);
        }
        seenByValue.get(value).push(index);
      });

      seenByValue.forEach((group) => {
        if (group.length > 1) {
          group.forEach((index) => conflicts.add(index));
        }
      });
    };

    for (let line = 0; line < SIZE; line += 1) {
      const rowIndices = [];
      const columnIndices = [];
      const boxIndices = [];
      const boxRow = Math.floor(line / 3) * 3;
      const boxColumn = (line % 3) * 3;

      for (let step = 0; step < SIZE; step += 1) {
        rowIndices.push(line * SIZE + step);
        columnIndices.push(step * SIZE + line);
        boxIndices.push((boxRow + Math.floor(step / 3)) * SIZE + boxColumn + (step % 3));
      }

      scanGroup(rowIndices);
      scanGroup(columnIndices);
      scanGroup(boxIndices);
    }

    return conflicts;
  }

  function renderStatus() {
    const currentLanguage = getLanguage();
    newGameButton.textContent = localize("sudokuNewGameButton", currentLanguage);
    stateText.textContent = isSolved
      ? localize("sudokuSolvedText", currentLanguage)
      : localize("sudokuHint", currentLanguage);
  }

  function renderBoard() {
    const conflicts = conflictingIndices();

    cellButtons.forEach((button, index) => {
      const value = valueAt(index);
      button.textContent = value === "." ? "" : value;
      button.classList.toggle("is-given", isGiven(index));
      button.classList.toggle("is-selected", index === selectedIndex);
      button.classList.toggle("is-conflict", conflicts.has(index));
    });

    container.classList.toggle("is-solved", isSolved);
  }

  function checkForSolved() {
    const complete = entries.every((entry, index) => isGiven(index) || entry);
    isSolved = complete && conflictingIndices().size === 0;

    if (isSolved) {
      audioManager.playSfx("clickButton");
    }
  }

  function setSelected(index) {
    selectedIndex = index;
    renderBoard();
  }

  function enterValue(value) {
    if (isSolved || isGiven(selectedIndex)) {
      return;
    }

    entries[selectedIndex] = value;
    audioManager.playSfx(value ? "clickButton" : "clickSwitch");
    checkForSolved();
    renderBoard();
    renderStatus();
  }

  function buildBoard() {
    board.replaceChildren();
    cellButtons = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("caveos-sudoku-cell");
      button.dataset.index = String(index);

      const row = Math.floor(index / SIZE);
      const column = index % SIZE;
      // The heavy 3x3 rules are borders on the cells that start a box, so the
      // grid needs no extra elements to draw them.
      if (column % 3 === 0 && column !== 0) {
        button.classList.add("has-box-left");
      }
      if (row % 3 === 0 && row !== 0) {
        button.classList.add("has-box-top");
      }

      button.setAttribute(
        "aria-label",
        `${localize("sudokuCellAriaLabel", getLanguage())} ${row + 1}, ${column + 1}`
      );

      button.addEventListener("click", () => {
        audioManager.onUserGesture();
        audioManager.playSfx("clickSwitch");
        setSelected(index);
      });

      cellButtons.push(button);
      board.appendChild(button);
    }
  }

  function buildKeypad() {
    keypad.replaceChildren();

    for (let digit = 1; digit <= SIZE; digit += 1) {
      const key = document.createElement("button");
      key.type = "button";
      key.classList.add("caveos-sudoku-key");
      key.textContent = String(digit);
      key.setAttribute("aria-label", String(digit));
      key.addEventListener("click", () => {
        audioManager.onUserGesture();
        enterValue(String(digit));
      });
      keypad.appendChild(key);
    }

    const clearKey = document.createElement("button");
    clearKey.type = "button";
    clearKey.classList.add("caveos-sudoku-key", "caveos-sudoku-clear");
    clearKey.addEventListener("click", () => {
      audioManager.onUserGesture();
      enterValue("");
    });
    keypad.appendChild(clearKey);
    return clearKey;
  }

  function resetGame() {
    puzzle = generatePuzzle();
    entries = new Array(CELL_COUNT).fill("");
    isSolved = false;
    // Start on the first cell the player may actually type into.
    selectedIndex = puzzle.findIndex((value) => value === ".");
    if (selectedIndex < 0) {
      selectedIndex = 0;
    }
    renderBoard();
    renderStatus();
  }

  buildBoard();
  const clearKey = buildKeypad();

  container.addEventListener("keydown", (event) => {
    if (event.key >= "1" && event.key <= "9") {
      event.preventDefault();
      audioManager.onUserGesture();
      enterValue(event.key);
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      audioManager.onUserGesture();
      enterValue("");
      return;
    }

    const MOVE_BY_KEY = {
      ArrowUp: -SIZE,
      ArrowDown: SIZE,
      ArrowLeft: -1,
      ArrowRight: 1,
    };
    const move = MOVE_BY_KEY[event.key];
    if (move === undefined) {
      return;
    }

    // Swallowed so the arrows move the selection rather than scrolling the
    // board out from under it.
    event.preventDefault();
    const next = selectedIndex + move;
    if (next < 0 || next >= CELL_COUNT) {
      return;
    }
    // Left and right must not step across a row edge.
    if (Math.abs(move) === 1 && Math.floor(next / SIZE) !== Math.floor(selectedIndex / SIZE)) {
      return;
    }
    setSelected(next);
    // The selection is the app's own idea of "where I am", but DOM focus has to
    // follow it or the ring stays behind on the cell the player left.
    cellButtons[next]?.focus();
  });

  newGameButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    resetGame();
  });

  const relocalize = () => {
    const currentLanguage = getLanguage();
    board.setAttribute("aria-label", localize("sudokuBoardAriaLabel", currentLanguage));
    clearKey.textContent = localize("sudokuClearKey", currentLanguage);
    clearKey.setAttribute("aria-label", localize("sudokuClearKey", currentLanguage));
    cellButtons.forEach((button, index) => {
      button.setAttribute(
        "aria-label",
        `${localize("sudokuCellAriaLabel", currentLanguage)} ${Math.floor(index / SIZE) + 1}, ${(index % SIZE) + 1}`
      );
    });
    renderStatus();
  };

  resetGame();
  relocalize();

  return {
    container,
    board,
    // Focus the selected cell, not the container: the keydown handler is
    // delegated, so a focused cell is what makes the keyboard work at all.
    focus: () => cellButtons[selectedIndex]?.focus(),
    relocalize,
  };
}

function createComputerTetrisWindowContentElements() {
  const COLUMNS = 10;
  const ROWS = 20;
  const CELL_SIZE = 22;
  // Just under two drops a second: enough time to place a piece at the far side
  // of the well without the game feeling becalmed.
  const DROP_MS = 560;
  const SCORE_BY_LINES = [0, 100, 300, 500, 800];

  // Every piece in its spawn rotation, on a square grid so a rotation is a
  // plain matrix turn with no per-piece special cases.
  const PIECES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  ];

  const languageCode = getLanguage();

  const container = document.createElement("div");
  container.classList.add("caveos-tetris-app");
  container.tabIndex = 0;
  container.setAttribute("role", "application");
  container.setAttribute("aria-label", localize("tetrisBoardAriaLabel", languageCode));

  const statusBar = document.createElement("div");
  statusBar.classList.add("caveos-tetris-status");

  const scoreText = document.createElement("span");
  scoreText.classList.add("caveos-tetris-score");

  const linesText = document.createElement("span");
  linesText.classList.add("caveos-tetris-lines");

  const hintText = document.createElement("span");
  hintText.classList.add("caveos-tetris-hint");

  statusBar.append(scoreText, linesText, hintText);

  const boardWrap = document.createElement("div");
  boardWrap.classList.add("caveos-tetris-board-wrap");

  const canvas = document.createElement("canvas");
  canvas.classList.add("caveos-tetris-board");
  canvas.width = COLUMNS * CELL_SIZE;
  canvas.height = ROWS * CELL_SIZE;
  boardWrap.appendChild(canvas);

  container.append(statusBar, boardWrap);

  const context = canvas.getContext("2d");

  let well = [];
  let piece = null;
  let score = 0;
  let clearedLines = 0;
  let isRunning = false;
  let isGameOver = false;
  let dropIntervalId = null;

  const readPalette = () => readCaveOsPaletteTokens({
    well: ["--caveos-paint-canvas", "#041204"],
    settled: ["--caveos-fg", "#70ff5c"],
    active: ["--caveos-accent", "#7cff64"],
    grid: ["--caveos-border", "rgba(97, 255, 88, 0.5)"],
  });

  const rotated = (shape) => shape[0]
    .map((_, column) => shape.map((row) => row[column]).reverse());

  function collides(shape, originColumn, originRow) {
    for (let row = 0; row < shape.length; row += 1) {
      for (let column = 0; column < shape[row].length; column += 1) {
        if (!shape[row][column]) {
          continue;
        }

        const wellColumn = originColumn + column;
        const wellRow = originRow + row;

        if (wellColumn < 0 || wellColumn >= COLUMNS || wellRow >= ROWS) {
          return true;
        }
        // Above the ceiling is legal while a piece is still entering the well.
        if (wellRow >= 0 && well[wellRow][wellColumn]) {
          return true;
        }
      }
    }

    return false;
  }

  function spawnPiece() {
    const shape = PIECES[Math.floor(Math.random() * PIECES.length)];
    const column = Math.floor((COLUMNS - shape[0].length) / 2);

    // No room for the new piece at the top means the well is full.
    if (collides(shape, column, 0)) {
      piece = null;
      endGame();
      return;
    }

    piece = { shape, column, row: 0 };
  }

  function settlePiece() {
    piece.shape.forEach((row, rowOffset) => {
      row.forEach((filled, columnOffset) => {
        if (!filled) {
          return;
        }
        const wellRow = piece.row + rowOffset;
        const wellColumn = piece.column + columnOffset;
        if (wellRow >= 0) {
          well[wellRow][wellColumn] = 1;
        }
      });
    });

    const survivingRows = well.filter((row) => row.some((cell) => !cell));
    const linesJustCleared = ROWS - survivingRows.length;

    if (linesJustCleared) {
      const replacements = Array.from(
        { length: linesJustCleared },
        () => new Array(COLUMNS).fill(0)
      );
      well = [...replacements, ...survivingRows];
      clearedLines += linesJustCleared;
      score += SCORE_BY_LINES[linesJustCleared] ?? 0;
      audioManager.playSfx("clickButton");
    }

    spawnPiece();
    renderStatus();
  }

  function renderStatus() {
    const currentLanguage = getLanguage();
    scoreText.textContent = `${localize("tetrisScoreLabel", currentLanguage)}: ${score}`;
    linesText.textContent = `${localize("tetrisLinesLabel", currentLanguage)}: ${clearedLines}`;

    if (isGameOver) {
      hintText.textContent = `${localize("tetrisGameOverText", currentLanguage)} — ${localize("tetrisRestartHint", currentLanguage)}`;
      return;
    }

    hintText.textContent = isRunning ? "" : localize("tetrisStartHint", currentLanguage);
  }

  function draw() {
    if (!context) {
      return;
    }

    const palette = readPalette();

    context.fillStyle = palette.well;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = palette.grid;
    context.lineWidth = 1;
    for (let column = 1; column < COLUMNS; column += 1) {
      context.beginPath();
      context.moveTo(column * CELL_SIZE + 0.5, 0);
      context.lineTo(column * CELL_SIZE + 0.5, canvas.height);
      context.stroke();
    }
    for (let row = 1; row < ROWS; row += 1) {
      context.beginPath();
      context.moveTo(0, row * CELL_SIZE + 0.5);
      context.lineTo(canvas.width, row * CELL_SIZE + 0.5);
      context.stroke();
    }

    const paintBlock = (column, row, fillStyle) => {
      if (row < 0) {
        return;
      }
      context.fillStyle = fillStyle;
      context.fillRect(
        column * CELL_SIZE + 2,
        row * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
    };

    well.forEach((row, rowIndex) => {
      row.forEach((filled, columnIndex) => {
        if (filled) {
          paintBlock(columnIndex, rowIndex, palette.settled);
        }
      });
    });

    // The falling piece is drawn in the accent so it reads apart from the pile
    // it is about to join.
    if (piece) {
      piece.shape.forEach((row, rowOffset) => {
        row.forEach((filled, columnOffset) => {
          if (filled) {
            paintBlock(piece.column + columnOffset, piece.row + rowOffset, palette.active);
          }
        });
      });
    }

    if (isGameOver) {
      context.fillStyle = "rgba(0, 0, 0, 0.55)";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function stopDropping() {
    if (dropIntervalId) {
      clearInterval(dropIntervalId);
      dropIntervalId = null;
    }
  }

  function endGame() {
    stopDropping();
    isRunning = false;
    isGameOver = true;
    audioManager.playSfx("clickSwitch");
    renderStatus();
    draw();
  }

  function stepDown() {
    if (!piece || isGameOver) {
      return;
    }

    if (collides(piece.shape, piece.column, piece.row + 1)) {
      settlePiece();
    } else {
      piece.row += 1;
    }

    draw();
  }

  function moveSideways(offset) {
    if (!piece || collides(piece.shape, piece.column + offset, piece.row)) {
      return;
    }
    piece.column += offset;
    draw();
  }

  function rotatePiece() {
    if (!piece) {
      return;
    }

    const next = rotated(piece.shape);
    // A rotation against a wall is nudged back in rather than refused, which is
    // what makes turning a bar in the last column possible at all.
    const KICKS = [0, -1, 1, -2, 2];
    const kick = KICKS.find((offset) => !collides(next, piece.column + offset, piece.row));
    if (kick === undefined) {
      return;
    }

    piece.shape = next;
    piece.column += kick;
    draw();
  }

  function hardDrop() {
    if (!piece) {
      return;
    }

    while (!collides(piece.shape, piece.column, piece.row + 1)) {
      piece.row += 1;
    }
    settlePiece();
    draw();
  }

  function resetGame() {
    well = Array.from({ length: ROWS }, () => new Array(COLUMNS).fill(0));
    piece = null;
    score = 0;
    clearedLines = 0;
    isRunning = false;
    isGameOver = false;
    renderStatus();
    draw();
  }

  function startGame() {
    resetGame();
    isRunning = true;
    spawnPiece();
    renderStatus();
    stopDropping();
    dropIntervalId = window.setInterval(stepDown, DROP_MS);
    draw();
  }

  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      audioManager.onUserGesture();
      if (!isRunning) {
        startGame();
      }
      return;
    }

    const HANDLED_KEYS = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "];
    if (!HANDLED_KEYS.includes(event.key)) {
      return;
    }

    // Swallowed even when the game is not running, so the arrows and the space
    // bar never scroll the window behind the well.
    event.preventDefault();

    if (!isRunning) {
      return;
    }

    if (event.key === "ArrowLeft") {
      moveSideways(-1);
    } else if (event.key === "ArrowRight") {
      moveSideways(1);
    } else if (event.key === "ArrowDown") {
      stepDown();
    } else if (event.key === "ArrowUp") {
      rotatePiece();
    } else {
      hardDrop();
    }
  });

  container.addEventListener("pointerdown", () => {
    container.focus();
  });

  resetGame();

  return {
    container,
    canvas,
    focus: () => container.focus(),
    // Called by the window's onClose: a drop interval outliving its window
    // would keep running against a detached canvas.
    destroy: stopDropping,
    relocalize: () => {
      container.setAttribute("aria-label", localize("tetrisBoardAriaLabel", getLanguage()));
      renderStatus();
    },
  };
}

function createComputerNetscapeWindowContentElements() {
  const HISTORY_LIMIT = 5;
  const WELCOME_URL = "about:welcome";

  const normalizeBrowserUrl = (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      return "";
    }

    const lowered = trimmed.toLowerCase();
    if (lowered.startsWith("http://") || lowered.startsWith("https://")) {
      return lowered.replace(/\/+$/, "");
    }

    return lowered;
  };

  const createMissingPage = (attemptedUrl) => {
    const page = document.createElement("div");
    page.classList.add("caveos-browser-page", "browser-page-welcome", "browser-page-missing");
    const languageCode = getLanguage();
    page.innerHTML = `
      <h1 class="browser-welcome-title">${localize("browserPageNotFoundTitle", languageCode)}</h1>
      <p class="browser-welcome-copy">${localize("browserNoPageExistsAt", languageCode)}</p>
      <p class="browser-cosmic-copy browser-cosmic-plain-url">${attemptedUrl}</p>
      <p class="browser-welcome-copy">${localize("browserTryFavoritesHint", languageCode)}</p>
    `;
    return page;
  };

  const createStandaloneTextPage = (pageRecord) => {
    const page = document.createElement("div");
    page.classList.add("caveos-browser-page", "browser-page-standalone");

    const shell = document.createElement("div");
    shell.classList.add("browser-page-shell", "browser-page-shell-gray", "browser-page-shell-standalone");

    shell.innerHTML = `
      <h1 class="browser-page-title">${pageRecord.title || pageRecord.id || localize("browserRecoveredPageFallback", getLanguage())}</h1>
    `;

    const styleSettings = pageRecord?.style && typeof pageRecord.style === "object"
      ? pageRecord.style
      : null;
    if (styleSettings?.backgroundColor) {
      shell.style.background = String(styleSettings.backgroundColor);
    }
    if (styleSettings?.textColor) {
      shell.style.color = String(styleSettings.textColor);
    }
    if (styleSettings?.fontFamily) {
      shell.style.fontFamily = String(styleSettings.fontFamily);
    }

    const gallery = createImageGallery(pageRecord.images, ["browser-image-gallery-zoom"]);
    if (gallery) {
      shell.appendChild(gallery);
    }

    const contentLines = normalizeLines(pageRecord.content);
    if (!contentLines.length) {
      const empty = document.createElement("p");
      empty.classList.add("browser-welcome-copy");
      empty.textContent = localize("browserNoBodyContent", getLanguage());
      shell.appendChild(empty);
    } else {
      const content = document.createElement("section");
      content.classList.add("browser-standalone-content");
      content.appendChild(createContentDivider());

      contentLines.forEach((line) => {
        const paragraph = document.createElement("p");
        paragraph.classList.add("browser-standalone-paragraph");
        appendDelimitedLinkText(paragraph, line);
        content.appendChild(paragraph);
      });

      shell.appendChild(content);
    }

    page.appendChild(shell);
    return page;
  };

  const createWelcomePage = () => {
    const page = document.createElement("div");
    page.classList.add("caveos-browser-page", "browser-page-welcome");
    page.innerHTML = `
      <div class="browser-welcome-logo" aria-hidden="true">
        <div class="browser-netscape-logo-mark">
          <span class="browser-netscape-logo-ring"></span>
          <span class="browser-netscape-logo-orbit"></span>
          <span class="browser-netscape-logo-glyph">N</span>
        </div>
      </div>
      <h1 class="browser-welcome-title">Netscape Navigator</h1>
      <p class="browser-welcome-copy">Browse archived destinations from your CaveOS terminal.</p>
    `;
    return page;
  };

  const createCosmicForgePage = () => {
    const page = document.createElement("div");
    page.classList.add("caveos-browser-page", "browser-page-cosmic");
    page.innerHTML = `
      <div class="browser-cosmic-shell">
        <h1 class="browser-cosmic-title">COSMIC FORGE</h1>
        <p class="browser-cosmic-copy browser-cosmic-welcome">Welcome Pioneer! Please enter your code name!</p>
        <p class="browser-cosmic-copy browser-cosmic-plain-url">https://leighhobson89.github.io/cosmicForge/</p>
        <div class="browser-cosmic-links">
          <a href="https://leighhobson89.github.io/cosmicForge/" target="_blank" rel="noreferrer">Website</a>
          <a href="https://leighhobson89.itch.io/cosmic-forge" target="_blank" rel="noreferrer">Itch.io</a>
          <a href="https://discord.com/invite/6bUN6BNtny" target="_blank" rel="noreferrer">Discord</a>
        </div>
      </div>
    `;
    return page;
  };

  const createQuickLinkButton = ({ iconClass, label, onClick }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("caveos-browser-quick-link");

    const icon = document.createElement("span");
    icon.classList.add("caveos-browser-quick-link-icon", iconClass);
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.classList.add("caveos-browser-quick-link-label");
    text.textContent = label;

    button.append(icon, text);
    button.addEventListener("click", onClick);
    return button;
  };

  const container = document.createElement("div");
  container.classList.add("caveos-browser-app");

  const quickLinksBar = document.createElement("div");
  quickLinksBar.classList.add("caveos-browser-toolbar");

  const addressRow = document.createElement("div");
  addressRow.classList.add("caveos-browser-address-row");

  const browserLanguageCode = getLanguage();

  const label = document.createElement("span");
  label.textContent = localize("browserUrlLabel", browserLanguageCode);

  const browserAddress = document.createElement("input");
  browserAddress.classList.add("caveos-browser-address");
  browserAddress.type = "text";
  browserAddress.value = "about:welcome";
  browserAddress.setAttribute("aria-label", localize("browserAddressAriaLabel", browserLanguageCode));

  const addressInputShell = document.createElement("div");
  addressInputShell.classList.add("caveos-browser-address-shell");

  const addressSubmitButton = document.createElement("button");
  addressSubmitButton.type = "button";
  addressSubmitButton.classList.add("caveos-browser-address-submit");
  addressSubmitButton.setAttribute("aria-label", localize("browserGoAriaLabel", browserLanguageCode));
  addressSubmitButton.title = localize("browserGoTitle", browserLanguageCode);

  const addressHistoryPanel = document.createElement("div");
  addressHistoryPanel.classList.add("caveos-browser-address-history");
  addressHistoryPanel.setAttribute("role", "listbox");
  addressHistoryPanel.hidden = true;

  addressInputShell.append(browserAddress, addressSubmitButton, addressHistoryPanel);

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.classList.add("caveos-browser-nav-button");
  backButton.textContent = "←";
  backButton.setAttribute("aria-label", localize("browserBackAriaLabel", browserLanguageCode));

  const forwardButton = document.createElement("button");
  forwardButton.type = "button";
  forwardButton.classList.add("caveos-browser-nav-button");
  forwardButton.textContent = "→";
  forwardButton.setAttribute("aria-label", localize("browserForwardAriaLabel", browserLanguageCode));

  const homeButton = document.createElement("button");
  homeButton.type = "button";
  homeButton.classList.add("caveos-browser-nav-button");
  homeButton.textContent = "⌂";
  homeButton.setAttribute("aria-label", localize("browserHomeAriaLabel", browserLanguageCode));

  addressRow.append(label, addressInputShell, backButton, forwardButton, homeButton);

  const pageHost = document.createElement("div");
  pageHost.classList.add("caveos-browser-body", "caveos-browser-page-host");
  pageHost.addEventListener("caveos-browser-navigate", (event) => {
    const targetUrl = String(event?.detail?.url ?? "").trim();
    if (!targetUrl) {
      return;
    }

    browserAddress.value = targetUrl;
    void navigateToAddress({ pushHistory: true });
  });

  // Every destination the in-game browser can reach. `siteId` marks the views
  // that are backed by a registered web-content site, which are the ones that
  // can be re-opened by replaying a search from address history.
  const browserViews = {
    welcome: {
      url: "about:welcome",
      render: createWelcomePage,
    },
    zoomsearch: {
      url: "http://www.zoomsearch.net",
      siteId: "zoomsearch",
    },
    library: {
      url: "http://library.intra",
      siteId: "library",
    },
    police: {
      url: "http://records.sk-police.gov",
      siteId: "police",
    },
    cosmic: {
      url: "https://leighhobson89.github.io/cosmicForge/",
      render: createCosmicForgePage,
    },
    archives: {
      url: "http://archives.canada.news",
      siteId: "archives",
    },
  };

  const renderBrowserView = (viewKey) => {
    const view = browserViews[viewKey];
    return view.render ? view.render() : webContentManager.createWebsitePage(view.siteId);
  };

  const urlRouteMap = new Map();
  const standalonePageRouteMap = new Map();
  const navigationHistory = [];
  const addressHistory = getBrowserAddressHistory();
  const webViewBySiteId = Object.fromEntries(
    Object.entries(browserViews)
      .filter(([, view]) => view.siteId)
      .map(([viewKey, view]) => [view.siteId, viewKey])
  );
  let historyIndex = -1;
  let standalonePagesPromise = null;
  let standalonePagesLanguage = null;
  let ignoreNextInputBlur = false;

  const getAddressEntryUrl = (entry) => {
    if (entry && typeof entry === "object") {
      return String(entry.url ?? "").trim();
    }

    return String(entry ?? "").trim();
  };

  const getAddressEntryReplay = (entry) => {
    if (!entry || typeof entry !== "object" || !entry.replay || typeof entry.replay !== "object") {
      return null;
    }

    return entry.replay;
  };

  const resolveAddressHistoryEntry = (entry) => {
    const url = getAddressEntryUrl(entry);
    if (!url) {
      return null;
    }

    const replay = getAddressEntryReplay(entry);
    if (replay) {
      return {
        url,
        replay: { ...replay },
      };
    }

    return url;
  };

  const updateAddressHistorySuggestions = () => {
    addressHistoryPanel.replaceChildren();

    let hasItems = false;
    for (let index = addressHistory.length - 1; index >= 0; index -= 1) {
      const itemValue = getAddressEntryUrl(addressHistory[index]);
      if (!itemValue) {
        continue;
      }

      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.classList.add("caveos-browser-address-history-item");
      itemButton.textContent = itemValue;
      itemButton.dataset.entryIndex = String(index);
      itemButton.setAttribute("role", "option");
      itemButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
        ignoreNextInputBlur = true;
      });
      itemButton.addEventListener("click", () => {
        const selectedIndex = Number.parseInt(String(itemButton.dataset.entryIndex ?? ""), 10);
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= addressHistory.length) {
          return;
        }

        const selectedEntry = resolveAddressHistoryEntry(addressHistory[selectedIndex]);
        if (!selectedEntry) {
          return;
        }

        browserAddress.value = getAddressEntryUrl(selectedEntry);
        hideAddressHistoryPanel();
        void navigateToAddressHistoryEntry(selectedEntry, { pushHistory: true });
      });

      addressHistoryPanel.appendChild(itemButton);
      hasItems = true;
    }

    if (!hasItems) {
      addressHistoryPanel.hidden = true;
    }
  };

  const showAddressHistoryPanel = () => {
    if (!addressHistoryPanel.childElementCount) {
      addressHistoryPanel.hidden = true;
      return;
    }

    addressHistoryPanel.hidden = false;
  };

  const hideAddressHistoryPanel = () => {
    addressHistoryPanel.hidden = true;
  };

  // Records a visited URL in the persistent address history. The welcome page is
  // skipped: it is rendered on every browser open and is always one click away
  // on the Home button, so recording it would crowd out real history.
  const pushAddressHistoryEntry = (urlValue, replay = null) => {
    const normalized = normalizeBrowserUrl(urlValue);
    if (!normalized || normalized === WELCOME_URL) {
      return;
    }

    const normalizedUrl = String(urlValue ?? "").trim() || normalized;
    addressHistory.push(
      replay && typeof replay === "object"
        ? { url: normalizedUrl, replay: { ...replay } }
        : normalizedUrl
    );

    setBrowserAddressHistory(addressHistory);
    // Re-read so this window's copy matches the canonical de-duplicated, capped list.
    addressHistory.splice(0, addressHistory.length, ...getBrowserAddressHistory());
    updateAddressHistorySuggestions();
  };

  const registerViewRoute = (viewKey, url) => {
    const normalized = normalizeBrowserUrl(url);
    if (!normalized) {
      return;
    }

    urlRouteMap.set(normalized, {
      type: "view",
      viewKey,
      url,
    });

    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      const withSlash = `${normalized}/`;
      urlRouteMap.set(withSlash, {
        type: "view",
        viewKey,
        url,
      });
    }
  };

  Object.entries(browserViews).forEach(([viewKey, view]) => {
    registerViewRoute(viewKey, view.url);
  });

  const updateNavigationButtonsState = () => {
    backButton.disabled = historyIndex <= 0;
    forwardButton.disabled = historyIndex < 0 || historyIndex >= navigationHistory.length - 1;
  };

  const pushHistoryEntry = (entry) => {
    if (!entry) {
      return;
    }

    if (historyIndex < navigationHistory.length - 1) {
      navigationHistory.splice(historyIndex + 1);
    }

    const previousEntry = navigationHistory[navigationHistory.length - 1];
    if (previousEntry && previousEntry.url === entry.url) {
      historyIndex = navigationHistory.length - 1;
      updateNavigationButtonsState();
      return;
    }

    navigationHistory.push(entry);
    if (navigationHistory.length > HISTORY_LIMIT) {
      navigationHistory.splice(0, navigationHistory.length - HISTORY_LIMIT);
    }

    historyIndex = navigationHistory.length - 1;
    updateNavigationButtonsState();
  };

  const navigateToBrowserView = (
    viewKey,
    { pushHistory = true, pushAddressHistory = true, overrideUrl = "" } = {}
  ) => {
    const nextView = browserViews[viewKey];
    if (!nextView) {
      return;
    }

    const finalUrl = overrideUrl || nextView.url;
    const renderedPageNode = renderBrowserView(viewKey);
    browserAddress.value = finalUrl;
    if (pushAddressHistory) {
      pushAddressHistoryEntry(finalUrl);
    }
    pageHost.replaceChildren(renderedPageNode);

    if (pushHistory) {
      pushHistoryEntry({
        type: "view",
        viewKey,
        url: finalUrl,
        pageNode: renderedPageNode,
      });
    }
  };

  const navigateToStandalonePage = (pageRecord, { pushHistory = true } = {}) => {
    if (!pageRecord?.url) {
      return;
    }

    if (pageRecord.awardsEvidence === true && pageRecord.evidence) {
      awardWebContentEvidence(pageRecord.evidence, { websiteId: "standalone" });
    }

    // Standalone pages are websites too, so visiting one records its progress
    // evidence. They are not search results, so they never dispatch
    // caveos-browser-record-opened and have to be activated here.
    activateProgressEvidenceForStandalonePage(pageRecord.id);

    const renderedPageNode = createStandaloneTextPage(pageRecord);
    browserAddress.value = pageRecord.url;
    pushAddressHistoryEntry(pageRecord.url);
    pageHost.replaceChildren(renderedPageNode);

    if (pushHistory) {
      pushHistoryEntry({
        type: "standalone",
        pageId: pageRecord.id,
        sourceSiteId: pageRecord.sourceSiteId,
        url: pageRecord.url,
        pageNode: renderedPageNode,
      });
    }
  };

  const renderHistoryEntry = (entry) => {
    if (!entry) {
      return;
    }

    if (entry.pageNode instanceof HTMLElement) {
      browserAddress.value = entry.url || "about:missing";
      pushAddressHistoryEntry(browserAddress.value);
      pageHost.replaceChildren(entry.pageNode);
      return;
    }

    if (entry.type === "view") {
      navigateToBrowserView(entry.viewKey, {
        pushHistory: false,
        overrideUrl: entry.url,
      });
      return;
    }

    if (entry.type === "standalone") {
      const routedPage = standalonePageRouteMap.get(normalizeBrowserUrl(entry.url));
      if (routedPage) {
        navigateToStandalonePage(routedPage, { pushHistory: false });
      } else {
        browserAddress.value = entry.url || "about:missing";
        pageHost.replaceChildren(createMissingPage(entry.url || localize("browserUnknownUrlFallback", getLanguage())));
      }
      return;
    }

    if (entry.type === "record" && entry.replay && typeof entry.replay === "object") {
      void replayAddressHistoryEntry(entry, { pushHistory: false });
      return;
    }

    browserAddress.value = entry.url || "about:missing";
    pageHost.replaceChildren(createMissingPage(entry.url || localize("browserUnknownUrlFallback", getLanguage())));
  };

  const navigateBack = () => {
    if (historyIndex <= 0) {
      return;
    }

    historyIndex -= 1;
    renderHistoryEntry(navigationHistory[historyIndex]);
    updateNavigationButtonsState();
  };

  const navigateForward = () => {
    if (historyIndex < 0 || historyIndex >= navigationHistory.length - 1) {
      return;
    }

    historyIndex += 1;
    renderHistoryEntry(navigationHistory[historyIndex]);
    updateNavigationButtonsState();
  };

  const ensureStandaloneRoutesLoaded = async () => {
    // Re-fetches whenever the current language differs from the one these
    // routes were last built for, so a mid-game language switch (or a save
    // loaded in a different language) picks up that language's standalone
    // pages instead of reusing routes built for the previous one.
    const currentLanguage = normalizeLanguageCode(getLanguage());
    if (standalonePagesPromise && standalonePagesLanguage === currentLanguage) {
      return standalonePagesPromise;
    }

    standalonePagesLanguage = currentLanguage;
    standalonePageRouteMap.clear();

    standalonePagesPromise = (async () => {
      try {
        const standaloneResponse = await fetch(resolveCatalogPath("./assets/{lang}/standalone-pages.json", currentLanguage));
        if (standaloneResponse.ok) {
          const standaloneData = await standaloneResponse.json();
          const standaloneRecords = Array.isArray(standaloneData?.records)
            ? standaloneData.records
            : [];

          standaloneRecords.forEach((pageRecord) => {
            if (!pageRecord || typeof pageRecord !== "object") {
              return;
            }

            const url = String(pageRecord.url ?? "").trim();
            const id = String(pageRecord.id ?? "").trim();
            if (!url || !id) {
              return;
            }

            const normalizedUrl = normalizeBrowserUrl(url);
            if (!normalizedUrl) {
              return;
            }

            const normalizedPage = {
              id,
              sourceSiteId: "standalone",
              sourceLabel: pageRecord.source || "standalone",
              title: String(pageRecord.title ?? id).trim() || id,
              url,
              content: pageRecord.content ?? pageRecord.body ?? "",
              images: pageRecord.images,
              style: pageRecord.style && typeof pageRecord.style === "object" ? pageRecord.style : null,
              awardsEvidence: pageRecord.awardsEvidence === true,
              evidence: pageRecord.evidence && (typeof pageRecord.evidence === "object" || Array.isArray(pageRecord.evidence))
                ? pageRecord.evidence
                : null,
            };

            standalonePageRouteMap.set(normalizedUrl, normalizedPage);
            if (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://")) {
              standalonePageRouteMap.set(`${normalizedUrl}/`, normalizedPage);
            }
          });
        }
      } catch (error) {
        console.warn(`Unable to load assets/${currentLanguage}/standalone-pages.json routes.`, error);
      }

    })();

    return standalonePagesPromise;
  };

  const replayAddressHistoryEntry = async (entry, { pushHistory = true } = {}) => {
    const replay = getAddressEntryReplay(entry);
    if (!replay) {
      return false;
    }

    const siteId = String(replay.siteId ?? "").trim().toLowerCase();
    const viewKey = webViewBySiteId[siteId];
    if (!viewKey || !browserViews[viewKey]) {
      return false;
    }

    navigateToBrowserView(viewKey, {
      pushHistory,
      pushAddressHistory: false,
      overrideUrl: browserViews[viewKey].url,
    });

    const activePage = pageHost.firstElementChild;
    if (!(activePage instanceof HTMLElement)) {
      return false;
    }

    activePage.dispatchEvent(new CustomEvent("caveos-browser-replay", {
      bubbles: true,
      detail: {
        ...replay,
        url: getAddressEntryUrl(entry),
      },
    }));

    return true;
  };

  const navigateToAddressHistoryEntry = async (entry, { pushHistory = true } = {}) => {
    const targetUrl = getAddressEntryUrl(entry);
    if (!targetUrl) {
      return;
    }

    browserAddress.value = targetUrl;

    const replayed = await replayAddressHistoryEntry(entry, { pushHistory });
    if (replayed) {
      return;
    }

    await navigateToAddress({ pushHistory });
  };

  const navigateToAddress = async ({ pushHistory = true } = {}) => {
    const enteredValue = String(browserAddress.value ?? "").trim();
    const normalized = normalizeBrowserUrl(enteredValue);

    if (!normalized) {
      return;
    }

    const favoriteRoute = urlRouteMap.get(normalized);
    if (favoriteRoute?.type === "view") {
      navigateToBrowserView(favoriteRoute.viewKey, {
        pushHistory,
        overrideUrl: favoriteRoute.url,
      });
      return;
    }

    await ensureStandaloneRoutesLoaded();

    const standaloneRoute = standalonePageRouteMap.get(normalized);
    if (standaloneRoute) {
      navigateToStandalonePage(standaloneRoute, { pushHistory });
      return;
    }

    browserAddress.value = enteredValue;
    pushAddressHistoryEntry(enteredValue);
    const missingPageNode = createMissingPage(enteredValue);
    pageHost.replaceChildren(missingPageNode);
    if (pushHistory) {
      pushHistoryEntry({
        type: "missing",
        url: enteredValue,
        pageNode: missingPageNode,
      });
    }
  };

  pageHost.addEventListener("caveos-browser-record-opened", (event) => {
    const openedUrl = String(event?.detail?.url || "").trim();
    const replay = event?.detail?.replay && typeof event.detail.replay === "object"
      ? event.detail.replay
      : null;
    const currentPageNode = pageHost.firstElementChild;
    if (!openedUrl || !(currentPageNode instanceof HTMLElement)) {
      return;
    }

    browserAddress.value = openedUrl;
    pushAddressHistoryEntry(openedUrl, replay);
    pushHistoryEntry({
      type: "record",
      url: openedUrl,
      replay,
      pageNode: currentPageNode,
    });
  });

  const quickLinkConfigs = [
    {
      iconClass: "icon-zoomsearch",
      label: "ZoomSearch",
      viewKey: "zoomsearch",
    },
    {
      iconClass: "icon-library",
      label: "Library",
      viewKey: "library",
    },
    {
      iconClass: "icon-police-records",
      label: "Police Records",
      viewKey: "police",
    },
    {
      iconClass: "icon-canada-archives",
      label: "Canada Archives",
      viewKey: "archives",
    },
    {
      iconClass: "icon-cosmic-forge",
      label: "Cosmic Forge",
      viewKey: "cosmic",
    },
  ];

  quickLinkConfigs.forEach(({ iconClass, label: quickLabel, viewKey }) => {
    quickLinksBar.appendChild(
      createQuickLinkButton({
        iconClass,
        label: quickLabel,
        onClick: () => {
          navigateToBrowserView(viewKey);
        },
      })
    );
  });

  browserAddress.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      hideAddressHistoryPanel();
      void navigateToAddress();
      return;
    }

    if (event.key === "Escape") {
      hideAddressHistoryPanel();
    }
  });

  browserAddress.addEventListener("focus", () => {
    updateAddressHistorySuggestions();
    showAddressHistoryPanel();
  });

  browserAddress.addEventListener("blur", () => {
    if (ignoreNextInputBlur) {
      ignoreNextInputBlur = false;
      return;
    }

    hideAddressHistoryPanel();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    if (!addressInputShell.contains(event.target)) {
      hideAddressHistoryPanel();
    }
  });

  addressSubmitButton.addEventListener("click", () => {
    hideAddressHistoryPanel();
    void navigateToAddress();
  });

  backButton.addEventListener("click", () => {
    navigateBack();
  });

  forwardButton.addEventListener("click", () => {
    navigateForward();
  });

  homeButton.addEventListener("click", () => {
    navigateToBrowserView("welcome");
  });

  updateAddressHistorySuggestions();
  navigateToBrowserView("welcome");
  updateNavigationButtonsState();
  void ensureStandaloneRoutesLoaded();

  container.append(quickLinksBar, addressRow, pageHost);
  return container;
}

function positionWindowWithinParent(
  rootElement,
  parentElement,
  {
    widthScale = 1,
    widthRatio = null,
    heightRatio = null,
  } = {}
) {
  if (!(rootElement instanceof HTMLElement) || !(parentElement instanceof HTMLElement)) {
    return;
  }

  const parentWidth = parentElement.clientWidth;
  const parentHeight = parentElement.clientHeight;

  const normalizedWidthRatio = Number(widthRatio);
  const normalizedHeightRatio = Number(heightRatio);

  const baseWidth = rootElement.offsetWidth || Math.round(parentWidth * 0.88);
  const scaledWidth = Number.isFinite(normalizedWidthRatio)
    ? Math.round(parentWidth * Math.max(0.3, Math.min(1, normalizedWidthRatio)))
    : Math.min(
      Math.round(baseWidth * Math.max(0.5, Number(widthScale) || 1)),
      Math.round(parentWidth)
    );
  const nextHeight = Number.isFinite(normalizedHeightRatio)
    ? Math.round(parentHeight * Math.max(0.3, Math.min(1, normalizedHeightRatio)))
    : Math.min(
      rootElement.offsetHeight || Math.round(parentHeight * 0.76),
      Math.round(parentHeight)
    );

  const nextLeft = Math.max(0, Math.round((parentWidth - scaledWidth) / 2));
  const nextTop = Math.max(0, Math.round((parentHeight - nextHeight) / 2));

  rootElement.style.width = `${scaledWidth}px`;
  rootElement.style.height = `${nextHeight}px`;
  rootElement.style.left = `${nextLeft}px`;
  rootElement.style.top = `${nextTop}px`;
  rootElement.style.transform = "none";
}

const COMPUTER_APP_CLOSE_ARIA_LABEL_KEY_BY_KIND = {
  "computer-notes": "closeNotesWindowAriaLabel",
  "computer-paint": "closePaintWindowAriaLabel",
  "computer-calculator": "closeCalculatorWindowAriaLabel",
  "computer-snake": "closeSnakeWindowAriaLabel",
  "computer-minesweeper": "closeMinesweeperWindowAriaLabel",
  "computer-sudoku": "closeSudokuWindowAriaLabel",
  "computer-tetris": "closeTetrisWindowAriaLabel",
  "computer-echotrail": "closeEchotrailWindowAriaLabel",
  "computer-folder-utilities": "closeUtilitiesFolderWindowAriaLabel",
  "computer-folder-games": "closeGamesFolderWindowAriaLabel",
  "computer-netscape": "closeNetscapeWindowAriaLabel",
};

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
  widthRatio = 0.6,
  heightRatio = 0.58,
  onAfterOpen = null,
  onBeforeClose = null,
}) {
  if (!parentElement || !(contentNode instanceof Node)) {
    return null;
  }

  const closeAriaLabelKey = COMPUTER_APP_CLOSE_ARIA_LABEL_KEY_BY_KIND[kind];

  let appWindowController = null;
  appWindowController = new DesktopWindow({
    parentElement,
    classNames: ["caveos-app-window", ...classNames],
    title,
    showCarouselNavigation: false,
    closeButtonAriaLabel: closeAriaLabelKey
      ? localize(closeAriaLabelKey, getLanguage())
      : `Close ${title} window`,
    onClose: () => {
      // Before the bookkeeping: an app with a running timer (Snake) has to be
      // told to stop it while its content is still reachable.
      onBeforeClose?.();
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
    positionWindowWithinParent(appWindowController.rootElement, parentElement, {
      widthScale,
      widthRatio,
      heightRatio,
    });
  }

  bringDesktopWindowToFront(appWindowController);

  if (appWindowSet) {
    appWindowSet.add(appWindowController);
  }

  // Last, so anything taking focus here does so on a window that is already
  // sized, positioned and raised.
  onAfterOpen?.();

  return appWindowController;
}

async function getStoryText(language, forceReload = false) {
  const storyEvidence = getCurrentEvidence(EVIDENCE_STORAGE_KEYS.BACKGROUND_STORY);
  const storyLanguage = language || "en";
  const storyPath = storyEvidence
    ? resolveEvidenceContentPath(storyEvidence, storyLanguage)
    : `assets/${storyLanguage}/story.md`;

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
    const fallbackStory = localize("unableToLoadStory", storyLanguage);
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
    title: localize("theArnieTragedy", getLanguage()),
    showCarouselNavigation: false,
    closeButtonAriaLabel: localize("closeStoryWindowAriaLabel", getLanguage()),
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
  activateProgressEvidenceForDesktopItem("theArnieTragedyStory");
}

async function updateStoryWindowContent(windowController, forceReload = false) {
  const refs = storyWindowContentRefs.get(windowController);
  if (!refs) {
    return;
  }

  refs.storyDocumentText.textContent = localize("loadingStory", getLanguage());
  const storyText = await getStoryText(getLanguage(), forceReload);
  refs.storyDocumentText.textContent = storyText;
  refs.storyDocumentContent.scrollTop = 0;
}

// Resets the wrapper to its base class and re-applies the single paper-style
// modifier for the supplied style name.
function applyPaperStyle(wrapElement, paperStyle, { baseClass, classPrefix, defaultStyle }) {
  if (!wrapElement) {
    return;
  }

  wrapElement.className = baseClass;

  const styleSuffix = String(paperStyle || defaultStyle).trim();
  if (!styleSuffix) {
    return;
  }

  wrapElement.classList.add(`${classPrefix}${styleSuffix}`);
}

function applyReportPaperStyle(reportPaperWrapElement, paperStyle) {
  applyPaperStyle(reportPaperWrapElement, paperStyle, {
    baseClass: "report-paper-wrap",
    classPrefix: REPORT_PAPER_STYLE_CLASS_PREFIX,
    defaultStyle: "report-parchment",
  });
}

function applyPhotoPaperStyle(photoPaperWrapElement, paperStyle) {
  applyPaperStyle(photoPaperWrapElement, paperStyle, {
    baseClass: "photo-paper-wrap",
    classPrefix: PHOTO_PAPER_STYLE_CLASS_PREFIX,
    defaultStyle: "photo-mounted",
  });
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

function isCatalogBackedPhotoEvidence(evidence) {
  return String(evidence?.type || "").trim() === "photo"
    && String(evidence?.source?.kind || "").trim() === "photo-localized-catalog-entry";
}

function getPhotoCaptionByEvidence(evidence, catalogEntry) {
  const catalogCaption = String(catalogEntry?.captionText || catalogEntry?.caption || "").trim();
  if (catalogCaption) {
    return sanitizeCatalogText(catalogCaption).trim();
  }

  if (!isCatalogBackedPhotoEvidence(evidence)) {
    const directCaption = String(evidence?.photoCaption || "").trim();
    if (directCaption) {
      return directCaption;
    }
  }

  return "";
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
  catalogLabel,
  forceReload = false,
}) {
  const language = normalizeLanguageCode(languageCode);
  const resolvedTemplate = String(pathTemplate || "").trim();
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
    console.error(`Error fetching ${catalogLabel} catalog JSON:`, error);
    const emptyIndex = new Map();
    cacheMap.set(cacheKey, emptyIndex);
    return emptyIndex;
  }
}

function buildMissingCatalogEntryMessage(evidence, label, languageCode) {
  const title = getEvidenceDefaultTitle(evidence);
  const entryId = getCatalogEntryIdFromEvidence(evidence) || "unknown-entry";
  return `${label} unavailable for '${title}'. Missing catalog entry '${entryId}' for language '${normalizeLanguageCode(languageCode)}'.`;
}

function buildMissingCatalogFieldMessage(evidence, label, fieldName, languageCode) {
  const title = getEvidenceDefaultTitle(evidence);
  const entryId = getCatalogEntryIdFromEvidence(evidence) || "unknown-entry";
  return `${label} unavailable for '${title}'. Catalog entry '${entryId}' is missing '${fieldName}' for language '${normalizeLanguageCode(languageCode)}'.`;
}

// `pathTemplate` is always the current code-owned constant, never read off
// the evidence object: evidence.source.catalogPathTemplate is cloned
// verbatim into save files and web-content JSON records, so a value baked in
// under an older file-naming convention would otherwise 404 forever after a
// rename. getReportCatalogEntry/getPhotoCatalogEntry below always pass the
// live REPORTS_/PHOTOS_CATALOG_PATH_TEMPLATE instead.
async function getCatalogEntryForEvidence(evidence, languageCode, forceReload, { cacheMap, catalogLabel, pathTemplate }) {
  const catalogIndex = await loadEvidenceCatalogByLanguage({
    cacheMap,
    languageCode,
    pathTemplate,
    catalogLabel,
    forceReload,
  });

  return catalogIndex.get(getCatalogEntryIdFromEvidence(evidence)) || null;
}

function getReportCatalogEntry(evidence, languageCode, forceReload = false) {
  return getCatalogEntryForEvidence(evidence, languageCode, forceReload, {
    cacheMap: reportCatalogCacheByLanguage,
    catalogLabel: "report evidence",
    pathTemplate: REPORTS_CATALOG_PATH_TEMPLATE,
  });
}

function getPhotoCatalogEntry(evidence, languageCode, forceReload = false) {
  return getCatalogEntryForEvidence(evidence, languageCode, forceReload, {
    cacheMap: photoCatalogCacheByLanguage,
    catalogLabel: "photo evidence",
    pathTemplate: PHOTOS_CATALOG_PATH_TEMPLATE,
  });
}

async function getDescriptionTextByEvidence(
  evidence,
  languageCode,
  forceReload = false,
  preloadedCatalogEntry = null
) {
  const evidenceType = String(evidence?.type || "").trim();
  const explicitDescription = String(evidence?.description || "")
    .replace(/\r\n/g, "\n")
    .trim();

  // Photos always defer to the catalog; reports and everything else may carry
  // an inline description (used by faxes) that wins over the catalog.
  if (evidenceType !== "photo" && explicitDescription) {
    return explicitDescription;
  }

  if (evidenceType !== "report" && evidenceType !== "photo") {
    return localize("descriptionUnavailable", getLanguage());
  }

  const label = evidenceType === "report"
    ? localize("reportDescriptionFieldLabel", languageCode)
    : localize("photoDescriptionFieldLabel", languageCode);
  const catalogEntry = preloadedCatalogEntry
    || (evidenceType === "report"
      ? await getReportCatalogEntry(evidence, languageCode, forceReload)
      : await getPhotoCatalogEntry(evidence, languageCode, forceReload));

  if (!catalogEntry) {
    return buildMissingCatalogEntryMessage(evidence, label, languageCode);
  }

  const descriptionText = sanitizeCatalogText(catalogEntry?.descriptionText).trim();
  if (descriptionText) {
    return descriptionText;
  }

  return buildMissingCatalogFieldMessage(evidence, label, "descriptionText", languageCode);
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

// Copies one measured dimension of `sourceElement` onto a sibling element so the
// title bar, caption row and description panel stay flush with the paper mount.
function syncMeasuredDimension(targetElement, sourceElement, dimension) {
  if (!targetElement || !sourceElement) {
    return;
  }

  const measured = Math.max(1, Math.round(sourceElement.getBoundingClientRect()[dimension]));
  targetElement.style[dimension] = `${measured}px`;
}

function syncEvidenceTitleWidth(refs, sourceElement) {
  syncMeasuredDimension(refs?.titleBarElement, sourceElement, "width");
}

function syncPhotoCaptionWidth(refs, sourceElement) {
  syncMeasuredDimension(refs?.captionOuterElement, sourceElement, "width");
}

function syncPhotoDescriptionHeight(refs, sourceElement) {
  syncMeasuredDimension(refs?.descriptionOuterElement, sourceElement, "height");
}

// The photo mount's title bar, caption row and description panel all track the
// paper wrapper, so they are always refreshed together.
function syncPhotoMountChrome(refs) {
  syncEvidenceTitleWidth(refs, refs?.photoPaperWrap);
  syncPhotoCaptionWidth(refs, refs?.photoPaperWrap);
  syncPhotoDescriptionHeight(refs, refs?.photoPaperWrap);
}

function createEvidenceTitleBarElements() {
  const titleBar = document.createElement("div");
  titleBar.classList.add("evidence-title-bar");

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.classList.add("evidence-title-input");
  titleInput.placeholder = localize("evidenceTitlePlaceholder", getLanguage());
  titleInput.setAttribute("aria-label", localize("evidenceTitlePlaceholder", getLanguage()));

  const commitButton = document.createElement("button");
  commitButton.type = "button";
  commitButton.classList.add("evidence-title-commit");
  commitButton.textContent = "✓";
  commitButton.disabled = true;
  commitButton.setAttribute("aria-label", localize("applyEvidenceTitleAriaLabel", getLanguage()));

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

// ---------------------------------------------------------------------------
// Paged documents (Notes and Paint)
//
// Notes and Paint present the same UI: a numbered, colour-coded tab strip down
// the side where each tab carries an editable page title, plus one editor pane.
// They differ only in the field that stores the page body, the default title
// noun, and a few extra CSS classes. Both are described by a page model below
// and share every helper in this section.
// ---------------------------------------------------------------------------

const NOTES_PAGE_MODEL = {
  pageCount: NOTES_PAGE_COUNT,
  titlePrefixKey: "notesPageDefaultTitlePrefix",
  titleForAriaKey: "notesPageTitleForAriaLabelPrefix",
  applyTitleForAriaKey: "notesPageTitleApplyAriaLabelPrefix",
  bodyKey: "content",
  getPages: getNotesPages,
  setPages: setNotesPages,
  getActivePageIndex: getNotesActivePageIndex,
  setActivePageIndex: setNotesActivePageIndex,
  rowClassNames: [],
  activateClassNames: [],
  titleInputClassNames: [],
};

const PAINT_PAGE_MODEL = {
  pageCount: PAINT_PAGE_COUNT,
  titlePrefixKey: "paintPageDefaultTitlePrefix",
  titleForAriaKey: "paintPageTitleForAriaLabelPrefix",
  applyTitleForAriaKey: "paintPageTitleApplyAriaLabelPrefix",
  bodyKey: "snapshot",
  getPages: getPaintPages,
  setPages: setPaintPages,
  getActivePageIndex: getPaintActivePageIndex,
  setActivePageIndex: setPaintActivePageIndex,
  rowClassNames: ["caveos-paint-page-row"],
  activateClassNames: ["caveos-paint-page-activate"],
  titleInputClassNames: ["caveos-paint-page-title-input"],
};

function buildDefaultPageTitle(model, pageIndex) {
  return `${localize(model.titlePrefixKey, getLanguage())} ${pageIndex + 1}`;
}

function readPageOrDefault(model, pages, pageIndex) {
  return pages[pageIndex] || {
    title: buildDefaultPageTitle(model, pageIndex),
    [model.bodyKey]: "",
  };
}

function clampToPageCount(model, requestedIndex) {
  return Math.min(model.pageCount - 1, Math.max(0, Number.parseInt(requestedIndex, 10) || 0));
}

function resolveActivePageIndex(model, pages) {
  return Math.min(
    pages.length - 1,
    Math.max(0, Number.parseInt(model.getActivePageIndex(), 10) || 0)
  );
}

// Writes `bodyValue` into the active page, skipping the store update when the
// body is unchanged so Paint does not re-encode an identical canvas snapshot.
function persistActivePageBody(model, bodyValue) {
  const pages = model.getPages();
  if (!pages.length) {
    return;
  }

  const activeIndex = resolveActivePageIndex(model, pages);
  const existingPage = readPageOrDefault(model, pages, activeIndex);

  if (String(existingPage[model.bodyKey] || "") === bodyValue) {
    return;
  }

  pages[activeIndex] = { ...existingPage, [model.bodyKey]: bodyValue };
  model.setPages(pages);
}

function refreshPageTitleCommitState(pageRowRefs) {
  if (!pageRowRefs?.titleInput || !pageRowRefs?.commitButton) {
    return;
  }

  const normalizedInput = String(pageRowRefs.titleInput.value || "").trim();
  const normalizedCommitted = String(pageRowRefs.committedTitle || "").trim();
  pageRowRefs.commitButton.disabled = !normalizedInput || normalizedInput === normalizedCommitted;
}

function commitPageTitle(model, pageRowRefs) {
  if (!pageRowRefs) {
    return;
  }

  const nextTitle = String(pageRowRefs.titleInput.value || "").trim();
  if (!nextTitle) {
    pageRowRefs.titleInput.value = pageRowRefs.committedTitle;
    refreshPageTitleCommitState(pageRowRefs);
    return;
  }

  if (nextTitle === String(pageRowRefs.committedTitle || "").trim()) {
    pageRowRefs.commitButton.disabled = true;
    return;
  }

  const pages = model.getPages();
  pages[pageRowRefs.pageIndex] = {
    ...readPageOrDefault(model, pages, pageRowRefs.pageIndex),
    title: nextTitle,
  };

  model.setPages(pages);
  pageRowRefs.committedTitle = nextTitle;
  pageRowRefs.titleInput.value = nextTitle;
  pageRowRefs.commitButton.disabled = true;
}

function createPageTabRow(model, pageIndex, onActivate) {
  const row = document.createElement("div");
  row.classList.add("notes-page-tab-row", ...model.rowClassNames);
  row.style.setProperty("--notes-tab-color", NOTES_TAB_COLORS[pageIndex % NOTES_TAB_COLORS.length]);

  const activateButton = document.createElement("button");
  activateButton.type = "button";
  activateButton.classList.add("notes-page-tab-activate", ...model.activateClassNames);
  activateButton.textContent = String(pageIndex + 1);

  const titleBar = document.createElement("div");
  titleBar.classList.add("evidence-title-bar", "notes-page-title-bar");

  const defaultTitle = buildDefaultPageTitle(model, pageIndex);

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.classList.add("evidence-title-input", "notes-page-title-input", ...model.titleInputClassNames);
  titleInput.placeholder = defaultTitle;
  titleInput.setAttribute("aria-label", `${localize(model.titleForAriaKey, getLanguage())} ${pageIndex + 1}`);

  const commitButton = document.createElement("button");
  commitButton.type = "button";
  commitButton.classList.add("evidence-title-commit", "notes-page-title-commit");
  commitButton.textContent = "✓";
  commitButton.setAttribute("aria-label", `${localize(model.applyTitleForAriaKey, getLanguage())} ${pageIndex + 1}`);
  commitButton.disabled = true;

  titleBar.append(titleInput, commitButton);
  row.append(activateButton, titleBar);

  const pageRowRefs = {
    pageIndex,
    root: row,
    activateButton,
    titleInput,
    commitButton,
    committedTitle: defaultTitle,
  };

  activateButton.addEventListener("click", () => {
    onActivate(pageIndex);
  });

  titleInput.addEventListener("input", () => {
    refreshPageTitleCommitState(pageRowRefs);
  });

  titleInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitPageTitle(model, pageRowRefs);
  });

  commitButton.addEventListener("click", () => {
    commitPageTitle(model, pageRowRefs);
  });

  return pageRowRefs;
}

// Builds the whole tab strip and appends it to `tabsList`.
function createPageTabRows(model, tabsList, onActivate) {
  return Array.from({ length: model.pageCount }, (_, pageIndex) => {
    const pageRowRefs = createPageTabRow(model, pageIndex, onActivate);
    tabsList.appendChild(pageRowRefs.root);
    return pageRowRefs;
  });
}

function syncPageTabRows(model, pageRows, pages, activeIndex) {
  pageRows.forEach((pageRowRefs) => {
    const pageData = readPageOrDefault(model, pages, pageRowRefs.pageIndex);
    const normalizedTitle = String(pageData.title || "").trim()
      || buildDefaultPageTitle(model, pageRowRefs.pageIndex);
    const isActive = pageRowRefs.pageIndex === activeIndex;

    pageRowRefs.root.classList.toggle("is-active", isActive);
    pageRowRefs.activateButton.setAttribute("aria-pressed", String(isActive));
    pageRowRefs.activateButton.setAttribute("aria-label", `${localize("openPagePrefix", getLanguage())} ${normalizedTitle}`);
    pageRowRefs.committedTitle = normalizedTitle;
    pageRowRefs.titleInput.value = normalizedTitle;
    pageRowRefs.commitButton.disabled = true;
  });
}

function persistActiveNotesPageContent(refs) {
  if (!refs?.textarea) {
    return;
  }

  persistActivePageBody(NOTES_PAGE_MODEL, String(refs.textarea.value || ""));
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

  const activeIndex = resolveActivePageIndex(NOTES_PAGE_MODEL, pages);
  setNotesActivePageIndex(activeIndex);
  refs.activePageIndex = activeIndex;
  refs.textarea.value = String(pages[activeIndex]?.content || "");

  syncPageTabRows(NOTES_PAGE_MODEL, refs.pageRows, pages, activeIndex);
}

function setActiveNotesPage(refs, requestedIndex) {
  if (!refs) {
    return;
  }

  persistActiveNotesPageContent(refs);
  setNotesActivePageIndex(clampToPageCount(NOTES_PAGE_MODEL, requestedIndex));
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
  textarea.placeholder = localize("notesWritePlaceholder", getLanguage());
  textarea.setAttribute("aria-label", localize("notesPageContentAriaLabel", getLanguage()));

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

  refs.pageRows = createPageTabRows(NOTES_PAGE_MODEL, tabsList, (pageIndex) => {
    setActiveNotesPage(refs, pageIndex);
  });

  textarea.addEventListener("focusout", () => {
    persistActiveNotesPageContent(refs);
  });

  container.append(editorColumn, tabsColumn);
  return refs;
}

function createEvidenceMagnifierToggleButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("evidence-magnifier-toggle");
  button.setAttribute("aria-label", localize("magnifierLabel", getLanguage()));
  button.setAttribute("aria-pressed", "false");
  button.title = localize("magnifierLabel", getLanguage());

  const icon = document.createElement("span");
  icon.classList.add("evidence-magnifier-icon");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⌕";

  button.appendChild(icon);
  return button;
}

function createEvidenceMagnifierController({ interactionElement, overlayHostElement, sourceElement, previewType }) {
  if (!(interactionElement instanceof HTMLElement) || !(overlayHostElement instanceof HTMLElement) || !(sourceElement instanceof HTMLElement)) {
    return null;
  }

  const lens = document.createElement("div");
  lens.classList.add("evidence-magnifier-lens");
  lens.setAttribute("aria-hidden", "true");
  lens.style.opacity = "0";

  const preview = document.createElement("div");
  preview.classList.add("evidence-magnifier-preview");

  const previewSurface = document.createElement("div");
  previewSurface.classList.add("evidence-magnifier-preview-surface");

  preview.appendChild(previewSurface);
  lens.appendChild(preview);

  overlayHostElement.appendChild(lens);

  let isEnabled = false;
  let isVisible = false;
  let pointerInside = false;
  let fallbackHideTimer = null;
  let frameRequest = null;
  let pendingClientX = 0;
  let pendingClientY = 0;

  const clearHideTimer = () => {
    if (fallbackHideTimer !== null) {
      window.clearTimeout(fallbackHideTimer);
      fallbackHideTimer = null;
    }
  };

  const cancelFrame = () => {
    if (frameRequest !== null) {
      window.cancelAnimationFrame(frameRequest);
      frameRequest = null;
    }
  };

  const updateLensFrame = () => {
    if (!isEnabled || !pointerInside) {
      return;
    }

    const hostRect = overlayHostElement.getBoundingClientRect();
    const sourceRect = sourceElement.getBoundingClientRect();
    const lensDiameter = 175;
    const lensRadius = lensDiameter / 2;
    const zoomScale = 3;

    const pointerX = Math.min(Math.max(pendingClientX - hostRect.left, 0), hostRect.width);
    const pointerY = Math.min(Math.max(pendingClientY - hostRect.top, 0), hostRect.height);

    const lensLeft = Math.min(Math.max(pointerX - lensRadius, 0), Math.max(0, hostRect.width - lensDiameter));
    const lensTop = Math.min(Math.max(pointerY, 0), Math.max(0, hostRect.height - lensDiameter));

    lens.style.left = `${lensLeft}px`;
    lens.style.top = `${lensTop}px`;

    const sourceScrollX = sourceElement instanceof HTMLElement ? sourceElement.scrollLeft || 0 : 0;
    const sourceScrollY = sourceElement instanceof HTMLElement ? sourceElement.scrollTop || 0 : 0;
    let sourcePointX = Math.max(0, pendingClientX - sourceRect.left + sourceScrollX);
    let sourcePointY = Math.max(0, pendingClientY - sourceRect.top + sourceScrollY);
    let contentWidth = sourceRect.width;
    let contentHeight = sourceRect.height;
    let contentOffsetX = 0;
    let contentOffsetY = 0;

    if (previewType === "photo" && sourceElement instanceof HTMLImageElement) {
      const naturalWidth = sourceElement.naturalWidth || 0;
      const naturalHeight = sourceElement.naturalHeight || 0;
      if (naturalWidth > 0 && naturalHeight > 0 && sourceRect.width > 0 && sourceRect.height > 0) {
        const fitScale = Math.min(sourceRect.width / naturalWidth, sourceRect.height / naturalHeight);
        contentWidth = naturalWidth * fitScale;
        contentHeight = naturalHeight * fitScale;
        contentOffsetX = (sourceRect.width - contentWidth) / 2;
        contentOffsetY = (sourceRect.height - contentHeight) / 2;
        sourcePointX = Math.min(Math.max(sourcePointX - contentOffsetX, 0), contentWidth);
        sourcePointY = Math.min(Math.max(sourcePointY - contentOffsetY, 0), contentHeight);
        contentOffsetX = 0;
        contentOffsetY = 0;
      }
    } else if (sourceElement instanceof HTMLElement) {
      contentWidth = Math.max(sourceRect.width, sourceElement.scrollWidth || 0);
      contentHeight = Math.max(sourceRect.height, sourceElement.scrollHeight || 0);
      sourcePointX = Math.min(sourcePointX, contentWidth);
      sourcePointY = Math.min(sourcePointY, contentHeight);
    }

    const rawTranslateX = lensRadius - sourcePointX * zoomScale;
    const rawTranslateY = lensRadius - sourcePointY * zoomScale;
    const scaledContentWidth = contentWidth * zoomScale;
    const scaledContentHeight = contentHeight * zoomScale;
    const minTranslateX = lensDiameter - (contentOffsetX * zoomScale) - scaledContentWidth;
    const maxTranslateX = -(contentOffsetX * zoomScale);
    const minTranslateY = lensDiameter - (contentOffsetY * zoomScale) - scaledContentHeight;
    const maxTranslateY = -(contentOffsetY * zoomScale);
    const translateX = Math.min(Math.max(rawTranslateX, minTranslateX), maxTranslateX);
    const translateY = Math.min(Math.max(rawTranslateY, minTranslateY), maxTranslateY);

    const previewTransform = `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`;
    previewSurface.style.width = `${contentWidth}px`;
    previewSurface.style.height = `${contentHeight}px`;
    previewSurface.style.transform = previewTransform;
    previewSurface.style.transformOrigin = "top left";
  };

  const renderPreviewContent = (imageElement = null, reportTextElement = null) => {
    previewSurface.replaceChildren();

    if (previewType === "photo" && imageElement instanceof HTMLImageElement && imageElement.src) {
      const photoPreview = document.createElement("img");
      photoPreview.classList.add("evidence-magnifier-photo-preview");
      photoPreview.src = imageElement.src;
      photoPreview.alt = imageElement.alt || "";
      photoPreview.style.width = "100%";
      photoPreview.style.height = "100%";
      photoPreview.style.objectFit = "contain";
      previewSurface.appendChild(photoPreview);
      return;
    }

    if (previewType === "report" && reportTextElement instanceof HTMLElement) {
      const reportPreview = sourceElement.cloneNode(true);
      reportPreview.className = "evidence-magnifier-report-preview";
      reportPreview.style.position = "static";
      reportPreview.style.inset = "auto";
      reportPreview.style.overflow = "visible";
      reportPreview.style.width = `${Math.max(sourceElement.scrollWidth || 0, sourceElement.clientWidth || 0)}px`;
      reportPreview.style.height = `${Math.max(sourceElement.scrollHeight || 0, sourceElement.clientHeight || 0)}px`;
      reportPreview.style.maxWidth = "none";
      reportPreview.style.maxHeight = "none";
      reportPreview.style.pointerEvents = "none";
      previewSurface.appendChild(reportPreview);
    }
  };

  const scheduleFrame = () => {
    cancelFrame();
    frameRequest = window.requestAnimationFrame(() => {
      frameRequest = null;
      updateLensFrame();
    });
  };

  const showLens = () => {
    clearHideTimer();
    isVisible = true;
    lens.style.opacity = "1";
    lens.style.transition = "none";
    lens.classList.add("is-visible");
    lens.classList.remove("is-hidden");
    scheduleFrame();
  };

  const hideLens = (animated = true) => {
    if (!isEnabled) {
      return;
    }

    clearHideTimer();
    if (!animated) {
      isVisible = false;
      lens.style.opacity = "0";
      lens.style.transition = "none";
      lens.classList.remove("is-visible");
      lens.classList.add("is-hidden");
      return;
    }

    isVisible = false;
    lens.style.opacity = "0";
    lens.style.transition = "opacity 0.5s ease";
    lens.classList.remove("is-visible");
    lens.classList.add("is-hidden");
  };

  const handlePointerMove = (event) => {
    if (!isEnabled) {
      return;
    }

    pendingClientX = event.clientX;
    pendingClientY = event.clientY;
    scheduleFrame();
  };

  const handlePointerEnter = (event) => {
    pointerInside = true;
    pendingClientX = event.clientX;
    pendingClientY = event.clientY;
    if (isEnabled) {
      showLens();
    }
  };

  const handlePointerLeave = () => {
    pointerInside = false;
    if (isEnabled) {
      hideLens(true);
    }
  };

  const setEnabled = (enabled) => {
    isEnabled = enabled;
    if (!enabled) {
      cancelFrame();
      clearHideTimer();
      pointerInside = false;
      lens.style.opacity = "0";
      lens.style.transition = "none";
      lens.classList.remove("is-visible");
      lens.classList.add("is-hidden");
      return;
    }

    if (pointerInside) {
      showLens();
    }
  };

  const refreshContent = ({ imageElement = null, reportTextElement = null }) => {
    renderPreviewContent(imageElement, reportTextElement);
    if (isEnabled && pointerInside) {
      scheduleFrame();
    }
  };

  const handleSourceScroll = () => {
    if (isEnabled && pointerInside) {
      scheduleFrame();
    }
  };

  interactionElement.addEventListener("pointerenter", handlePointerEnter);
  interactionElement.addEventListener("pointermove", handlePointerMove);
  interactionElement.addEventListener("pointerleave", handlePointerLeave);
  sourceElement.addEventListener("scroll", handleSourceScroll, { passive: true });

  return {
    lens,
    preview,
    previewSurface,
    setEnabled,
    refreshContent,
    show: showLens,
    hide: () => hideLens(false),
  };
}

// The magnifier toggle and "n/total" counter that sit above every evidence
// carousel.
function createEvidenceControlsHost(counterClassName) {
  const controlsHost = document.createElement("div");
  controlsHost.classList.add("evidence-controls-host");

  const magnifierToggle = createEvidenceMagnifierToggleButton();

  const counter = document.createElement("div");
  counter.classList.add(counterClassName);

  controlsHost.append(magnifierToggle, counter);

  return { controlsHost, magnifierToggle, counter };
}

// The parchment description panel shown under every evidence carousel.
function createEvidenceDescriptionPanel() {
  const descriptionOuter = document.createElement("div");
  descriptionOuter.classList.add("evidence-description-outer");

  const descriptionPaperWrap = document.createElement("div");
  descriptionPaperWrap.classList.add("report-paper-wrap", "evidence-description-paper-wrap");

  const descriptionText = document.createElement("div");
  descriptionText.classList.add("evidence-description-text", "scrollbars-hidden");
  descriptionText.textContent = localize("loadingDescription", getLanguage());

  descriptionPaperWrap.appendChild(descriptionText);
  descriptionOuter.appendChild(descriptionPaperWrap);

  return { descriptionOuter, descriptionPaperWrap, descriptionText };
}

function createEvidenceMagnifierOverlayHost() {
  const magnifierOverlayHost = document.createElement("div");
  magnifierOverlayHost.classList.add("evidence-magnifier-overlay-host");
  return magnifierOverlayHost;
}

function createPhotosWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("photos-carousel-container");

  const titleEditorRefs = createEvidenceTitleBarElements();
  const { controlsHost, magnifierToggle, counter } = createEvidenceControlsHost("photos-carousel-counter");
  const { descriptionOuter, descriptionPaperWrap, descriptionText } = createEvidenceDescriptionPanel();
  const magnifierOverlayHost = createEvidenceMagnifierOverlayHost();

  const mediaViewport = document.createElement("div");
  mediaViewport.classList.add("photos-media-viewport");

  const photoPaperWrap = document.createElement("div");
  photoPaperWrap.classList.add("photo-paper-wrap");

  const image = document.createElement("img");
  image.classList.add("photos-carousel-image");

  const emptyState = document.createElement("div");
  emptyState.classList.add("photos-carousel-empty", "d-none");

  const captionOuter = document.createElement("div");
  captionOuter.classList.add("photo-caption-outer");

  const captionText = document.createElement("div");
  captionText.classList.add("photo-caption-text", "scrollbars-hidden");
  captionText.textContent = "";
  captionOuter.appendChild(captionText);

  photoPaperWrap.appendChild(image);
  mediaViewport.append(photoPaperWrap, captionOuter, emptyState);
  container.append(titleEditorRefs.titleBar, controlsHost, mediaViewport, descriptionOuter, magnifierOverlayHost);

  const magnifierController = createEvidenceMagnifierController({
    interactionElement: mediaViewport,
    overlayHostElement: magnifierOverlayHost,
    sourceElement: image,
    previewType: "photo",
  });

  return {
    container,
    mediaViewport,
    titleBarElement: titleEditorRefs.titleBar,
    photoPaperWrap,
    image,
    emptyState,
    counter,
    captionOuterElement: captionOuter,
    captionText,
    descriptionOuterElement: descriptionOuter,
    descriptionPaperWrap,
    descriptionText,
    titleInput: titleEditorRefs.titleInput,
    commitButton: titleEditorRefs.commitButton,
    magnifierToggle,
    magnifierController,
    controlsHost,
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
  if (!refs?.mediaViewport || !refs?.photoPaperWrap || !refs?.image) {
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

  const availableWidth = refs.mediaViewport.clientWidth;
  const availableHeight = refs.mediaViewport.clientHeight;
  if (!availableWidth || !availableHeight) {
    return;
  }

  const availableFrameWidth = Math.max(
    1,
    availableWidth - padLeft - padRight - borderLeft - borderRight
  );
  const availableFrameHeight = Math.max(
    1,
    availableHeight - padTop - padBottom - borderTop - borderBottom
  );

  const constrainedWidth = Math.min(PHOTO_FRAME_MAX_WIDTH, availableFrameWidth);
  const constrainedHeight = Math.min(PHOTO_FRAME_MAX_HEIGHT, availableFrameHeight);

  let frameWidth = constrainedWidth;
  let frameHeight = Math.floor(frameWidth / PHOTO_FRAME_ASPECT_RATIO);

  if (frameHeight > constrainedHeight) {
    frameHeight = constrainedHeight;
    frameWidth = Math.floor(frameHeight * PHOTO_FRAME_ASPECT_RATIO);
  }

  frameWidth = Math.max(1, frameWidth);
  frameHeight = Math.max(1, frameHeight);

  refs.photoPaperWrap.style.width = `${frameWidth + padLeft + padRight + borderLeft + borderRight}px`;
  refs.photoPaperWrap.style.height = `${frameHeight + padTop + padBottom + borderTop + borderBottom}px`;
  refs.image.style.width = `${frameWidth}px`;
  refs.image.style.height = `${frameHeight}px`;
  syncPhotoMountChrome(refs);
}

function createReportsWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("reports-carousel-container");

  const titleEditorRefs = createEvidenceTitleBarElements();
  const { controlsHost, magnifierToggle, counter } = createEvidenceControlsHost("report-carousel-counter");
  const { descriptionOuter, descriptionPaperWrap, descriptionText } = createEvidenceDescriptionPanel();
  const magnifierOverlayHost = createEvidenceMagnifierOverlayHost();

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

  reportDocumentContent.append(reportDocumentText, emptyState);
  reportPaperWrap.appendChild(reportDocumentContent);
  reportViewport.append(reportPaperWrap);
  container.append(titleEditorRefs.titleBar, controlsHost, reportViewport, descriptionOuter, magnifierOverlayHost);

  const magnifierController = createEvidenceMagnifierController({
    interactionElement: reportViewport,
    overlayHostElement: magnifierOverlayHost,
    sourceElement: reportDocumentContent,
    previewType: "report",
  });

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
    magnifierToggle,
    magnifierController,
    controlsHost,
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
    refs.captionText.textContent = "";
    refs.descriptionText.textContent = localize("descriptionUnavailable", getLanguage());
    return;
  }

  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS, getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS));
  const currentIndex = getEvidenceIndex(EVIDENCE_STORAGE_KEYS.PHOTOS);
  const currentEvidence = photoEvidences[currentIndex];
  const languageCode = getLanguage();
  const renderToken = (refs.renderToken || 0) + 1;
  refs.renderToken = renderToken;

  refs.descriptionText.textContent = localize("loadingDescription", getLanguage());

  const photoCatalogEntry = await getPhotoCatalogEntry(currentEvidence, languageCode);
  const effectiveEvidence = buildEvidenceWithCatalogDefaults(currentEvidence, photoCatalogEntry);
  const photoCaptionText = getPhotoCaptionByEvidence(effectiveEvidence, photoCatalogEntry);
  const currentItem = String(photoCatalogEntry?.photoPath || "").trim();
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

  if (!currentItem) {
    refs.image.classList.add("d-none");
    refs.emptyState.classList.remove("d-none");
    refs.emptyState.textContent = buildMissingCatalogFieldMessage(currentEvidence, localize("photoImageFieldLabel", languageCode), "photoPath", languageCode);
    refs.image.removeAttribute("src");
    refs.counter.textContent = `${currentIndex + 1}/${photoEvidences.length}`;
    refs.captionText.textContent = photoCaptionText;
    refs.descriptionText.textContent = descriptionText || localize("descriptionUnavailable", getLanguage());
    refs.descriptionText.scrollTop = 0;

    if (windowController.previousButtonElement) {
      windowController.previousButtonElement.disabled = false;
    }
    if (windowController.nextButtonElement) {
      windowController.nextButtonElement.disabled = false;
    }

    syncPhotoMountChrome(refs);
    return;
  }

  refs.image.classList.remove("d-none");
  refs.emptyState.classList.add("d-none");
  refs.image.src = currentItem;
  refs.image.alt = photoCaptionText || `${localize("photos", languageCode)} ${currentIndex + 1}`;
  refs.counter.textContent = `${currentIndex + 1}/${photoEvidences.length}`;
  refs.captionText.textContent = photoCaptionText;
  refs.descriptionText.textContent = descriptionText || localize("descriptionUnavailable", getLanguage());
  refs.descriptionText.scrollTop = 0;

  const applyLayout = () => {
    layoutPhotoMount(refs);
  };

  applyLayout();

  if (refs.magnifierController) {
    refs.magnifierController.refreshContent({ imageElement: refs.image });
  }

  refs.image.onload = () => {
    applyLayout();
    if (refs.magnifierController) {
      refs.magnifierController.refreshContent({ imageElement: refs.image });
    }
  };

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
    refs.emptyState.textContent = `${localize("missingImagePrefix", getLanguage())} ${currentItem}`;
  };

  syncPhotoMountChrome(refs);
}

async function getReportTextByEvidence(
  evidence,
  languageCode,
  forceReload = false,
  preloadedReportEntry = null
) {
  const explicitReportText = String(evidence?.reportText || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (explicitReportText) {
    return explicitReportText;
  }

  const reportEntry = preloadedReportEntry
    || await getReportCatalogEntry(evidence, languageCode, forceReload);
  if (!reportEntry) {
    return buildMissingCatalogEntryMessage(evidence, localize("reportContentFieldLabel", languageCode), languageCode);
  }

  const localizedReportText = sanitizeCatalogText(reportEntry?.reportText).trim();
  if (localizedReportText) {
    return localizedReportText;
  }

  return buildMissingCatalogFieldMessage(evidence, localize("reportContentFieldLabel", languageCode), "reportText", languageCode);
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
    refs.descriptionText.textContent = localize("descriptionUnavailable", getLanguage());
    return;
  }

  setEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS, getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS));
  const currentIndex = getEvidenceIndex(EVIDENCE_STORAGE_KEYS.REPORTS);
  const currentEvidence = reportEvidences[currentIndex];
  const languageCode = getLanguage();
  const renderToken = (refs.renderToken || 0) + 1;
  refs.renderToken = renderToken;

  refs.emptyState.classList.add("d-none");
  refs.reportDocumentText.textContent = localize("loadingReport", getLanguage());
  refs.descriptionText.textContent = localize("loadingDescription", getLanguage());

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
  if (refs.magnifierController) {
    refs.magnifierController.refreshContent({ reportTextElement: refs.reportDocumentText });
  }
  refs.counter.textContent = `${currentIndex + 1}/${reportEvidences.length}`;
  refs.reportDocumentContent.scrollTop = 0;
  refs.descriptionText.textContent = descriptionText || localize("descriptionUnavailable", getLanguage());
  refs.descriptionText.scrollTop = 0;
  syncEvidenceTitleWidth(refs, refs.reportPaperWrap);

  if (windowController.previousButtonElement) {
    windowController.previousButtonElement.disabled = false;
  }
  if (windowController.nextButtonElement) {
    windowController.nextButtonElement.disabled = false;
  }
}

// Advances a carousel by `delta`, doing nothing when the collection is empty.
// Uses the count rather than the collection so no evidence is cloned.
function stepEvidenceCarousel(storageKey, delta) {
  if (!getEvidenceCount(storageKey)) {
    return;
  }

  stepEvidenceIndex(storageKey, delta);
}

function wireEvidenceMagnifierToggle(refs) {
  if (!refs?.magnifierToggle || !refs?.magnifierController) {
    return;
  }

  refs.magnifierToggle.addEventListener("click", () => {
    const nextEnabled = refs.magnifierController && !refs.magnifierToggle.classList.contains("is-active");
    refs.magnifierToggle.classList.toggle("is-active", nextEnabled);
    refs.magnifierToggle.setAttribute("aria-pressed", String(nextEnabled));
    refs.magnifierController.setEnabled(nextEnabled);
    if (!nextEnabled) {
      refs.magnifierController.hide();
    }
  });
}

// Photos and Reports are the same window: a carousel with prev/next navigation,
// an editable evidence title, a magnifier, and a description panel. The config
// below is everything that actually differs between them.
const EVIDENCE_CAROUSEL_WINDOWS = {
  photos: {
    kind: "photos",
    titleKey: "photos",
    classNames: ["story-window", "photos-window"],
    closeButtonAriaLabelKey: "closePhotosWindowAriaLabel",
    storageKey: () => EVIDENCE_STORAGE_KEYS.PHOTOS,
    contentRefsMap: () => photosWindowContentRefs,
    createContentElements: createPhotosWindowContentElements,
    updateWindowContent: (windowController) => updatePhotosWindowContent(windowController),
    initialHeightRatio: 0.646,
    getScrollContainer: (refs) => refs.container,
    getResizeTargets: (refs) => [refs.mediaViewport, refs.photoPaperWrap],
    onResize: (refs) => {
      layoutPhotoMount(refs);
      syncPhotoMountChrome(refs);
    },
  },
  reports: {
    kind: "reports",
    titleKey: "reports",
    classNames: ["story-window", "reports-window"],
    closeButtonAriaLabelKey: "closeReportsWindowAriaLabel",
    storageKey: () => EVIDENCE_STORAGE_KEYS.REPORTS,
    contentRefsMap: () => reportsWindowContentRefs,
    createContentElements: createReportsWindowContentElements,
    updateWindowContent: (windowController) => updateReportsWindowContent(windowController),
    getScrollContainer: (refs) => refs.reportDocumentContent,
    getResizeTargets: (refs) => [refs.reportViewport, refs.reportPaperWrap],
    onResize: (refs) => {
      syncEvidenceTitleWidth(refs, refs.reportPaperWrap);
    },
  },
};

function openEvidenceCarouselWindow(config) {
  if (!getElements().gameArea) {
    return;
  }

  const storageKey = config.storageKey();
  const contentRefsMap = config.contentRefsMap();

  let windowController = null;
  windowController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: config.classNames,
    title: localize(config.titleKey, getLanguage()),
    showCarouselNavigation: true,
    ...(config.initialHeightRatio ? { initialHeightRatio: config.initialHeightRatio } : {}),
    onNavigatePrevious: () => {
      stepEvidenceCarousel(storageKey, -1);
      config.updateWindowContent(windowController);
    },
    onNavigateNext: () => {
      stepEvidenceCarousel(storageKey, 1);
      config.updateWindowContent(windowController);
    },
    closeButtonAriaLabel: localize(config.closeButtonAriaLabelKey, getLanguage()),
    onClose: () => {
      const refs = contentRefsMap.get(windowController);
      if (refs?.resizeObserver) {
        refs.resizeObserver.disconnect();
        refs.resizeObserver = null;
      }

      unregisterDesktopWindow(windowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  windowController.setCarouselAriaLabels({
    previous: localize("previousImageAriaLabel", getLanguage()),
    next: localize("nextImageAriaLabel", getLanguage()),
  });

  const contentRefs = config.createContentElements();
  wireEvidenceTitleEditor({
    refs: contentRefs,
    storageKey,
    onCommitted: () => {
      config.updateWindowContent(windowController);
    },
  });

  windowController.setContent(contentRefs.container);
  windowController.scrollContainerElement = config.getScrollContainer(contentRefs);

  if (typeof ResizeObserver !== "undefined") {
    contentRefs.resizeObserver = new ResizeObserver(() => {
      config.onResize(contentRefs);
    });
    config.getResizeTargets(contentRefs).forEach((target) => {
      contentRefs.resizeObserver.observe(target);
    });
  }

  contentRefsMap.set(windowController, contentRefs);
  registerDesktopWindow(windowController, config.kind);
  wireEvidenceMagnifierToggle(contentRefs);

  config.updateWindowContent(windowController);
  windowController.open({ resizable: true, showScrollbar: false });
  bringDesktopWindowToFront(windowController);
  audioManager.playSfx("clickSwitch");
}

function openPhotosWindow() {
  openEvidenceCarouselWindow(EVIDENCE_CAROUSEL_WINDOWS.photos);
}

function openReportsWindow() {
  openEvidenceCarouselWindow(EVIDENCE_CAROUSEL_WINDOWS.reports);
}

// ---------------------------------------------------------------------------
// Progress evidence — the manila EVIDENCE envelope on the noticeboard
//
// The envelope shows every progress evidence item where BOTH
// progressEvidenceActivated (player progress) and
// progressEvidenceDeveloperEnabled (developer decision) are true. See
// progressEvidenceManager.js and docs/progress-evidence-system.md.
// ---------------------------------------------------------------------------

// Three cards on screen at once, per the design.
const PROGRESS_EVIDENCE_VISIBLE_CARD_COUNT = 3;

// Must stay in step with --progress-evidence-slide-duration in styles.css: the
// outgoing track is only replaced once its CSS transition has finished.
const PROGRESS_EVIDENCE_SLIDE_MS = 320;

// Which item sits leftmost in the strip. Purely view state — it is not saved,
// and it is re-clamped against the live eligible list on every render, so the
// envelope can never open onto a stale index.
let progressEvidenceCarouselIndex = 0;

// The one place that decides what a card actually shows. Today: the item's
// PNG when it exists, and a placeholder card carrying the progressEvidenceId
// when it does not. Replacing the placeholder later (or dropping it entirely
// once every image is drawn) means editing this function and nothing else.
// The artwork for one timeline photograph. Shared by the envelope carousel and
// by a filled frame, so both fall back the same way.
function createProgressEvidenceCardMedia(progressTimeLinePhotoId) {
  const imagePath = resolveProgressTimeLineEventImagePath(progressTimeLinePhotoId);
  if (!imagePath) {
    return createProgressEvidencePlaceholder(progressTimeLinePhotoId);
  }

  const image = document.createElement("img");
  image.classList.add("progress-evidence-card-image");
  image.alt = "";

  // A missing PNG is the normal case while the artwork is still being made, so
  // it swaps itself for the placeholder rather than leaving a broken image.
  image.addEventListener("error", () => {
    image.replaceWith(createProgressEvidencePlaceholder(progressTimeLinePhotoId));
  }, { once: true });

  image.src = imagePath;
  return image;
}

// The file an id resolves to, without its directory — what the placeholder
// prints so a developer can see at a glance which PNG is missing.
function getProgressTimeLinePhotoFileName(progressTimeLinePhotoId) {
  const imagePath = resolveProgressTimeLineEventImagePath(progressTimeLinePhotoId);
  return imagePath ? imagePath.split("/").pop() : "";
}

// Stands in for artwork that has not been drawn yet, in the envelope and in a
// filled frame alike. It carries both the photograph's id and the PNG it was
// looking for, which is the whole point: with most art in
// assets/progressEvidenceImages still missing, this is what the drag-and-drop
// is actually tested against.
function createProgressEvidencePlaceholder(progressTimeLinePhotoId) {
  const placeholder = document.createElement("div");
  placeholder.classList.add("progress-evidence-placeholder");

  const caption = document.createElement("div");
  caption.classList.add("progress-evidence-placeholder-caption");
  caption.textContent = resolveLocalizedText("progressEvidencePlaceholderCaption", "Evidence pending");

  const identifier = document.createElement("div");
  identifier.classList.add("progress-evidence-placeholder-id");
  identifier.textContent = progressTimeLinePhotoId;

  const fileName = document.createElement("div");
  fileName.classList.add("progress-evidence-placeholder-filename");
  fileName.textContent = getProgressTimeLinePhotoFileName(progressTimeLinePhotoId);

  placeholder.append(caption, identifier, fileName);
  return placeholder;
}

// One photograph waiting in the envelope. Its id is the progressTimeLineEventId
// of the frame it was drawn for — see the header of
// progressTimeLineEventManager.js for why a photograph is identified by its
// frame rather than by the page it came from.
function createProgressEvidenceCard(entry) {
  const photoId = entry.progressTimeLineEventId;

  const card = document.createElement("div");
  card.classList.add("progress-evidence-card");
  card.dataset.progressTimeLinePhotoId = photoId;
  // No tooltip, and no description in the accessible name either: naming the
  // event a photograph belongs to would hand the player the answer on hover.
  // Working out which frame it fits is the puzzle.
  card.setAttribute("aria-label", photoId);

  makeProgressTimeLinePhotoDraggable(card, photoId, { fromFrameId: "" });

  // The artwork alone, filling the whole card. The id is deliberately not
  // printed under it: the photograph is what the player reasons about, and the
  // id is only ever bookkeeping. It stays on the card as `aria-label` and as
  // the data attribute, so both assistive tech and the tests can still name it.
  card.appendChild(createProgressEvidenceCardMedia(photoId));
  return card;
}

// A strip of exactly `cardCount` cards starting at `startIndex`, wrapping
// around the end of the collection the same way the evidence carousels do. The
// caller decides the count: the settled strip never exceeds the number of
// items, while a stepping strip is allowed one extra (which repeats an item
// when there are only a few — exactly what a short physical carousel does).
function buildProgressEvidenceTrack(entries, startIndex, cardCount) {
  const track = document.createElement("div");
  track.classList.add("progress-evidence-track");

  if (!entries.length) {
    const emptyState = document.createElement("div");
    emptyState.classList.add("progress-evidence-empty");
    emptyState.textContent = resolveLocalizedText("progressEvidenceEmptyMessage", "No evidence yet");
    track.appendChild(emptyState);
    return track;
  }

  for (let offset = 0; offset < cardCount; offset += 1) {
    const wrappedIndex = ((startIndex + offset) % entries.length + entries.length) % entries.length;
    track.appendChild(createProgressEvidenceCard(entries[wrappedIndex]));
  }

  return track;
}

// How far one card slot is, in pixels: a card's width plus the gap between
// cards. Measured from a rendered track rather than assumed, since the card
// width is derived from the window height. Returns 0 when there is nothing to
// measure, which is the caller's cue to skip the animation.
function measureProgressEvidenceCardStep(track) {
  const card = track?.querySelector(".progress-evidence-card");
  if (!card) {
    return 0;
  }

  const cardWidth = card.getBoundingClientRect().width;
  if (!cardWidth) {
    return 0;
  }

  const trackStyle = window.getComputedStyle(track);
  const gap = Number.parseFloat(trackStyle.columnGap || trackStyle.gap || "0");
  return cardWidth + (Number.isFinite(gap) ? gap : 0);
}

// Swaps the visible strip by exactly one card, the way a physical stack of
// photographs would move: the card leaving view slides out and fades, the two
// staying on screen shuffle along into their new slots, and one new card slides
// in from the far side, fading up.
//
// `direction` is 0 for a plain (re)render, 1 for Next and -1 for Previous.
// `progressEvidenceCarouselIndex` has already been stepped by the time this
// runs, so the four-card strip built for the animation starts one item earlier
// than the new index for Next, and exactly at it for Previous.
//
// The strip is left-justified, so for Next the extra card simply hangs off the
// right-hand end and the travel is a plain slot to the left. For Previous the
// arriving card is prepended, which pushes the others right by a slot, so the
// strip starts a slot to the left to hold them in place and animates back to 0.
function renderProgressEvidenceTrack(refs, entries, direction) {
  if (refs.slideTimeoutId !== null) {
    window.clearTimeout(refs.slideTimeoutId);
    refs.slideTimeoutId = null;
  }

  const settledCardCount = Math.min(PROGRESS_EVIDENCE_VISIBLE_CARD_COUNT, entries.length);
  const settledTrack = () => buildProgressEvidenceTrack(entries, progressEvidenceCarouselIndex, settledCardCount);
  const existingTrack = refs.viewport.firstElementChild;
  const cardStep = direction && existingTrack ? measureProgressEvidenceCardStep(existingTrack) : 0;

  if (!direction || !cardStep) {
    refs.viewport.replaceChildren(settledTrack());
    return;
  }

  const isNext = direction > 0;
  const steppingTrack = buildProgressEvidenceTrack(
    entries,
    isNext ? progressEvidenceCarouselIndex - 1 : progressEvidenceCarouselIndex,
    settledCardCount + 1
  );

  const steppingCards = Array.from(steppingTrack.querySelectorAll(".progress-evidence-card"));
  const leavingCard = isNext ? steppingCards[0] : steppingCards[steppingCards.length - 1];
  const enteringCard = isNext ? steppingCards[steppingCards.length - 1] : steppingCards[0];

  // `is-stepping` suppresses the transitions so the starting position and the
  // incoming card's transparency are set without animating into them.
  steppingTrack.classList.add("is-stepping", isNext ? "is-stepping-next" : "is-stepping-prev");
  steppingTrack.style.setProperty(
    "--progress-evidence-track-offset",
    isNext ? "0px" : `${-cardStep}px`
  );
  enteringCard?.classList.add("is-card-entering");
  refs.viewport.replaceChildren(steppingTrack);

  // Read a layout property so that starting state is committed before the
  // transitions come back on, otherwise the browser collapses both states into
  // one frame and nothing animates.
  void steppingTrack.offsetWidth;

  window.requestAnimationFrame(() => {
    steppingTrack.classList.remove("is-stepping");
    steppingTrack.style.setProperty(
      "--progress-evidence-track-offset",
      isNext ? `${-cardStep}px` : "0px"
    );
    enteringCard?.classList.remove("is-card-entering");
    leavingCard?.classList.add("is-card-leaving");
  });

  refs.slideTimeoutId = window.setTimeout(() => {
    refs.slideTimeoutId = null;
    refs.viewport.replaceChildren(settledTrack());
  }, PROGRESS_EVIDENCE_SLIDE_MS);
}

function createProgressEvidenceWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("progress-evidence-carousel-container");

  const controlsHost = document.createElement("div");
  controlsHost.classList.add("progress-evidence-controls-host");

  const counter = document.createElement("div");
  counter.classList.add("progress-evidence-carousel-counter");
  controlsHost.appendChild(counter);

  const viewport = document.createElement("div");
  viewport.classList.add("progress-evidence-viewport");

  // The envelope is itself a drop target, so a photograph dragged out of a
  // frame can be put back into the pool. There are no listeners for it here:
  // the release is resolved from this element's geometry in
  // resolveProgressTimeLineDropTarget().
  container.append(controlsHost, viewport);

  return {
    container,
    controlsHost,
    counter,
    viewport,
    slideTimeoutId: null,
  };
}

// Re-reads the eligible collection from progressEvidenceManager every time, so
// the envelope always reflects current progress rather than whatever it showed
// when it was last opened.
function updateProgressEvidenceWindowContent(windowController, { direction = 0 } = {}) {
  const refs = progressEvidenceWindowContentRefs.get(windowController);
  if (!refs) {
    return;
  }

  const eligibleEntries = getEnvelopeProgressTimeLinePhotos();

  // Everything fits on screen at three or fewer, so there is nothing to scroll
  // through: the cards simply fill the strip left to right as the player
  // collects them, and the navigation stays disabled until a fourth arrives.
  const isCarouselNavigable = eligibleEntries.length > PROGRESS_EVIDENCE_VISIBLE_CARD_COUNT;

  progressEvidenceCarouselIndex = isCarouselNavigable
    ? ((progressEvidenceCarouselIndex % eligibleEntries.length) + eligibleEntries.length) % eligibleEntries.length
    : 0;

  refs.counter.textContent = eligibleEntries.length
    ? `${progressEvidenceCarouselIndex + 1}/${eligibleEntries.length}`
    : "0/0";

  if (windowController.previousButtonElement) {
    windowController.previousButtonElement.disabled = !isCarouselNavigable;
  }
  if (windowController.nextButtonElement) {
    windowController.nextButtonElement.disabled = !isCarouselNavigable;
  }

  renderProgressEvidenceTrack(refs, eligibleEntries, isCarouselNavigable ? direction : 0);
}

// A no-op unless there is more evidence than fits on screen, which matches the
// disabled state of the nav buttons.
function stepProgressEvidenceCarousel(windowController, delta) {
  const eligibleCount = getEnvelopeProgressTimeLinePhotos().length;
  if (eligibleCount <= PROGRESS_EVIDENCE_VISIBLE_CARD_COUNT) {
    return;
  }

  progressEvidenceCarouselIndex = ((progressEvidenceCarouselIndex + delta) % eligibleCount + eligibleCount) % eligibleCount;
  updateProgressEvidenceWindowContent(windowController, { direction: delta > 0 ? 1 : -1 });
}

function openProgressEvidenceWindow() {
  if (!getElements().gameArea) {
    return;
  }

  let windowController = null;
  windowController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window", "progress-evidence-window"],
    title: localize("progressEvidenceWindowTitle", getLanguage()),
    showCarouselNavigation: true,
    // Deliberately small, and docked bottom-left after open(). The envelope is
    // a working surface now: the player drags photographs out of it onto the
    // frames behind, and drags them back. Anything larger blankets the corkboard
    // — at the original 0.96 x 0.98 a photograph already sitting in a frame
    // could not be picked up at all, because the window was on top of it. This
    // size keeps a clear working area to the right of the envelope at every
    // zoom level, which is what makes frame-to-frame and frame-to-envelope
    // drags possible.
    initialWidthRatio: 0.32,
    initialHeightRatio: 0.38,
    onNavigatePrevious: () => {
      stepProgressEvidenceCarousel(windowController, -1);
    },
    onNavigateNext: () => {
      stepProgressEvidenceCarousel(windowController, 1);
    },
    closeButtonAriaLabel: localize("closeProgressEvidenceWindowAriaLabel", getLanguage()),
    onClose: () => {
      const refs = progressEvidenceWindowContentRefs.get(windowController);
      if (refs?.slideTimeoutId !== null && refs?.slideTimeoutId !== undefined) {
        window.clearTimeout(refs.slideTimeoutId);
        refs.slideTimeoutId = null;
      }

      unregisterDesktopWindow(windowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  windowController.setCarouselAriaLabels({
    previous: localize("previousImageAriaLabel", getLanguage()),
    next: localize("nextImageAriaLabel", getLanguage()),
  });

  const contentRefs = createProgressEvidenceWindowContentElements();
  windowController.setContent(contentRefs.container);
  windowController.scrollContainerElement = contentRefs.container;

  progressEvidenceWindowContentRefs.set(windowController, contentRefs);
  registerDesktopWindow(windowController, "progress-evidence");

  updateProgressEvidenceWindowContent(windowController);
  windowController.open({ resizable: true, showScrollbar: false });

  // Docked bottom-left rather than centred. DesktopWindow centres by default,
  // which for this one puts it exactly over the middle of the corkboard — the
  // part of the board the player is working on, and where a frame lands when it
  // is panned into view. Sitting in the corner keeps every frame reachable, and
  // keeps the envelope itself reachable as a drop target at the same time.
  const envelopeParent = getElements().gameArea;
  if (envelopeParent && windowController.rootElement) {
    const envelopeElement = windowController.rootElement;
    envelopeElement.style.left = "24px";
    envelopeElement.style.top = `${Math.max(
      24,
      envelopeParent.clientHeight - envelopeElement.offsetHeight - 24
    )}px`;
  }

  bringDesktopWindowToFront(windowController);
  audioManager.playSfx("clickSwitch");
}

// Re-renders every open envelope window. Called after an activation so an
// envelope left open while the player works picks the new item up.
function refreshOpenProgressEvidenceWindows() {
  findExistingWindowsByKind("progress-evidence").forEach((windowController) => {
    updateProgressEvidenceWindowContent(windowController);
  });
}

// Activation entry points. Each resolves the service + item to its
// progressEvidenceId through the registry; items with no registry entry are
// ignored rather than throwing.
function activateProgressEvidenceForWebRecord(detail) {
  const openedService = String(detail?.replay?.siteId || "").trim().toLowerCase();
  const openedRecordId = String(detail?.recordId || "").trim();
  if (!openedService || !openedRecordId) {
    return;
  }

  if (activateProgressEvidenceForItem(openedService, openedRecordId)) {
    refreshOpenProgressEvidenceWindows();
  }
}

function activateProgressEvidenceForStandalonePage(pageId) {
  if (activateProgressEvidenceForItem(PROGRESS_EVIDENCE_SERVICES.STANDALONE, pageId)) {
    refreshOpenProgressEvidenceWindows();
  }
}

function activateProgressEvidenceForFacsimileReport(reportId) {
  if (activateProgressEvidenceForItem(PROGRESS_EVIDENCE_SERVICES.FACSIMILE, reportId)) {
    refreshOpenProgressEvidenceWindows();
  }
}

function activateProgressEvidenceForDesktopItem(itemId) {
  if (activateProgressEvidenceForItem(PROGRESS_EVIDENCE_SERVICES.DESKTOP, itemId)) {
    refreshOpenProgressEvidenceWindows();
  }
}

// Developer/console surface. `activateProgressEvidence` is the documented way
// for any other part of the game to record a milestone; the rest are
// inspection helpers and the developer-only display switch, which is never
// touched by gameplay code.
window.activateProgressEvidence = function activateProgressEvidenceFromGame(progressEvidenceId) {
  const activated = activateProgressEvidence(progressEvidenceId);
  if (activated) {
    refreshOpenProgressEvidenceWindows();
  }
  return activated;
};

// Sets a track's unlocked flag — the documented way for a story trigger to
// reveal a recording in the ECHOTRAIL library.
//
// Every track carries that flag. The authored six are permanently true; every
// other file in audio/music/ starts false and is invisible until this is called
// for it, which is what lets *all* the music be copied into the folder up front
// and revealed a piece at a time as the player earns it. Nothing is fetched for
// a locked track, so its filename never appears in a network log either.
//
// Takes a filename ("nightMail.mp3") or a path ending in one; a bare filename is
// resolved against audio/music/. Returns whether the flag actually changed, so a
// trigger that fires twice, or names one of the permanently-unlocked six, is a
// no-op rather than a duplicated row.
//
// What the track is *called* is not this function's business: a file named
// backgroundMusic_<number>.mp3 is shown under its invented title and is eligible
// for the in-game music rotation, and anything else is listed under its own
// filename and stays out of the rotation for good. Both halves of that rule live
// in echotrailManager.js.
window.addAudioToEchotrail = function addAudioToEchotrail(fileName) {
  const unlocked = unlockEchotrailFileName(fileName);
  if (!unlocked) {
    return false;
  }

  // The rotation is rebuilt rather than appended to, so it always agrees with
  // the library the player can see.
  audioManager.refreshGameMusicTracks(getEchotrailUnlockedFileNames());
  refreshOpenEchotrailWindows();
  return true;
};

// Any open library window rebuilds its rows. Kept separate from the trigger
// above so a save being loaded can reuse it.
function refreshOpenEchotrailWindows() {
  activeDesktopWindows.forEach((windowController) => {
    if (desktopWindowKinds.get(windowController) === "computer-echotrail") {
      echotrailWindowContentRefs.get(windowController)?.relocalize?.();
    }
  });
}

// ---------------------------------------------------------------------------
// Progress timeline events — the dated frames pinned to the corkboard
//
// The frames are static: one per developer-enabled event, drawn in
// progressTimeLineEventId order, each captioned with its own date. The player
// drags a photograph out of the EVIDENCE envelope and drops it into a frame;
// the drop is recorded with a correct/incorrect flag, which a later validation
// pass over consecutive runs will read. See progressTimeLineEventManager.js and
// docs/progress-timeline-event-system.md.
// ---------------------------------------------------------------------------

// Photograph dragging is built on pointer events and a floating ghost, NOT on
// the HTML5 drag-and-drop API.
//
// Native DnD does not survive this screen. The envelope window opens at 96% x
// 98%, so every frame the player is dragging towards sits *behind* it, which
// means the drop has to pass through the window — and toggling pointer-events
// on the window mid-drag is exactly the kind of thing that silently kills a
// native drag in Chromium. On top of that, .desktop-viewport owns a pointerdown
// handler for panning the scene, which competes for the same gesture. The
// result was a drag that never started at all.
//
// Doing it by hand costs a few dozen lines and removes every one of those
// failure modes: the drop target is resolved from geometry rather than from
// hit-testing through a stack of elements, so it cannot be blocked by whatever
// happens to be on top.

// How far the pointer must travel before a press becomes a drag. Below this a
// press is just a press, so clicking a card never accidentally lifts it.
const PROGRESS_TIMELINE_DRAG_THRESHOLD_PX = 5;

// The drag in flight, or null. One at a time, by construction.
let activeProgressTimeLinePhotoDrag = null;

// While a photograph is in flight the envelope window fades back so the board
// underneath is visible, and stops taking pointer events so it cannot swallow
// the release. Purely visual: the drop target is decided from geometry.
function setProgressEvidenceWindowDragState(isDragging) {
  findExistingWindowsByKind("progress-evidence").forEach((windowController) => {
    const element = windowController.rootElement;
    if (!element) {
      return;
    }

    element.classList.toggle("is-photo-drag-active", isDragging === true);
    element.classList.toggle("is-photo-drag-passthrough", isDragging === true);
  });
}

// The thing that follows the pointer. A copy of the photograph, not the element
// itself, so the card stays in the carousel (dimmed) while it is being moved.
function createProgressTimeLinePhotoGhost(progressTimeLinePhotoId) {
  const ghost = document.createElement("div");
  ghost.classList.add("progress-timeline-photo-ghost");
  ghost.appendChild(createProgressEvidenceCardMedia(progressTimeLinePhotoId));
  document.body.appendChild(ghost);
  return ghost;
}

function isPointWithin(element, clientX, clientY) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

// Which frame (or the envelope) is under the pointer, resolved from bounding
// boxes rather than elementFromPoint. Geometry cannot be intercepted by an
// overlay, which is the whole reason this is not native DnD.
//
// The envelope window floats over the board, so a point can be inside both it
// and a frame at once. Which one wins depends on where the drag began, because
// that is what the player is expressing:
//
//   from the envelope  ->  they are placing, so frames win
//   from a frame       ->  they may be putting it back, so the envelope wins
function resolveProgressTimeLineDropTarget(clientX, clientY, { preferEnvelope = false } = {}) {
  const viewport = document.querySelector(".progress-evidence-viewport");
  const isOverEnvelope = isPointWithin(viewport, clientX, clientY);

  if (preferEnvelope && isOverEnvelope) {
    return { kind: "envelope" };
  }

  const frameElements = document.querySelectorAll(
    "#progressTimeLineBoard .progress-timeline-frame"
  );

  for (const frameElement of frameElements) {
    if (isPointWithin(frameElement, clientX, clientY)) {
      return { kind: "frame", frameId: frameElement.dataset.progressTimeLineEventId };
    }
  }

  return isOverEnvelope ? { kind: "envelope" } : { kind: "none" };
}

function updateProgressTimeLineDropHighlight(clientX, clientY) {
  const target = resolveProgressTimeLineDropTarget(clientX, clientY, {
    preferEnvelope: Boolean(activeProgressTimeLinePhotoDrag?.fromFrameId),
  });

  document.querySelectorAll("#progressTimeLineBoard .progress-timeline-frame").forEach((frameElement) => {
    frameElement.classList.toggle(
      "is-drop-target",
      target.kind === "frame" && frameElement.dataset.progressTimeLineEventId === target.frameId
    );
  });

  const viewport = document.querySelector(".progress-evidence-viewport");
  if (viewport) {
    viewport.classList.toggle("is-drop-target", target.kind === "envelope");
  }
}

function clearProgressTimeLineDropHighlight() {
  document.querySelectorAll("#progressTimeLineBoard .progress-timeline-frame")
    .forEach((frameElement) => frameElement.classList.remove("is-drop-target"));
  document.querySelector(".progress-evidence-viewport")?.classList.remove("is-drop-target");
}

function finishProgressTimeLinePhotoDrag(clientX, clientY) {
  const drag = activeProgressTimeLinePhotoDrag;
  if (!drag) {
    return;
  }

  activeProgressTimeLinePhotoDrag = null;
  window.removeEventListener("pointermove", handleProgressTimeLinePhotoPointerMove, true);
  window.removeEventListener("pointerup", handleProgressTimeLinePhotoPointerUp, true);
  window.removeEventListener("pointercancel", handleProgressTimeLinePhotoPointerUp, true);

  drag.sourceElement?.classList.remove("is-dragging");
  drag.ghost?.remove();
  clearProgressTimeLineDropHighlight();
  setProgressEvidenceWindowDragState(false);

  // A press that never passed the threshold was a click, not a drag.
  if (!drag.hasStarted) {
    return;
  }

  const target = resolveProgressTimeLineDropTarget(clientX, clientY, {
    preferEnvelope: Boolean(drag.fromFrameId),
  });

  if (target.kind === "frame") {
    handleProgressTimeLineDrop(target.frameId, drag.progressTimeLinePhotoId);
    return;
  }

  // Dropped on the envelope: only a photograph that came out of a frame has
  // anything to undo.
  if (target.kind === "envelope" && drag.fromFrameId) {
    if (returnProgressTimeLinePhotoToEnvelope(drag.fromFrameId)) {
      renderProgressTimeLineBoard();
      refreshOpenProgressEvidenceWindows();
      audioManager.playSfx("clickSwitch");
    }
  }

  // Dropped anywhere else: the photograph stays exactly where it started.
}

function handleProgressTimeLinePhotoPointerMove(event) {
  const drag = activeProgressTimeLinePhotoDrag;
  if (!drag) {
    return;
  }

  if (!drag.hasStarted) {
    const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (travelled < PROGRESS_TIMELINE_DRAG_THRESHOLD_PX) {
      return;
    }

    drag.hasStarted = true;
    drag.ghost = createProgressTimeLinePhotoGhost(drag.progressTimeLinePhotoId);
    drag.sourceElement?.classList.add("is-dragging");
    setProgressEvidenceWindowDragState(true);
  }

  drag.ghost.style.left = `${event.clientX}px`;
  drag.ghost.style.top = `${event.clientY}px`;
  updateProgressTimeLineDropHighlight(event.clientX, event.clientY);
}

function handleProgressTimeLinePhotoPointerUp(event) {
  finishProgressTimeLinePhotoDrag(event.clientX, event.clientY);
}

// Wires one draggable photograph, whether it is sitting in the envelope
// (fromFrameId "") or in a frame.
function makeProgressTimeLinePhotoDraggable(element, progressTimeLinePhotoId, { fromFrameId = "" } = {}) {
  // Native dragging is explicitly off: a stray HTML5 drag on the inner <img>
  // would fight the pointer drag for the same gesture.
  element.draggable = false;

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || activeProgressTimeLinePhotoDrag) {
      return;
    }

    // Keep the gesture away from .desktop-viewport's scene-panning pointerdown
    // handler, which would otherwise pan the board while the photograph moves.
    event.preventDefault();
    event.stopPropagation();

    activeProgressTimeLinePhotoDrag = {
      progressTimeLinePhotoId,
      fromFrameId,
      sourceElement: element,
      startX: event.clientX,
      startY: event.clientY,
      hasStarted: false,
      ghost: null,
    };

    window.addEventListener("pointermove", handleProgressTimeLinePhotoPointerMove, true);
    window.addEventListener("pointerup", handleProgressTimeLinePhotoPointerUp, true);
    window.addEventListener("pointercancel", handleProgressTimeLinePhotoPointerUp, true);
  });

  // The inner <img> is natively draggable; stop it starting a second, competing
  // drag on the same press.
  element.addEventListener("dragstart", (event) => event.preventDefault());
}

const PROGRESS_TIMELINE_MONTH_KEYS = [
  "monthJanuaryShort", "monthFebruaryShort", "monthMarchShort", "monthAprilShort",
  "monthMayShort", "monthJuneShort", "monthJulyShort", "monthAugustShort",
  "monthSeptemberShort", "monthOctoberShort", "monthNovemberShort", "monthDecemberShort",
];

const PROGRESS_TIMELINE_MONTH_FALLBACKS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The reserved "no fixed in-fiction year" sentinel (see the developer guide).
const PROGRESS_TIMELINE_UNDATED_YEAR = 9999;

// The caption printed under a frame. A month of 00 prints the bare year, which
// is the authored meaning of "month unknown" rather than a formatting failure.
function formatProgressTimeLineEventDate(year) {
  const parsed = parseProgressTimeLineEventYear(year);
  if (!parsed) {
    return "";
  }

  if (parsed.year === PROGRESS_TIMELINE_UNDATED_YEAR) {
    return resolveLocalizedText("progressTimeLineUndatedLabel", "Present day");
  }

  if (!parsed.hasKnownMonth) {
    return String(parsed.year);
  }

  const monthIndex = parsed.month - 1;
  const monthName = resolveLocalizedText(
    PROGRESS_TIMELINE_MONTH_KEYS[monthIndex],
    PROGRESS_TIMELINE_MONTH_FALLBACKS[monthIndex]
  );
  return `${monthName} ${parsed.year}`;
}

// The player's note is shown on hover of the photograph itself, which is what
// they are trying to place. Put on the slot rather than the frame so it does
// not also fire over the input they are typing into — and so that on a locked
// frame, where the slot carries no title, the hover falls through to the
// frame's own title and shows the event description instead.
//
// This is the one tooltip in the game that is never localized: it is the
// player's own words. Nothing has to enforce that — the tooltip layer draws a
// title verbatim (see tooltipManager.js).
function applyProgressTimeLineNoteTooltip(slot, noteText) {
  if (!slot) {
    return;
  }

  const trimmedNote = String(noteText || "").trim();
  if (trimmedNote) {
    slot.title = trimmedNote;
    return;
  }

  slot.removeAttribute("title");
}

// The note row above a frame: a one-line field the player can write anything
// in, plus a cross that empties it.
//
// The row itself is always present and always the same height, even on a locked
// frame that no longer has a field in it — otherwise a frame would shrink the
// moment it locked and reflow every row on the board around it.
function renderProgressTimeLineFrameNote(frame, progressTimeLineEventId, isLocked) {
  const noteRow = frame.querySelector(".progress-timeline-frame-note");
  const slot = frame.querySelector(".progress-timeline-frame-slot");
  if (!noteRow) {
    return;
  }

  noteRow.replaceChildren();
  applyProgressTimeLineNoteTooltip(slot, "");

  // Settled frame: the question the note existed to answer is gone, so the
  // field and its cross go with it. The note text itself was already cleared
  // when the frame locked (see validateProgressTimeLinePlacements).
  if (isLocked) {
    return;
  }

  const noteText = getProgressTimeLineEventNote(progressTimeLineEventId);

  const input = document.createElement("input");
  input.type = "text";
  input.classList.add("progress-timeline-frame-note-input");
  input.value = noteText;
  input.placeholder = resolveLocalizedText("progressTimeLineNotePlaceholder", "Add a note…");
  input.setAttribute(
    "aria-label",
    resolveLocalizedText("progressTimeLineNoteAriaLabel", "Your note for this frame")
  );

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.classList.add("progress-timeline-frame-note-clear");
  clearButton.textContent = "×";
  clearButton.setAttribute(
    "aria-label",
    resolveLocalizedText("progressTimeLineClearNoteAriaLabel", "Clear this note")
  );

  // The noticeboard pans from a pointerdown anywhere in the viewport, so
  // without stopping it here a click into the field — or a drag to select the
  // text already in it — would haul the whole board around instead.
  [input, clearButton].forEach((element) => {
    element.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  });

  // Saved as it is typed rather than on blur, so a note is never lost to an
  // autosave (or a drop that redraws the board) landing mid-edit.
  input.addEventListener("input", () => {
    setProgressTimeLineEventNote(progressTimeLineEventId, input.value);
    applyProgressTimeLineNoteTooltip(slot, input.value);
  });

  clearButton.addEventListener("click", (event) => {
    event.stopPropagation();
    input.value = "";
    setProgressTimeLineEventNote(progressTimeLineEventId, "");
    applyProgressTimeLineNoteTooltip(slot, "");
    input.focus();
    audioManager.playSfx("clickSwitch");
  });

  noteRow.append(input, clearButton);
  applyProgressTimeLineNoteTooltip(slot, noteText);
}

// What sits inside a frame: the placed photograph when there is one, otherwise
// an empty slot. Correctness is expressed as a class rather than as text, so the
// frame does not spell out the answer.
function renderProgressTimeLineFrameContent(frame, progressTimeLineEventId) {
  const slot = frame.querySelector(".progress-timeline-frame-slot");
  if (!slot) {
    return;
  }

  slot.replaceChildren();
  frame.classList.remove("is-filled", "is-correct", "is-incorrect", "is-locked");
  // No tooltip while the placement is still in play — see below, where it is
  // restored once (and only once) the frame locks in.
  frame.removeAttribute("title");

  const placement = getProgressTimeLineFramePlacement(progressTimeLineEventId);

  // Every frame gets a note row, filled or not: an empty frame is exactly where
  // a player wants to jot down what they think belongs in it.
  renderProgressTimeLineFrameNote(frame, progressTimeLineEventId, placement?.isLocked === true);

  if (!placement) {
    frame.dataset.placedProgressTimeLinePhotoId = "";
    frame.dataset.placementCorrect = "";
    frame.dataset.placementLocked = "";
    return;
  }

  frame.dataset.placedProgressTimeLinePhotoId = placement.progressTimeLinePhotoId;
  frame.dataset.placementCorrect = placement.isCorrect ? "true" : "false";
  frame.dataset.placementLocked = placement.isLocked ? "true" : "false";
  frame.classList.add("is-filled", placement.isCorrect ? "is-correct" : "is-incorrect");

  // The same media builder the envelope uses, so a frame falls back to the
  // id-and-filename placeholder exactly the way a card does.
  const media = createProgressEvidenceCardMedia(placement.progressTimeLinePhotoId);
  slot.appendChild(media);

  if (placement.isLocked) {
    // A locked frame is settled: no cross button, and nothing to drag out.
    // Locking is also the one point the puzzle is over for this frame, so —
    // and only now — the description stops being a spoiler and the tooltip
    // is switched on, permanently (a locked frame never unlocks).
    frame.classList.add("is-locked");
    const description = getProgressTimeLineEventDescription(progressTimeLineEventId, getLanguage());
    if (description) {
      frame.title = description;
    }
    return;
  }

  makeProgressTimeLinePhotoDraggable(slot, placement.progressTimeLinePhotoId, {
    fromFrameId: progressTimeLineEventId,
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.classList.add("progress-timeline-frame-remove");
  removeButton.textContent = "×";
  removeButton.setAttribute(
    "aria-label",
    resolveLocalizedText("progressTimeLineRemovePhotoAriaLabel", "Return this photograph to the envelope")
  );
  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!returnProgressTimeLinePhotoToEnvelope(progressTimeLineEventId)) {
      return;
    }

    renderProgressTimeLineBoard();
    refreshOpenProgressEvidenceWindows();
    audioManager.playSfx("clickSwitch");
  });

  frame.appendChild(removeButton);
}

function createProgressTimeLineFrame(entry) {
  const frame = document.createElement("div");
  frame.classList.add("progress-timeline-frame");
  frame.dataset.progressTimeLineEventId = entry.progressTimeLineEventId;

  // Filled in by renderProgressTimeLineFrameContent(), which is the only thing
  // that knows whether this frame is locked and therefore past needing a note.
  const note = document.createElement("div");
  note.classList.add("progress-timeline-frame-note");

  const slot = document.createElement("div");
  slot.classList.add("progress-timeline-frame-slot");

  const date = document.createElement("div");
  date.classList.add("progress-timeline-frame-date");
  date.textContent = formatProgressTimeLineEventDate(entry.year);

  // The accessible name is only the date already printed under the frame —
  // never the description, which would say what belongs here, the one thing
  // the player is meant to work out. No tooltip either, while that is still
  // true: renderProgressTimeLineFrameContent() switches one on, permanently,
  // once (and only once) the frame locks in and the puzzle for it is over.
  frame.setAttribute("aria-label", date.textContent || entry.progressTimeLineEventId);

  frame.append(note, slot, date);

  // No drop listeners here: the drag is pointer-based, and the release is
  // resolved from frame geometry in resolveProgressTimeLineDropTarget().
  return frame;
}

// Records a drop and redraws. Any photograph may be dropped in any frame:
// a wrong one is stored as incorrect rather than bounced, which is what lets
// the player lay the board out and be told later how they did. Only a matching
// one counts towards the lock threshold.
//
// The whole board is redrawn rather than just this frame, because one drop can
// move a photograph out of another frame, displace one back to the envelope,
// and lock a batch — all at once.
function handleProgressTimeLineDrop(progressTimeLineFrameId, progressTimeLinePhotoId) {
  const placement = placePhotoOnProgressTimeLineFrame(progressTimeLineFrameId, progressTimeLinePhotoId);
  if (!placement) {
    return;
  }

  renderProgressTimeLineBoard();
  refreshOpenProgressEvidenceWindows();

  // Locking is the one thing on this board worth announcing: it is the player's
  // only confirmation that a batch was right, since individual frames never say.
  if (placement.lockedFrameIds.length) {
    showNotifcation(
      "reward",
      resolveLocalizedText("progressTimeLineSectionValidated", "Timeline section validated"),
      3000
    );
  }

  audioManager.playSfx("clickSwitch");
}

// ---------------------------------------------------------------------------
// Moving the EVIDENCE envelope around the corkboard
//
// The envelope is pinned into the noticeboard *world*, not to the screen, so
// once the board grew tall enough to need panning it would disappear off the
// bottom as soon as the player scrolled up to the later rows — leaving nothing
// to open and no way to get a photograph out. Letting them drag it up the board
// to whatever row they are working on is what fixes that.
//
// Same shape as the photograph drag: a threshold separates a move from a click,
// so clicking the envelope still opens it.
// ---------------------------------------------------------------------------

const PROGRESS_EVIDENCE_ENVELOPE_DRAG_THRESHOLD_PX = 5;

let activeProgressEvidenceEnvelopeDrag = null;
// Set when a drag actually happened, so the click it is followed by can be
// swallowed rather than opening the window the player was only repositioning.
let progressEvidenceEnvelopeWasDragged = false;
// The envelope element is static markup, so its listeners must only ever be
// bound once however many times a game is started or loaded.
let progressEvidenceEnvelopeDragInitialized = false;

// The noticeboard scene carries the zoom on its transform, so screen pixels and
// world pixels differ. Derived from the rendered width rather than read out of
// the transform, which keeps it correct whatever else is applied.
function getNoticeboardSceneScale() {
  const scene = getElements().noticeboardScene;
  if (!scene?.offsetWidth) {
    return 1;
  }

  const scale = scene.getBoundingClientRect().width / scene.offsetWidth;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

// Writes the stored world position onto the element. Switching to left/top
// means dropping the CSS right/bottom anchor, which is what positions it until
// the player first moves it.
function applyProgressEvidenceEnvelopePosition() {
  const envelope = getElements().progressEvidenceEnvelope;
  if (!envelope) {
    return;
  }

  const position = getProgressEvidenceEnvelopePosition();
  if (!position) {
    envelope.style.left = "";
    envelope.style.top = "";
    envelope.style.right = "";
    envelope.style.bottom = "";
    return;
  }

  envelope.style.left = `${position.x}px`;
  envelope.style.top = `${position.y}px`;
  envelope.style.right = "auto";
  envelope.style.bottom = "auto";
}

function handleProgressEvidenceEnvelopePointerMove(event) {
  const drag = activeProgressEvidenceEnvelopeDrag;
  if (!drag) {
    return;
  }

  if (!drag.hasStarted) {
    const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (travelled < PROGRESS_EVIDENCE_ENVELOPE_DRAG_THRESHOLD_PX) {
      return;
    }

    drag.hasStarted = true;
    progressEvidenceEnvelopeWasDragged = true;
    getElements().progressEvidenceEnvelope?.classList.add("is-being-moved");
  }

  const scene = getElements().noticeboardScene;
  const envelope = getElements().progressEvidenceEnvelope;
  if (!scene || !envelope) {
    return;
  }

  const worldX = drag.originX + (event.clientX - drag.startX) / drag.scale;
  const worldY = drag.originY + (event.clientY - drag.startY) / drag.scale;

  // Kept inside the scene, so the envelope can never be shoved somewhere the
  // player cannot pan to.
  const maxX = Math.max(0, scene.offsetWidth - envelope.offsetWidth);
  const maxY = Math.max(0, scene.offsetHeight - envelope.offsetHeight);

  setProgressEvidenceEnvelopePosition({
    x: Math.min(maxX, Math.max(0, worldX)),
    y: Math.min(maxY, Math.max(0, worldY)),
  });
  applyProgressEvidenceEnvelopePosition();
}

function handleProgressEvidenceEnvelopePointerUp() {
  activeProgressEvidenceEnvelopeDrag = null;
  window.removeEventListener("pointermove", handleProgressEvidenceEnvelopePointerMove, true);
  window.removeEventListener("pointerup", handleProgressEvidenceEnvelopePointerUp, true);
  window.removeEventListener("pointercancel", handleProgressEvidenceEnvelopePointerUp, true);
  getElements().progressEvidenceEnvelope?.classList.remove("is-being-moved");
}

function initializeProgressEvidenceEnvelopeDrag() {
  const envelope = getElements().progressEvidenceEnvelope;
  if (!envelope || progressEvidenceEnvelopeDragInitialized) {
    return;
  }

  progressEvidenceEnvelopeDragInitialized = true;

  envelope.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || activeProgressEvidenceEnvelopeDrag) {
      return;
    }

    // Keep the press away from .desktop-viewport's scene-panning handler, which
    // would otherwise pan the board while the envelope moves.
    event.stopPropagation();

    const scene = getElements().noticeboardScene;
    if (!scene) {
      return;
    }

    const scale = getNoticeboardSceneScale();
    const envelopeRect = envelope.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();

    activeProgressEvidenceEnvelopeDrag = {
      startX: event.clientX,
      startY: event.clientY,
      originX: (envelopeRect.left - sceneRect.left) / scale,
      originY: (envelopeRect.top - sceneRect.top) / scale,
      scale,
      hasStarted: false,
    };

    window.addEventListener("pointermove", handleProgressEvidenceEnvelopePointerMove, true);
    window.addEventListener("pointerup", handleProgressEvidenceEnvelopePointerUp, true);
    window.addEventListener("pointercancel", handleProgressEvidenceEnvelopePointerUp, true);
  });

  // Swallow the click that follows a move, so repositioning the envelope does
  // not also open it. Capture phase, to beat the open handler.
  envelope.addEventListener("click", (event) => {
    if (!progressEvidenceEnvelopeWasDragged) {
      return;
    }

    progressEvidenceEnvelopeWasDragged = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

// How many frames sit in one row of the snake before it turns and climbs.
const PROGRESS_TIMELINE_FRAMES_PER_ROW = 6;

// One arrow between two frames. `direction` is the way the timeline is
// travelling at that point: "right" and "left" along a row, "up" at a turn.
function createProgressTimeLineArrow(direction) {
  const arrow = document.createElement("div");
  arrow.classList.add("progress-timeline-arrow", `is-${direction}`);
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "➜";
  return arrow;
}

// The oversized empty frame the whole timeline points at: the unanswered
// question the board is being built to answer.
function createProgressTimeLineFinalFrame() {
  const finalFrame = document.createElement("div");
  finalFrame.classList.add("progress-timeline-final-frame");
  finalFrame.id = "progressTimeLineFinalFrame";
  finalFrame.setAttribute(
    "aria-label",
    resolveLocalizedText("progressTimeLineFinalFrameAriaLabel", "The unanswered question")
  );

  const slot = document.createElement("div");
  slot.classList.add("progress-timeline-final-frame-slot");

  const questionMark = document.createElement("div");
  questionMark.classList.add("progress-timeline-final-frame-question");
  questionMark.textContent = "?";

  slot.appendChild(questionMark);
  finalFrame.appendChild(slot);
  return finalFrame;
}

// Draws every developer-enabled frame in chronological order, snaking:
// the earliest is bottom-left, the row runs right, then climbs a row and runs
// back left, and so on up the board. Arrows follow that path, and the last
// frame points up at the oversized question-mark frame centred at the top.
//
// The snake is pure CSS once the frames are chunked into rows: the board is
// laid out column-reverse so row 0 sits at the bottom, and odd rows are
// row-reverse so they run right-to-left.
//
// Safe to call again: it rebuilds rather than appending, which is what makes it
// usable as the "re-render after a load" hook too.
function renderProgressTimeLineBoard() {
  const noticeboardScene = getElements().noticeboardScene;
  if (!noticeboardScene) {
    return;
  }

  let board = noticeboardScene.querySelector(".progress-timeline-board");
  if (!board) {
    board = document.createElement("div");
    board.classList.add("progress-timeline-board");
    board.id = "progressTimeLineBoard";
    noticeboardScene.appendChild(board);
  }

  board.replaceChildren();

  const entries = getBoardProgressTimeLineEvents();

  for (let start = 0; start < entries.length; start += PROGRESS_TIMELINE_FRAMES_PER_ROW) {
    const rowEntries = entries.slice(start, start + PROGRESS_TIMELINE_FRAMES_PER_ROW);
    const rowIndex = start / PROGRESS_TIMELINE_FRAMES_PER_ROW;
    const isReversedRow = rowIndex % 2 === 1;

    const row = document.createElement("div");
    row.classList.add("progress-timeline-row");
    row.classList.toggle("is-reversed", isReversedRow);
    row.dataset.rowIndex = String(rowIndex);

    let lastFrame = null;

    rowEntries.forEach((entry, indexInRow) => {
      const frame = createProgressTimeLineFrame(entry);
      renderProgressTimeLineFrameContent(frame, entry.progressTimeLineEventId);
      row.appendChild(frame);
      lastFrame = frame;

      if (indexInRow < rowEntries.length - 1) {
        row.appendChild(createProgressTimeLineArrow(isReversedRow ? "left" : "right"));
      }
    });

    // The turn: an arrow climbing from the frame the row ends on to the row
    // above. It goes *inside* that frame rather than beside it, because the CSS
    // then hangs it above the frame, centred on it, in the gap between the two
    // rows — out of the row's flow, so it neither shifts the frames along nor
    // widens the row.
    if (lastFrame) {
      lastFrame.appendChild(createProgressTimeLineArrow("up"));
    }

    board.appendChild(row);
  }

  // Appended last, so column-reverse puts it at the very top of the board.
  board.appendChild(createProgressTimeLineFinalFrame());
}

window.progressTimeLineEventDeveloperTools = {
  getProgressTimeLineEventEntries: () => getProgressTimeLineEventEntries(),
  getBoardProgressTimeLineEvents: () => getBoardProgressTimeLineEvents(),
  getEnvelopeProgressTimeLinePhotos: () => getEnvelopeProgressTimeLinePhotos(),
  getProgressTimeLineEventPlacements: () => getProgressTimeLineEventPlacements(),
  getProgressTimeLineFramePlacement: (frameId) => getProgressTimeLineFramePlacement(frameId),
  getCorrectlyPlacedProgressTimeLineFrameIds: () => getCorrectlyPlacedProgressTimeLineFrameIds(),
  getLockedProgressTimeLineFrameIds: () => getLockedProgressTimeLineFrameIds(),
  isProgressTimeLineFrameLocked: (frameId) => isProgressTimeLineFrameLocked(frameId),
  isProgressTimeLinePhotoUnlocked: (photoId) => isProgressTimeLinePhotoUnlocked(photoId),
  getProgressTimeLineEventDescription: (id, language) => getProgressTimeLineEventDescription(id, language),
  resolveProgressTimeLineEventImagePath: (photoId) => resolveProgressTimeLineEventImagePath(photoId),
  formatProgressTimeLineEventDate: (year) => formatProgressTimeLineEventDate(year),
  getProgressTimeLineEventNote: (frameId) => getProgressTimeLineEventNote(frameId),
  // The drop path, callable without a real drag, so the placement rules can be
  // tested independently of the pointer interaction.
  placePhotoOnProgressTimeLineFrame: (frameId, photoId) => {
    const placement = placePhotoOnProgressTimeLineFrame(frameId, photoId);
    if (placement) {
      renderProgressTimeLineBoard();
      refreshOpenProgressEvidenceWindows();
    }
    return placement;
  },
  returnProgressTimeLinePhotoToEnvelope: (frameId) => {
    const returned = returnProgressTimeLinePhotoToEnvelope(frameId);
    if (returned) {
      renderProgressTimeLineBoard();
      refreshOpenProgressEvidenceWindows();
    }
    return returned;
  },
  renderProgressTimeLineBoard: () => renderProgressTimeLineBoard(),
  // The board is taller than the screen at every zoom level, so anything
  // wanting to interact with a particular frame has to bring it into view
  // first. Used by the drag tests, and the hook a future "jump to the frame you
  // just filled" would use.
  focusProgressTimeLineFrame: (frameId) => focusNoticeboardOnElement(
    document.querySelector(
      `#progressTimeLineBoard .progress-timeline-frame[data-progress-time-line-event-id="${frameId}"]`
    ),
    // Right of centre, not centred: the envelope window is docked bottom left,
    // and a frame landing underneath it cannot be picked up. Horizontal is the
    // reliable axis to dodge on — pan clamping means a bottom-row frame cannot
    // always be raised above the window.
    { horizontalAnchor: 0.76, verticalAnchor: 0.34 }
  ),
};

window.progressEvidenceDeveloperTools = {
  getProgressEvidence: () => getProgressEvidence(),
  getProgressEvidenceEntries: () => getProgressEvidenceEntries(),
  getEligibleProgressEvidence: () => getEligibleProgressEvidence(),
  getProgressEvidenceIdForItem: (service, itemId) => getProgressEvidenceIdForItem(service, itemId),
  isProgressEvidenceActivated: (progressEvidenceId) => isProgressEvidenceActivated(progressEvidenceId),
  setProgressEvidenceDeveloperEnabled: (progressEvidenceId, isEnabled) => {
    const changed = setProgressEvidenceDeveloperEnabled(progressEvidenceId, isEnabled);
    if (changed) {
      refreshOpenProgressEvidenceWindows();
    }
    return changed;
  },
};

function createFacsimileWindowContentElements() {
  const container = document.createElement("div");
  container.classList.add("facsimile-window-content");

  const page = document.createElement("article");
  page.classList.add("facsimile-page");

  const summary = document.createElement("p");
  summary.classList.add("facsimile-summary");
  summary.textContent = "Transmission monitor online.";

  const divider = createContentDivider();

  const reportTitle = document.createElement("h3");
  reportTitle.classList.add("facsimile-report-title");

  const reportText = document.createElement("pre");
  reportText.classList.add("facsimile-report-text");

  const nextMessageButton = document.createElement("button");
  nextMessageButton.type = "button";
  nextMessageButton.classList.add("facsimile-next-message-button");
  nextMessageButton.textContent = resolveLocalizedText("facsimileNextNoAdditionalCachedMessages", "No Additional Cached Messages");
  nextMessageButton.disabled = true;
  nextMessageButton.setAttribute(
    "aria-label",
    resolveLocalizedText("facsimileNextButtonAriaLabel", "Show next cached facsimile message")
  );

  page.append(summary, divider, reportTitle, reportText, nextMessageButton);
  container.appendChild(page);

  return {
    container,
    summary,
    reportTitle,
    reportText,
    nextMessageButton,
    hasReadPendingMessage: false,
    viewedReportId: "",
  };
}

function processFacsimileMessageById(reportId) {
  const normalizedId = String(reportId || "").trim();
  if (!normalizedId) {
    return false;
  }

  const viewedPending = getFacsimilePendingReports().find(
    (item) => String(item?.id || "").trim() === normalizedId
  );
  if (!viewedPending) {
    return false;
  }

  return commitReadFacsimileReportToEvidence(viewedPending);
}

function updateFacsimileWindowContent(windowController) {
  const refs = facsimileWindowContentRefs.get(windowController);
  if (!refs) {
    return;
  }

  const pendingReports = getFacsimilePendingReports();
  const pendingReport = pendingReports[0] || null;
  const pendingCount = pendingReports.length;
  if (!pendingReport) {
    refs.summary.textContent = resolveLocalizedText("facsimileTransmissionMonitorOnline", "Transmission monitor online.");
    refs.reportTitle.textContent = resolveLocalizedText("facsimileNoNewMessages", "NO NEW MESSAGES");
    refs.reportText.textContent = "";
    refs.nextMessageButton.textContent = resolveLocalizedText("facsimileNextNoAdditionalCachedMessages", "No Additional Cached Messages");
    refs.nextMessageButton.disabled = true;
    refs.hasReadPendingMessage = false;
    refs.viewedReportId = "";
    return;
  }

  refs.summary.textContent = pendingCount > 1
    ? `${resolveLocalizedText("facsimileIncomingTransmissionsCachedPrefix", "Incoming transmissions cached")} (${pendingCount}).`
    : resolveLocalizedText("facsimileIncomingTransmissionCached", "Incoming transmission cached.");
  refs.reportTitle.textContent = pendingReport.title || resolveLocalizedText("facsimileFallbackMessageTitle", "FACSIMILE MESSAGE");
  refs.reportText.textContent = pendingReport.reportText || resolveLocalizedText("facsimileMessageBodyUnavailable", "[Transmission body unavailable]");
  refs.nextMessageButton.disabled = pendingCount <= 1;
  refs.nextMessageButton.textContent = pendingCount > 1
    ? `${resolveLocalizedText("facsimileNextShowNextCachedMessage", "Show Next Cached Message")} (${pendingCount - 1} ${resolveLocalizedText("facsimileQueuedCountSuffix", "queued")})`
    : resolveLocalizedText("facsimileNextNoAdditionalCachedMessages", "No Additional Cached Messages");
  refs.hasReadPendingMessage = true;
  refs.viewedReportId = String(pendingReport.id || "").trim();
}

function openFacsimileWindow() {
  if (!getElements().gameArea) {
    return null;
  }

  let facsimileWindowController = null;
  facsimileWindowController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window", "facsimile-window"],
    title: "FACSIMILE",
    showCarouselNavigation: false,
    closeButtonAriaLabel: localize("closeFacsimileWindowAriaLabel", getLanguage()),
    onClose: () => {
      const refs = facsimileWindowContentRefs.get(facsimileWindowController);
      if (refs?.hasReadPendingMessage && refs.viewedReportId) {
        processFacsimileMessageById(refs.viewedReportId);
      }

      unregisterDesktopWindow(facsimileWindowController);
      audioManager.playSfx("clickSwitch");
    },
  });

  const refs = createFacsimileWindowContentElements();
  facsimileWindowController.setContent(refs.container);
  facsimileWindowController.scrollContainerElement = refs.container;
  facsimileWindowContentRefs.set(facsimileWindowController, refs);
  registerDesktopWindow(facsimileWindowController, "facsimile");

  refs.nextMessageButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (!refs.hasReadPendingMessage || !refs.viewedReportId) {
      return;
    }

    processFacsimileMessageById(refs.viewedReportId);
    updateFacsimileWindowContent(facsimileWindowController);
  });

  updateFacsimileWindowContent(facsimileWindowController);
  facsimileWindowController.open({ resizable: false, showScrollbar: false });
  bringDesktopWindowToFront(facsimileWindowController);
  audioManager.playSfx("clickSwitch");

  return facsimileWindowController;
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
    widthRatio = null,
    heightRatio = null,
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
    closeButtonAriaLabel: localize("closeNotesWindowAriaLabel", getLanguage()),
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
    positionWindowWithinParent(notesWindowController.rootElement, parentElement, {
      widthScale,
      widthRatio,
      heightRatio,
    });
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
        widthRatio: 0.6,
        heightRatio: 0.58,
        onWindowClose: (windowController) => {
          contentRefs.appWindows.delete(windowController);
        },
      });
      if (notesWindow) {
        contentRefs.appWindows.add(notesWindow);
      }
    }
  });

  // The apps that now live inside folders. Each is still opened by a single
  // click on its icon and still toggles, exactly as it did when the icon sat on
  // the desktop — only where the icon lives has changed.
  const openPaintApp = () => {
    if (toggleExistingWindowsByKind("computer-paint")) {
      return;
    }

    const paintRefs = createComputerPaintWindowContentElements();
    openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-paint",
      title: localize("computerPaintIconLabel", getLanguage()),
      classNames: ["caveos-paint-window"],
      contentNode: paintRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
    });
  };

  const openCalculatorApp = () => {
    if (toggleExistingWindowsByKind("computer-calculator")) {
      return;
    }

    const calculatorRefs = createComputerCalculatorWindowContentElements();
    const calculatorWindow = openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-calculator",
      title: localize("computerCalculatorWindowTitle", getLanguage()),
      classNames: ["caveos-calculator-window"],
      contentNode: calculatorRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      // Narrower and shorter than Notes or Paint: a calculator is a small
      // utility, and DesktopWindow's own minimum size keeps it usable however
      // small the ratios would otherwise make it.
      widthRatio: 0.34,
      heightRatio: 0.62,
    });

    if (calculatorWindow) {
      calculatorWindowContentRefs.set(calculatorWindow, calculatorRefs);
    }
  };

  const openSnakeApp = () => {
    if (toggleExistingWindowsByKind("computer-snake")) {
      return;
    }

    const snakeRefs = createComputerSnakeWindowContentElements();
    const snakeWindow = openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-snake",
      title: localize("computerSnakeWindowTitle", getLanguage()),
      classNames: ["caveos-snake-window"],
      contentNode: snakeRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      widthRatio: 0.62,
      heightRatio: 0.72,
      // The board is keyboard-driven, so it takes focus on open — otherwise the
      // player's first arrow key goes nowhere.
      onAfterOpen: () => snakeRefs.focus(),
      // Stops the tick interval; without it a closed game keeps running against
      // a canvas that is no longer in the document.
      onBeforeClose: () => snakeRefs.destroy(),
    });

    if (snakeWindow) {
      snakeWindowContentRefs.set(snakeWindow, snakeRefs);
    }
  };

  const openMinesweeperApp = () => {
    if (toggleExistingWindowsByKind("computer-minesweeper")) {
      return;
    }

    const minesweeperRefs = createComputerMinesweeperWindowContentElements();
    const minesweeperWindow = openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-minesweeper",
      title: localize("computerMinesweeperWindowTitle", getLanguage()),
      classNames: ["caveos-minesweeper-window"],
      contentNode: minesweeperRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      // The board is a fixed nine by nine, so the window only needs to be big
      // enough to hold it and its status bar.
      widthRatio: 0.4,
      heightRatio: 0.66,
    });

    if (minesweeperWindow) {
      minesweeperWindowContentRefs.set(minesweeperWindow, minesweeperRefs);
    }
  };

  const openSudokuApp = () => {
    if (toggleExistingWindowsByKind("computer-sudoku")) {
      return;
    }

    const sudokuRefs = createComputerSudokuWindowContentElements();
    const sudokuWindow = openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-sudoku",
      title: localize("computerSudokuWindowTitle", getLanguage()),
      classNames: ["caveos-sudoku-window"],
      contentNode: sudokuRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      widthRatio: 0.44,
      heightRatio: 0.78,
      // Typing digits is the fast way to play, and that needs a focused cell.
      onAfterOpen: () => sudokuRefs.focus(),
    });

    if (sudokuWindow) {
      sudokuWindowContentRefs.set(sudokuWindow, sudokuRefs);
    }
  };

  const openTetrisApp = () => {
    if (toggleExistingWindowsByKind("computer-tetris")) {
      return;
    }

    const tetrisRefs = createComputerTetrisWindowContentElements();
    const tetrisWindow = openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-tetris",
      title: localize("computerTetrisWindowTitle", getLanguage()),
      classNames: ["caveos-tetris-window"],
      contentNode: tetrisRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      // Tall and narrow, because the well is.
      widthRatio: 0.36,
      heightRatio: 0.86,
      onAfterOpen: () => tetrisRefs.focus(),
      // Same reason as Snake: a drop interval must not outlive its window.
      onBeforeClose: () => tetrisRefs.destroy(),
    });

    if (tetrisWindow) {
      tetrisWindowContentRefs.set(tetrisWindow, tetrisRefs);
    }
  };

  // What each folder contains. Order here is the order the icons appear in.
  const FOLDER_DEFINITIONS = {
    utilities: {
      kind: "computer-folder-utilities",
      titleKey: "computerUtilitiesFolderLabel",
      className: "caveos-folder-utilities-window",
      contents: [
        { labelKey: "computerPaintIconLabel", iconClassName: "computer-icon-paint", open: openPaintApp },
        { labelKey: "computerCalculatorIconLabel", iconClassName: "computer-icon-calculator", open: openCalculatorApp },
      ],
    },
    games: {
      kind: "computer-folder-games",
      titleKey: "computerGamesFolderLabel",
      className: "caveos-folder-games-window",
      contents: [
        { labelKey: "computerSnakeIconLabel", iconClassName: "computer-icon-snake", open: openSnakeApp },
        { labelKey: "computerMinesweeperIconLabel", iconClassName: "computer-icon-minesweeper", open: openMinesweeperApp },
        { labelKey: "computerSudokuIconLabel", iconClassName: "computer-icon-sudoku", open: openSudokuApp },
        { labelKey: "computerTetrisIconLabel", iconClassName: "computer-icon-tetris", open: openTetrisApp },
      ],
    },
  };

  // A folder window: the same icon grid the desktop uses, in a window of its
  // own. The icons inside are ordinary single-click app icons — only the
  // folder itself needs the double click.
  const openFolderWindow = (folderId) => {
    const definition = FOLDER_DEFINITIONS[folderId];
    if (!definition || toggleExistingWindowsByKind(definition.kind)) {
      return;
    }

    const languageCode = getLanguage();

    const folderBody = document.createElement("div");
    folderBody.classList.add("caveos-folder-app");

    const folderGrid = document.createElement("div");
    folderGrid.classList.add("computer-icons-grid", "caveos-folder-icons-grid");

    definition.contents.forEach((entry) => {
      const label = localize(entry.labelKey, languageCode);

      const iconButton = document.createElement("button");
      iconButton.type = "button";
      iconButton.classList.add("computer-icon", entry.iconClassName);
      iconButton.setAttribute("aria-label", label);

      const pixelArt = document.createElement("span");
      pixelArt.classList.add("computer-icon-pixel", `${entry.iconClassName}-pixel`);

      const labelElement = document.createElement("span");
      labelElement.classList.add("computer-icon-label");
      labelElement.textContent = label;

      iconButton.append(pixelArt, labelElement);
      iconButton.addEventListener("click", () => {
        audioManager.onUserGesture();
        audioManager.playSfx("clickButton");
        entry.open();
      });

      folderGrid.appendChild(iconButton);
    });

    folderBody.appendChild(folderGrid);

    openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: definition.kind,
      title: localize(definition.titleKey, languageCode),
      classNames: ["caveos-folder-window", definition.className],
      contentNode: folderBody,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      widthRatio: 0.46,
      heightRatio: 0.5,
    });
  };

  // Folders open on a double click, the way folders on a 1996 desktop did.
  // `dblclick` is used rather than counting clicks by hand so the browser's own
  // (and the platform's) double-click timing applies.
  contentRefs.utilitiesFolderIcon.addEventListener("dblclick", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    openFolderWindow("utilities");
  });

  contentRefs.gamesFolderIcon.addEventListener("dblclick", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");
    openFolderWindow("games");
  });

  // A folder icon is still a button, so Enter and Space have to open it too —
  // a double click is not something a keyboard can produce.
  [
    { icon: contentRefs.utilitiesFolderIcon, folderId: "utilities" },
    { icon: contentRefs.gamesFolderIcon, folderId: "games" },
  ].forEach(({ icon, folderId }) => {
    icon.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      audioManager.onUserGesture();
      audioManager.playSfx("clickButton");
      openFolderWindow(folderId);
    });
  });

  contentRefs.echotrailIcon.addEventListener("click", () => {
    audioManager.onUserGesture();
    audioManager.playSfx("clickButton");

    if (toggleExistingWindowsByKind("computer-echotrail")) {
      return;
    }

    const echotrailRefs = createComputerEchotrailWindowContentElements();
    const echotrailWindow = openComputerAppWindow({
      parentElement: contentRefs.container,
      kind: "computer-echotrail",
      title: "ECHOTRAIL",
      classNames: ["caveos-echotrail-window"],
      contentNode: echotrailRefs.container,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      // Wide and shallow: four columns of file details want horizontal room far
      // more than they want height.
      widthRatio: 0.78,
      heightRatio: 0.66,
      // Drops the audio subscription. The track itself keeps playing on
      // purpose — closing the library is not the same as stopping the music.
      onBeforeClose: () => echotrailRefs.destroy(),
    });

    if (echotrailWindow) {
      echotrailWindowContentRefs.set(echotrailWindow, echotrailRefs);
    }
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
      title: "Netscape Navigator 3.0",
      classNames: ["caveos-browser-window"],
      contentNode: netscapeContent,
      appWindowSet: contentRefs.appWindows,
      resizable: true,
      showScrollbar: false,
      widthRatio: 1,
      heightRatio: 1,
    });
  });

  const themePicker = createCaveOsThemeSelect();
  contentRefs.themeSelect = themePicker.select;
  contentRefs.themePickerLabel = themePicker.label;

  let nextController = null;
  nextController = new DesktopWindow({
    parentElement: getElements().gameArea,
    classNames: ["story-window", "computer-window"],
    title: localize("computerWindowTitle", getLanguage()),
    showCarouselNavigation: false,
    closeButtonAriaLabel: localize("closeComputerWindowAriaLabel", getLanguage()),
    headerAccessoryElement: themePicker.wrapper,
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
      audioManager.playSfx("clickSwitch");
    },
  });

  nextController.setContent(contentRefs.container);
  nextController.scrollContainerElement = contentRefs.container;
  computerWindowContentRefs.set(nextController, contentRefs);
  registerDesktopWindow(nextController, "computer");
  // Before open(), so the window is never painted in the default theme for a
  // frame on its way to the saved one.
  applyCaveOsThemeToWindow(nextController);
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
  audioManager.playSfx("clickSwitch");
}
  