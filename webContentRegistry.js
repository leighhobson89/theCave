import { textEquals } from "./webContentManager.js";
import { localize } from "./localization.js";
import { getLanguage } from "./constantsAndGlobalVars.js";

// Generic CaveOS/Netscape chrome (buttons, field labels, status/empty
// messages, table headers) is localized; the actual web-content records
// (article bodies, keywords, site identity/branding) are not - see
// registerDefaultWebContentSites() below.
function t(key) {
  return localize(key, getLanguage());
}

let lastSelectedArchiveProvince = "Saskatchewan";

function createElement(tagName, classNames = [], textContent = "") {
  const element = document.createElement(tagName);
  classNames.filter(Boolean).forEach((className) => element.classList.add(className));
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
}

function createInput({ type = "text", ariaLabel, value = "", placeholder = "" } = {}) {
  const input = document.createElement("input");
  input.classList.add("browser-input");
  input.type = type;
  input.value = value;
  if (placeholder) {
    input.placeholder = placeholder;
  }
  if (ariaLabel) {
    input.setAttribute("aria-label", ariaLabel);
  }
  return input;
}

function createSelect(options, ariaLabel) {
  const select = document.createElement("select");
  select.classList.add("browser-select");
  if (ariaLabel) {
    select.setAttribute("aria-label", ariaLabel);
  }

  options.forEach((optionConfig) => {
    const option = document.createElement("option");
    if (typeof optionConfig === "string") {
      option.value = optionConfig;
      option.textContent = optionConfig;
    } else {
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      if (optionConfig.selected) {
        option.selected = true;
      }
    }
    select.appendChild(option);
  });

  return select;
}

function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("browser-button");
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createStatusLine(initialText = "") {
  const status = document.createElement("div");
  status.classList.add("browser-status-line");
  status.textContent = initialText;
  return status;
}

function createResultEmptyState(text) {
  return createElement("div", ["browser-results-empty"], text);
}

export function createContentDivider() {
  return createElement(
    "p",
    ["browser-content-divider"],
    "---------------------------------------------------------------------------------------------"
  );
}

function createBrowserInlineLink(urlText) {
  const normalizedUrl = String(urlText ?? "").trim();
  if (!normalizedUrl) {
    return document.createTextNode("");
  }

  const link = document.createElement("a");
  link.classList.add("browser-inline-content-link");
  link.href = normalizedUrl;
  link.textContent = normalizedUrl;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    link.dispatchEvent(new CustomEvent("caveos-browser-navigate", {
      bubbles: true,
      detail: {
        url: normalizedUrl,
      },
    }));
  });

  return link;
}

// Body text may embed navigable in-game URLs as *-*http://example*-*.
export function appendDelimitedLinkText(targetElement, sourceText) {
  const value = String(sourceText ?? "");
  const tokenPattern = /\*-\*(.*?)\*-\*/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(value)) !== null) {
    const before = value.slice(lastIndex, match.index);
    if (before) {
      targetElement.appendChild(document.createTextNode(before));
    }

    const linkValue = String(match[1] ?? "").trim();
    if (linkValue) {
      targetElement.appendChild(createBrowserInlineLink(linkValue));
    }

    lastIndex = match.index + match[0].length;
  }

  const trailing = value.slice(lastIndex);
  if (trailing) {
    targetElement.appendChild(document.createTextNode(trailing));
  }

  if (!targetElement.childNodes.length) {
    targetElement.textContent = value;
  }
}

function normalizeQuery(query) {
  return String(query ?? "").replace(/\s+/g, " ").trim();
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image) {
        return null;
      }

      const src = String((typeof image === "string" ? image : image.src) ?? "").trim();
      if (!src) {
        return null;
      }

      return {
        src,
        alt: typeof image === "string" ? "" : String(image.alt ?? "").trim(),
        caption: typeof image === "string" ? "" : String(image.caption ?? "").trim(),
      };
    })
    .filter(Boolean);
}

// Splits authored body text into paragraphs on blank lines, or passes an
// already-split array through.
export function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function recordMatchesExactQuery(record, query, fields = []) {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return false;
  }

  return fields.some((field) => {
    const value = record?.[field];
    if (Array.isArray(value)) {
      return value.some((item) => textEquals(item, normalizedQuery));
    }

    return textEquals(value, normalizedQuery);
  });
}

function createSearchFormRow(labelText, control) {
  const row = document.createElement("tr");
  const labelCell = document.createElement("td");
  labelCell.classList.add("browser-label-cell");
  labelCell.textContent = labelText;
  const controlCell = document.createElement("td");
  controlCell.appendChild(control);
  row.append(labelCell, controlCell);
  return row;
}

function createResultsTable(columnLabels, classNames = []) {
  const table = document.createElement("table");
  table.classList.add("browser-results-table", ...classNames);
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");

  columnLabels.forEach((label) => {
    const cell = document.createElement("th");
    cell.textContent = label;
    headRow.appendChild(cell);
  });

  const body = document.createElement("tbody");
  head.appendChild(headRow);
  table.append(head, body);
  return { table, body };
}

function createDetailHost(placeholderText = t("browserSelectRecordDefaultPrompt")) {
  const host = createElement("section", ["browser-record-detail"]);
  const body = createElement("div", ["browser-record-detail-body"]);
  body.appendChild(createResultEmptyState(placeholderText));
  host.appendChild(body);
  return { host, body };
}

function setDetailContent(detailBody, contentNode, placeholderText = t("browserSelectRecordDefaultPrompt")) {
  detailBody.replaceChildren();
  if (!contentNode) {
    detailBody.appendChild(createResultEmptyState(placeholderText));
    return;
  }

  detailBody.appendChild(contentNode);
}

function createTextSection(titleText, content, classNames = []) {
  const section = createElement("section", ["browser-detail-section", ...classNames]);
  const suppressHeading = String(titleText ?? "").trim().toLowerCase() === "page content";
  const paragraphs = normalizeLines(content);

  if (paragraphs.length) {
    section.appendChild(createContentDivider());
  }

  if (titleText && !suppressHeading) {
    section.appendChild(createElement("h3", ["browser-detail-section-title"], titleText));
  }

  paragraphs.forEach((paragraphText) => {
    const paragraph = createElement("p", ["browser-detail-paragraph"]);
    appendDelimitedLinkText(paragraph, paragraphText);
    section.appendChild(paragraph);
  });

  return section;
}

function createMetadataGrid(entries, classNames = []) {
  const grid = createElement("dl", ["browser-detail-meta-grid", ...classNames]);

  entries.filter((entry) => entry?.value).forEach((entry) => {
    const wrapper = createElement("div", ["browser-detail-meta-item"]);
    wrapper.append(
      createElement("dt", ["browser-detail-meta-label"], entry.label),
      createElement("dd", ["browser-detail-meta-value"], String(entry.value))
    );
    grid.appendChild(wrapper);
  });

  return grid;
}

function createKeyValueList(titleText, items, classNames = []) {
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!normalizedItems.length) {
    return null;
  }

  const section = createElement("section", ["browser-detail-section", ...classNames]);
  if (titleText) {
    section.appendChild(createElement("h3", ["browser-detail-section-title"], titleText));
  }

  const list = createElement("ul", ["browser-detail-list"]);
  normalizedItems.forEach((item) => {
    const entry = createElement("li", ["browser-detail-list-item"]);
    if (typeof item === "string") {
      entry.textContent = item;
    } else {
      entry.textContent = item.value
        ? `${item.label}: ${item.value}`
        : String(item.label ?? "");
    }
    list.appendChild(entry);
  });

  section.appendChild(list);
  return section;
}

export function createImageGallery(images, classNames = []) {
  const normalizedImages = normalizeImages(images);
  if (!normalizedImages.length) {
    return null;
  }

  const section = createElement("section", ["browser-media-section"]);
  section.appendChild(createContentDivider());

  const gallery = createElement("div", ["browser-image-gallery", ...classNames]);
  normalizedImages.forEach((image) => {
    const figure = createElement("figure", ["browser-image-figure"]);
    const img = document.createElement("img");
    img.classList.add("browser-detail-image");
    img.src = image.src;
    img.alt = image.alt;
    img.title = image.alt;
    figure.appendChild(img);

    if (image.caption) {
      figure.appendChild(createElement("figcaption", ["browser-image-caption"], image.caption));
    }

    gallery.appendChild(figure);
  });

  section.appendChild(gallery);
  return section;
}

function makeSelectableResults({
  tbody,
  records,
  detailBody,
  emptyColSpan,
  emptyText,
  detailPrompt,
  getRowValues,
  renderDetail,
  autoSelectRecordId = "",
  getReplayDetail = null,
}) {
  tbody.replaceChildren();
  setDetailContent(detailBody, null, detailPrompt);

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = emptyColSpan;
    cell.appendChild(createResultEmptyState(emptyText));
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  const normalizedAutoSelectRecordId = String(autoSelectRecordId || "").trim().toLowerCase();
  let autoActivate = null;

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.classList.add("browser-results-row", "is-selectable");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.dataset.recordId = String(record?.id || "").trim();

    getRowValues(record).forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value ?? "");
      row.appendChild(cell);
    });

    const activate = () => {
      tbody.querySelectorAll(".browser-results-row.is-selected").forEach((activeRow) => {
        activeRow.classList.remove("is-selected");
      });
      row.classList.add("is-selected");
      setDetailContent(detailBody, renderDetail(record), detailPrompt);

      // Dispatched on every record open, not just ones with a `url` (police
      // records don't have one). The address-bar/history listener in ui.js
      // ignores an empty url itself; record-open fax triggers key off
      // `replay.siteId` + `recordId` instead, which every site supplies.
      const detailUrl = String(record?.url || "").trim();
      const replay = typeof getReplayDetail === "function"
        ? getReplayDetail(record)
        : null;
      row.dispatchEvent(new CustomEvent("caveos-browser-record-opened", {
        bubbles: true,
        detail: {
          url: detailUrl,
          recordId: String(record?.id || "").trim(),
          replay: replay && typeof replay === "object" ? replay : null,
        },
      }));
    };

    row.addEventListener("click", activate);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });

    tbody.appendChild(row);

    const normalizedRecordId = String(record?.id || "").trim().toLowerCase();
    if (
      normalizedAutoSelectRecordId
      && normalizedRecordId
      && normalizedRecordId === normalizedAutoSelectRecordId
    ) {
      autoActivate = activate;
    }
  });

  if (typeof autoActivate === "function") {
    autoActivate();
  }
}

function formatFoundMessage(label, awardedEvidence = 0) {
  const baseMessage = `${t("browserFoundOnePrefix")} ${label} ${t("browserFoundMessageSuffix")}`;
  if (!awardedEvidence) {
    return baseMessage;
  }

  return `${baseMessage} ${t("browserEvidenceUnlockedCountSuffix")} ${awardedEvidence}.`;
}

// Re-opening a page from browser address history dispatches a replay event
// carrying the original search terms, so the page can restore its own result.
function wireReplayListener(root, siteId, applyReplay) {
  root.addEventListener("caveos-browser-replay", (event) => {
    const replay = event?.detail;
    if (!replay || String(replay.siteId || "").trim().toLowerCase() !== siteId) {
      return;
    }

    applyReplay(replay);
  });
}

function wireEnterKeySubmit(inputElement, onSubmit) {
  inputElement.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onSubmit();
  });
}

// Username/password panel used by the sites that gate records behind an access
// level.
//
// The session lives in webContentManager and outlives this panel, so re-opening
// the page (or the whole computer) keeps whoever was signed in. The site's
// default guest account is only signed in when there is no session at all, i.e.
// the first time the page is ever built.
//
// "Log Out" does not clear the session; it signs back in as the site's default
// guest account, which is what "logged out" means for these sites.
function createAuthPanel({
  panelClassNames,
  titleText,
  usernameAriaLabel,
  passwordAriaLabel,
  loginWebsite,
  getSession,
  formatSession,
  invalidMessage,
  getQuickLoginEntry,
  recordManualLogin,
  quickLoginWebsite,
  formatQuickLoginLabel,
}) {
  const panel = createElement("div", panelClassNames);
  panel.appendChild(createElement("div", ["browser-archives-auth-title"], titleText));

  const usernameInput = createInput({ ariaLabel: usernameAriaLabel, placeholder: t("browserUsernamePlaceholder") });
  const passwordInput = createInput({ type: "password", ariaLabel: passwordAriaLabel, placeholder: t("browserPasswordPlaceholder") });
  const status = createStatusLine(t("browserLoggedOutStatus"));

  // Sits on its own row under Login/Log Out and only exists once a manual login
  // has banked a level worth replaying. `formatQuickLoginLabel` is what makes
  // the same panel read "Quick Log in (Lvl 3)" for police and "Quick Subscriber
  // Login" for the archives.
  const quickLoginButton = createButton("", async () => {
    const session = await quickLoginWebsite();
    if (!session) {
      return;
    }

    usernameInput.value = "";
    passwordInput.value = "";
    status.textContent = session.authenticated ? formatSession(session) : invalidMessage;
    syncQuickLoginButton();
  });
  quickLoginButton.classList.add("browser-button-quick-login");
  quickLoginButton.setAttribute("aria-label", t("browserQuickLoginAriaLabel"));

  const quickLoginRow = createElement("div", ["browser-auth-actions", "browser-auth-actions-quick"]);
  quickLoginRow.appendChild(quickLoginButton);

  function syncQuickLoginButton() {
    const entry = typeof getQuickLoginEntry === "function" ? getQuickLoginEntry() : null;
    const isAvailable = Boolean(entry) && typeof formatQuickLoginLabel === "function";
    quickLoginRow.classList.toggle("d-none", !isAvailable);
    if (isAvailable) {
      const label = formatQuickLoginLabel(entry);
      quickLoginButton.textContent = label;
      quickLoginButton.setAttribute("aria-label", label);
    }
  }

  const loginButton = createButton(t("browserLoginButton"), async () => {
    const credentials = { username: usernameInput.value, password: passwordInput.value };
    const session = await loginWebsite(credentials);
    status.textContent = session.authenticated ? formatSession(session) : invalidMessage;
    if (typeof recordManualLogin === "function") {
      recordManualLogin(credentials, session);
    }
    syncQuickLoginButton();
  });

  const logoutButton = createButton(t("browserLogoutButton"), async () => {
    const session = await loginWebsite({ useDefault: true });
    usernameInput.value = "";
    passwordInput.value = "";
    status.textContent = formatSession(session);
    syncQuickLoginButton();
  });
  logoutButton.classList.add("browser-button-logout");

  const actionsRow = createElement("div", ["browser-auth-actions"]);
  actionsRow.append(loginButton, logoutButton);

  panel.append(usernameInput, passwordInput, actionsRow, quickLoginRow, status);
  syncQuickLoginButton();

  const existingSession = getSession();
  if (existingSession?.authenticated) {
    status.textContent = formatSession(existingSession);
  } else {
    void loginWebsite({ useDefault: true }).then((session) => {
      status.textContent = formatSession(session);
    });
  }

  return { panel, status, syncQuickLoginButton };
}

// Resolves credentials to an account. Both the username and the password are
// matched EXACTLY against the stored values, so both are case sensitive; only
// surrounding whitespace is trimmed from the typed username.
function findAccountForCredentials(data, credentials) {
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];

  if (credentials?.useDefault) {
    return accounts.find((account) => account?.default) || accounts[0] || null;
  }

  const username = String(credentials?.username ?? "").trim();
  const password = String(credentials?.password ?? "");
  if (!username || !password) {
    return null;
  }

  return accounts.find((account) => (
    String(account?.username ?? "") === username
    && String(account?.password ?? "") === password
  )) || null;
}

// Runs a site search, updates the status line, and rebuilds the result table.
// Every site shows at most one match, so the result list is sliced to one row.
async function runSiteSearch({
  searchWebsite,
  request,
  status,
  foundLabel,
  emptyText,
  ...selectableOptions
}) {
  const result = await searchWebsite(request);
  const visibleRecords = Array.isArray(result.results) ? result.results.slice(0, 1) : [];

  status.textContent = visibleRecords.length
    ? formatFoundMessage(foundLabel, result.awardedEvidence.length)
    : result.message || emptyText;

  makeSelectableResults({
    ...selectableOptions,
    records: visibleRecords,
    emptyText,
  });
}

function buildZoomDetail(record) {
  const wrapper = createElement("article", ["browser-record-layout", "browser-record-layout-zoom"]);
  wrapper.appendChild(createElement("div", ["browser-site-banner"], record.websiteName || "ZoomSearch Result"));
  wrapper.appendChild(createElement("h2", ["browser-record-title"], record.pageTitle || record.id));

  const grid = createElement("div", ["browser-record-columns", "browser-record-columns-zoom"]);
  const mainColumn = createElement("div", ["browser-record-main"]);
  const sideColumn = createElement("aside", ["browser-record-side"]);

  if (record.summary) {
    mainColumn.appendChild(createElement("p", ["browser-record-summary"], record.summary));
  }
  const pageContentSection = createTextSection(t("sectionTitlePageContent"), record.pageContent || record.htmlContent || record.body);
  pageContentSection.classList.add("browser-primary-content-section");
  mainColumn.appendChild(pageContentSection);

  const gallery = createImageGallery(record.images, ["browser-image-gallery-zoom"]);
  if (gallery) {
    sideColumn.appendChild(gallery);
  }

  grid.append(mainColumn, sideColumn);
  wrapper.appendChild(grid);
  return wrapper;
}

function buildLibraryDetail(record) {
  const wrapper = createElement("article", ["browser-record-layout", "browser-record-layout-library"]);
  const top = createElement("div", ["browser-record-columns", "browser-record-columns-library"]);
  const mediaColumn = createElement("div", ["browser-record-side"]);
  const detailColumn = createElement("div", ["browser-record-main"]);

  const gallery = createImageGallery(record.images, ["browser-image-gallery-library"]);
  if (gallery) {
    mediaColumn.appendChild(gallery);
  }

  detailColumn.appendChild(createElement("h2", ["browser-record-title"], record.title || record.id));
  detailColumn.appendChild(
    createMetadataGrid([
      { label: t("browserAuthorFieldLabel"), value: record.author },
      { label: t("tableHeaderPublisher"), value: record.publisher },
      { label: t("publicationYearFieldLabel"), value: record.publicationYear },
      { label: t("browserProvinceFieldLabel"), value: record.province },
      { label: t("tableHeaderSummary"), value: record.summary },
    ])
  );

  top.append(mediaColumn, detailColumn);
  wrapper.appendChild(top);
  const extractSection = createTextSection(t("sectionTitleExtract"), record.extract || record.body);
  extractSection.classList.add("browser-primary-content-section");
  wrapper.appendChild(extractSection);

  const references = createKeyValueList(t("referencesLabel"), record.references, ["browser-detail-references"]);
  if (references) {
    wrapper.appendChild(references);
  }

  return wrapper;
}

function buildPoliceDetail(record) {
  const wrapper = createElement("article", ["browser-record-layout", "browser-record-layout-police"]);
  wrapper.appendChild(createElement("h2", ["browser-record-title"], record.title || record.id));
  wrapper.appendChild(
    createMetadataGrid([
      { label: t("caseNumberFieldLabel"), value: record.caseNumber },
      { label: t("browserProvinceFieldLabel"), value: record.province },
      { label: t("officerFieldLabel"), value: record.officer },
      { label: t("classificationFieldLabel"), value: record.classification },
      { label: t("declassificationFieldLabel"), value: record.declassificationStatus },
      { label: t("tableHeaderDate"), value: record.date },
      { label: t("tableHeaderSummary"), value: record.summary },
    ], ["browser-detail-meta-grid-police"])
  );

  const gallery = createImageGallery(record.images, ["browser-image-gallery-police"]);
  if (gallery) {
    wrapper.appendChild(gallery);
  }

  const reportSection = createTextSection(t("sectionTitleReport"), record.report || record.body);
  reportSection.classList.add("browser-primary-content-section");
  wrapper.appendChild(reportSection);

  const attachments = createKeyValueList(t("attachmentsLabel"), record.attachments, ["browser-detail-attachments"]);
  if (attachments) {
    wrapper.appendChild(attachments);
  }

  return wrapper;
}

function buildArchiveDetail(record) {
  const wrapper = createElement("article", ["browser-record-layout", "browser-record-layout-archives"]);
  wrapper.appendChild(createElement("h2", ["browser-record-title", "browser-record-title-headline"], record.headline || record.title || record.id));
  wrapper.appendChild(
    createMetadataGrid([
      { label: t("publicationFieldLabel"), value: record.publication },
      { label: t("editionFieldLabel"), value: record.edition },
      { label: t("browserProvinceFieldLabel"), value: record.province },
      { label: t("tableHeaderDate"), value: record.date },
      { label: t("tableHeaderSummary"), value: record.summary },
    ], ["browser-detail-meta-grid-archives"])
  );
  const articleSection = createTextSection(t("sectionTitleArticle"), record.article || record.body);
  articleSection.classList.add("browser-primary-content-section");
  wrapper.appendChild(articleSection);

  const gallery = createImageGallery(record.images, ["browser-image-gallery-archives"]);
  if (gallery) {
    wrapper.appendChild(gallery);
  }

  return wrapper;
}

function createZoomSearchPage({ searchWebsite }) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-zoomsearch");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-zoom"]);
  const title = createElement("h1", ["browser-zoom-title"]);
  const titleText = createElement("span", [], "ZoomSearch");
  const rocket = createElement("span", ["browser-zoom-rocket"]);
  rocket.setAttribute("aria-hidden", "true");
  title.append(titleText, rocket);

  const intro = createElement("p", ["browser-page-intro"], "Search exact archived keywords to inspect a recovered webpage.");
  const searchRow = document.createElement("table");
  searchRow.classList.add("browser-form-table");
  const queryInput = createInput({ ariaLabel: t("zoomSearchQueryAriaLabel"), placeholder: t("browserKeywordPlaceholder") });
  const searchButton = createButton(t("browserSearchButton"), runSearch);
  searchRow.append(createSearchFormRow(t("browserQueryFieldLabel"), queryInput), createSearchFormRow("", searchButton));

  const status = createStatusLine(t("browserReadyStatus"));
  const { table, body } = createResultsTable([t("tableHeaderWebsite"), t("tableHeaderPage"), t("tableHeaderSummary")], ["browser-results-zoom"]);
  const { host: detailHost, body: detailBody } = createDetailHost(t("browserSelectWebpageEntryPrompt"));

  async function runSearch({ queryOverride = "", autoSelectRecordId = "" } = {}) {
    const nextQuery = normalizeQuery(queryOverride || queryInput.value);
    if (queryOverride) {
      queryInput.value = queryOverride;
    }

    await runSiteSearch({
      searchWebsite,
      request: { query: nextQuery },
      status,
      foundLabel: t("browserFoundLabelResult"),
      emptyText: "Search brings up a lot of unrelated bumph. You move on.",
      tbody: body,
      detailBody,
      emptyColSpan: 3,
      detailPrompt: t("browserSelectWebpageEntryPrompt"),
      getRowValues: (record) => [record.websiteName, record.pageTitle, record.summary],
      renderDetail: buildZoomDetail,
      autoSelectRecordId,
      getReplayDetail: (record) => ({
        siteId: "zoomsearch",
        query: nextQuery,
        recordId: String(record?.id || "").trim(),
      }),
    });
  }

  wireReplayListener(root, "zoomsearch", (replay) => {
    void runSearch({
      queryOverride: String(replay.query || "").trim(),
      autoSelectRecordId: String(replay.recordId || "").trim(),
    });
  });

  wireEnterKeySubmit(queryInput, () => {
    void runSearch();
  });

  shell.append(title, intro, searchRow, status, table, detailHost);
  root.appendChild(shell);
  return root;
}

function createLibraryPage({ searchWebsite }) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-library");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-library"]);
  shell.append(
    createElement("h1", ["browser-page-title", "browser-page-title-library"], "Library Archive Index"),
    createElement("p", ["browser-page-intro", "browser-page-intro-library"], "Author and title must both exactly match the same archive entry."),
  );

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const authorInput = createInput({ ariaLabel: t("libraryAuthorAriaLabel"), placeholder: t("browserAuthorFieldLabel") });
  const titleInput = createInput({ ariaLabel: t("libraryTitleAriaLabel"), placeholder: t("browserTitleFieldLabel") });
  const status = createStatusLine(t("browserReadyStatus"));
  const { table, body } = createResultsTable([t("browserAuthorFieldLabel"), t("browserTitleFieldLabel"), t("tableHeaderPublisher"), t("tableHeaderYear")], ["browser-results-library"]);
  const { host: detailHost, body: detailBody } = createDetailHost(t("browserSelectLibraryEntryPrompt"));

  async function runSearch({ authorOverride = "", titleOverride = "", autoSelectRecordId = "" } = {}) {
    const authorValue = authorOverride || authorInput.value;
    const titleValue = titleOverride || titleInput.value;
    if (authorOverride) {
      authorInput.value = authorOverride;
    }
    if (titleOverride) {
      titleInput.value = titleOverride;
    }

    await runSiteSearch({
      searchWebsite,
      request: { author: authorValue, title: titleValue },
      status,
      foundLabel: t("browserFoundLabelRecord"),
      emptyText: t("browserNothingFoundMessage"),
      tbody: body,
      detailBody,
      emptyColSpan: 4,
      detailPrompt: t("browserSelectLibraryEntryPrompt"),
      getRowValues: (record) => [record.author, record.title, record.publisher, record.publicationYear],
      renderDetail: buildLibraryDetail,
      autoSelectRecordId,
      getReplayDetail: (record) => ({
        siteId: "library",
        author: normalizeQuery(authorValue),
        title: normalizeQuery(titleValue),
        recordId: String(record?.id || "").trim(),
      }),
    });
  }

  wireReplayListener(root, "library", (replay) => {
    void runSearch({
      authorOverride: String(replay.author || "").trim(),
      titleOverride: String(replay.title || "").trim(),
      autoSelectRecordId: String(replay.recordId || "").trim(),
    });
  });

  const searchButton = createButton(t("browserSearchCatalogButton"), runSearch);
  const clearButton = createButton(t("browserClearButton"), () => {
    authorInput.value = "";
    titleInput.value = "";
    status.textContent = t("browserReadyStatus");
    body.replaceChildren();
    setDetailContent(detailBody, null, t("browserSelectLibraryEntryPrompt"));
  });
  const buttonRow = document.createElement("tr");
  const buttonCell = document.createElement("td");
  buttonCell.colSpan = 2;
  buttonCell.append(searchButton, clearButton);
  buttonRow.appendChild(buttonCell);
  form.append(createSearchFormRow(t("browserAuthorFieldLabel"), authorInput), createSearchFormRow(t("browserTitleFieldLabel"), titleInput), buttonRow);

  shell.append(form, status, table, detailHost);
  root.appendChild(shell);
  return root;
}

function createPoliceRecordsPage({
  loginWebsite,
  searchWebsite,
  getSession,
  getQuickLoginEntry,
  recordManualLogin,
  quickLoginWebsite,
}) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-police");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-police"]);
  const header = createElement("div", ["browser-police-header"]);
  const icon = createElement("span", ["browser-police-icon"]);
  icon.setAttribute("aria-hidden", "true");
  header.append(icon, createElement("span", [], "Saskatchewan & North-West Territories District Police Records"));
  const subtitle = createElement(
    "p",
    ["browser-police-subtitle"],
    "⭐ 50 Years of Declassified and Not So Declassified Police Archives! ⭐"
  );

  const { panel: loginPanel, status } = createAuthPanel({
    panelClassNames: ["browser-auth-panel", "browser-auth-panel-police"],
    titleText: t("browserLoginButton"),
    usernameAriaLabel: t("policeUsernameAriaLabel"),
    passwordAriaLabel: t("policePasswordAriaLabel"),
    loginWebsite,
    getSession,
    formatSession: (session) => `Logged in as: ${session.accessLabel || "Public"} (Level ${session.accessLevel ?? 0})`,
    invalidMessage: "Invalid login. Access remains Public (Level 0).",
    getQuickLoginEntry,
    recordManualLogin,
    quickLoginWebsite,
    formatQuickLoginLabel: (entry) => `Quick Log in (Lvl ${entry.accessLevel})`,
  });

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const queryInput = createInput({ ariaLabel: t("policeSearchAriaLabel"), placeholder: t("browserKeywordPlaceholder") });
  const searchButton = createButton(t("browserSearchButton"), runSearch);
  form.append(createSearchFormRow(t("browserKeywordsFieldLabel"), queryInput), createSearchFormRow("", searchButton));

  const { table, body } = createResultsTable([t("tableHeaderCase"), t("browserTitleFieldLabel"), t("tableHeaderDate"), t("tableHeaderSummary")], ["browser-results-police"]);
  const { host: detailHost, body: detailBody } = createDetailHost(t("browserSelectPoliceRecordPrompt"));

  async function runSearch({ queryOverride = "", autoSelectRecordId = "" } = {}) {
    const queryValue = queryOverride || queryInput.value;
    if (queryOverride) {
      queryInput.value = queryOverride;
    }

    await runSiteSearch({
      searchWebsite,
      request: { query: queryValue, session: getSession() },
      status,
      foundLabel: t("browserFoundLabelRecord"),
      emptyText: t("browserNothingFoundMessage"),
      tbody: body,
      detailBody,
      emptyColSpan: 4,
      detailPrompt: t("browserSelectPoliceRecordPrompt"),
      getRowValues: (record) => [record.caseNumber, record.title, record.date, record.summary],
      renderDetail: buildPoliceDetail,
      autoSelectRecordId,
      getReplayDetail: (record) => ({
        siteId: "police",
        query: normalizeQuery(queryValue),
        recordId: String(record?.id || "").trim(),
      }),
    });
  }

  wireReplayListener(root, "police", (replay) => {
    void runSearch({
      queryOverride: String(replay.query || "").trim(),
      autoSelectRecordId: String(replay.recordId || "").trim(),
    });
  });

  wireEnterKeySubmit(queryInput, () => {
    void runSearch();
  });

  shell.append(header, subtitle, loginPanel, form, table, detailHost);
  root.appendChild(shell);

  return root;
}

function createArchivesPage({
  loginWebsite,
  searchWebsite,
  getSession,
  getQuickLoginEntry,
  recordManualLogin,
  quickLoginWebsite,
}) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-archives");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-archives"]);
  shell.append(
    createElement("h1", ["browser-page-title"], "Canada Newspaper Archive Database"),
    createElement("p", ["browser-page-intro", "browser-page-intro-archives"], "Province and keyword must both exactly match the same archive entry."),
  );

  const { panel: authPanel, status } = createAuthPanel({
    panelClassNames: ["browser-archives-auth"],
    titleText: "Archive Access",
    usernameAriaLabel: t("archiveUsernameAriaLabel"),
    passwordAriaLabel: t("archivePasswordAriaLabel"),
    loginWebsite,
    getSession,
    formatSession: (session) => `Logged in as: ${session.accessLabel || "Free"}`,
    invalidMessage: "Invalid login. Access remains Free.",
    getQuickLoginEntry,
    recordManualLogin,
    quickLoginWebsite,
    formatQuickLoginLabel: () => "Quick Subscriber Login",
  });

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const queryInput = createInput({ ariaLabel: t("archiveKeywordSearchAriaLabel"), placeholder: t("browserKeywordPlaceholder") });
  const provinceSelect = createSelect(
    [
      "Saskatchewan",
      "Ontario",
      "Quebec",
      "Alberta",
    ],
    t("browserProvinceSelectorAriaLabel")
  );
  if (lastSelectedArchiveProvince) {
    provinceSelect.value = lastSelectedArchiveProvince;
  }
  const searchButton = createButton(t("browserFindRecordsButton"), runSearch);
  form.append(
    createSearchFormRow(t("browserProvinceFieldLabel"), provinceSelect),
    createSearchFormRow(t("browserKeywordsFieldLabel"), queryInput),
    createSearchFormRow("", searchButton)
  );

  const { table, body } = createResultsTable([t("tableHeaderDate"), t("browserProvinceFieldLabel"), t("tableHeaderHeadline"), t("tableHeaderSummary")], ["browser-results-archives"]);
  const { host: detailHost, body: detailBody } = createDetailHost(t("browserSelectNewspaperRecordPrompt"));

  async function runSearch({ queryOverride = "", provinceOverride = "", autoSelectRecordId = "" } = {}) {
    const selectedProvince = provinceOverride || provinceSelect.value;
    const queryValue = queryOverride || queryInput.value;
    if (provinceOverride) {
      provinceSelect.value = provinceOverride;
    }
    if (queryOverride) {
      queryInput.value = queryOverride;
    }

    lastSelectedArchiveProvince = selectedProvince;

    await runSiteSearch({
      searchWebsite,
      request: { query: queryValue, province: selectedProvince, session: getSession() },
      status,
      foundLabel: t("browserFoundLabelArticle"),
      emptyText: t("browserNothingFoundMessage"),
      tbody: body,
      detailBody,
      emptyColSpan: 4,
      detailPrompt: t("browserSelectNewspaperRecordPrompt"),
      getRowValues: (record) => [record.date, record.province, record.headline, record.summary],
      renderDetail: buildArchiveDetail,
      autoSelectRecordId,
      getReplayDetail: (record) => ({
        siteId: "archives",
        query: normalizeQuery(queryValue),
        province: selectedProvince,
        recordId: String(record?.id || "").trim(),
      }),
    });
  }

  wireReplayListener(root, "archives", (replay) => {
    void runSearch({
      queryOverride: String(replay.query || "").trim(),
      provinceOverride: String(replay.province || "").trim(),
      autoSelectRecordId: String(replay.recordId || "").trim(),
    });
  });

  provinceSelect.addEventListener("change", () => {
    lastSelectedArchiveProvince = provinceSelect.value;
  });

  wireEnterKeySubmit(queryInput, () => {
    void runSearch();
  });

  shell.append(authPanel, form, table, detailHost);
  root.appendChild(shell);

  return root;
}

export function registerDefaultWebContentSites(manager) {
  manager.registerWebsite({
    id: "zoomsearch",
    displayName: "ZoomSearch",
    homeUrl: "http://www.zoomsearch.net",
    dataPath: "./assets/{lang}/zoomsearch.json",
    pageClass: "browser-page-zoomsearch",
    searchFields: ["keywords"],
    buildPage: createZoomSearchPage,
    search: ({ data, request }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const query = normalizeQuery(request?.query ?? "");
      const match = records.find((record) =>
        recordMatchesExactQuery(record, query, ["keywords"])
      );

      return {
        results: match ? [match] : [],
        message: match ? "" : "Search brings up a lot of unrelated bumph. You move on.",
        deniedCount: 0,
      };
    },
  });

  manager.registerWebsite({
    id: "library",
    displayName: "Library Archive",
    homeUrl: "http://library.intra",
    dataPath: "./assets/{lang}/library.json",
    pageClass: "browser-page-library",
    searchFields: ["author", "title"],
    buildPage: createLibraryPage,
    search: ({ data, request }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const author = normalizeQuery(request?.author ?? "");
      const title = normalizeQuery(request?.title ?? "");
      const match = records.find((record) =>
        textEquals(record.author, author) && textEquals(record.title, title)
      );

      return {
        results: match ? [match] : [],
        message: match ? "" : t("browserNothingFoundMessage"),
        deniedCount: 0,
      };
    },
  });

  manager.registerWebsite({
    id: "police",
    displayName: "Police Records",
    homeUrl: "http://records.sk-police.gov",
    dataPath: "./assets/{lang}/police.json",
    pageClass: "browser-page-police",
    searchFields: ["keywords"],
    defaultAccessLabel: "Public",
    buildPage: createPoliceRecordsPage,
    authenticate: ({ data, credentials }) => {
      const account = findAccountForCredentials(data, credentials);

      return account
        ? {
            authenticated: true,
            account,
            accessLevel: Number(account.privilegeLevel || 0),
            accessLabel: account.label || account.username || "Public",
          }
        : { authenticated: false, account: null, accessLevel: 0, accessLabel: "Public" };
    },
    search: ({ data, request, session }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const query = normalizeQuery(request?.query ?? "");
      const accessLevel = Number(session?.accessLevel || 0);
      const match = records.find((record) =>
        recordMatchesExactQuery(record, query, ["keywords"])
      );

      if (!match) {
        return {
          results: [],
          deniedCount: 0,
          message: t("browserNothingFoundMessage"),
        };
      }

      if (accessLevel < Number(match.requiredPrivilegeLevel || 0)) {
        return {
          results: [],
          deniedCount: 1,
          message: t("browserRecordsHiddenByPrivilegeMessage"),
        };
      }

      return {
        results: [match],
        deniedCount: 0,
        message: "",
      };
    },
  });

  manager.registerWebsite({
    id: "archives",
    displayName: "Canada Newspaper Archive",
    homeUrl: "http://archives.canada.news",
    dataPath: "./assets/{lang}/archives.json",
    pageClass: "browser-page-archives",
    searchFields: ["province", "keywords"],
    defaultAccessLabel: "Free",
    buildPage: createArchivesPage,
    authenticate: ({ data, credentials }) => {
      const account = findAccountForCredentials(data, credentials);

      return account
        ? {
            authenticated: true,
            account,
            accessLevel: Number(account.accessLevel || 0),
            accessLabel: account.label || "Free",
          }
        : { authenticated: false, account: null, accessLevel: 0, accessLabel: "Free" };
    },
    search: ({ data, request, session }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const query = normalizeQuery(request?.query ?? "");
      const province = normalizeQuery(request?.province ?? "");
      const accessLevel = Number(session?.accessLevel || 0);
      const match = records.find((record) =>
        textEquals(record.province, province) && recordMatchesExactQuery(record, query, ["keywords"])
      );

      if (!match) {
        return {
          results: [],
          deniedCount: 0,
          message: t("browserNothingFoundMessage"),
        };
      }

      if (accessLevel < Number(match.requiredAccessLevel || 0)) {
        return {
          results: [],
          deniedCount: 1,
          message: t("browserArticlesHiddenByAccessMessage"),
        };
      }

      return {
        results: [match],
        deniedCount: 0,
        message: "",
      };
    },
  });
}
