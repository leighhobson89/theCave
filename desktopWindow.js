export class DesktopWindow {
  constructor({ rootElement, headerElement, resizeHandleElement, scrollContainerElement = null }) {
    this.rootElement = rootElement;
    this.headerElement = headerElement;
    this.resizeHandleElement = resizeHandleElement;
    this.scrollContainerElement = scrollContainerElement;

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

    this.initialize();
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

    this.rootElement.classList.add("d-none");
    this.cancelInteractions();
  }

  centerInViewport() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(this.rootElement.offsetWidth || 900, viewportWidth * 0.88);
    const height = Math.min(this.rootElement.offsetHeight || 640, viewportHeight * 0.76);

    const left = (viewportWidth - width) / 2;
    const top = (viewportHeight - height) / 2;

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

    const rect = this.rootElement.getBoundingClientRect();
    this.dragStartLeft = rect.left;
    this.dragStartTop = rect.top;

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
    const marginX = window.innerWidth * this.marginRatio;
    const marginY = window.innerHeight * this.marginRatio;

    const rect = this.rootElement.getBoundingClientRect();

    const minLeft = marginX;
    const maxLeft = Math.max(minLeft, window.innerWidth - marginX - rect.width);
    const minTop = marginY;
    const maxTop = Math.max(minTop, window.innerHeight - marginY - rect.height);

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
