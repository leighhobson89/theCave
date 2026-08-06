import { textEquals, textIncludes } from "./webContentManager.js";

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

function createSection(titleText, classNames = []) {
  const section = document.createElement("section");
  section.classList.add("browser-page-section", ...classNames);
  if (titleText) {
    const title = createElement("h2", ["browser-section-title"], titleText);
    section.appendChild(title);
  }
  return section;
}

function createResultEmptyState(text) {
  return createElement("div", ["browser-results-empty"], text);
}

function normalizeQuery(query) {
  return String(query ?? "").replace(/\s+/g, " ").trim();
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

function renderResultsIntoTarget(target, records, renderer, emptyText = "No results found.") {
  target.replaceChildren();

  if (!records.length) {
    target.appendChild(createResultEmptyState(emptyText));
    return;
  }

  records.forEach((record) => {
    target.appendChild(renderer(record));
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

function createZoomSearchPage({ searchWebsite }) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-zoomsearch");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-zoom"]);
  const title = createElement("h1", ["browser-zoom-title"]);
  const titleText = createElement("span", [], "ZoomSearch");
  const rocket = createElement("span", ["browser-zoom-rocket"]);
  rocket.setAttribute("aria-hidden", "true");
  title.append(titleText, rocket);

  const intro = createElement("p", ["browser-page-intro"], "Early search engine results from the cave net.");

  const searchRow = document.createElement("table");
  searchRow.classList.add("browser-form-table");
  const queryInput = createInput({ ariaLabel: "ZoomSearch query", placeholder: "Search the cave net" });
  const searchButton = createButton("Search", runSearch);
  searchRow.append(createSearchFormRow("Query", queryInput));
  searchRow.append(createSearchFormRow("", searchButton));

  const status = createStatusLine("Ready.");
  const results = createElement("div", ["browser-results-list"]);

  async function runSearch() {
    const result = await searchWebsite({ query: queryInput.value });
    const visibleRecords = Array.isArray(result.results) ? result.results : [];
    status.textContent = result.message || (result.awardedEvidence.length ? `Evidence unlocked: ${result.awardedEvidence.length}` : `Found ${visibleRecords.length} result(s).`);
    renderResultsIntoTarget(
      results,
      visibleRecords,
      renderZoomResultCard,
      "Search brings up a lot of unrelated bumph. You move on."
    );
  }

  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
  });

  shell.append(title, intro, searchRow, status, results);
  root.appendChild(shell);
  return root;
}

function renderZoomResultCard(record) {
  const card = createElement("article", ["browser-result-card", "browser-result-card-zoom"]);
  card.append(
    createElement("h3", ["browser-result-title"], record.title || record.id),
    createElement("p", ["browser-result-body"], record.body || record.excerpt || ""),
  );
  return card;
}

function createLibraryPage({ searchWebsite }) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-library");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-library"]);
  const title = createElement("h1", ["browser-page-title", "browser-page-title-library"], "Intranet Library Database");
  const intro = createElement("p", ["browser-page-intro", "browser-page-intro-library"], "Both author and title must match the same record.");

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const authorInput = createInput({ ariaLabel: "Library author", placeholder: "Author" });
  const titleInput = createInput({ ariaLabel: "Library title", placeholder: "Title" });
  const searchButton = createButton("Search Catalog", runSearch);
  const clearButton = createButton("Clear", () => {
    authorInput.value = "";
    titleInput.value = "";
    results.replaceChildren();
    status.textContent = "Ready.";
  });
  const buttonRow = document.createElement("tr");
  const buttonCell = document.createElement("td");
  buttonCell.colSpan = 2;
  buttonCell.append(searchButton, clearButton);
  buttonRow.appendChild(buttonCell);
  form.append(
    createSearchFormRow("Author", authorInput),
    createSearchFormRow("Title", titleInput),
    buttonRow
  );

  const status = createStatusLine("Ready.");
  const results = document.createElement("table");
  results.classList.add("browser-results-table", "browser-results-library");
  const head = document.createElement("thead");
  head.innerHTML = "<tr><th>Author</th><th>Title</th><th>Subject</th><th>Summary</th></tr>";
  const body = document.createElement("tbody");
  results.append(head, body);

  async function runSearch() {
    const result = await searchWebsite({
      author: authorInput.value,
      title: titleInput.value,
    });
    const visibleRecords = Array.isArray(result.results) ? result.results : [];
    status.textContent = result.message || `Found ${visibleRecords.length} record(s).`;
    body.replaceChildren();
    if (!visibleRecords.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.appendChild(createResultEmptyState("Nothing found."));
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    visibleRecords.forEach((record) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(record.author || "")}</td>
        <td>${escapeHtml(record.title || "")}</td>
        <td>${escapeHtml(record.subject || "")}</td>
        <td>${escapeHtml(record.body || record.excerpt || "")}</td>
      `;
      body.appendChild(row);
    });
  }

  shell.append(title, intro, form, status, results);
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
  header.append(icon, createElement("span", [], "Saskatchewan Police Records Access Terminal"));

  const loginPanel = createElement("div", ["browser-auth-panel", "browser-auth-panel-police"]);
  const loginTitle = createElement("div", ["browser-archives-auth-title"], "Login");
  const usernameInput = createInput({ ariaLabel: "Police username", placeholder: "Username" });
  const passwordInput = createInput({ type: "password", ariaLabel: "Police password", placeholder: "Password" });
  const loginButton = createButton("Login", runLogin);
  const status = createStatusLine("Logged out.");
  loginPanel.append(loginTitle, usernameInput, passwordInput, loginButton, status);

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const queryInput = createInput({ ariaLabel: "Police search", placeholder: "Search records" });
  const searchButton = createButton("Search", runSearch);
  form.append(
    createSearchFormRow("Search", queryInput),
    createSearchFormRow("", searchButton)
  );

  const results = document.createElement("table");
  results.classList.add("browser-results-table", "browser-results-police");
  results.innerHTML = "<thead><tr><th>Title</th><th>Privilege</th><th>Summary</th></tr></thead><tbody></tbody>";
  const body = results.querySelector("tbody");

  async function runLogin() {
    const session = await loginWebsite({
      username: usernameInput.value,
      password: passwordInput.value,
    });
    if (!session.authenticated) {
      status.textContent = "Invalid login. Access remains Public (Level 0).";
      return;
    }

    status.textContent = `Logged in as: ${session.accessLabel || "Guest"} (Level ${session.accessLevel ?? 0})`;
  }

  async function runSearch() {
    const session = getSession();
    const result = await searchWebsite({ query: queryInput.value, session });
    const visibleRecords = Array.isArray(result.results) ? result.results : [];
    const deniedCount = Number(result.deniedCount || 0);
    status.textContent = result.message || (deniedCount ? `${deniedCount} restricted record(s) hidden by privilege.` : `Found ${visibleRecords.length} record(s).`);
    body.replaceChildren();
    if (!visibleRecords.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.appendChild(createResultEmptyState("Nothing found."));
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    visibleRecords.forEach((record) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(record.title || "")}</td>
        <td>${escapeHtml(String(record.requiredPrivilegeLevel ?? 0))}</td>
        <td>${escapeHtml(record.body || record.excerpt || "")}</td>
      `;
      body.appendChild(row);
    });
  }

  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
  });

  shell.append(header, loginPanel, form, results);
  root.appendChild(shell);

  void loginWebsite({ useDefault: true }).then((session) => {
    status.textContent = `Logged in as: ${session.accessLabel || "Guest"} (Level ${session.accessLevel ?? 0})`;
  });

  return root;
}

function createArchivesPage({ loginWebsite, searchWebsite, getSession }) {
  const root = document.createElement("div");
  root.classList.add("caveos-browser-page", "browser-page-archives");

  const shell = createElement("div", ["browser-page-shell", "browser-page-shell-archives"]);
  const title = createElement("h1", ["browser-page-title"], "Canada Newspaper Archive Database");
  const authPanel = createElement("div", ["browser-archives-auth"]);
  const authTitle = createElement("div", ["browser-archives-auth-title"], "Archive Access");
  const usernameInput = createInput({ ariaLabel: "Archive username", placeholder: "Username" });
  const passwordInput = createInput({ type: "password", ariaLabel: "Archive password", placeholder: "Password" });
  const loginButton = createButton("Login", runLogin);
  const status = createStatusLine("Logged out.");
  authPanel.append(authTitle, usernameInput, passwordInput, loginButton, status);

  const form = document.createElement("table");
  form.classList.add("browser-form-table", "browser-grid-table");
  const queryInput = createInput({ ariaLabel: "Archive keyword search", placeholder: "Keywords" });
  const dateInput = createInput({ type: "date", ariaLabel: "Archive date" });
  const provinceSelect = createSelect(
    [
      { value: "all", label: "All", selected: true },
      "Saskatchewan",
      "Alberta",
      "Ontario",
      "Quebec",
    ],
    "Province selector"
  );
  const searchButton = createButton("Find Records", runSearch);
  form.append(
    createSearchFormRow("Keywords", queryInput),
    createSearchFormRow("Date", dateInput),
    createSearchFormRow("Province", provinceSelect),
    createSearchFormRow("", searchButton)
  );

  const results = document.createElement("table");
  results.classList.add("browser-results-table", "browser-results-archives");
  results.innerHTML = "<thead><tr><th>Date</th><th>Province</th><th>Headline</th><th>Summary</th></tr></thead><tbody></tbody>";
  const body = results.querySelector("tbody");

  async function runLogin() {
    const session = await loginWebsite({
      username: usernameInput.value,
      password: passwordInput.value,
    });
    if (!session.authenticated) {
      status.textContent = "Invalid login. Access remains Free.";
      return;
    }

    status.textContent = `Logged in as: ${session.accessLabel || "Free"}`;
  }

  async function runSearch() {
    const session = getSession();
    const result = await searchWebsite({
      query: queryInput.value,
      date: dateInput.value,
      province: provinceSelect.value,
      session,
    });
    const visibleRecords = Array.isArray(result.results) ? result.results : [];
    const deniedCount = Number(result.deniedCount || 0);
    status.textContent = result.message || (deniedCount ? `${deniedCount} subscriber record(s) hidden.` : `Found ${visibleRecords.length} article(s).`);
    body.replaceChildren();
    if (!visibleRecords.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.appendChild(createResultEmptyState("Nothing found."));
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    visibleRecords.forEach((record) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(record.date || "")}</td>
        <td>${escapeHtml(record.province || "")}</td>
        <td>${escapeHtml(record.title || "")}</td>
        <td>${escapeHtml(record.body || record.excerpt || "")}</td>
      `;
      body.appendChild(row);
    });
  }

  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
  });

  shell.append(title, authPanel, form, results);
  root.appendChild(shell);

  void loginWebsite({ useDefault: true }).then((session) => {
    status.textContent = `Logged in as: ${session.accessLabel || "Free"}`;
  });

  return root;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function registerDefaultWebContentSites(manager) {
  manager.registerWebsite({
    id: "zoomsearch",
    displayName: "ZoomSearch",
    homeUrl: "http://www.zoomsearch.net",
    dataPath: "./assets/web-content/zoomsearch.json",
    pageClass: "browser-page-zoomsearch",
    searchFields: ["title", "body", "keywords"],
    buildPage: createZoomSearchPage,
    search: ({ data, request, helpers }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const query = normalizeQuery(request?.query ?? "");
      const matches = records.filter((record) =>
        recordMatchesExactQuery(record, query, ["title", "body", "keywords"])
      );
      return {
        results: matches,
        message: matches.length
          ? ""
          : "Search brings up a lot of unrelated bumph. You move on.",
        deniedCount: 0,
      };
    },
  });

  manager.registerWebsite({
    id: "library",
    displayName: "Library Database",
    homeUrl: "http://library.intra",
    dataPath: "./assets/web-content/library.json",
    pageClass: "browser-page-library",
    searchFields: ["author", "title"],
    buildPage: createLibraryPage,
    search: ({ data, request, helpers }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const author = normalizeQuery(request?.author ?? "");
      const title = normalizeQuery(request?.title ?? "");
      const matches = records.filter((record) =>
        textEquals(record.author, author) && textEquals(record.title, title)
      );
      return {
        results: matches,
        message: matches.length ? "" : "Nothing found.",
        deniedCount: 0,
      };
    },
  });

  manager.registerWebsite({
    id: "police",
    displayName: "Saskatchewan Police Database",
    homeUrl: "http://records.sk-police.gov",
    dataPath: "./assets/web-content/police.json",
    pageClass: "browser-page-police",
    searchFields: ["title", "body", "keywords"],
    defaultAccessLabel: "Public",
    buildPage: createPoliceRecordsPage,
    authenticate: ({ data, credentials }) => {
      const accounts = Array.isArray(data?.accounts) ? data.accounts : [];

      if (credentials?.useDefault) {
        const account = accounts.find((item) => item?.default) || accounts[0] || null;
        return account
          ? {
              authenticated: true,
              account,
              accessLevel: Number(account.privilegeLevel || 0),
              accessLabel: account.label || account.username || "Public",
            }
          : { authenticated: false, account: null, accessLevel: 0, accessLabel: "Public" };
      }

      const username = normalizeQuery(credentials?.username);
      const password = String(credentials?.password ?? "");
      const account = accounts.find((item) =>
        normalizeQuery(item.username) === username && String(item.password ?? "") === password
      );

      return account
        ? {
            authenticated: true,
            account,
            accessLevel: Number(account.privilegeLevel || 0),
            accessLabel: account.label || account.username || "Public",
          }
        : { authenticated: false, account: null, accessLevel: 0, accessLabel: "Public" };
    },
    search: ({ data, request, session, helpers }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const query = normalizeQuery(request?.query ?? "");
      const accessLevel = Number(session?.accessLevel || 0);
      const matches = [];
      let deniedCount = 0;

      records.forEach((record) => {
        if (!recordMatchesExactQuery(record, query, ["title", "body", "keywords"])) {
          return;
        }

        const requiredPrivilegeLevel = Number(record.requiredPrivilegeLevel || 0);
        if (accessLevel >= requiredPrivilegeLevel) {
          matches.push(record);
          return;
        }

        deniedCount += 1;
      });

      return {
        results: matches,
        deniedCount,
        message: matches.length
          ? ""
          : deniedCount
            ? "One or more matching records were hidden by privilege restrictions."
            : "Nothing found.",
      };
    },
  });

  manager.registerWebsite({
    id: "archives",
    displayName: "Canada Newspaper Archive",
    homeUrl: "http://archives.canada.news",
    dataPath: "./assets/web-content/archives.json",
    pageClass: "browser-page-archives",
    searchFields: ["title", "body", "keywords", "province", "date"],
    defaultAccessLabel: "Free",
    buildPage: createArchivesPage,
    authenticate: ({ data, credentials }) => {
      const accounts = Array.isArray(data?.accounts) ? data.accounts : [];

      if (credentials?.useDefault) {
        const account = accounts.find((item) => item?.default) || accounts[0] || null;
        return account
          ? {
              authenticated: true,
              account,
              accessLevel: Number(account.accessLevel || 0),
              accessLabel: account.label || "Free",
            }
          : { authenticated: false, account: null, accessLevel: 0, accessLabel: "Free" };
      }

      const username = normalizeQuery(credentials?.username);
      const password = String(credentials?.password ?? "");
      const account = accounts.find((item) =>
        normalizeQuery(item.username) === username && String(item.password ?? "") === password
      );

      return account
        ? {
            authenticated: true,
            account,
            accessLevel: Number(account.accessLevel || 0),
            accessLabel: account.label || "Free",
          }
        : { authenticated: false, account: null, accessLevel: 0, accessLabel: "Free" };
    },
    search: ({ data, request, session, helpers }) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      const query = normalizeQuery(request?.query ?? "");
      const date = normalizeQuery(request?.date ?? "");
      const province = normalizeQuery(request?.province ?? "");
      const accessLevel = Number(session?.accessLevel || 0);
      const matches = [];
      let deniedCount = 0;

      records.forEach((record) => {
        if (!recordMatchesExactQuery(record, query, ["title", "body", "keywords"])) {
          return;
        }

        if (date && !textEquals(record.date, date)) {
          return;
        }

        if (province && province !== "all" && !textEquals(record.province, province)) {
          return;
        }

        const requiredAccessLevel = Number(record.requiredAccessLevel || 0);
        if (accessLevel >= requiredAccessLevel) {
          matches.push(record);
          return;
        }

        deniedCount += 1;
      });

      return {
        results: matches,
        deniedCount,
        message: matches.length
          ? ""
          : deniedCount
            ? "Subscriber-only articles were hidden by access level."
            : "Nothing found.",
      };
    },
  });
}
