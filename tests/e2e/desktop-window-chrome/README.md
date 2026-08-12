# Desktop window chrome

The shared `DesktopWindow` component (`desktopWindow.js`) behind every window:
dragging, resizing, click-to-focus z-index promotion, centring, scrollbar
visibility, and the carousel/close-button aria-label API.

| Spec | Covers |
| --- | --- |
| `desktop-window-mechanics.spec.js` | `DesktopWindow` in isolation (a fresh instance constructed directly against the page, no game state needed): centering on first open, dragging and its viewport-margin clamp, resizing and its min-size (540×360) clamp, dynamically toggling resizability via `setResizable()`, scrollbar visibility via `open({ showScrollbar })`/`setScrollbarVisibility()`, the carousel aria-label API (`setCarouselAriaLabels()`, including partial/independent updates), and close/destroy firing `onClose` |
| `desktop-window-focus-stacking.spec.js` | Click-to-focus z-index promotion (`registerDesktopWindow()` in ui.js) through real, fully-overlapping app windows: raising a buried window above one opened after it, monotonic promotion across repeated clicks, and that closing the topmost window leaves the rest of the stack undisturbed |

Opening, closing via the title-bar X, and basic z-index stacking are also
exercised incidentally elsewhere (e.g. `persistence/autosave-indicator.spec.js`);
these two specs are what actually drive the mechanics themselves.
