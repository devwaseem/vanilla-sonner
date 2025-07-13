import { ToastOptions } from "./models";
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

function buildToast(template: string, replacements: Record<string, string>) {
  const content = renderTemplate(template, replacements);
  return baseTemplate.replace(/{{ ?slot ?}}/g, content.trim());
}

export default class Toast {
  id: string;
  toast: HTMLElement;
  options: ToastOptions;
  xPosition: string;
  yPosition: string;
  isExpanded: boolean;

  timeStarted: number;
  removalTimer: NodeJS.Timeout | null;
  lastRemovalPaused: number;
  duration: number;
  remainingTimeToRemove: number;
  height: number;
  onUpdate: ((id: string) => void) | null;
  onRemove: ((id: string) => void) | null;
  onClose: ((id: string) => void) | null;
  hidden: boolean;

  isFront: boolean;
  index: number;

  canRemove: boolean;

  constructor(options: ToastOptions) {
    this.id = `toast-${Math.random().toString(26).substring(4)}-${Date.now()}`;
    this.options = options;
    this.toast = document.createElement("li");
    this.toast.setAttribute("id", this.id);
    this.setXPosition(options.xPosition || "right");
    this.setYPosition(options.yPosition || "bottom");

    this.isExpanded = false;
    this.hidden = false;
    this.timeStarted = Date.now();
    this.removalTimer = null;
    this.lastRemovalPaused = Date.now();
    this.duration = options.duration || 0;
    this.remainingTimeToRemove = this.duration;
    this.height = 0;

    this.onUpdate = null;
    this.onClose = null;
    this.onRemove = null;
    this.canRemove = true;

    this.#setup();
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
        this.toast.innerHTML = buildToast(plainTemplate, {
          id: this.id,
          message: this.options.message || "",
        });
        break;
      case "description":
        this.toast.innerHTML = buildToast(descriptionTemplate, {
          id: this.id,
          title: this.options.message || "",
          description: this.options.description || "",
        });
        break;
      case "success":
        this.toast.innerHTML = buildToast(successTemplate, {
          id: this.id,
          message: this.options.message || "",
        });
        break;
      case "info":
        this.toast.innerHTML = buildToast(infoTemplate, {
          id: this.id,
          message: this.options.message || "",
        });
        break;
      case "warning":
        this.toast.innerHTML = buildToast(warningTemplate, {
          id: this.id,
          message: this.options.message || "",
        });
        break;
      case "error":
        this.toast.innerHTML = buildToast(errorTemplate, {
          id: this.id,
          message: this.options.message || "",
        });
        break;
      case "custom":
        if (!this.options.template_id) {
          throw new Error("Custom toasts require a template_id");
        }
        const template = document.getElementById(this.options.template_id);
        if (!template) {
          throw new Error("Template not found: " + this.options.template_id);
        }
        let toastData = this.options.toastData || {};
        toastData["id"] = this.id;
        this.toast.innerHTML = buildToast(template.innerHTML, toastData);
        break;
      case "promise":
        this.canRemove = false;
        this.toast.innerHTML = buildToast(promiseTemplate, {
          id: this.id,
          message: this.options.message || "",
        });
        const promiseOptions = this.options.promiseOptions;

        function setCompleted() {
          this.toast
            .querySelector("[data-toast-promise-running]")
            ?.setAttribute("data-show", "false");
          this.toast
            .querySelector("[data-toast-promise-completed]")
            ?.setAttribute("data-show", "true");
          this.canRemove = true;
          this.#setupRemoval();
          if (this.isExpanded) {
            this.pauseRemoval();
          }
          this.onUpdate?.(this.id);
        }

        function setMessage(message: string) {
          const messageElement = this.toast?.querySelector(
            "[data-toast-promise-message]",
          )!;
          messageElement.innerHTML = message;
        }

        setMessage.bind(this)(promiseOptions?.loadingMessage || "");
        promiseOptions?.promise
          .then(() => {
            setMessage.bind(this)(
              promiseOptions?.successMessage ||
                promiseOptions?.loadingMessage ||
                "",
            );
            setCompleted.bind(this)();
          })
          .catch(() => {
            setMessage.bind(this)(
              promiseOptions?.errorMessage ||
                promiseOptions?.loadingMessage ||
                "",
            );
            setCompleted.bind(this)();
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

      this.toast
        .querySelector(".sonner-toast-close")
        ?.addEventListener("click", (e) => {
          e.stopPropagation();
          this.remove();
          if (this.removalTimer) {
            clearTimeout(this.removalTimer);
          }
        });
    }

    const actionButton = this.toast.querySelector(
      "[data-sonner-action-button]",
    )!;
    if (this.options.action) {
      actionButton.setAttribute("data-sonner-action-button", "true");
      actionButton.innerHTML = renderTemplate(actionButton.innerHTML, {
        action_label: this.options.action?.label || "Action",
      });
      actionButton.addEventListener("click", () => {
        let retVal = this.options.action?.onClick();
        if (retVal == null || retVal == undefined || retVal !== false) {
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
    if (this.canRemove) {
      this.#setupRemoval();
    }
  }

  setSpaceAbove(value: number) {
    this.element.style.setProperty("--space-above", `${value}px`);
  }

  setExpanded() {
    this.isExpanded = true;
    this.toast.dataset.expanded = "true";
    if (this.duration > 0 && this.canRemove) {
      this.pauseRemoval();
    }
  }

  setCollapsed() {
    this.isExpanded = false;
    this.toast.dataset.expanded = "false";
    if (this.duration > 0 && this.canRemove && !this.removalTimer) {
      this.resumeRemoval();
    }
  }

  #setupRemoval() {
    if (this.duration > 0) {
      if (this.removalTimer) {
        clearTimeout(this.removalTimer);
      }
      this.removalTimer = setTimeout(() => {
        this.remove();
        this.removalTimer = null;
      }, this.duration);
    }
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

    if (this.removalTimer) {
      clearTimeout(this.removalTimer);
    }

    setTimeout(() => {
      this.element.remove();
      if (this.onRemove) {
        this.onRemove(this.toast.id);
        // remove circular dependency to allow garbage collection
        this.onClose = null;
        this.onUpdate = null;
        this.onRemove = null;
      }
    }, 500);
  }
}
