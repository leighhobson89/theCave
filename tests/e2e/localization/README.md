# Localization

Language switching across all 5 languages (English, Spanish, German, Italian,
French): menu and desktop chrome, mid-session re-localization of every open
window kind, the facsimile window's dynamic content, the Netscape browser's
generic chrome, and Paint/Notes default state. Expected strings are read
straight out of `localization.json` rather than hand-copied into the specs,
so a translation edit cannot silently desync a test from the source of truth
it is checking.

| Spec | Covers |
| --- | --- |
| `menu-and-desktop-chrome-localization.spec.js` | Flag-button active-state exclusivity; menu button labels; desk folder labels/aria-labels; the settings panel; the desktop calendar's language-following month abbreviation; the CaveOS computer desktop (window title, icon labels, clock hint) |
| `window-titles-relocalize-on-language-switch.spec.js` | All 9 open-window kinds (`refreshOpenWindowLocalization` in ui.js) re-titling and re-labeling their close button live on a language switch, without needing to close and reopen |
| `facsimile-content-localization.spec.js` | The facsimile window's dynamic content (transmission-monitor summary, cached-count pluralization, next-button label/disabled state, empty inbox) re-localizing live via its refresh hook |
| `netscape-browser-chrome-localization.spec.js` | The browser's generic chrome (address bar, nav buttons, ZoomSearch/Library/Police form controls, the "missing page" fallback) per language; site identity (button labels, product names) is deliberately not translated and is left in English throughout |
| `paint-and-notes-localization.spec.js` | Paint's tool palette at open (no live-refresh hook, so re-opened per language); New Game's default per-page titles seeded into Notes and Paint |

Two of these specs (window titles, Paint/Netscape chrome) exist specifically
because some window kinds only pick up a language change at construction
time rather than live -- the specs' comments note which, and why, so a future
change to add a live-refresh hook is a welcome test update rather than a
surprise failure.

**Known gaps still open:** most of the ~25 authored web-content records
(article bodies, keywords) are not localized by design and are out of scope
here; the Netscape "welcome" page's flavor copy and the Cosmic Forge easter
egg have no localization.json keys at all (never translated, not a
regression). See `docs/test-coverage-analysis.md` for the original audit.
