import Toast from "./toast.js";
import type { ToastOptions } from "./models";

export class Toaster {
  toasts: Toast[];
  container: HTMLElement;
  maxToasts: number;
  expandedByDefault: boolean;
  enableCloseButton: boolean;
  isToastsExpanded: boolean;
  resizeObserver: ResizeObserver;

  constructor() {
    this.toasts = [];
    const _container = document.getElementById("sonner-toast-container");
    if (!_container) {
      throw new Error(
        'Vanilla Sonner requires an element with id "sonner-toast-container".',
      );
    }
    this.container = _container;

    this.resizeObserver = new ResizeObserver((entries) => {
      let needsRefresh = false;
      for (const entry of entries) {
        const toast = this.toasts.find(
          (candidate) => candidate.contentElement === entry.target,
        );
        if (!toast) {
          continue;
        }
        const previousHeight = toast.height;
        toast.updateHeight();
        needsRefresh ||= Math.abs(previousHeight - toast.height) > 0.5;
      }
      if (needsRefresh) {
        this.refresh();
      }
    });

    const configuredMax = Number.parseInt(
      this.container.getAttribute("max-toasts") || "3",
      10,
    );
    this.maxToasts =
      Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 3;

    this.isToastsExpanded =
      (this.container.getAttribute("expanded") || "false") === "true";
    this.expandedByDefault = this.isToastsExpanded;
    this.container.addEventListener(
      "mouseenter",
      this.#onMouseEnter.bind(this),
    );
    this.container.addEventListener("mouseleave", this.#onMouseOver.bind(this));
    this.container.addEventListener("mouseout", this.#onMouseOver.bind(this));
    this.container.addEventListener("mousemove", this.#onMouseOver.bind(this));
    this.container.addEventListener("focusin", this.#onFocusIn.bind(this));
    this.container.addEventListener("focusout", this.#onFocusOut.bind(this));

    const enableCloseButton =
      this.container.getAttribute("close-button") || "false";
    this.enableCloseButton = enableCloseButton === "true";

    const theme = this.container.getAttribute("theme");
    if (theme === "system") {
      const prefersDarkScheme = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );
      prefersDarkScheme.addEventListener("change", () => {
        this.refresh();
      });
    }
  }

  get isDarkTheme() {
    const theme = this.container.getAttribute("theme");
    if (theme === "system") {
      const prefersDarkScheme = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );
      return prefersDarkScheme.matches;
    }
    return this.container.getAttribute("theme") === "dark";
  }

  get positions() {
    const position = this.container.getAttribute("position") || "bottom-right";
    const [rawYPosition, rawXPosition] = position.split("-");
    const yPosition: "top" | "bottom" =
      rawYPosition === "top" ? "top" : "bottom";
    const xPosition: "left" | "right" | "center" =
      rawXPosition === "left" || rawXPosition === "center"
        ? rawXPosition
        : "right";
    return { xPosition, yPosition };
  }

  create(options: ToastOptions) {
    const resolvedOptions = { ...options };
    const containerDuration = this.container.getAttribute("duration");
    if (resolvedOptions.duration == null && containerDuration !== null) {
      const duration = Number.parseInt(containerDuration, 10);
      if (Number.isFinite(duration) && duration >= 0) {
        resolvedOptions.duration = duration;
      }
    }

    if (resolvedOptions.closeButton == null) {
      resolvedOptions.closeButton = this.enableCloseButton;
    }

    if (resolvedOptions.theme == null) {
      const containerTheme = this.container.getAttribute("theme");
      if (containerTheme === "light" || containerTheme === "dark") {
        resolvedOptions.theme = containerTheme;
      }
    }

    if (resolvedOptions.useRichColors == null) {
      resolvedOptions.useRichColors =
        this.container.getAttribute("rich-colors") === "true";
    }

    const toast = new Toast(resolvedOptions);
    this.container.appendChild(toast.element);
    toast.updateHeight();
    this.toasts.push(toast);

    const contentElement = toast.contentElement;
    if (contentElement) {
      this.resizeObserver.observe(contentElement);
    }

    this.refresh();
    toast.setMounted();

    toast.onUpdate = () => {
      toast.updateHeight();
      this.refresh();
    };

    const onClose = toast.onClose;
    toast.onClose = (id) => {
      this.toasts = this.toasts.filter((candidate) => candidate.id !== id);
      this.refresh();
      onClose?.(id);
    };

    const onRemove = toast.onRemove;
    toast.onRemove = (id) => {
      if (contentElement) {
        this.resizeObserver.unobserve(contentElement);
      }
      onRemove?.(id);
    };

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
      const reverseIndex = this.toasts.length - index;
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

    const frontToast = this.toasts.at(-1);
    if (!frontToast) {
      return;
    }

    let height = 0;
    let lastElementHeight = 0;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const existingToast = this.toasts[i];
      if (!existingToast || existingToast.hidden) {
        continue;
      }
      height += lastElementHeight;
      existingToast.setCollapsedHeight(frontToast.height);
      existingToast.setSpaceAbove(height);
      lastElementHeight = existingToast.height + 10;
    }

    frontToast.setFront(true);
  }

  #onMouseEnter() {
    if (!this.expandedByDefault) {
      this.expand();
    }
    for (const toast of this.toasts) {
      toast.pauseRemoval("pointer");
    }
  }

  #onMouseOver(event: MouseEvent) {
    if (this.toasts.length === 0) {
      return;
    }

    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (const toast of this.toasts) {
      const rect = toast.element.getBoundingClientRect();
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    }

    const isMouseInside =
      event.clientX >= left &&
      event.clientX <= right &&
      event.clientY >= top &&
      event.clientY <= bottom;

    if (!isMouseInside) {
      if (!this.expandedByDefault) {
        this.collapse();
      }
      for (const toast of this.toasts) {
        toast.resumeRemoval("pointer");
      }
    }
  }

  #onFocusIn() {
    if (!this.expandedByDefault) {
      this.expand();
    }
    for (const toast of this.toasts) {
      toast.pauseRemoval("focus");
    }
  }

  #onFocusOut(event: FocusEvent) {
    if (
      event.relatedTarget instanceof Node &&
      this.container.contains(event.relatedTarget)
    ) {
      return;
    }
    if (!this.expandedByDefault) {
      this.collapse();
    }
    for (const toast of this.toasts) {
      toast.resumeRemoval("focus");
    }
  }
}
