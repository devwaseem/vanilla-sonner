import type { ToastOptions } from "./models";
import {
  baseTemplate,
  plainTemplate,
  descriptionTemplate,
  successTemplate,
  renderTemplate,
  infoTemplate,
  warningTemplate,
  errorTemplate,
  promiseTemplate,
} from "./templates";

function buildToast(template: string) {
  return baseTemplate.replace(/{{ ?slot ?}}/g, template.trim());
}

const LEVEL_TEMPLATES = {
  success: successTemplate,
  info: infoTemplate,
  warning: warningTemplate,
  error: errorTemplate,
};

export default class Toast {
  id: string;
  toast: HTMLElement;
  options: ToastOptions;
  xPosition: "left" | "right" | "center" = "right";
  yPosition: "top" | "bottom" = "bottom";

  removalTimer: number | null;
  removalDeadline: number | null;
  duration: number;
  remainingTimeToRemove: number;
  pauseReasons: Set<string>;
  height: number;
  onUpdate: ((id: string) => void) | null;
  onRemove: ((id: string) => void) | null;
  onClose: ((id: string) => void) | null;
  hidden: boolean;

  isFront: boolean;
  index: number;

  canRemove: boolean;
  closing: boolean;

  constructor(options: ToastOptions) {
    this.id = `toast-${Math.random().toString(26).substring(4)}-${Date.now()}`;
    this.options = options;
    this.toast = document.createElement("li");
    this.toast.setAttribute("id", this.id);
    this.toast.setAttribute("role", "status");
    this.toast.setAttribute("aria-live", "polite");
    this.toast.setAttribute("aria-atomic", "true");
    this.setXPosition(options.xPosition || "right");
    this.setYPosition(options.yPosition || "bottom");

    this.isFront = false;
    this.index = 0;
    this.hidden = false;
    this.removalTimer = null;
    this.removalDeadline = null;
    this.duration = options.duration ?? 0;
    this.remainingTimeToRemove = this.duration;
    this.pauseReasons = new Set();
    this.height = 0;

    this.onUpdate = null;
    this.onClose = options.onClose ?? null;
    this.onRemove = options.onRemove ?? null;
    this.canRemove = true;
    this.closing = false;

    this.#setup();
  }

  get element() {
    return this.toast;
  }

  get contentElement() {
    return this.toast.querySelector<HTMLElement>(
      ".sonner-toast-content-container",
    );
  }

  updateHeight() {
    const content = this.contentElement;
    if (!content) {
      return;
    }
    const style = window.getComputedStyle(this.toast);
    const chrome =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
    this.height = content.getBoundingClientRect().height + chrome;
  }

  #setText(selector: string, value = "") {
    const element = this.toast.querySelector<HTMLElement>(selector);
    if (element) {
      element.textContent = value;
    }
  }

  #setup() {
    switch (this.options.type) {
      case "plain":
        this.toast.innerHTML = buildToast(plainTemplate);
        this.#setText("[data-toast-plain]", this.options.message);
        break;
      case "description":
        this.toast.innerHTML = buildToast(descriptionTemplate);
        this.#setText("[data-title]", this.options.message);
        this.#setText("[data-description]", this.options.description);
        break;
      case "success":
      case "info":
      case "warning":
      case "error": {
        this.toast.innerHTML = buildToast(LEVEL_TEMPLATES[this.options.type]);
        this.#setText("[data-toast-level-message]", this.options.message);
        break;
      }
      case "custom": {
        if (!this.options.template_id) {
          throw new Error("Custom toasts require a template_id");
        }
        const template = document.getElementById(this.options.template_id);
        if (!template) {
          throw new Error("Template not found: " + this.options.template_id);
        }
        const toastData = {
          ...this.options.toastData,
          id: this.id,
        };
        this.toast.innerHTML = buildToast(
          renderTemplate(template.innerHTML, toastData),
        );
        break;
      }
      case "promise": {
        this.canRemove = false;
        this.toast.innerHTML = buildToast(promiseTemplate);
        const promiseOptions = this.options.promiseOptions;

        const setCompleted = () => {
          this.toast
            .querySelector("[data-toast-promise-running]")
            ?.setAttribute("data-show", "false");
          this.toast
            .querySelector("[data-toast-promise-completed]")
            ?.setAttribute("data-show", "true");
          this.canRemove = true;
          this.#setupRemoval();
          this.onUpdate?.(this.id);
        };

        const setMessage = (message: string) => {
          this.#setText("[data-toast-promise-message]", message);
        };

        setMessage(promiseOptions?.loadingMessage || "");
        promiseOptions?.promise
          .then(() => {
            setMessage(
              promiseOptions?.successMessage ||
                promiseOptions?.loadingMessage ||
                "",
            );
            setCompleted();
          })
          .catch(() => {
            setMessage(
              promiseOptions?.errorMessage ||
                promiseOptions?.loadingMessage ||
                "",
            );
            setCompleted();
          });
        break;
      }
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

      this.toast
        .querySelector(".sonner-toast-close")
        ?.addEventListener("click", (event) => {
          event.stopPropagation();
          this.remove();
        });
    }

    const actionButton = this.toast.querySelector(
      "[data-sonner-action-button]",
    )!;
    if (this.options.action) {
      actionButton.setAttribute("data-sonner-action-button", "true");
      actionButton.textContent = this.options.action.label || "Action";
      actionButton.addEventListener("click", () => {
        const returnValue = this.options.action?.onClick();
        if (returnValue !== false) {
          this.remove();
        }
      });
    } else {
      actionButton.remove();
    }
  }

  setCollapsedHeight(height: number) {
    this.toast.style.setProperty("--collapsed-height", `${height}px`);
  }

  setFront(value: boolean) {
    this.isFront = value;
    this.toast.dataset.front = value.toString();
  }

  setXPosition(xPosition: "left" | "right" | "center") {
    this.xPosition = xPosition;
    this.toast.dataset.xPosition = xPosition;
  }

  setYPosition(yPosition: "top" | "bottom") {
    this.yPosition = yPosition;
    this.toast.dataset.yPosition = yPosition;
  }

  setIndex(index: number) {
    this.index = index;
    this.element.style.setProperty("--index", String(index));
  }

  show() {
    this.toast.dataset.hidden = "false";
    this.toast.removeAttribute("aria-hidden");
    this.toast.inert = false;
    this.hidden = false;
  }

  hide() {
    this.toast.dataset.hidden = "true";
    this.toast.setAttribute("aria-hidden", "true");
    this.toast.inert = true;
    this.hidden = true;
  }

  setMounted() {
    window.setTimeout(() => {
      this.toast.dataset.mounted = "true";
    }, 10);
    if (this.canRemove) {
      this.#setupRemoval();
    }
  }

  setSpaceAbove(value: number) {
    this.element.style.setProperty("--space-above", `${value}px`);
  }

  setExpanded() {
    this.toast.dataset.expanded = "true";
  }

  setCollapsed() {
    this.toast.dataset.expanded = "false";
  }

  setTheme(theme: "light" | "dark") {
    this.toast.dataset.theme = theme;
  }

  #setupRemoval() {
    if (this.duration <= 0) {
      return;
    }
    this.remainingTimeToRemove = this.duration;
    this.#scheduleRemoval();
  }

  #scheduleRemoval() {
    if (
      !this.canRemove ||
      this.closing ||
      this.pauseReasons.size > 0 ||
      this.duration <= 0
    ) {
      return;
    }
    if (this.removalTimer !== null) {
      window.clearTimeout(this.removalTimer);
    }
    this.removalDeadline = performance.now() + this.remainingTimeToRemove;
    this.removalTimer = window.setTimeout(() => {
      this.removalTimer = null;
      this.removalDeadline = null;
      this.remove();
    }, this.remainingTimeToRemove);
  }

  pauseRemoval(reason = "manual") {
    if (this.pauseReasons.has(reason)) {
      return;
    }
    this.pauseReasons.add(reason);
    if (this.removalTimer !== null && this.removalDeadline !== null) {
      window.clearTimeout(this.removalTimer);
      this.removalTimer = null;
      this.remainingTimeToRemove = Math.max(
        0,
        this.removalDeadline - performance.now(),
      );
      this.removalDeadline = null;
    }
  }

  resumeRemoval(reason = "manual") {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0 && this.removalTimer === null) {
      this.#scheduleRemoval();
    }
  }

  remove() {
    if (this.closing) {
      return;
    }
    this.closing = true;
    this.hide();

    try {
      this.onClose?.(this.toast.id);
    } finally {
      if (this.removalTimer !== null) {
        window.clearTimeout(this.removalTimer);
        this.removalTimer = null;
        this.removalDeadline = null;
      }

      window.setTimeout(() => {
        this.element.remove();
        try {
          this.onRemove?.(this.toast.id);
        } finally {
          // Remove circular dependencies to allow garbage collection.
          this.onClose = null;
          this.onUpdate = null;
          this.onRemove = null;
        }
      }, 500);
    }
  }
}
