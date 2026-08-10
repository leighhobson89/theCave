import {
    getLanguage,
    getLocalization,
    setLanguage,
    setLocalization,
} from './constantsAndGlobalVars.js';

let localizationData = {};
// localization.json is static, so it is fetched once and reused for every
// subsequent language change instead of re-downloading per switch.
let localizationFetch = null;

function fetchLocalization() {
    if (!localizationFetch) {
        localizationFetch = fetch('localization.json')
            .then((response) => response.json())
            .then((data) => {
                localizationData = data;
                return localizationData;
            })
            .catch((error) => {
                console.error('Error loading localization:', error);
                localizationFetch = null;
                return localizationData;
            });
    }

    return localizationFetch;
}

export async function initLocalization(language) {
    const localization = await fetchLocalization();
    setLocalization(localization);
    setLanguage(language);
}

function localize(key, language) {
    const localization = getLocalization();
    if (!localization || !localization[language]) {
        return key;
    }

    const localizedString = localization[language][key];
    if (!localizedString) return key;

    if (localizedString.includes('${')) {
        try {
            return interpolateTemplateLiteral(localizedString);
        } catch (e) {
            console.error(`Error evaluating template literal in localized string for key '${key}':`, e);
            return localizedString;
        }
    } else {
        return localizedString;
    }
}

function interpolateTemplateLiteral(template) {
    return template.replace(/\${(.*?)}/g, (match, expression) => {
        try {
            const value = eval(expression);
            return String(value);
        } catch (e) {
            console.error(`Error evaluating expression '${expression}' in template literal:`, e);
            return match;
        }
    });
}

export {
    localize
};