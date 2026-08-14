// The game's hover tooltips.
//
// Every tooltip in the app is authored the ordinary way, as a `title`
// attribute, and that is deliberately unchanged: call sites keep setting
// `element.title = localize(...)` and nothing has to know this file exists.
// What changes is who draws it. The browser's own tooltip cannot be styled at
// all - it is fixed at the OS's small caption size, it will not wrap where we
// want it to, and it is placed by the platform - so on hover the `title` is
// lifted off the element (which is the only way to stop the native one
// appearing), parked in a data attribute, and drawn instead into a single
// styled element of our own that follows the cursor and keeps itself on screen.
//
// The lifted text is put back the moment the pointer leaves, so the DOM the
// rest of the app sees is the DOM it wrote. Anything that reads or rewrites a
// `title` therefore behaves exactly as before, including the noticeboard, where
// a frame's title is deleted and re-set as the puzzle progresses.
//
// Localization is not this file's job either, for the same reason: it renders
// whatever the `title` already says, so a tooltip is localized precisely when
// its call site localized it. The one tooltip in the game that must NOT be
// translated - the player's own note on a noticeboard frame - is therefore
// handled correctly by doing nothing special.

// Long enough that tooltips do not flash up while the pointer sweeps across the
// desk, shorter than the platform's own ~500ms so it still feels responsive.
const TOOLTIP_SHOW_DELAY_MS = 350;

// How far from the cursor the panel sits. Clear of a standard arrow cursor's
// hotspot so it never covers what is being pointed at.
const CURSOR_OFFSET_X = 18;
const CURSOR_OFFSET_Y = 24;

// Never allowed closer than this to any edge of the window.
const VIEWPORT_MARGIN = 10;

// Where the lifted `title` waits while our own tooltip is drawing it. Also how
// an element that is currently showing a tooltip is recognised, which matters
// because it no longer has the `title` that identified it.
const STASH_ATTRIBUTE = "data-native-tooltip-text";

let tooltipElement = null;
let activeElement = null;
let showTimerId = 0;
let isVisible = false;
// Set while a pointer button is down: a tooltip during a drag would follow the
// cursor across the board the player is dragging on. Cleared by the first move
// after the button comes back up.
let isSuppressed = false;
let pointerX = 0;
let pointerY = 0;

function ensureTooltipElement() {
  if (tooltipElement && tooltipElement.isConnected) {
    return tooltipElement;
  }

  tooltipElement = document.createElement("div");
  tooltipElement.className = "game-tooltip";
  tooltipElement.setAttribute("role", "tooltip");
  // The accessible name of the element being hovered already carries this text
  // (every call site that sets a title sets an aria-label too), so announcing
  // the panel as well would read it out twice.
  tooltipElement.setAttribute("aria-hidden", "true");
  document.body.appendChild(tooltipElement);
  return tooltipElement;
}

// The innermost element at or above `target` carrying tooltip text, which is
// the one the browser itself would have used. An element whose title is empty
// deliberately stops the search rather than falling through to its parent -
// that is what an empty `title` means natively, and the noticeboard relies on
// the fall-through case (a slot with no title at all lets the frame's
// description show instead).
function resolveTooltipHost(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const host = target.closest(`[title], [${STASH_ATTRIBUTE}]`);
  if (!host || host === tooltipElement) {
    return null;
  }

  return readTooltipText(host) ? host : null;
}

function readTooltipText(element) {
  const text = element.hasAttribute("title")
    ? element.getAttribute("title")
    : element.getAttribute(STASH_ATTRIBUTE);
  return String(text || "").trim();
}

// Lifting the title off the element is what suppresses the native tooltip, so
// it happens as soon as the pointer arrives - not when ours is finally shown.
function stashTitle(element) {
  if (!element.hasAttribute("title")) {
    return;
  }

  element.setAttribute(STASH_ATTRIBUTE, element.getAttribute("title"));
  element.removeAttribute("title");
}

function restoreTitle(element) {
  if (!element || !element.hasAttribute(STASH_ATTRIBUTE)) {
    return;
  }

  // Only when the element has not been given a new title in the meantime:
  // whatever the app set most recently wins over what we lifted.
  if (!element.hasAttribute("title")) {
    element.setAttribute("title", element.getAttribute(STASH_ATTRIBUTE));
  }

  element.removeAttribute(STASH_ATTRIBUTE);
}

// Keeps the panel wholly on screen. It prefers to sit below-right of the
// cursor; when there is not room it flips to the other side of the cursor
// rather than merely sliding, so the panel never ends up underneath the
// pointer. Whatever the flip decides, it is then clamped, which is what
// handles a tooltip too wide or tall to fit on either side.
function positionTooltip() {
  const element = ensureTooltipElement();
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = pointerX + CURSOR_OFFSET_X;
  if (left + width > viewportWidth - VIEWPORT_MARGIN) {
    left = pointerX - CURSOR_OFFSET_X - width;
  }
  left = Math.min(Math.max(left, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN));

  let top = pointerY + CURSOR_OFFSET_Y;
  if (top + height > viewportHeight - VIEWPORT_MARGIN) {
    top = pointerY - CURSOR_OFFSET_Y - height;
  }
  top = Math.min(Math.max(top, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, viewportHeight - height - VIEWPORT_MARGIN));

  element.style.left = `${Math.round(left)}px`;
  element.style.top = `${Math.round(top)}px`;
}

function showTooltip(text) {
  const element = ensureTooltipElement();
  element.textContent = text;
  element.classList.add("is-visible");
  isVisible = true;
  positionTooltip();
}

// Undoes everything the current hover set up: the timer, the panel, and the
// element's own title. Safe to call at any time, and called from every path
// that could otherwise strand a tooltip on screen.
function clearTooltip() {
  if (showTimerId) {
    clearTimeout(showTimerId);
    showTimerId = 0;
  }

  if (isVisible && tooltipElement) {
    tooltipElement.classList.remove("is-visible");
    tooltipElement.textContent = "";
    isVisible = false;
  }

  if (activeElement) {
    restoreTitle(activeElement);
    activeElement = null;
  }
}

function beginHover(host) {
  activeElement = host;
  stashTitle(host);
  showTimerId = window.setTimeout(() => {
    showTimerId = 0;
    // Re-read rather than capturing the text at hover time: a note being typed
    // rewrites its tooltip while the pointer is still on the frame.
    const text = readTooltipText(host);
    if (!text || !host.isConnected) {
      clearTooltip();
      return;
    }

    showTooltip(text);
  }, TOOLTIP_SHOW_DELAY_MS);
}

function handlePointerOver(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;

  // Touch has no hover, and a long-press tooltip would fight the game's own
  // press-and-drag gestures.
  if (event.pointerType === "touch" || isSuppressed) {
    return;
  }

  const host = resolveTooltipHost(event.target);
  if (host === activeElement) {
    return;
  }

  clearTooltip();
  if (host) {
    beginHover(host);
  }
}

function handlePointerMove(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;

  // A move with no button held is the end of the drag that suppressed us, and
  // the point at which the element under the cursor can earn a tooltip again.
  if (isSuppressed && event.buttons === 0) {
    isSuppressed = false;
    handlePointerOver(event);
    return;
  }

  if (isVisible) {
    positionTooltip();
  }
}

function handlePointerOut(event) {
  // Ignore moves between descendants of the element that owns the tooltip.
  if (activeElement && event.relatedTarget instanceof Node && activeElement.contains(event.relatedTarget)) {
    return;
  }

  clearTooltip();
}

function handlePointerDown() {
  isSuppressed = true;
  clearTooltip();
}

// Installs the tooltip layer. Idempotent, and listeners go on the document in
// the capture phase so a tooltip still resolves over elements that stop
// pointer events from bubbling - the noticeboard drag being the obvious one.
let isInstalled = false;

export function installGameTooltips() {
  if (isInstalled) {
    return;
  }

  isInstalled = true;
  ensureTooltipElement();

  document.addEventListener("pointerover", handlePointerOver, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerout", handlePointerOut, true);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointercancel", handlePointerDown, true);

  // Anything that moves the world out from under a visible tooltip.
  window.addEventListener("blur", clearTooltip);
  window.addEventListener("resize", clearTooltip);
  window.addEventListener("wheel", clearTooltip, { passive: true });
  document.addEventListener("scroll", clearTooltip, true);
  document.addEventListener("visibilitychange", clearTooltip);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearTooltip();
    }
  });
}

// For tests: the panel and whether it is currently showing.
export function getGameTooltipElement() {
  return tooltipElement;
}
