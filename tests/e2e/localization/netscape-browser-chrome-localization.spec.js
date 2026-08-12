// The Netscape browser's generic chrome -- address bar, nav buttons, and the
// form controls webContentRegistry.js builds for ZoomSearch/Library/Police --
// localizes correctly. Site identity (button labels like "ZoomSearch",
// "Police Records", the "Netscape Navigator" product name) is deliberately
// not translated, so this suite still navigates with the English quick-link
// helpers regardless of language; only the generic chrome is asserted per
// language. The "computer-netscape" window has no live-refresh hook (see
// window-titles-relocalize-on-language-switch.spec.js), so language is
// switched before opening the browser each time, not while it is open.
const { test, expect } = require("@playwright/test");
const localization = require("../../../localization.json");
const {
  clickNewGame,
  openNetscape,
  openZoomSearch,
  openLibrary,
  openPolice,
} = require("../../support/game-helpers");

// game-helpers.js's browserAddress()/visitBrowserUrl() locate the address bar
// by its (English) aria-label, so they only work in English. Drive it here by
// the language-independent ".caveos-browser-address" class instead.
async function visitBrowserUrlInAnyLanguage(page, url) {
  const address = page.locator(".caveos-browser-address");
  await address.fill(url);
  await address.press("Enter");
}

const LANGUAGES = [
  { code: "en", buttonId: "btnEnglish" },
  { code: "es", buttonId: "btnSpanish" },
  { code: "de", buttonId: "btnGerman" },
  { code: "it", buttonId: "btnItalian" },
  { code: "fr", buttonId: "btnFrench" },
];

for (const { code, buttonId } of LANGUAGES) {
  const strings = localization[code];

  test(`Netscape browser chrome localizes to ${code}`, async ({ page }) => {
    await page.goto("/");
    await page.locator(`#${buttonId}`).click();
    await clickNewGame(page);

    await openNetscape(page);

    // Toolbar: address bar, go button, and the three nav buttons in order.
    await expect(page.locator(".caveos-browser-address")).toHaveAttribute("aria-label", strings.browserAddressAriaLabel);
    await expect(page.locator(".caveos-browser-address-submit")).toHaveAttribute("aria-label", strings.browserGoAriaLabel);
    await expect(page.locator(".caveos-browser-address-submit")).toHaveAttribute("title", strings.browserGoTitle);
    const navButtons = page.locator(".caveos-browser-nav-button");
    await expect(navButtons.nth(0)).toHaveAttribute("aria-label", strings.browserBackAriaLabel);
    await expect(navButtons.nth(1)).toHaveAttribute("aria-label", strings.browserForwardAriaLabel);
    await expect(navButtons.nth(2)).toHaveAttribute("aria-label", strings.browserHomeAriaLabel);

    // ZoomSearch: query placeholder and search button.
    await openZoomSearch(page);
    await expect(page.locator(".browser-page-zoomsearch input.browser-input")).toHaveAttribute("placeholder", strings.browserKeywordPlaceholder);
    await expect(page.locator(".browser-page-zoomsearch button.browser-button")).toHaveText(strings.browserSearchButton);

    // Library: search-catalog and clear buttons.
    await openLibrary(page);
    const libraryButtons = page.locator(".browser-page-library button.browser-button");
    await expect(libraryButtons.nth(0)).toHaveText(strings.browserSearchCatalogButton);
    await expect(libraryButtons.nth(1)).toHaveText(strings.browserClearButton);

    // Police: guest-state login form (login button, username/password placeholders).
    await openPolice(page);
    const policePanel = page.locator(".browser-auth-panel-police");
    await expect(policePanel.locator(".browser-button:not(.browser-button-logout):not(.browser-button-quick-login)")).toHaveText(strings.browserLoginButton);
    await expect(policePanel.locator("input:not([type='password'])").first()).toHaveAttribute("placeholder", strings.browserUsernamePlaceholder);
    await expect(policePanel.locator("input[type='password']")).toHaveAttribute("placeholder", strings.browserPasswordPlaceholder);

    // Navigating to an unregistered URL renders the localized "missing page".
    await visitBrowserUrlInAnyLanguage(page, "http://this-address-does-not-exist.example");
    await expect(page.locator(".browser-page-missing .browser-welcome-title")).toHaveText(strings.browserPageNotFoundTitle);
    await expect(page.locator(".browser-page-missing .browser-welcome-copy").first()).toHaveText(strings.browserNoPageExistsAt);
  });
}
