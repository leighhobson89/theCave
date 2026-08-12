# Desktop window chrome

The shared `DesktopWindow` component (`desktopWindow.js`) behind every window:
dragging, resizing, click-to-focus z-index promotion, centring, scrollbar
visibility, and the carousel/close-button aria-label API.

**No dedicated specs yet** — opening, closing and z-index stacking are
currently only exercised incidentally inside other categories (e.g. via
`persistence/autosave-indicator.spec.js`). Add `*.spec.js` files here for
window mechanics in isolation.
