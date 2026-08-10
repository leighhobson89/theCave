import {captureGameStatusForSaving, restoreGameStatus, getElements, getLanguage} from './constantsAndGlobalVars.js';
import {localize} from './localization.js';
import { handleLanguageChange } from './ui.js';

// Compresses the current game state into the save popup's text area for the
// player to copy out. There is no auto-save/file-download path.
export function saveGame() {
    const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(captureGameStatusForSaving())
    );

    document.querySelector('.save-load-header').innerHTML = `${localize('headerStringSave', getLanguage())}`;
    document.getElementById('copyButtonSavePopup').classList.remove('d-none');
    document.getElementById('loadStringButton').classList.add('d-none');
    document.getElementById('pasteButtonLoadPopup').classList.add('d-none');
    getElements().saveLoadPopup.classList.remove('d-none');
    document.getElementById('overlay').classList.remove('d-none');

    getElements().loadSaveGameStringTextArea.value = compressed;
    getElements().loadSaveGameStringTextArea.readOnly = true;
}

export function copySaveStringToClipBoard() {
    const textArea = getElements().loadSaveGameStringTextArea;
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(textArea.value)
            .then(() => {
                alert('Text copied to clipboard!');
            })
            .catch(err => {
                alert(err);
            })
            .finally(() => {
                textArea.setSelectionRange(0, 0);
            })
    } catch (err) {
        alert(err);
    }
}

export function loadGameOption() {
    getElements().loadSaveGameStringTextArea.readOnly = false;
    document.querySelector('.save-load-header').innerHTML = `${localize('headerStringLoad', getLanguage())}`;
    document.getElementById('loadStringButton').classList.remove('d-none');
    document.getElementById('copyButtonSavePopup').classList.add('d-none');
    document.getElementById('pasteButtonLoadPopup').classList.remove('d-none');
    getElements().saveLoadPopup.classList.remove('d-none');
    document.getElementById('overlay').classList.remove('d-none');
    getElements().loadSaveGameStringTextArea.value = "";
    getElements().loadSaveGameStringTextArea.placeholder = `${localize('textAreaLabel', getLanguage())}`;
}

export async function pasteLoadStringFromClipboard() {
    const textArea = getElements().loadSaveGameStringTextArea;
    if (!textArea) {
        return;
    }

    if (!navigator?.clipboard?.readText) {
        alert('Clipboard paste is not available in this browser.');
        return;
    }

    try {
        const clipboardText = await navigator.clipboard.readText();
        if (!String(clipboardText || '').trim()) {
            alert('Clipboard is empty.');
            return;
        }

        textArea.value = clipboardText;
        textArea.focus();
        textArea.setSelectionRange(textArea.value.length, textArea.value.length);
    } catch (error) {
        console.error('Clipboard read failed:', error);
        alert('Could not read clipboard. Please allow clipboard permissions.');
    }
}

// Restores the game from the compressed save string in the popup's text area.
// Rejects (after alerting the player) if the string is not a usable save.
export async function loadGame() {
    const textArea = getElements().loadSaveGameStringTextArea;
    if (!textArea) {
        throw new Error('Text area not found.');
    }

    const decompressedJson = LZString.decompressFromEncodedURIComponent(textArea.value);
    if (decompressedJson === null) {
        alert('Invalid game data string. Please check and try again.');
        throw new Error('Invalid game data string');
    }

    let savedState;
    try {
        savedState = JSON.parse(decompressedJson);
    } catch (error) {
        console.error('Error loading game:', error);
        alert('Error loading game. Please make sure the file contains valid game data.');
        throw error;
    }

    getElements().overlay.classList.add('d-none');

    try {
        await restoreGameStatus(savedState);
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error initializing game. Please make sure the data is correct.');
        throw error;
    }

    await handleLanguageChange(getLanguage());
    alert('Game loaded successfully!');
}