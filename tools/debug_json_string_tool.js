const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const status = document.getElementById("status");
const languageSelect = document.getElementById("languageSelect");
const targetSelect = document.getElementById("targetSelect");
const evidenceIdInput = document.getElementById("evidenceIdInput");
const defaultTitleInput = document.getElementById("defaultTitleInput");
const paperStyleInput = document.getElementById("paperStyleInput");
const photoPathInput = document.getElementById("photoPathInput");
const addDefaultStartupCheckbox = document.getElementById("addDefaultStartupCheckbox");

const convertButton = document.getElementById("convertButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const pickPhotoButton = document.getElementById("pickPhotoButton");
const injectButton = document.getElementById("injectButton");

const INJECT_API_URL = "http://localhost:5057/api/inject";

const REPORT_FILE_BY_LANG = {
    en: "reportsEvidences_en.json",
    de: "reportsEvidences_de.json",
    es: "reportsEvidences_es.json",
    fr: "reportsEvidences_fr.json",
    it: "reportsEvidences_it.json"
};

const PHOTO_FILE_BY_LANG = {
    en: "photos_evidences_en.json",
    de: "photos_evidences_de.json",
    es: "photos_evidences_es.json",
    fr: "photos_evidences_fr.json",
    it: "photos_evidences_it.json"
};

function setStatus(message) {
    status.textContent = message;
}

function slugifyId(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toTitleFromId(idValue) {
    return idValue
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRawText(raw) {
    const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (!normalized.endsWith("\n")) {
        return `${normalized}\n`;
    }
    return normalized;
}

function toPersistedCrlfText(raw) {
    return normalizeRawText(raw).replace(/\n/g, "\r\n");
}

function toJsonSingleLine(raw) {
    return JSON.stringify(toPersistedCrlfText(raw));
}

function toOutputValue(raw) {
    return `${toJsonSingleLine(raw)},`;
}

function ensureEntriesShape(data) {
    if (!data || typeof data !== "object") {
        return { entries: [] };
    }
    if (!Array.isArray(data.entries)) {
        data.entries = [];
    }
    return data;
}

function buildDefaultEntry(target, id, title, paperStyle, photoPath) {
    const defaultTitle = title || toTitleFromId(id);
    if (target === "photoDescription") {
        return {
            id,
            photoPath: photoPath || "./assets/photos/caveEntrance.png",
            defaultTitleString: defaultTitle,
            paperStyle: paperStyle || "photo-mounted-ivory",
            descriptionText: ""
        };
    }

    return {
        id,
        defaultTitleString: defaultTitle,
        paperStyle: paperStyle || "report-parchment",
        reportText: "",
        descriptionText: ""
    };
}

function applyTargetValue(entry, target, value, photoPath) {
    if (target === "reportText") {
        entry.reportText = value;
        return;
    }

    entry.descriptionText = value;
    if (target === "photoDescription" && photoPath) {
        entry.photoPath = photoPath;
    }
}

function upsertEvidenceJson(data, options) {
    const {
        target,
        evidenceId,
        title,
        paperStyle,
        photoPath,
        value
    } = options;

    const normalized = ensureEntriesShape(data);
    let entry = normalized.entries.find((candidate) => candidate && candidate.id === evidenceId);
    let created = false;

    if (!entry) {
        entry = buildDefaultEntry(target, evidenceId, title, paperStyle, photoPath);
        normalized.entries.push(entry);
        created = true;
    } else {
        if (!entry.defaultTitleString) {
            entry.defaultTitleString = title || toTitleFromId(evidenceId);
        }
        if (!entry.paperStyle) {
            entry.paperStyle = paperStyle || (target === "photoDescription" ? "photo-mounted-ivory" : "report-parchment");
        }
        if (target === "photoDescription" && !entry.photoPath) {
            entry.photoPath = photoPath || "./assets/photos/caveEntrance.png";
        }
        if (target !== "photoDescription" && typeof entry.reportText !== "string") {
            entry.reportText = "";
        }
        if (typeof entry.descriptionText !== "string") {
            entry.descriptionText = "";
        }
    }

    if (title) {
        entry.defaultTitleString = title;
    }
    if (paperStyle) {
        entry.paperStyle = paperStyle;
    }

    applyTargetValue(entry, target, value, photoPath);

    return {
        json: normalized,
        created
    };
}

function getAssetsFileName(language, target) {
    if (target === "photoDescription") {
        return PHOTO_FILE_BY_LANG[language];
    }
    return REPORT_FILE_BY_LANG[language];
}

async function pickPhotoPath() {
    if (!window.showOpenFilePicker) {
        setStatus("File picker is not supported in this browser.");
        return;
    }

    const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
            {
                description: "Image files",
                accept: {
                    "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"]
                }
            }
        ]
    });

    if (!handle) {
        setStatus("No photo selected.");
        return;
    }

    photoPathInput.value = `./assets/photos/${handle.name}`;
    setStatus(`Photo selected: ${handle.name}`);
}

function buildEvidenceId() {
    const raw = evidenceIdInput.value.trim();
    if (raw) {
        const normalized = slugifyId(raw);
        evidenceIdInput.value = normalized;
        return normalized;
    }

    const fromTitle = slugifyId(defaultTitleInput.value || "");
    if (fromTitle) {
        evidenceIdInput.value = fromTitle;
        return fromTitle;
    }

    const fallback = `evidence-${Date.now()}`;
    evidenceIdInput.value = fallback;
    return fallback;
}

async function copyOutputValue() {
    if (!outputText.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(outputText.value);
    } catch (error) {
        outputText.select();
        document.execCommand("copy");
    }
}

function convert() {
    const raw = inputText.value;
    if (!raw.trim()) {
        setStatus("Input is empty.");
        outputText.value = "";
        return;
    }

    outputText.value = toOutputValue(raw);
    setStatus("Converted with trailing comma.");
}

async function injectIntoJson() {
    const raw = inputText.value;
    if (!raw.trim()) {
        setStatus("Input is empty.");
        return;
    }

    const language = languageSelect.value;
    const target = targetSelect.value;
    const evidenceId = buildEvidenceId();
    const title = defaultTitleInput.value.trim();
    const paperStyle = paperStyleInput.value.trim();
    const photoPath = photoPathInput.value.trim();
    const shouldAddDefaultStartup = addDefaultStartupCheckbox.checked;

    outputText.value = toOutputValue(raw);
    const persistedValue = toPersistedCrlfText(raw);

    const targetFileName = getAssetsFileName(language, target);
    let response;
    try {
        response = await fetch(INJECT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                language,
                target,
                evidenceId,
                title,
                paperStyle,
                photoPath,
                persistedValue,
                shouldAddDefaultStartup,
            }),
        });
    } catch (error) {
        throw new Error("Inject API is offline. Start it with: node tools/evidence_builder_server.js");
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Injection API failed (${response.status})`);
    }

    const result = await response.json();

    await copyOutputValue();

    const action = result.created ? "created" : "updated";
    const startupStatus = result.startupResult === "added"
        ? " Added to startup defaults."
        : result.startupResult === "already-exists"
            ? " Startup default already existed."
            : "";
    setStatus(`Injected and copied. Entry ${action}: ${evidenceId} -> assets/${targetFileName}.${startupStatus}`);
}

function clearAll() {
    inputText.value = "";
    outputText.value = "";
    evidenceIdInput.value = "";
    defaultTitleInput.value = "";
    paperStyleInput.value = "";
    photoPathInput.value = "";
    setStatus("Cleared.");
}

async function copyOutput() {
    if (!outputText.value) {
        setStatus("Nothing to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(outputText.value);
        setStatus("Copied.");
    } catch (error) {
        outputText.select();
        document.execCommand("copy");
        setStatus("Copied (fallback).");
    }
}

convertButton.addEventListener("click", convert);
clearButton.addEventListener("click", clearAll);
copyButton.addEventListener("click", copyOutput);
pickPhotoButton.addEventListener("click", () => {
    pickPhotoPath().catch((error) => {
        setStatus(`Photo picker failed: ${error.message}`);
    });
});
injectButton.addEventListener("click", () => {
    injectIntoJson().catch((error) => {
        setStatus(`Inject failed: ${error.message}`);
    });
});

inputText.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
        convert();
    }
});

setStatus("Ready.");

window.debugJsonTool = {
    toJsonSingleLine,
    toOutputValue,
    upsertEvidenceJson
};
