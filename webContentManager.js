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

export function textIncludes(source, query) {
  const normalizedSource = normalizeText(source);
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return false;
  }

  return normalizedSource.includes(normalizedQuery);
}

export function textEquals(source, query) {
  return normalizeText(source) === normalizeText(query);
}

export function recordMatchesAnyText(record, query, fields = []) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return false;
  }

  const values = fields.length ? fields : ["title", "body", "keywords"];
  return values.some((field) => {
    const value = record?.[field];
    if (Array.isArray(value)) {
      return value.some((item) => textIncludes(item, normalizedQuery));
    }

    return textIncludes(value, normalizedQuery);
  });
}

function getDefaultAccount(data) {
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  return accounts.find((account) => account?.default) || accounts[0] || null;
}

function buildSessionFromAccount(account, fallbackLabel = "Guest") {
  if (!account) {
    return { ...DEFAULT_SESSION, accessLabel: fallbackLabel };
  }

  const accessLevel = Number.isFinite(Number(account.privilegeLevel))
    ? Number(account.privilegeLevel)
    : Number.isFinite(Number(account.accessLevel))
      ? Number(account.accessLevel)
      : 0;

  return {
    authenticated: true,
    account: cloneJson(account),
    accessLevel,
    accessLabel: account.label || account.displayName || account.username || fallbackLabel,
  };
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

    websiteRegistry.set(websiteId, {
      ...definition,
      id: websiteId,
    });
  }

  function getWebsiteDefinition(websiteId) {
    return websiteRegistry.get(normalizeText(websiteId)) || null;
  }

  function getWebsiteIds() {
    return Array.from(websiteRegistry.keys());
  }

  function setActiveWebsite(websiteId) {
    const normalizedWebsiteId = normalizeText(websiteId);
    if (!normalizedWebsiteId || !websiteRegistry.has(normalizedWebsiteId)) {
      return;
    }

    activeWebsiteId = normalizedWebsiteId;
  }

  function getActiveWebsite() {
    return activeWebsiteId;
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

  async function loginWebsite(websiteId, credentials = {}) {
    const definition = getWebsiteDefinition(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    const data = await loadWebsiteData(websiteId);
    const session = await Promise.resolve(
      definition.authenticate
        ? definition.authenticate({ data, credentials, manager: api })
        : defaultAuthenticate(data, credentials, definition)
    );

    setSession(websiteId, session);
    return getSession(websiteId);
  }

  function defaultAuthenticate(data, credentials, definition) {
    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];

    if (credentials?.useDefault) {
      const account = getDefaultAccount(data);
      return buildSessionFromAccount(account, definition?.defaultAccessLabel || "Guest");
    }

    const username = normalizeText(credentials?.username);
    const password = String(credentials?.password ?? "");

    if (!username || !password) {
      return DEFAULT_SESSION;
    }

    const matchedAccount = accounts.find((account) =>
      normalizeText(account?.username) === username && String(account?.password ?? "") === password
    );

    return buildSessionFromAccount(matchedAccount, definition?.defaultAccessLabel || "Guest");
  }

  async function searchWebsite(websiteId, request = {}) {
    const definition = getWebsiteDefinition(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    const data = await loadWebsiteData(websiteId);
    const session = getSession(websiteId);
    const searchResult = await Promise.resolve(
      definition.search
        ? definition.search({ data, request, session, manager: api, helpers: buildHelpers(websiteId, data, session) })
        : defaultSearch({ data, request, session, definition })
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

  function defaultSearch({ data, request, session, definition }) {
    const query = request?.query ?? request?.search ?? "";
    const records = Array.isArray(data?.records) ? data.records : [];
    const matches = records.filter((record) => recordMatchesAnyText(record, query, definition?.searchFields || []));

    return {
      results: matches,
      message: matches.length ? "" : "No matching records were found.",
      deniedCount: 0,
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

  function buildHelpers(websiteId, data, session) {
    return {
      normalizeText,
      textIncludes,
      textEquals,
      recordMatchesAnyText,
      getSession: () => getSession(websiteId),
      getData: () => cloneJson(data),
      awardEvidence: (record) => awardEvidenceForRecord(websiteId, record, getWebsiteDefinition(websiteId)),
      session,
      data,
    };
  }

  function createWebsitePage(websiteId) {
    const definition = getWebsiteDefinition(websiteId);
    if (!definition) {
      throw new Error(`Unknown website: ${websiteId}`);
    }

    if (typeof definition.buildPage !== "function") {
      throw new Error(`Website ${websiteId} does not define a buildPage function.`);
    }

    return definition.buildPage({
      manager: api,
      websiteId: normalizeText(websiteId),
      definition,
      getSession: () => getSession(websiteId),
      getData: () => loadWebsiteData(websiteId),
      searchWebsite: (request) => searchWebsite(websiteId, request),
      loginWebsite: (credentials) => loginWebsite(websiteId, credentials),
      setActiveWebsite,
      getActiveWebsite,
    });
  }

  const api = {
    registerWebsite,
    getWebsiteDefinition,
    getWebsiteIds,
    getActiveWebsite,
    setActiveWebsite,
    loadWebsiteData,
    getSession,
    setSession,
    loginWebsite,
    searchWebsite,
    createWebsitePage,
    normalizeText,
    textIncludes,
    textEquals,
    recordMatchesAnyText,
  };

  let activeWebsiteId = "";

  return api;
}
