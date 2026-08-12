import { captureGameStatusForSaving } from './constantsAndGlobalVars.js';

// Sticky save: an autosaved copy of the game held in localStorage so a browser
// refresh (or closing and reopening the tab) can offer "Resume Game" instead of
// losing the session.
//
// This deliberately reuses the same serialisation as the copy/paste save string
// in saveLoadGame.js -- captureGameStatusForSaving() plus LZString -- so there
// is only one save format in the project. The only difference is where the
// resulting string is put.
export const STICKY_SAVE_STORAGE_KEY = 'theCave:sticky-save';
export const STICKY_AUTOSAVE_INTERVAL_MS = 60000;

let autosaveIntervalId = null;
let unloadFlushHandler = null;

// localStorage throws rather than returning null in some privacy modes, and
// LZString arrives from a CDN script tag, so every entry point degrades to
// "no sticky save" instead of breaking the game.
function getStorage() {
    try {
        const storage = window.localStorage;
        if (!storage) {
            return null;
        }

        // Touching a key is the only reliable availability probe.
        const probeKey = `${STICKY_SAVE_STORAGE_KEY}:probe`;
        storage.setItem(probeKey, '1');
        storage.removeItem(probeKey);
        return storage;
    } catch (error) {
        console.warn('Sticky save unavailable: localStorage cannot be used.', error);
        return null;
    }
}

function getCompressor() {
    return typeof LZString !== 'undefined' ? LZString : null;
}

export function writeStickySave() {
    const storage = getStorage();
    const compressor = getCompressor();
    if (!storage || !compressor) {
        return false;
    }

    try {
        const compressed = compressor.compressToEncodedURIComponent(
            JSON.stringify(captureGameStatusForSaving())
        );
        storage.setItem(STICKY_SAVE_STORAGE_KEY, compressed);
        return true;
    } catch (error) {
        console.warn('Sticky save write failed.', error);
        return false;
    }
}

// Returns the parsed game state, or null when there is nothing usable stored.
// A malformed or partially written entry is cleared rather than left to fail
// again on the next load.
export function readStickySave() {
    const storage = getStorage();
    const compressor = getCompressor();
    if (!storage || !compressor) {
        return null;
    }

    let rawValue;
    try {
        rawValue = storage.getItem(STICKY_SAVE_STORAGE_KEY);
    } catch (error) {
        console.warn('Sticky save read failed.', error);
        return null;
    }

    if (!rawValue) {
        return null;
    }

    try {
        const decompressed = compressor.decompressFromEncodedURIComponent(rawValue);
        if (!decompressed) {
            throw new Error('Sticky save could not be decompressed.');
        }

        const parsed = JSON.parse(decompressed);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Sticky save did not contain a game state object.');
        }

        return parsed;
    } catch (error) {
        console.warn('Discarding unreadable sticky save.', error);
        clearStickySave();
        return null;
    }
}

export function hasStickySave() {
    return readStickySave() !== null;
}

export function clearStickySave() {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    try {
        storage.removeItem(STICKY_SAVE_STORAGE_KEY);
    } catch (error) {
        console.warn('Sticky save clear failed.', error);
    }
}

// Idempotent: calling this again (New Game, Load Game, Resume) restarts the
// single timer rather than stacking a second one.
//
// `onAutosave` fires only after a timed autosave that actually wrote, so a UI
// indicator hung off it is reporting a real save rather than just a tick. It is
// deliberately not called for the immediate seed writes or the beforeunload
// flush -- neither is something the player needs told about.
export function startStickyAutosave({
    intervalMs = STICKY_AUTOSAVE_INTERVAL_MS,
    onAutosave = null,
} = {}) {
    stopStickyAutosave();

    autosaveIntervalId = window.setInterval(() => {
        const didWrite = writeStickySave();
        if (didWrite && typeof onAutosave === 'function') {
            onAutosave();
        }
    }, intervalMs);

    // Catches the common case of refreshing between two autosave ticks.
    unloadFlushHandler = () => {
        writeStickySave();
    };
    window.addEventListener('beforeunload', unloadFlushHandler);
}

export function stopStickyAutosave() {
    if (autosaveIntervalId !== null) {
        window.clearInterval(autosaveIntervalId);
        autosaveIntervalId = null;
    }

    if (unloadFlushHandler) {
        window.removeEventListener('beforeunload', unloadFlushHandler);
        unloadFlushHandler = null;
    }
}

export function isStickyAutosaveRunning() {
    return autosaveIntervalId !== null;
}
