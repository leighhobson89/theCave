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
} from "./constantsAndGlobalVars.js";
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
  resolveEvidenceContentPath,
  setEvidenceIndex,
  stepEvidenceIndex,
} from "./evidenceManager.js";
import { LANGUAGE_BUTTON_KEYS_BY_CODE, setGameState, startGame } from "./game.js";
import { audioManager } from "./audioManager.js";
import { initLocalization, localize } from "./localization.js";
import { DesktopWindow } from "./desktopWindow.js";
import {
  loadGameOption,
  loadGame,
  pasteLoadStringFromClipboard,
  saveGame,
  copySaveStringToClipBoard,
} from "./saveLoadGame.js";
import { createWebContentManager } from "./webContentManager.js";
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
const facsimileWindowContentRefs = new WeakMap();
const EVIDENCE_STORAGE_KEYS = getEvidenceStorageKeys();
const REPORT_PAPER_STYLE_CLASS_PREFIX = "report-paper-style-";
const PHOTO_PAPER_STYLE_CLASS_PREFIX = "photo-paper-style-";
const PHOTO_FRAME_ASPECT_RATIO = 16 / 9;
const PHOTO_FRAME_MAX_WIDTH = 760;
const PHOTO_FRAME_MAX_HEIGHT = Math.round(PHOTO_FRAME_MAX_WIDTH / PHOTO_FRAME_ASPECT_RATIO);
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
let ashtrayAnimationTimeoutId = null;
let facsimileFeedAnimationTimeoutId = null;
let evidenceMilestoneTriggersInitialized = false;
const NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS = 3000;
const notificationQueue = [];
let notificationReleaseIntervalId = null;
let notificationHostElement = null;

const webContentManager = createWebContentManager({
  awardEvidence: awardWebContentEvidence,
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
    if (notificationReleaseIntervalId) {
      clearInterval(notificationReleaseIntervalId);
      notificationReleaseIntervalId = null;
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

  requestAnimationFrame(() => {
    notificationElement.classList.add("is-visible");
  });

  if (next.sound) {
    audioManager.playSfx(next.sound);
  }

  const hideDelay = Math.max(200, next.time);
  window.setTimeout(() => {
    notificationElement.classList.remove("is-visible");
    window.setTimeout(() => {
      notificationElement.remove();
    }, 260);
  }, hideDelay);
}

function ensureNotificationQueueReleaseLoop() {
  if (notificationReleaseIntervalId) {
    return;
  }

  releaseNextNotificationFromQueue();
  notificationReleaseIntervalId = window.setInterval(() => {
    releaseNextNotificationFromQueue();
  }, NOTIFICATION_QUEUE_RELEASE_INTERVAL_MS);
}

export function showNotifcation(type, text, time, sound = false) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    return;
  }

  const parsedTime = Number(time);
  const notification = {
    type: normalizeNotificationType(type),
    text: normalizedText,
    time: Number.isFinite(parsedTime) ? Math.max(200, parsedTime) : 2500,
    sound: typeof sound === "string" && sound.trim() ? sound.trim() : false,
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
  const notificationTitle = String(report?.title || "Incoming facsimile").trim() || "Incoming facsimile";
  const notificationText = String(notificationOptions.text || "").trim() || `Incoming facsimile: ${notificationTitle}`;
  const notificationDuration = Number(notificationOptions.durationMs);
  const notificationSound = String(notificationOptions.sound || "").trim() || "fax";

  showNotifcation(
    notificationType,
    notificationText,
    Number.isFinite(notificationDuration) ? notificationDuration : 4200,
    notificationSound
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
    catalogPathTemplate: "./assets/reportsEvidences_{lang}.json",
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
    catalogPathTemplate: "./assets/reportsEvidences_{lang}.json",
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
    catalogPathTemplate: "./assets/reportsEvidences_{lang}.json",
    entryId: "missingReport",
  },
  storageKey: EVIDENCE_STORAGE_KEYS.REPORTS,
  titleKey: "reports",
  evidenceName: "missingReport",
  messageType: "urgent",
};

const NEW_GAME_WELCOME_FAX_DELAY_MS = 10000;
const NEW_GAME_MISSING_REPORT_FAX_DELAY_MS = 30000;
let newGameWelcomeFaxTimeoutId = null;
let newGameMissingReportFaxTimeoutId = null;

// Cancels any pending intro-fax timers from a previous new-game click so a
// player who restarts before the sequence completes can't stack duplicates
// or have a stale timer fire into a fresh evidence store.
function cancelScheduledNewGameIntroFacsimiles() {
  if (newGameWelcomeFaxTimeoutId !== null) {
    window.clearTimeout(newGameWelcomeFaxTimeoutId);
    newGameWelcomeFaxTimeoutId = null;
  }
  if (newGameMissingReportFaxTimeoutId !== null) {
    window.clearTimeout(newGameMissingReportFaxTimeoutId);
    newGameMissingReportFaxTimeoutId = null;
  }
}

// Schedules the two scripted faxes that open a new game: a welcome/orientation
// message, followed by the fax that delivers the missing person report.
function scheduleNewGameIntroFacsimiles() {
  cancelScheduledNewGameIntroFacsimiles();

  newGameWelcomeFaxTimeoutId = window.setTimeout(() => {
    newGameWelcomeFaxTimeoutId = null;
    queueConfiguredFacsimileReport(NEW_GAME_WELCOME_FAX_CONFIG, { animateFeed: true }).catch((error) => {
      console.error("Failed to queue new-game welcome facsimile:", error);
    });
  }, NEW_GAME_WELCOME_FAX_DELAY_MS);

  newGameMissingReportFaxTimeoutId = window.setTimeout(() => {
    newGameMissingReportFaxTimeoutId = null;
    queueConfiguredFacsimileReport(MISSING_REPORT_FAX_CONFIG, { animateFeed: true }).catch((error) => {
      console.error("Failed to queue new-game missing-report facsimile:", error);
    });
  }, NEW_GAME_WELCOME_FAX_DELAY_MS + NEW_GAME_MISSING_REPORT_FAX_DELAY_MS);
}

function initializeEvidenceMilestoneTriggers() {
  if (evidenceMilestoneTriggersInitialized) {
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

  evidenceMilestoneTriggersInitialized = true;
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

  syncFacsimileVisualState({ animateFeed: false });
  refreshOpenFacsimileWindows();

  if (awardsEvidence) {
    showNotifcation(
      "reward",
      `New ${resolveLocalizedText("evidenceTypeReport", "Report")} ${resolveLocalizedText("notificationEvidenceUnlockedSuffix", "Evidence unlocked in your Evidence folder!")}`,
      4000,
      "evidenceGain"
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

  if (facsimileFeedAnimationTimeoutId) {
    window.clearTimeout(facsimileFeedAnimationTimeoutId);
  }

  facsimileFeedAnimationTimeoutId = window.setTimeout(() => {
    facsimileElement.classList.remove("is-receiving");
    facsimileFeedAnimationTimeoutId = null;
  }, 1900);
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
        `New ${evidenceTypeLabel} ${resolveLocalizedText("notificationEvidenceUnlockedSuffix", "Evidence unlocked in your Evidence folder!")}`,
        4000,
        "evidenceGain"
      );
    }

    awardedAny = true;
  });

  return awardedAny;
}

document.addEventListener("DOMContentLoaded", async () => {
  setElements();
  initializeEvidenceMilestoneTriggers();
  syncAshtrayVisualState();
  syncFacsimileVisualState({ animateFeed: false });
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
    resetFacsimileState();
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
    setGameState(getDesktopState());
    startGame(true);
    audioManager.startBackgroundMusicForGame();
    refreshAudioControlsDisplay();
  });

  getElements().resumeGameMenuButton.addEventListener("click", () => {
    audioManager.onUserGesture();
    if (gameState === getMenuState()) {
      setGameState(getActiveGameplayState());
    }
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
        audioManager.syncFromSavedPreferences();
        refreshAudioControlsDisplay();
        getElements().saveLoadPopup.classList.add("d-none");
        document.getElementById("overlay").classList.add("d-none");
        setGameInProgress(true);
        setGameState(getActiveGameplayState());
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
  musicVolumeLabel: "musicVolume",
  sfxVolumeLabel: "sfxVolume",
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

  elements.zoomReadout.textContent = `${localize("zoomLabel", languageCode)} 3/5`;

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
  const monthText = DESKTOP_CALENDAR_MONTH_FORMATTER
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

// How each open desktop window re-titles and re-renders itself after a language
// change. `titleKey` goes through localize(); `title` is a fixed product name.
// Kinds absent from this table (currently "debug") are left untouched.
const DESKTOP_WINDOW_LOCALIZATION_BY_KIND = {
  story: { titleKey: "theArnieTragedy", refresh: updateStoryWindowContent },
  photos: { titleKey: "photos", refresh: updatePhotosWindowContent },
  reports: { titleKey: "reports", refresh: updateReportsWindowContent },
  notes: { titleKey: "notes" },
  "computer-notes": { titleKey: "notes" },
  "computer-paint": { title: "Paint" },
  "computer-netscape": { title: "Netscape Navigator 3.0" },
  facsimile: { title: "FACSIMILE", refresh: updateFacsimileWindowContent },
  computer: { title: "Computer" },
};

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
    localization.refresh?.(windowController);
  });
}

// Built once: the clock ticks every second and Intl formatter construction is
// comparatively expensive.
const COMPUTER_CLOCK_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const DESKTOP_CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "short" });

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

  refs.dateText.textContent = COMPUTER_CLOCK_DATE_FORMATTER.format(now);
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
    page.innerHTML = `
      <h1 class="browser-welcome-title">Page Not Found</h1>
      <p class="browser-welcome-copy">No in-game page exists at:</p>
      <p class="browser-cosmic-copy browser-cosmic-plain-url">${attemptedUrl}</p>
      <p class="browser-welcome-copy">Try one of the favorites or a known hidden page URL.</p>
    `;
    return page;
  };

  const createStandaloneTextPage = (pageRecord) => {
    const page = document.createElement("div");
    page.classList.add("caveos-browser-page", "browser-page-standalone");

    const shell = document.createElement("div");
    shell.classList.add("browser-page-shell", "browser-page-shell-gray", "browser-page-shell-standalone");

    shell.innerHTML = `
      <h1 class="browser-page-title">${pageRecord.title || pageRecord.id || "Recovered Page"}</h1>
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
      empty.textContent = "This hidden page has no body content.";
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

  const label = document.createElement("span");
  label.textContent = "URL:";

  const browserAddress = document.createElement("input");
  browserAddress.classList.add("caveos-browser-address");
  browserAddress.type = "text";
  browserAddress.value = "about:welcome";
  browserAddress.setAttribute("aria-label", "Browser address");

  const addressInputShell = document.createElement("div");
  addressInputShell.classList.add("caveos-browser-address-shell");

  const addressSubmitButton = document.createElement("button");
  addressSubmitButton.type = "button";
  addressSubmitButton.classList.add("caveos-browser-address-submit");
  addressSubmitButton.setAttribute("aria-label", "Go to URL");
  addressSubmitButton.title = "Go";

  const addressHistoryPanel = document.createElement("div");
  addressHistoryPanel.classList.add("caveos-browser-address-history");
  addressHistoryPanel.setAttribute("role", "listbox");
  addressHistoryPanel.hidden = true;

  addressInputShell.append(browserAddress, addressSubmitButton, addressHistoryPanel);

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.classList.add("caveos-browser-nav-button");
  backButton.textContent = "←";
  backButton.setAttribute("aria-label", "Back");

  const forwardButton = document.createElement("button");
  forwardButton.type = "button";
  forwardButton.classList.add("caveos-browser-nav-button");
  forwardButton.textContent = "→";
  forwardButton.setAttribute("aria-label", "Forward");

  const homeButton = document.createElement("button");
  homeButton.type = "button";
  homeButton.classList.add("caveos-browser-nav-button");
  homeButton.textContent = "⌂";
  homeButton.setAttribute("aria-label", "Home");

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
        pageHost.replaceChildren(createMissingPage(entry.url || "Unknown URL"));
      }
      return;
    }

    if (entry.type === "record" && entry.replay && typeof entry.replay === "object") {
      void replayAddressHistoryEntry(entry, { pushHistory: false });
      return;
    }

    browserAddress.value = entry.url || "about:missing";
    pageHost.replaceChildren(createMissingPage(entry.url || "Unknown URL"));
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
    if (standalonePagesPromise) {
      return standalonePagesPromise;
    }

    standalonePagesPromise = (async () => {
      try {
        const standaloneResponse = await fetch("./assets/web-content/standalone-pages.json");
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
        console.warn("Unable to load standalone-pages.json routes.", error);
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
      iconClass: "icon-cosmic-forge",
      label: "Cosmic Forge",
      viewKey: "cosmic",
    },
    {
      iconClass: "icon-canada-archives",
      label: "Canada Archives",
      viewKey: "archives",
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
    title: localize("theArnieTragedy", getLanguage()),
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

async function getCatalogEntryForEvidence(evidence, languageCode, forceReload, { cacheMap, catalogLabel }) {
  const catalogIndex = await loadEvidenceCatalogByLanguage({
    cacheMap,
    languageCode,
    pathTemplate: String(evidence?.source?.catalogPathTemplate || "").trim(),
    catalogLabel,
    forceReload,
  });

  return catalogIndex.get(getCatalogEntryIdFromEvidence(evidence)) || null;
}

function getReportCatalogEntry(evidence, languageCode, forceReload = false) {
  return getCatalogEntryForEvidence(evidence, languageCode, forceReload, {
    cacheMap: reportCatalogCacheByLanguage,
    catalogLabel: "report evidence",
  });
}

function getPhotoCatalogEntry(evidence, languageCode, forceReload = false) {
  return getCatalogEntryForEvidence(evidence, languageCode, forceReload, {
    cacheMap: photoCatalogCacheByLanguage,
    catalogLabel: "photo evidence",
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
    return "Description unavailable.";
  }

  const label = evidenceType === "report" ? "Report description" : "Photo description";
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
  titlePrefix: "Page",
  ariaNoun: "notes page",
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
  titlePrefix: "Sketch",
  ariaNoun: "sketch",
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
  return `${model.titlePrefix} ${pageIndex + 1}`;
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
  titleInput.setAttribute("aria-label", `Title for ${model.ariaNoun} ${pageIndex + 1}`);

  const commitButton = document.createElement("button");
  commitButton.type = "button";
  commitButton.classList.add("evidence-title-commit", "notes-page-title-commit");
  commitButton.textContent = "✓";
  commitButton.setAttribute("aria-label", `Apply title for ${model.ariaNoun} ${pageIndex + 1}`);
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
    pageRowRefs.activateButton.setAttribute("aria-label", `Open ${normalizedTitle}`);
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
  button.setAttribute("aria-label", "Magnifier");
  button.setAttribute("aria-pressed", "false");
  button.title = "Magnifier";

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
  descriptionText.textContent = "Loading description...";

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
    refs.emptyState.textContent = buildMissingCatalogFieldMessage(currentEvidence, "Photo image", "photoPath", languageCode);
    refs.image.removeAttribute("src");
    refs.counter.textContent = `${currentIndex + 1}/${photoEvidences.length}`;
    refs.captionText.textContent = photoCaptionText;
    refs.descriptionText.textContent = descriptionText || "Description unavailable.";
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
  refs.descriptionText.textContent = descriptionText || "Description unavailable.";
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
    refs.emptyState.textContent = `Missing image: ${currentItem}`;
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
    return buildMissingCatalogEntryMessage(evidence, "Report content", languageCode);
  }

  const localizedReportText = sanitizeCatalogText(reportEntry?.reportText).trim();
  if (localizedReportText) {
    return localizedReportText;
  }

  return buildMissingCatalogFieldMessage(evidence, "Report content", "reportText", languageCode);
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
  if (refs.magnifierController) {
    refs.magnifierController.refreshContent({ reportTextElement: refs.reportDocumentText });
  }
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
    closeButtonAriaLabel: "Close photos window",
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
    closeButtonAriaLabel: "Close reports window",
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
    closeButtonAriaLabel: config.closeButtonAriaLabel,
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
    closeButtonAriaLabel: "Close facsimile window",
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
  audioManager.playSfx("clickSwitch");
}
  