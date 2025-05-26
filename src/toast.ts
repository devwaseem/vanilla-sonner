import { ToastOptions } from "./models";
import {
  plainTemplate,
  descriptionTemplate,
  successTemplate,
  buildTemplate,
  infoTemplate,
  warningTemplate,
  errorTemplate,
} from "./templates";

export default class Toast {
  id: string;
  toast: HTMLElement;
  options: ToastOptions;
  xPosition: string;
  yPosition: string;

  timeStarted: number;
  removalTimer: NodeJS.Timeout | null;
  lastRemovalPaused: number;
  duration: number;
  remainingTimeToRemove: number;
  height: number;
  onRemove: ((id: string) => void) | null;
  onClose: ((id: string) => void) | null;
  hidden: boolean;

  isFront: boolean;
  index: number;

  constructor(options: ToastOptions) {
    this.id = `toast-${Math.random().toString(26).substring(4)}-${Date.now()}`;
    this.options = options;
    this.toast = document.createElement("div");
    this.toast.setAttribute("id", this.id);
    this.setXPosition(options.xPosition || "right");
    this.setYPosition(options.yPosition || "bottom");
    this.#setup();

    this.hidden = false;

    this.timeStarted = Date.now();
    this.removalTimer = null;
    this.lastRemovalPaused = Date.now();
    this.duration = options.duration || 0;
    this.remainingTimeToRemove = this.duration;
    this.height = 0;
    this.onClose = null;
    this.onRemove = null;
  }

  get element() {
    return this.toast;
  }

  updateHeight() {
    this.height = this.toast.getBoundingClientRect().height;
  }

  #setup() {
    switch (this.options.type) {
      case "plain":
        this.toast.innerHTML = buildTemplate(plainTemplate, {
          id: this.id,
          message: this.options.message,
        });
        break;
      case "description":
        this.toast.innerHTML = buildTemplate(descriptionTemplate, {
          id: this.id,
          title: this.options.message,
          description: this.options.description || "",
        });
        break;
      case "success":
        this.toast.innerHTML = buildTemplate(successTemplate, {
          id: this.id,
          message: this.options.message,
        });
        break;
      case "info":
        this.toast.innerHTML = buildTemplate(infoTemplate, {
          id: this.id,
          message: this.options.message,
        });
        break;
      case "warning":
        this.toast.innerHTML = buildTemplate(warningTemplate, {
          id: this.id,
          message: this.options.message,
        });
        break;
      case "error":
        this.toast.innerHTML = buildTemplate(errorTemplate, {
          id: this.id,
          message: this.options.message,
        });
        break;
      case "action":
        this.toast.innerHTML = buildTemplate(errorTemplate, {
          id: this.id,
          message: this.options.message,
        });
        break;
    }

    this.toast.dataset.sonnerToast = "";
    this.toast.dataset.theme = this.options.theme || "light";
    this.toast.dataset.mounted = "false";
    this.toast.dataset.hidden = "false";
    this.toast.dataset.expanded = "false";
    this.toast.dataset.xPosition = this.xPosition;
    this.toast.dataset.yPosition = this.yPosition;
    this.toast.dataset.type = this.options.type;
    this.toast.dataset.richColors = this.options.useRichColors
      ? "true"
      : "false";

    if (this.options.closeButton) {
      this.toast.style.setProperty(
        "--close-button-display",
        "var(--close-button-visible-display)",
      );
    }

    this.toast
      .querySelector("[data-toast-close]")
      ?.addEventListener("click", () => {
        this.remove();
        if (this.removalTimer) {
          clearTimeout(this.removalTimer);
        }
      });
  }

  setCollapsedHeight(height: number) {
    this.toast.style.setProperty("--collapsed-height", `${height}px`);
  }

  setFront(value: boolean) {
    this.isFront = value;
    this.toast.dataset.front = value.toString();
  }

  setXPosition(xPosition: string) {
    this.xPosition = xPosition;
    this.toast.dataset.xPosition = xPosition;
  }

  setYPosition(yPosition: string) {
    this.yPosition = yPosition;
    this.toast.dataset.yPosition = yPosition;
  }

  setIndex(index: number) {
    this.index = index;
    this.element.style.setProperty("--index", String(index));
  }

  show() {
    this.toast.dataset.hidden = "false";
    this.hidden = false;
  }

  hide() {
    this.toast.dataset.hidden = "true";
    this.hidden = true;
  }

  setMounted() {
    setTimeout(() => {
      this.toast.dataset.mounted = "true";
    }, 10);
    if (this.duration > 0) {
      this.#setupRemoval();
    }
  }

  setSpaceAbove(value: number) {
    this.element.style.setProperty("--space-above", `${value}px`);
  }

  setExpanded() {
    this.toast.dataset.expanded = "true";
    if (this.duration > 0) {
      this.pauseRemoval();
    }
  }

  setCollapsed() {
    this.toast.dataset.expanded = "false";
    if (this.duration > 0 && !this.removalTimer) {
      this.resumeRemoval();
    }
  }

  #setupRemoval() {
    this.removalTimer = setTimeout(() => {
      this.remove();
      this.removalTimer = null;
    }, this.duration);
  }

  pauseRemoval() {
    if (this.removalTimer) {
      clearTimeout(this.removalTimer);
    }
    this.removalTimer = null;
    this.remainingTimeToRemove = Math.max(
      0,
      this.remainingTimeToRemove - (Date.now() - this.timeStarted),
    );
  }

  resumeRemoval() {
    this.removalTimer = setTimeout(() => {
      this.remove();
      this.removalTimer = null;
    }, this.remainingTimeToRemove! + 1000);
    this.timeStarted = Date.now();
  }

  remove() {
    this.hide();
    this.onClose?.(this.toast.id);
    setTimeout(() => {
      this.element.remove();
      if (this.onRemove) {
        this.onRemove(this.toast.id);
      }
    }, 500);
  }
}
