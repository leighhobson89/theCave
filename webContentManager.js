const DEFAULT_SESSION = Object.freeze({
  authenticated: false,
  account: null,
  accessLevel: 0,
  accessLabel: "Guest",
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function textEquals(source, query) {
  return normalizeText(source) === normalizeText(query);
}

export function createWebContentManager({ awardEvidence } = {}) {
  const websiteRegistry = new Map();
  const websiteDataCache = new Map();
  const websiteSessions = new Map();
  const awardedEvidenceKeys = new Set();
  const awardEvidenceCallback = typeof awardEvidence === "function" ? awardEvidence : null;

  async function loadWebsiteData(websiteId) {
    const definition = websiteRegistry.get(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    if (websiteDataCache.has(websiteId)) {
      return cloneJson(websiteDataCache.get(websiteId));
    }

    const response = await fetch(definition.dataPath);
    if (!response.ok) {
      throw new Error(`Failed to load website data for ${websiteId}: ${response.status}`);
    }

    const data = await response.json();
    websiteDataCache.set(websiteId, data);
    return cloneJson(data);
  }

  function registerWebsite(definition) {
    if (!definition || typeof definition !== "object") {
      throw new Error("Website definition must be an object.");
    }

    const websiteId = normalizeText(definition.id);
    if (!websiteId) {
      throw new Error("Website definition requires an id.");
    }

    if (!definition.dataPath) {
      throw new Error(`Website definition ${websiteId} requires a dataPath.`);
    }

    // Every site supplies its own exact-match search and (where it has accounts)
    // its own authenticate, so these are required rather than defaulted.
    if (typeof definition.search !== "function") {
      throw new Error(`Website definition ${websiteId} requires a search function.`);
    }

    if (typeof definition.buildPage !== "function") {
      throw new Error(`Website definition ${websiteId} requires a buildPage function.`);
    }

    websiteRegistry.set(websiteId, {
      ...definition,
      id: websiteId,
    });
  }

  function getWebsiteDefinition(websiteId) {
    return websiteRegistry.get(normalizeText(websiteId)) || null;
  }

  function getSession(websiteId) {
    const normalizedWebsiteId = normalizeText(websiteId);
    return cloneJson(websiteSessions.get(normalizedWebsiteId) || DEFAULT_SESSION);
  }

  function setSession(websiteId, session) {
    const normalizedWebsiteId = normalizeText(websiteId);
    websiteSessions.set(normalizedWebsiteId, {
      ...DEFAULT_SESSION,
      ...cloneJson(session),
    });
  }

  // Every session ever set (including a guest sign-in) as a plain
  // websiteId -> session object, for the save payload.
  function getSessionsSnapshot() {
    const snapshot = {};
    websiteSessions.forEach((session, websiteId) => {
      snapshot[websiteId] = cloneJson(session);
    });
    return snapshot;
  }

  // Replaces every session with the contents of a save payload. The loaded
  // save is treated as the full source of truth, so this clears sessions that
  // exist only in the current runtime (e.g. from a save made before login
  // persistence existed, or one that never touched a given site) rather than
  // merging on top of them. Entries for sites that are not registered, or that
  // are not well-formed session objects, are skipped.
  function restoreSessionsSnapshot(snapshot) {
    websiteSessions.clear();
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    Object.keys(snapshot).forEach((rawWebsiteId) => {
      const websiteId = normalizeText(rawWebsiteId);
      const session = snapshot[rawWebsiteId];
      if (!websiteId || !websiteRegistry.has(websiteId) || !session || typeof session !== "object") {
        return;
      }

      setSession(websiteId, session);
    });
  }

  // Used by New Game: no site should still appear logged in.
  function clearSessions() {
    websiteSessions.clear();
  }

  async function loginWebsite(websiteId, credentials = {}) {
    const definition = getWebsiteDefinition(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    const data = await loadWebsiteData(websiteId);
    const session = definition.authenticate
      ? await Promise.resolve(definition.authenticate({ data, credentials, manager: api }))
      : DEFAULT_SESSION;

    setSession(websiteId, session);
    return getSession(websiteId);
  }

  async function searchWebsite(websiteId, request = {}) {
    const definition = getWebsiteDefinition(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    const data = await loadWebsiteData(websiteId);
    const session = getSession(websiteId);
    const searchResult = await Promise.resolve(
      definition.search({ data, request, session, manager: api })
    );

    const results = Array.isArray(searchResult?.results) ? searchResult.results : [];
    const awardedEvidence = [];

    for (const record of results) {
      if (await awardEvidenceForRecord(websiteId, record, definition)) {
        awardedEvidence.push(cloneJson(record.evidence));
      }
    }

    return {
      websiteId,
      website: cloneJson(definition),
      session: getSession(websiteId),
      results: cloneJson(results),
      message: String(searchResult?.message || ""),
      deniedCount: Number(searchResult?.deniedCount || 0),
      awardedEvidence,
    };
  }

  async function awardEvidenceForRecord(websiteId, record, definition) {
    if (!record?.awardsEvidence || !record?.evidence || !awardEvidenceCallback) {
      return false;
    }

    const evidenceKey = `${websiteId}:${record.id}`;
    if (awardedEvidenceKeys.has(evidenceKey)) {
      return false;
    }

    const evidencePayload = cloneJson(record.evidence);
    const result = await Promise.resolve(awardEvidenceCallback(evidencePayload, { websiteId, record, definition }));
    if (result === false) {
      return false;
    }

    awardedEvidenceKeys.add(evidenceKey);
    return true;
  }

  function createWebsitePage(websiteId) {
    const definition = getWebsiteDefinition(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    return definition.buildPage({
      manager: api,
      websiteId: normalizeText(websiteId),
      definition,
      getSession: () => getSession(websiteId),
      getData: () => loadWebsiteData(websiteId),
      searchWebsite: (request) => searchWebsite(websiteId, request),
      loginWebsite: (credentials) => loginWebsite(websiteId, credentials),
    });
  }

  const api = {
    registerWebsite,
    getWebsiteDefinition,
    loadWebsiteData,
    getSession,
    loginWebsite,
    searchWebsite,
    createWebsitePage,
    getSessionsSnapshot,
    restoreSessionsSnapshot,
    clearSessions,
    normalizeText,
    textEquals,
  };

  return api;
}
