import Toast from "./toast.js";
import { ToastOptions } from "./models";

export class Toaster {
  toasts: Toast[];
  container: HTMLElement;
  maxToasts: number;
  expandedByDefault: boolean;
  enableCloseButton: boolean;
  isToastsExpanded: boolean;

  constructor() {
    this.toasts = [];
    const _container = document.getElementById("sonner-toast-container");
    if (!_container) {
      throw new Error("No container found");
    }
    this.container = _container;

    this.maxToasts = parseInt(this.container.getAttribute("max-toasts") || "3");

    this.isToastsExpanded =
      (this.container.getAttribute("expanded") || "false") === "true";
    this.expandedByDefault = this.isToastsExpanded;
    if (!this.expandedByDefault) {
      this.container.addEventListener(
        "mouseenter",
        this.#onMouseEnter.bind(this),
      );
      this.container.addEventListener(
        "mouseleave",
        this.#onMouseOver.bind(this),
      );
      this.container.addEventListener("mouseout", this.#onMouseOver.bind(this));
      this.container.addEventListener(
        "mousemove",
        this.#onMouseOver.bind(this),
      );
    }

    let enableCloseButton =
      this.container.getAttribute("close-button") || "false";
    this.enableCloseButton = enableCloseButton == "true";

    let theme = this.container.getAttribute("theme");
    if (theme == "system") {
      const prefersDarkScheme = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );
      prefersDarkScheme.addEventListener("change", (event) => {
        this.refresh();
      });
    }
  }

  get isDarkTheme() {
    let theme = this.container.getAttribute("theme");
    if (theme == "system") {
      const prefersDarkScheme = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );
      return prefersDarkScheme.matches;
    }
    return this.container.getAttribute("theme") == "dark";
  }

  get positions() {
    const position = this.container.getAttribute("position") || "bottom-right";
    const [yPosition, xPosition] = position.split("-");
    return {
      xPosition,
      yPosition,
    };
  }

  create(options: ToastOptions) {
    const container = this.container;

    const containerDuration = container.getAttribute("duration");
    if (!options.duration && containerDuration) {
      options.duration = parseInt(containerDuration);
    }

    if (options.closeButton == undefined || options.closeButton == null) {
      options.closeButton = this.enableCloseButton;
    }

    if (options.theme == undefined || options.theme == null) {
      let containerTheme = this.container.getAttribute("theme");
      if (containerTheme == "light" || containerTheme == "dark") {
        options.theme = containerTheme;
      }
    }

    if (options.useRichColors == undefined || options.useRichColors == null) {
      let containerRichColors = this.container.getAttribute("rich-colors");
      if (containerRichColors == "true") {
        options.useRichColors = true;
      }
    }

    const toast = new Toast({
      ...options,
    });

    container.appendChild(toast.element);

    toast.updateHeight();
    this.toasts.push(toast);

    this.refresh();
    toast.setMounted();

    toast.onUpdate = (id) => {
      this.refresh();
    };

    toast.onClose = (id) => {
      this.toasts = this.toasts.filter((toast) => toast.id != id);
      this.refresh();
    };

    toast.onRemove = (id) => {};

    if (this.expandedByDefault) {
      toast.setExpanded();
    }
  }

  expand() {
    for (const toast of this.toasts) {
      toast.setExpanded();
    }
    this.isToastsExpanded = true;
  }

  collapse() {
    for (const toast of this.toasts) {
      toast.setCollapsed();
    }
    this.isToastsExpanded = false;
  }

  refresh() {
    if (this.toasts.length === 0) {
      return;
    }

    const { xPosition, yPosition } = this.positions;
    const isDarkTheme = this.isDarkTheme;
    this.toasts.forEach((toast, index) => {
      let reverseIndex = this.toasts.length - index;
      toast.setFront(false);
      toast.setIndex(reverseIndex);
      toast.setXPosition(xPosition);
      toast.setYPosition(yPosition);
      toast.setTheme(isDarkTheme ? "dark" : "light");
      if (reverseIndex > this.maxToasts) {
        toast.hide();
      } else {
        toast.show();
      }
    });

    let frontToast = this.toasts[this.toasts.length - 1];

    let height = 0;
    let lastElementHeight = 0;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const existingToast = this.toasts[i];
      if (existingToast.hidden) {
        continue;
      }
      height += lastElementHeight;
      existingToast.setCollapsedHeight(frontToast.height);
      existingToast.setSpaceAbove(height);
      lastElementHeight = existingToast.height + 10;
    }

    frontToast.setFront(true);
  }

  #onMouseEnter(_event: MouseEvent) {
    this.expand();
  }

  #onMouseOver(event: MouseEvent) {
    if (this.toasts.length === 0) {
      return;
    }

    const rects: DOMRect[] = [
      ...Array.from(this.toasts).map((t) => t.element.getBoundingClientRect()),
    ];

    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));

    const isMouseInside =
      event.clientX >= left &&
      event.clientX <= right &&
      event.clientY >= top &&
      event.clientY <= bottom;

    if (!isMouseInside) {
      this.collapse();
    }
  }
}
