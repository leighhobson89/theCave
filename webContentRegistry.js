import { textEquals } from "./webContentManager.js";

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

      if (typeof image === "string") {
        return {
          src: image,
          alt: "",
          caption: "",
        };
      }

      const src = String(image.src ?? "").trim();
      if (!src) {
        return null;
      }

      return {
        src,
        alt: String(image.alt ?? "").trim(),
        caption: String(image.caption ?? "").trim(),
      };
    })
    .filter(Boolean);
}

function normalizeLines(value) {
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

function createDetailHost(placeholderText = "Select the record below to inspect its contents.") {
  const host = createElement("section", ["browser-record-detail"]);
  const body = createElement("div", ["browser-record-detail-body"]);
  body.appendChild(createResultEmptyState(placeholderText));
  host.appendChild(body);
  return { host, body };
}

function setDetailContent(detailBody, contentNode, placeholderText = "Select the record below to inspect its contents.") {
  detailBody.replaceChildren();
  if (!contentNode) {
    detailBody.appendChild(createResultEmptyState(placeholderText));
    return;
  }

  detailBody.appendChild(contentNode);
}

function createTextSection(titleText, content, classNames = []) {
  const section = createElement("section", ["browser-detail-section", ...classNames]);
  if (titleText) {
    section.appendChild(createElement("h3", ["browser-detail-section-title"], titleText));
  }

  normalizeLines(content).forEach((paragraphText) => {
    section.appendChild(createElement("p", ["browser-detail-paragraph"], paragraphText));
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

function createImageGallery(images, classNames = []) {
  const normalizedImages = normalizeImages(images);
  if (!normalizedImages.length) {
    return null;
  }

  const gallery = createElement("div", ["browser-image-gallery", ...classNames]);
  normalizedImages.forEach((image) => {
    const figure = createElement("figure", ["browser-image-figure"]);
    const img = document.createElement("img");
    img.classList.add("browser-detail-image");
    img.src = image.src;
    img.alt = image.alt;
    img.title = image.alt;
    figure.appendChild(img);
    gallery.appendChild(figure);
  });

  return gallery;
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

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.classList.add("browser-results-row", "is-selectable");
    row.tabIndex = 0;
    row.setAttribute("role", "button");

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
    };

    row.addEventListener("click", activate);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });

    tbody.appendChild(row);
  });
}

function formatFoundMessage(label, awardedEvidence = 0) {
  const baseMessage = `Found 1 ${label}. Select the record below to inspect it.`;
  if (!awardedEvidence) {
    return baseMessage;
  }

  return `${baseMessage} Evidence unlocked: ${awardedEvidence}.`;
}

function buildZoomDetail(record) {
  const wrapper = createElement("article", ["browser-record-layout", "browser-record-layout-zoom"]);
  wrapper.appendChild(createElement("div", ["browser-site-banner"], record.websiteName || "ZoomSearch Result"));
  wrapper.appendChild(createElement("h2", ["browser-record-title"], record.pageTitle || record.id));
  wrapper.appendChild(createElement("div", ["browser-record-url"], record.url || ""));

  const grid = createElement("div", ["browser-record-columns", "browser-record-columns-zoom"]);
  const mainColumn = createElement("div", ["browser-record-main"]);
  const sideColumn = createElement("aside", ["browser-record-side"]);

  if (record.summary) {
    mainColumn.appendChild(createElement("p", ["browser-record-summary"], record.summary));
  }
  mainColumn.appendChild(createTextSection("Page Content", record.pageContent || record.htmlContent || record.body));

  const gallery = createImageGallery(record.images, ["browser-image-gallery-zoom"]);
  if (gallery) {
    sideColumn.appendChild(gallery);
  } else {
    sideColumn.appendChild(createResultEmptyState("No page images are attached to this result."));
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
  mediaColumn.appendChild(gallery || createResultEmptyState("No scanned cover or illustration is attached."));

  detailColumn.appendChild(createElement("h2", ["browser-record-title"], record.title || record.id));
  detailColumn.appendChild(
    createMetadataGrid([
      { label: "Author", value: record.author },
      { label: "Publisher", value: record.publisher },
      { label: "Publication Year", value: record.publicationYear },
      { label: "Province", value: record.province },
      { label: "Summary", value: record.summary },
    ])
  );

  top.append(mediaColumn, detailColumn);
  wrapper.appendChild(top);
  wrapper.appendChild(createTextSection("Extract", record.extract || record.body));

  const references = createKeyValueList("References", record.references, ["browser-detail-references"]);
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
      { label: "Case Number", value: record.caseNumber },
      { label: "Province", value: record.province },
      { label: "Officer", value: record.officer },
      { label: "Classification", value: record.classification },
      { label: "Declassification", value: record.declassificationStatus },
      { label: "Date", value: record.date },
      { label: "Summary", value: record.summary },
    ], ["browser-detail-meta-grid-police"])
  );

  const gallery = createImageGallery(record.images, ["browser-image-gallery-police"]);
  if (gallery) {
    wrapper.appendChild(gallery);
  }

  wrapper.appendChild(createTextSection("Report", record.report || record.body));

  const attachments = createKeyValueList("Attachments", record.attachments, ["browser-detail-attachments"]);
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
      { label: "Publication", value: record.publication },
      { label: "Edition", value: record.edition },
      { label: "Province", value: record.province },
      { label: "Date", value: record.date },
      { label: "Summary", value: record.summary },
    ], ["browser-detail-meta-grid-archives"])
  );
  wrapper.appendChild(createTextSection("Article", record.article || record.body));

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
  const queryInput = createInput({ ariaLabel: "ZoomSearch query", placeholder: "Enter full keyword" });
  const searchButton = createButton("Search", runSearch);
  searchRow.append(createSearchFormRow("Query", queryInput), createSearchFormRow("", searchButton));

  const status = createStatusLine("Ready.");
  const { table, body } = createResultsTable(["Website", "Page", "URL", "Summary"], ["browser-results-zoom"]);
  const { host: detailHost, body: detailBody } = createDetailHost("Select the returned webpage entry to inspect its contents.");

  async function runSearch() {
    const result = await searchWebsite({ query: queryInput.value });
    const visibleRecords = Array.isArray(result.results) ? result.results.slice(0, 1) : [];
    status.textContent = visibleRecords.length
      ? formatFoundMessage("result", result.awardedEvidence.length)
      : result.message || "Search brings up a lot of unrelated bumph. You move on.";

    makeSelectableResults({
      tbody: body,
      records: visibleRecords,
      detailBody,
      emptyColSpan: 4,
      emptyText: "Search brings up a lot of unrelated bumph. You move on.",
      detailPrompt: "Select the returned webpage entry to inspect its contents.",
      getRowValues: (record) => [record.websiteName, record.pageTitle, record.url, record.summary],
      renderDetail: buildZoomDetail,
    });
  }

  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
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
  const authorInput = createInput({ ariaLabel: "Library author", placeholder: "Author" });
  const titleInput = createInput({ ariaLabel: "Library title", placeholder: "Title" });
  const status = createStatusLine("Ready.");
  const { table, body } = createResultsTable(["Author", "Title", "Publisher", "Year"], ["browser-results-library"]);
  const { host: detailHost, body: detailBody } = createDetailHost("Select the returned library entry to inspect it.");

  async function runSearch() {
    const result = await searchWebsite({
      author: authorInput.value,
      title: titleInput.value,
    });
    const visibleRecords = Array.isArray(result.results) ? result.results.slice(0, 1) : [];
    status.textContent = visibleRecords.length
      ? formatFoundMessage("record", result.awardedEvidence.length)
      : result.message || "Nothing found.";

    makeSelectableResults({
      tbody: body,
      records: visibleRecords,
      detailBody,
      emptyColSpan: 4,
      emptyText: "Nothing found.",
      detailPrompt: "Select the returned library entry to inspect it.",
      getRowValues: (record) => [record.author, record.title, record.publisher, record.publicationYear],
      renderDetail: buildLibraryDetail,
    });
  }

  const searchButton = createButton("Search Catalog", runSearch);
  const clearButton = createButton("Clear", () => {
    authorInput.value = "";
    titleInput.value = "";
    status.textContent = "Ready.";
    body.replaceChildren();
    setDetailContent(detailBody, null, "Select the returned library entry to inspect it.");
  });
  const buttonRow = document.createElement("tr");
  const buttonCell = document.createElement("td");
  buttonCell.colSpan = 2;
  buttonCell.append(searchButton, clearButton);
  buttonRow.appendChild(buttonCell);
  form.append(createSearchFormRow("Author", authorInput), createSearchFormRow("Title", titleInput), buttonRow);

  shell.append(form, status, table, detailHost);
  root.appendChild(shell);
  return root;
}

function createPoliceRecordsPage({ loginWebsite, searchWebsite, getSession }) {
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

  const loginPanel = createElement("div", ["browser-auth-panel", "browser-auth-panel-police"]);
  loginPanel.appendChild(createElement("div", ["browser-archives-auth-title"], "Login"));
  const usernameInput = createInput({ ariaLabel: "Police username", placeholder: "Username" });
  const passwordInput = createInput({ type: "password", ariaLabel: "Police password", placeholder: "Password" });
  const loginButton = createButton("Login", runLogin);
  const status = createStatusLine("Logged out.");
  loginPanel.append(usernameInput, passwordInput, loginButton, status);

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const queryInput = createInput({ ariaLabel: "Police search", placeholder: "Enter full keyword" });
  const searchButton = createButton("Search", runSearch);
  form.append(createSearchFormRow("Keywords", queryInput), createSearchFormRow("", searchButton));

  const { table, body } = createResultsTable(["Case", "Title", "Date", "Summary"], ["browser-results-police"]);
  const { host: detailHost, body: detailBody } = createDetailHost("Select the returned police record to inspect it.");

  async function runLogin() {
    const session = await loginWebsite({ username: usernameInput.value, password: passwordInput.value });
    if (!session.authenticated) {
      status.textContent = "Invalid login. Access remains Public (Level 0).";
      return;
    }

    status.textContent = `Logged in as: ${session.accessLabel || "Public"} (Level ${session.accessLevel ?? 0})`;
  }

  async function runSearch() {
    const session = getSession();
    const result = await searchWebsite({ query: queryInput.value, session });
    const visibleRecords = Array.isArray(result.results) ? result.results.slice(0, 1) : [];
    status.textContent = visibleRecords.length
      ? formatFoundMessage("record", result.awardedEvidence.length)
      : result.message || "Nothing found.";

    makeSelectableResults({
      tbody: body,
      records: visibleRecords,
      detailBody,
      emptyColSpan: 4,
      emptyText: "Nothing found.",
      detailPrompt: "Select the returned police record to inspect it.",
      getRowValues: (record) => [record.caseNumber, record.title, record.date, record.summary],
      renderDetail: buildPoliceDetail,
    });
  }

  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
  });

  shell.append(header, subtitle, loginPanel, form, table, detailHost);
  root.appendChild(shell);

  void loginWebsite({ useDefault: true }).then((session) => {
    status.textContent = `Logged in as: ${session.accessLabel || "Public"} (Level ${session.accessLevel ?? 0})`;
  });

  return root;
}

function createArchivesPage({ loginWebsite, searchWebsite, getSession }) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-archives");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-archives"]);
  shell.append(
    createElement("h1", ["browser-page-title"], "Canada Newspaper Archive Database"),
    createElement("p", ["browser-page-intro", "browser-page-intro-archives"], "Province and keyword must both exactly match the same archive entry."),
  );

  const authPanel = createElement("div", ["browser-archives-auth"]);
  authPanel.appendChild(createElement("div", ["browser-archives-auth-title"], "Archive Access"));
  const usernameInput = createInput({ ariaLabel: "Archive username", placeholder: "Username" });
  const passwordInput = createInput({ type: "password", ariaLabel: "Archive password", placeholder: "Password" });
  const loginButton = createButton("Login", runLogin);
  const status = createStatusLine("Logged out.");
  authPanel.append(usernameInput, passwordInput, loginButton, status);

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const queryInput = createInput({ ariaLabel: "Archive keyword search", placeholder: "Enter full keyword" });
  const provinceSelect = createSelect(
    [
      { value: "Saskatchewan", label: "Saskatchewan", selected: true },
      "Ontario",
      "Quebec",
      "Alberta",
    ],
    "Province selector"
  );
  const searchButton = createButton("Find Records", runSearch);
  form.append(
    createSearchFormRow("Province", provinceSelect),
    createSearchFormRow("Keywords", queryInput),
    createSearchFormRow("", searchButton)
  );

  const { table, body } = createResultsTable(["Date", "Province", "Headline", "Summary"], ["browser-results-archives"]);
  const { host: detailHost, body: detailBody } = createDetailHost("Select the returned newspaper record to inspect it.");

  async function runLogin() {
    const session = await loginWebsite({ username: usernameInput.value, password: passwordInput.value });
    if (!session.authenticated) {
      status.textContent = "Invalid login. Access remains Free.";
      return;
    }

    status.textContent = `Logged in as: ${session.accessLabel || "Free"}`;
  }

  async function runSearch() {
    const selectedProvince = provinceSelect.value;
    const session = getSession();
    const result = await searchWebsite({ query: queryInput.value, province: selectedProvince, session });
    const visibleRecords = Array.isArray(result.results) ? result.results.slice(0, 1) : [];
    status.textContent = visibleRecords.length
      ? formatFoundMessage("article", result.awardedEvidence.length)
      : result.message || "Nothing found.";

    makeSelectableResults({
      tbody: body,
      records: visibleRecords,
      detailBody,
      emptyColSpan: 4,
      emptyText: "Nothing found.",
      detailPrompt: "Select the returned newspaper record to inspect it.",
      getRowValues: (record) => [record.date, record.province, record.headline, record.summary],
      renderDetail: buildArchiveDetail,
    });

    provinceSelect.value = "Saskatchewan";
  }

  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
  });

  shell.append(authPanel, form, table, detailHost);
  root.appendChild(shell);

  void loginWebsite({ useDefault: true }).then((session) => {
    status.textContent = `Logged in as: ${session.accessLabel || "Free"}`;
  });

  return root;
}

export function registerDefaultWebContentSites(manager) {
  manager.registerWebsite({
    id: "zoomsearch",
    displayName: "ZoomSearch",
    homeUrl: "http://www.zoomsearch.net",
    dataPath: "./assets/web-content/zoomsearch.json",
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
    dataPath: "./assets/web-content/library.json",
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
        message: match ? "" : "Nothing found.",
        deniedCount: 0,
      };
    },
  });

  manager.registerWebsite({
    id: "police",
    displayName: "Police Records",
    homeUrl: "http://records.sk-police.gov",
    dataPath: "./assets/web-content/police.json",
    pageClass: "browser-page-police",
    searchFields: ["keywords"],
    defaultAccessLabel: "Public",
    buildPage: createPoliceRecordsPage,
    authenticate: ({ data, credentials }) => {
      const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
      const useDefault = credentials?.useDefault;
      const username = normalizeQuery(credentials?.username ?? "");
      const password = String(credentials?.password ?? "");
      const account = useDefault
        ? accounts.find((item) => item?.default) || accounts[0] || null
        : accounts.find((item) => textEquals(item?.username, username) && String(item?.password ?? "") === password) || null;

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
          message: "Nothing found.",
        };
      }

      if (accessLevel < Number(match.requiredPrivilegeLevel || 0)) {
        return {
          results: [],
          deniedCount: 1,
          message: "One or more matching records were hidden by privilege restrictions.",
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
    dataPath: "./assets/web-content/archives.json",
    pageClass: "browser-page-archives",
    searchFields: ["province", "keywords"],
    defaultAccessLabel: "Free",
    buildPage: createArchivesPage,
    authenticate: ({ data, credentials }) => {
      const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
      const useDefault = credentials?.useDefault;
      const username = normalizeQuery(credentials?.username ?? "");
      const password = String(credentials?.password ?? "");
      const account = useDefault
        ? accounts.find((item) => item?.default) || accounts[0] || null
        : accounts.find((item) => textEquals(item?.username, username) && String(item?.password ?? "") === password) || null;

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
          message: "Nothing found.",
        };
      }

      if (accessLevel < Number(match.requiredAccessLevel || 0)) {
        return {
          results: [],
          deniedCount: 1,
          message: "Subscriber-only articles were hidden by access level.",
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
