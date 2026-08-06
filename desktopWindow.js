export class DesktopWindow {
  constructor({
    rootElement = null,
    headerElement = null,
    resizeHandleElement = null,
    scrollContainerElement = null,
    parentElement = null,
    classNames = [],
    title = "",
    showCarouselNavigation = false,
    showDescriptionPanel = false,
    descriptionPanelHeightRatio = 0.33,
    windowColor = null,
    onNavigatePrevious = null,
    onNavigateNext = null,
    onClose = null,
    closeButtonAriaLabel = "Close window",
  } = {}) {
    this.ownsDom = !rootElement;
    this.parentElement = parentElement || document.body;
    this.showCarouselNavigation = Boolean(showCarouselNavigation);
    this.showDescriptionPanel = Boolean(showDescriptionPanel);
    this.descriptionPanelHeightRatio = Number.isFinite(descriptionPanelHeightRatio)
      ? Math.min(0.6, Math.max(0.2, descriptionPanelHeightRatio))
      : 0.33;
    this.windowColor = windowColor;
    this.onNavigatePrevious = onNavigatePrevious;
    this.onNavigateNext = onNavigateNext;
    this.onClose = onClose;

    this.rootElement = rootElement;
    this.headerElement = headerElement;
    this.resizeHandleElement = resizeHandleElement;
    this.scrollContainerElement = scrollContainerElement;
    this.bodyElement = null;
    this.titleElement = null;
    this.closeButtonElement = null;
    this.contentHostElement = null;
    this.descriptionHostElement = null;
    this.previousButtonElement = null;
    this.nextButtonElement = null;

    this.isDragging = false;
    this.isResizing = false;

    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartLeft = 0;
    this.dragStartTop = 0;

    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;

    this.marginRatio = 0.05;
    this.minWidth = 540;
    this.minHeight = 360;

    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);

    if (this.ownsDom) {
      this.createDomStructure({ classNames, title, closeButtonAriaLabel });
    }

    this.initialize();
  }

  createDomStructure({ classNames, title, closeButtonAriaLabel }) {
    this.rootElement = document.createElement("div");
    this.rootElement.classList.add("desktop-window", "d-none");

    if (Array.isArray(classNames)) {
      classNames.filter(Boolean).forEach((className) => {
        this.rootElement.classList.add(className);
      });
    } else if (typeof classNames === "string" && classNames.trim()) {
      this.rootElement.classList.add(classNames.trim());
    }

    this.headerElement = document.createElement("div");
    this.headerElement.classList.add("desktop-window-header");

    this.titleElement = document.createElement("div");
    this.titleElement.classList.add("desktop-window-title");
    this.titleElement.textContent = title;

    this.closeButtonElement = document.createElement("button");
    this.closeButtonElement.type = "button";
    this.closeButtonElement.classList.add("story-window-close");
    this.closeButtonElement.setAttribute("aria-label", closeButtonAriaLabel);
    this.closeButtonElement.textContent = "x";

    this.headerElement.append(this.titleElement, this.closeButtonElement);

    this.bodyElement = document.createElement("div");
    this.bodyElement.classList.add("desktop-window-body");

    if (this.showCarouselNavigation) {
      const carouselLayout = document.createElement("div");
      carouselLayout.classList.add("desktop-window-carousel-layout");

      this.previousButtonElement = document.createElement("button");
      this.previousButtonElement.type = "button";
      this.previousButtonElement.classList.add("desktop-window-carousel-nav", "carousel-nav-prev");
      this.previousButtonElement.setAttribute("aria-label", "Previous image");
      this.previousButtonElement.textContent = "<";

      this.nextButtonElement = document.createElement("button");
      this.nextButtonElement.type = "button";
      this.nextButtonElement.classList.add("desktop-window-carousel-nav", "carousel-nav-next");
      this.nextButtonElement.setAttribute("aria-label", "Next image");
      this.nextButtonElement.textContent = ">";

      if (this.showDescriptionPanel) {
        this.rootElement.classList.add("desktop-window-has-description-panel");
        this.rootElement.style.setProperty(
          "--desktop-window-description-ratio",
          String(this.descriptionPanelHeightRatio)
        );

        const contentStack = document.createElement("div");
        contentStack.classList.add("desktop-window-carousel-content-stack");

        this.contentHostElement = document.createElement("div");
        this.contentHostElement.classList.add(
          "desktop-window-carousel-content",
          "desktop-window-carousel-content-main"
        );

        this.descriptionHostElement = document.createElement("div");
        this.descriptionHostElement.classList.add(
          "desktop-window-carousel-description-host",
          "scrollbars-hidden"
        );

        contentStack.append(this.contentHostElement, this.descriptionHostElement);
        carouselLayout.append(
          this.previousButtonElement,
          contentStack,
          this.nextButtonElement
        );
        this.bodyElement.appendChild(carouselLayout);
      } else {
        this.contentHostElement = document.createElement("div");
        this.contentHostElement.classList.add("desktop-window-carousel-content");

        carouselLayout.append(
          this.previousButtonElement,
          this.contentHostElement,
          this.nextButtonElement
        );
        this.bodyElement.appendChild(carouselLayout);
      }
    } else {
      this.contentHostElement = document.createElement("div");
      this.contentHostElement.classList.add("desktop-window-content-host");
      this.bodyElement.appendChild(this.contentHostElement);
    }

    this.resizeHandleElement = document.createElement("div");
    this.resizeHandleElement.classList.add("desktop-window-resize-handle", "d-none");
    this.resizeHandleElement.setAttribute("aria-hidden", "true");

    this.rootElement.append(this.headerElement, this.bodyElement, this.resizeHandleElement);
    this.parentElement.appendChild(this.rootElement);
    this.scrollContainerElement = this.scrollContainerElement || this.contentHostElement;
    this.applyWindowColor();
  }

  applyWindowColor() {
    if (!this.rootElement || !this.headerElement || !this.windowColor) {
      return;
    }

    const normalizedColor = String(this.windowColor).trim();
    if (!normalizedColor || !window.CSS?.supports?.("color", normalizedColor)) {
      return;
    }

    this.rootElement.style.borderColor = normalizedColor;
    this.headerElement.style.background = `linear-gradient(180deg, ${normalizedColor} 0%, rgba(0, 0, 0, 0) 100%)`;
  }

  initialize() {
    if (!this.rootElement || !this.headerElement || !this.resizeHandleElement) {
      return;
    }

    this.rootElement.style.position = "absolute";

    this.headerElement.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      if (
        event.target instanceof Element &&
        event.target.closest(
          "button, input, textarea, select, option, a, [role='button'], [data-no-window-drag]"
        )
      ) {
        return;
      }

      this.beginDrag(event);
    });

    this.resizeHandleElement.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || this.resizeHandleElement.classList.contains("d-none")) {
        return;
      }

      this.beginResize(event);
    });

    if (this.closeButtonElement) {
      this.closeButtonElement.addEventListener("click", (event) => {
        event.stopPropagation();
        this.close();
      });
    }

    if (this.previousButtonElement && typeof this.onNavigatePrevious === "function") {
      this.previousButtonElement.addEventListener("click", (event) => {
        event.stopPropagation();
        this.onNavigatePrevious();
      });
    }

    if (this.nextButtonElement && typeof this.onNavigateNext === "function") {
      this.nextButtonElement.addEventListener("click", (event) => {
        event.stopPropagation();
        this.onNavigateNext();
      });
    }
  }

  getParentMetrics() {
    if (!this.parentElement || this.parentElement === document.body || this.parentElement === document.documentElement) {
      return {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    const parentRect = this.parentElement.getBoundingClientRect();

    return {
      left: parentRect.left,
      top: parentRect.top,
      width: this.parentElement.clientWidth,
      height: this.parentElement.clientHeight,
    };
  }

  open({ resizable = false, showScrollbar = true } = {}) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.classList.remove("d-none");

    if (!this.rootElement.dataset.positioned) {
      this.centerInViewport();
      this.rootElement.dataset.positioned = "true";
    }

    this.setResizable(resizable);
    this.setScrollbarVisibility(showScrollbar);
    this.clampToViewport();
  }

  setScrollbarVisibility(showScrollbar) {
    if (!this.scrollContainerElement) {
      return;
    }

    this.scrollContainerElement.classList.toggle("scrollbars-hidden", !showScrollbar);
  }

  close() {
    if (!this.rootElement) {
      return;
    }

    this.cancelInteractions();

    if (typeof this.onClose === "function") {
      this.onClose();
    }

    if (this.ownsDom) {
      this.destroy();
      return;
    }

    this.rootElement.classList.add("d-none");
  }

  destroy() {
    this.cancelInteractions();

    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }

    this.rootElement = null;
    this.headerElement = null;
    this.resizeHandleElement = null;
    this.scrollContainerElement = null;
    this.bodyElement = null;
    this.titleElement = null;
    this.closeButtonElement = null;
    this.contentHostElement = null;
    this.descriptionHostElement = null;
    this.previousButtonElement = null;
    this.nextButtonElement = null;
  }

  setTitle(title) {
    if (this.titleElement) {
      this.titleElement.textContent = title;
    }
  }

  setContent(content) {
    if (!this.contentHostElement) {
      return;
    }

    this.contentHostElement.replaceChildren();

    if (content instanceof Node) {
      this.contentHostElement.appendChild(content);
      return;
    }

    this.contentHostElement.textContent = String(content ?? "");
  }

  getContentHostElement() {
    return this.contentHostElement;
  }

  setDescriptionContent(content) {
    if (!this.descriptionHostElement) {
      return;
    }

    this.descriptionHostElement.replaceChildren();

    if (content instanceof Node) {
      this.descriptionHostElement.appendChild(content);
      return;
    }

    this.descriptionHostElement.textContent = String(content ?? "");
  }

  centerInViewport() {
    const parentMetrics = this.getParentMetrics();

    const width = Math.min(this.rootElement.offsetWidth || 900, parentMetrics.width * 0.88);
    const height = Math.min(this.rootElement.offsetHeight || 640, parentMetrics.height * 0.76);

    const left = (parentMetrics.width - width) / 2;
    const top = (parentMetrics.height - height) / 2;

    this.rootElement.style.width = `${Math.round(width)}px`;
    this.rootElement.style.height = `${Math.round(height)}px`;
    this.rootElement.style.left = `${Math.round(left)}px`;
    this.rootElement.style.top = `${Math.round(top)}px`;
    this.rootElement.style.transform = "none";
  }

  setResizable(resizable) {
    this.rootElement.classList.toggle("is-resizable", Boolean(resizable));
    this.resizeHandleElement.classList.toggle("d-none", !resizable);
  }

  beginDrag(event) {
    this.isDragging = true;
    this.rootElement.classList.add("is-dragging-window");

    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    const parentMetrics = this.getParentMetrics();
    const rect = this.rootElement.getBoundingClientRect();
    this.dragStartLeft = rect.left - parentMetrics.left;
    this.dragStartTop = rect.top - parentMetrics.top;

    this.attachGlobalPointerListeners();
    this.headerElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  beginResize(event) {
    this.isResizing = true;
    this.rootElement.classList.add("is-resizing-window");

    const rect = this.rootElement.getBoundingClientRect();
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;

    this.attachGlobalPointerListeners();
    this.resizeHandleElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  attachGlobalPointerListeners() {
    window.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp);
    window.addEventListener("pointercancel", this.boundPointerUp);
    window.addEventListener("blur", this.boundPointerUp);
  }

  removeGlobalPointerListeners() {
    window.removeEventListener("pointermove", this.boundPointerMove);
    window.removeEventListener("pointerup", this.boundPointerUp);
    window.removeEventListener("pointercancel", this.boundPointerUp);
    window.removeEventListener("blur", this.boundPointerUp);
  }

  handlePointerMove(event) {
    if (!this.rootElement) {
      return;
    }

    if (this.isDragging) {
      const nextLeft = this.dragStartLeft + (event.clientX - this.dragStartX);
      const nextTop = this.dragStartTop + (event.clientY - this.dragStartY);
      this.setClampedPosition(nextLeft, nextTop);
      return;
    }

    if (this.isResizing) {
      const dx = event.clientX - this.resizeStartX;
      const dy = event.clientY - this.resizeStartY;

      const marginX = window.innerWidth * this.marginRatio;
      const marginY = window.innerHeight * this.marginRatio;

      const maxWidth = Math.max(this.minWidth, window.innerWidth - marginX - this.rootElement.offsetLeft);
      const maxHeight = Math.max(this.minHeight, window.innerHeight - marginY - this.rootElement.offsetTop);

      const width = Math.max(this.minWidth, Math.min(maxWidth, this.resizeStartWidth + dx));
      const height = Math.max(this.minHeight, Math.min(maxHeight, this.resizeStartHeight + dy));

      this.rootElement.style.width = `${Math.round(width)}px`;
      this.rootElement.style.height = `${Math.round(height)}px`;
    }
  }

  handlePointerUp() {
    this.cancelInteractions();
  }

  cancelInteractions() {
    this.isDragging = false;
    this.isResizing = false;
    if (this.rootElement) {
      this.rootElement.classList.remove("is-dragging-window");
      this.rootElement.classList.remove("is-resizing-window");
    }
    this.removeGlobalPointerListeners();
  }

  setClampedPosition(left, top) {
    const parentMetrics = this.getParentMetrics();
    const marginX = parentMetrics.width * this.marginRatio;
    const marginY = parentMetrics.height * this.marginRatio;

    const rect = this.rootElement.getBoundingClientRect();

    const minLeft = marginX;
    const maxLeft = Math.max(minLeft, parentMetrics.width - marginX - rect.width);
    const minTop = marginY;
    const maxTop = Math.max(minTop, parentMetrics.height - marginY - rect.height);

    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, left));
    const clampedTop = Math.min(maxTop, Math.max(minTop, top));

    this.rootElement.style.left = `${clampedLeft}px`;
    this.rootElement.style.top = `${clampedTop}px`;
  }

  clampToViewport() {
    const rect = this.rootElement.getBoundingClientRect();
    this.setClampedPosition(rect.left, rect.top);
  }
}
