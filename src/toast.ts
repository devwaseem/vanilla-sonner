import type {
  ToastCloseReason,
  ToastOptions,
  ToastPromiseResult,
  ToastSnapshot,
  ToastSwipeDirection,
} from "./models";
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

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function reportConsumerError(error: unknown) {
  console.error("Vanilla Sonner consumer callback failed", error);
}

function resultToUpdate(
  result: ToastPromiseResult,
  fallbackType: "success" | "error",
) {
  return typeof result === "string"
    ? { message: result, type: fallbackType }
    : { type: fallbackType, ...result };
}

export default class Toast {
  id: string;
  toast: HTMLElement;
  options: ToastOptions;
  xPosition: "left" | "right" | "center" = "right";
  yPosition: "top" | "bottom" = "bottom";
  removalTimer: number | null = null;
  removalDeadline: number | null = null;
  duration: number;
  remainingTimeToRemove: number;
  pauseReasons = new Set<string>();
  height = 0;
  onUpdate: ((id: string) => void) | null = null;
  onRemove: ((id: string, reason: ToastCloseReason) => void) | null = null;
  onClose: ((id: string, reason: ToastCloseReason) => void) | null = null;
  hidden = false;
  queued = false;
  delayed = false;
  isFront = false;
  index = 0;
  canRemove = true;
  closing = false;
  renderGeneration = 0;
  mounted = false;
  promiseSettled = false;
  createdAt = Date.now();
  closeReason?: ToastCloseReason;
  closedAt?: number;
  #pointerStart: { x: number; y: number; id: number } | null = null;

  constructor(options: ToastOptions) {
    this.id =
      options.id ??
      `toast-${Math.random().toString(26).substring(4)}-${Date.now()}`;
    this.options = { ...options, id: this.id };
    this.toast = document.createElement("li");
    this.toast.id = this.id;
    this.toast.tabIndex = -1;
    this.setXPosition(options.xPosition || "right");
    this.setYPosition(options.yPosition || "bottom");
    this.duration = options.duration ?? 0;
    this.remainingTimeToRemove = this.duration;
    this.#bindPointerEvents();
    this.toast.addEventListener("click", (event) => {
      if (
        this.options.closeOnClick &&
        this.options.dismissible !== false &&
        !(event.target instanceof Element && event.target.closest("button"))
      ) {
        this.dismiss("click");
      }
    });
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

  get state(): ToastSnapshot["state"] {
    if (this.closing) return "closing";
    if (this.delayed) return "delayed";
    if (this.queued) return "queued";
    return "visible";
  }

  snapshot(): ToastSnapshot {
    return {
      id: this.id,
      type: this.options.type,
      state: this.state,
      createdAt: this.createdAt,
      ...(this.options.message !== undefined
        ? { message: this.options.message }
        : {}),
      ...(this.options.description !== undefined
        ? { description: this.options.description }
        : {}),
      ...(this.options.position !== undefined
        ? { position: this.options.position }
        : {}),
      ...(this.options.progress !== undefined
        ? { progress: this.options.progress }
        : {}),
      ...(this.closedAt !== undefined ? { closedAt: this.closedAt } : {}),
      ...(this.closeReason !== undefined
        ? { closeReason: this.closeReason }
        : {}),
      ...(this.options.data ? { data: { ...this.options.data } } : {}),
    };
  }

  updateHeight() {
    const content = this.contentElement;
    if (!content || !this.mounted) return;
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
    if (element) element.textContent = value;
  }

  #appendDescription() {
    if (!this.options.description) return;
    const content = this.toast.querySelector<HTMLElement>(
      "[data-toast-container-horizontal], [data-toast-plain]",
    );
    if (!content) return;
    const wrapper = document.createElement("div");
    wrapper.dataset.sonnerDescription = "";
    wrapper.textContent = this.options.description;
    content.insertAdjacentElement("afterend", wrapper);
  }

  #setup() {
    const generation = ++this.renderGeneration;
    this.canRemove = this.options.type !== "promise";
    this.toast.style.removeProperty("--close-button-display");

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
      case "error":
        this.toast.innerHTML = buildToast(LEVEL_TEMPLATES[this.options.type]);
        this.#setText("[data-toast-level-message]", this.options.message);
        this.#appendDescription();
        break;
      case "loading":
        this.toast.innerHTML = buildToast(promiseTemplate);
        this.#setText("[data-toast-promise-message]", this.options.message);
        this.#appendDescription();
        break;
      case "custom": {
        if (!this.options.template_id) {
          throw new Error("Custom toasts require a template_id");
        }
        const template = document.getElementById(this.options.template_id);
        if (!template) {
          throw new Error("Template not found: " + this.options.template_id);
        }
        this.toast.innerHTML = buildToast(
          renderTemplate(template.innerHTML, {
            ...this.options.toastData,
            id: this.id,
          }),
        );
        break;
      }
      case "promise":
        this.toast.innerHTML = buildToast(promiseTemplate);
        this.#setText("[data-toast-promise-message]", this.options.message);
        this.#appendDescription();
        this.#watchPromise(generation);
        break;
    }

    this.#setDataset();
    this.#setupProgress();
    this.#setupCloseButton();
    this.#setupAction();
  }

  #watchPromise(generation: number) {
    const promiseOptions = this.options.promiseOptions;
    if (!promiseOptions) {
      throw new Error("Promise toasts require promiseOptions");
    }

    const settle = (
      result: ToastPromiseResult,
      fallbackType: "success" | "error",
    ) => {
      if (generation !== this.renderGeneration || this.closing) return;
      this.promiseSettled = true;
      const update = resultToUpdate(result, fallbackType);
      this.update(update, update.duration !== undefined);
    };

    void promiseOptions.promise.then(
      (value) => {
        if (generation !== this.renderGeneration || this.closing) return;
        try {
          settle(promiseOptions.successResult(value), "success");
        } catch (error) {
          try {
            settle(promiseOptions.errorResult(error), "error");
          } catch (mapperError) {
            reportConsumerError(mapperError);
            settle({ type: "error", message: "Something went wrong" }, "error");
          }
        }
      },
      (error: unknown) => {
        if (generation !== this.renderGeneration || this.closing) return;
        try {
          settle(promiseOptions.errorResult(error), "error");
        } catch (mapperError) {
          reportConsumerError(mapperError);
          settle({ type: "error", message: "Something went wrong" }, "error");
        }
      },
    );
  }

  #setDataset() {
    this.toast.dataset.sonnerToast = "";
    this.toast.dataset.sonnerPart = "toast";
    this.toast.dataset.theme = this.options.theme === "dark" ? "dark" : "light";
    this.toast.dataset.mounted = this.mounted ? "true" : "false";
    this.toast.dataset.hidden = this.hidden ? "true" : "false";
    this.toast.dataset.expanded ||= "false";
    this.toast.dataset.xPosition = this.xPosition;
    this.toast.dataset.yPosition = this.yPosition;
    this.toast.dataset.type = this.options.type;
    this.toast.dataset.richColors = this.options.useRichColors
      ? "true"
      : "false";
    this.toast.dataset.unstyled = this.options.unstyled ? "true" : "false";
    this.toast.dataset.state = this.state;
    const swipeDirections = this.options.swipeDirections ?? [];
    const horizontalSwipe =
      swipeDirections.includes("left") || swipeDirections.includes("right");
    const verticalSwipe =
      swipeDirections.includes("up") || swipeDirections.includes("down");
    this.toast.dataset.swipeAxis =
      horizontalSwipe && verticalSwipe
        ? "both"
        : horizontalSwipe
          ? "horizontal"
          : verticalSwipe
            ? "vertical"
            : "none";
    this.toast.setAttribute(
      "role",
      this.options.important ? "alert" : "status",
    );
    this.toast.setAttribute(
      "aria-live",
      this.options.important ? "assertive" : "polite",
    );
    this.toast.setAttribute("aria-atomic", "true");
    this.toast
      .querySelector(".sonner-toast-content-container")
      ?.setAttribute("data-sonner-part", "content");
  }

  #setupProgress() {
    if (this.options.progress === undefined) {
      this.toast.removeAttribute("data-progress");
      return;
    }
    const progress = clampProgress(this.options.progress);
    this.options.progress = progress;
    this.toast.dataset.progress = String(progress);
    const track = document.createElement("div");
    track.dataset.sonnerProgressTrack = "";
    track.dataset.sonnerPart = "progress-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    const bar = document.createElement("div");
    bar.dataset.sonnerProgressBar = "";
    bar.dataset.sonnerPart = "progress-bar";
    bar.style.setProperty("--progress", String(progress));
    track.appendChild(bar);
    this.toast.appendChild(track);
  }

  #setupCloseButton() {
    const closeButton = this.toast.querySelector<HTMLElement>(
      ".sonner-toast-close",
    );
    closeButton?.setAttribute("data-sonner-part", "close-button");
    if (!this.options.closeButton || this.options.dismissible === false) return;
    this.toast.style.setProperty(
      "--close-button-display",
      "var(--close-button-visible-display)",
    );
    closeButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.dismiss("close-button");
    });
  }

  #setupAction() {
    const actionButton = this.toast.querySelector<HTMLButtonElement>(
      "[data-sonner-action-button]",
    );
    if (!actionButton) return;
    actionButton.dataset.sonnerPart = "action-button";
    if (!this.options.action) {
      actionButton.remove();
      return;
    }
    actionButton.dataset.sonnerActionButton = "true";
    actionButton.textContent = this.options.action.label || "Action";
    actionButton.addEventListener("click", (event) => {
      event.stopPropagation();
      let result: void | false | Promise<void | false>;
      try {
        result = this.options.action?.onClick(this.id);
      } catch (error) {
        reportConsumerError(error);
        return;
      }
      void Promise.resolve(result)
        .then((value) => {
          if (value !== false) this.dismiss("action");
        })
        .catch(reportConsumerError);
    });
  }

  #bindPointerEvents() {
    this.toast.addEventListener("pointerdown", (event) => {
      if (
        this.options.dismissible === false ||
        !this.options.swipeDirections?.length ||
        event.button !== 0 ||
        (event.target instanceof Element && event.target.closest("button"))
      ) {
        return;
      }
      this.#pointerStart = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      this.toast.setPointerCapture?.(event.pointerId);
      this.toast.dataset.swiping = "true";
      this.pauseRemoval("swipe");
    });
    this.toast.addEventListener("pointermove", (event) => {
      if (!this.#pointerStart || event.pointerId !== this.#pointerStart.id)
        return;
      const delta = this.#allowedSwipeDelta(
        event.clientX - this.#pointerStart.x,
        event.clientY - this.#pointerStart.y,
      );
      this.toast.style.setProperty("--swipe-x", `${delta.x}px`);
      this.toast.style.setProperty("--swipe-y", `${delta.y}px`);
    });
    const finish = (event: PointerEvent) => {
      if (!this.#pointerStart || event.pointerId !== this.#pointerStart.id)
        return;
      const delta = this.#allowedSwipeDelta(
        event.clientX - this.#pointerStart.x,
        event.clientY - this.#pointerStart.y,
      );
      const threshold = Math.max(
        0,
        Math.min(1, this.options.swipeThreshold ?? 0.35),
      );
      const rect = this.toast.getBoundingClientRect();
      const dismissed =
        Math.abs(delta.x) >= rect.width * threshold ||
        Math.abs(delta.y) >= rect.height * threshold;
      this.#pointerStart = null;
      this.toast.dataset.swiping = "false";
      this.toast.style.removeProperty("--swipe-x");
      this.toast.style.removeProperty("--swipe-y");
      this.resumeRemoval("swipe");
      if (dismissed) this.dismiss("swipe");
    };
    this.toast.addEventListener("pointerup", finish);
    this.toast.addEventListener("pointercancel", finish);
  }

  #allowedSwipeDelta(x: number, y: number) {
    const directions = this.options.swipeDirections ?? [];
    const allow = (direction: ToastSwipeDirection) =>
      directions.includes(direction);
    return {
      x: x < 0 && allow("left") ? x : x > 0 && allow("right") ? x : 0,
      y: y < 0 && allow("up") ? y : y > 0 && allow("down") ? y : 0,
    };
  }

  update(options: Partial<ToastOptions>, resetDuration: boolean) {
    if (this.closing) return false;
    const wasWaiting = !this.canRemove;
    if (options.xPosition) this.setXPosition(options.xPosition);
    if (options.yPosition) this.setYPosition(options.yPosition);
    this.options = { ...this.options, ...options, id: this.id };

    if (resetDuration) {
      this.duration = options.duration ?? 0;
      this.remainingTimeToRemove = this.duration;
    }
    if (
      resetDuration ||
      options.type === "promise" ||
      options.type === "loading"
    ) {
      this.#clearRemovalTimer();
    }

    this.#setup();
    if (this.mounted && this.canRemove && (resetDuration || wasWaiting)) {
      this.restartRemoval();
    }
    this.onUpdate?.(this.id);
    return true;
  }

  setCollapsedHeight(height: number) {
    this.toast.style.setProperty("--collapsed-height", `${height}px`);
  }

  setFront(value: boolean) {
    this.isFront = value;
    this.toast.dataset.front = value.toString();
  }

  setXPosition(value: "left" | "right" | "center") {
    this.xPosition = value;
    this.toast.dataset.xPosition = value;
  }

  setYPosition(value: "top" | "bottom") {
    this.yPosition = value;
    this.toast.dataset.yPosition = value;
  }

  setIndex(index: number) {
    this.index = index;
    this.toast.style.setProperty("--index", String(index));
  }

  show() {
    this.queued = false;
    this.delayed = false;
    this.toast.dataset.state = "visible";
    this.toast.dataset.hidden = "false";
    this.toast.removeAttribute("aria-hidden");
    this.toast.inert = false;
    this.hidden = false;
    this.resumeRemoval("queue");
  }

  hide() {
    this.toast.dataset.hidden = "true";
    this.toast.setAttribute("aria-hidden", "true");
    this.toast.inert = true;
    this.hidden = true;
  }

  setQueued(value: boolean) {
    this.queued = value;
    if (value) {
      this.toast.dataset.state = "queued";
      this.pauseRemoval("queue");
      this.hide();
    } else {
      this.show();
    }
  }

  setDelayed(value: boolean) {
    this.delayed = value;
    this.toast.dataset.state = value ? "delayed" : "visible";
  }

  setMounted() {
    this.mounted = true;
    this.delayed = false;
    window.setTimeout(() => {
      if (!this.closing) this.toast.dataset.mounted = "true";
    }, 10);
    if (this.canRemove) this.#scheduleRemoval();
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

  restartRemoval(duration = this.duration) {
    this.duration = duration;
    this.remainingTimeToRemove = duration;
    this.#clearRemovalTimer();
    this.#scheduleRemoval();
  }

  #scheduleRemoval() {
    if (
      !this.mounted ||
      !this.canRemove ||
      this.closing ||
      this.pauseReasons.size > 0 ||
      this.duration <= 0
    ) {
      return;
    }
    this.#clearRemovalTimer();
    this.removalDeadline = performance.now() + this.remainingTimeToRemove;
    this.removalTimer = window.setTimeout(() => {
      this.removalTimer = null;
      this.removalDeadline = null;
      this.dismiss("timeout");
    }, this.remainingTimeToRemove);
  }

  #clearRemovalTimer() {
    if (this.removalTimer !== null) window.clearTimeout(this.removalTimer);
    this.removalTimer = null;
    this.removalDeadline = null;
  }

  pauseRemoval(reason = "manual") {
    if (this.pauseReasons.has(reason)) return false;
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
    return true;
  }

  resumeRemoval(reason = "manual") {
    const removed = this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0 && this.removalTimer === null) {
      this.#scheduleRemoval();
    }
    return removed;
  }
  dismiss(reason: ToastCloseReason = "programmatic", immediate = false) {
    if (this.closing) return false;
    if (
      this.options.dismissible === false &&
      ["close-button", "action", "swipe", "click", "keyboard"].includes(reason)
    ) {
      return false;
    }
    this.closing = true;
    this.closeReason = reason;
    this.closedAt = Date.now();
    this.renderGeneration++;
    this.hide();
    this.toast.dataset.state = "closing";
    this.#clearRemovalTimer();
    this.onClose?.(this.id, reason);
    if (immediate) {
      this.#finalizeRemoval(reason);
    } else {
      window.setTimeout(() => this.#finalizeRemoval(reason), 500);
    }
    return true;
  }

  remove() {
    return this.dismiss("programmatic");
  }

  removeImmediately(reason: ToastCloseReason = "programmatic") {
    return this.dismiss(reason, true);
  }

  #finalizeRemoval(reason: ToastCloseReason) {
    this.element.remove();
    try {
      this.onRemove?.(this.id, reason);
    } finally {
      this.onClose = null;
      this.onUpdate = null;
      this.onRemove = null;
    }
  }
}
