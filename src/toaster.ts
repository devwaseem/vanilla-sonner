import Toast from "./toast.js";
import type {
  StandardToastType,
  ToastCloseReason,
  ToastConfig,
  ToastDedupe,
  ToasterConfig,
  ToastOptions,
  ToastPosition,
  ToastSnapshot,
  ToastSwipeDirection,
  ToastUpdate,
} from "./models";

function reportConsumerError(error: unknown) {
  console.error("Vanilla Sonner consumer callback failed", error);
}

function generatedId() {
  return `toast-${Math.random().toString(26).substring(4)}-${Date.now()}`;
}

export class Toaster {
  toasts: Toast[] = [];
  history: ToastSnapshot[] = [];
  container: HTMLElement;
  config: ToasterConfig;
  maxToasts: number;
  expandedByDefault: boolean;
  enableCloseButton: boolean;
  isToastsExpanded: boolean;
  resizeObserver: ResizeObserver;
  destroyed = false;
  onDestroy: (() => void) | null = null;
  #abortController = new AbortController();
  #delayedMounts = new Map<string, number>();

  constructor(
    target: string | HTMLElement = "#sonner-toast-container",
    config: ToasterConfig = {},
  ) {
    if (typeof document === "undefined") {
      throw new Error("Vanilla Sonner toast creation requires a browser DOM.");
    }
    const container =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!(container instanceof HTMLElement)) {
      throw new Error(
        `Vanilla Sonner could not find toaster target: ${String(target)}`,
      );
    }
    this.container = container;
    this.config = { ...config, defaults: { ...config.defaults } };
    this.maxToasts = this.#readMaxToasts();
    this.enableCloseButton =
      config.closeButton ?? container.getAttribute("close-button") === "true";
    this.expandedByDefault =
      config.expanded ??
      (config.stack !== undefined
        ? config.stack === "expand"
        : container.getAttribute("expanded") === "true");
    this.isToastsExpanded = this.expandedByDefault;

    this.resizeObserver = new ResizeObserver((entries) => {
      let needsRefresh = false;
      for (const entry of entries) {
        const toast = this.toasts.find(
          (candidate) => candidate.contentElement === entry.target,
        );
        if (!toast) continue;
        const previousHeight = toast.height;
        toast.updateHeight();
        needsRefresh ||= Math.abs(previousHeight - toast.height) > 0.5;
      }
      if (needsRefresh) this.refresh();
    });

    this.#bindEvents();
    this.#applyContainerConfig();
  }

  get id() {
    return this.config.id ?? this.container.id;
  }

  get isDarkTheme() {
    const theme = this.config.theme ?? this.container.getAttribute("theme");
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return theme === "dark";
  }

  get positions() {
    return this.#getPosition(
      this.config.position ??
        (this.container.getAttribute("position") as ToastPosition | null) ??
        "bottom-right",
    );
  }

  configure(config: Partial<ToasterConfig>) {
    this.#assertActive();
    this.config = {
      ...this.config,
      ...config,
      defaults: { ...this.config.defaults, ...config.defaults },
    };
    this.maxToasts = this.#readMaxToasts();
    this.enableCloseButton =
      config.closeButton ??
      this.config.closeButton ??
      this.container.getAttribute("close-button") === "true";
    if (config.expanded !== undefined || config.stack !== undefined) {
      this.expandedByDefault =
        config.expanded ??
        (config.stack !== undefined
          ? config.stack === "expand"
          : this.expandedByDefault);
      this.expandedByDefault ? this.expand() : this.collapse();
    }
    this.#applyContainerConfig();
    this.refresh();
  }

  create(options: ToastOptions) {
    this.#assertActive();
    if (options.id !== undefined) {
      const existing = this.toasts.find(
        (candidate) => candidate.id === options.id,
      );
      if (existing) {
        this.#updateToast(existing, options);
        return existing.id;
      }
    }
    let resolvedOptions = this.#resolveOptions(options);
    const active = this.getActive();
    const beforeCreate = this.config.beforeCreate;
    if (beforeCreate) {
      try {
        const result = beforeCreate(
          Object.freeze({ ...resolvedOptions }),
          active,
        );
        if (result === false) return resolvedOptions.id ?? generatedId();
        resolvedOptions = this.#resolveOptions(result);
      } catch (error) {
        reportConsumerError(error);
      }
    }

    const duplicateId = this.#findDuplicate(resolvedOptions, active);
    if (duplicateId !== false) return duplicateId;
    if (resolvedOptions.id !== undefined) {
      const existing = this.toasts.find(
        (candidate) => candidate.id === resolvedOptions.id,
      );
      if (existing) {
        this.#updateToast(existing, resolvedOptions);
        return existing.id;
      }
    }

    const toast = new Toast(resolvedOptions);
    this.#bindToast(toast);
    this.toasts.push(toast);

    if (this.#applyDiscardPolicy(toast)) return toast.id;

    const delay = Math.max(0, resolvedOptions.delay ?? 0);
    if (delay > 0) {
      toast.setDelayed(true);
      const timer = window.setTimeout(() => {
        this.#delayedMounts.delete(toast.id);
        if (!toast.closing) this.#mountToast(toast);
      }, delay);
      this.#delayedMounts.set(toast.id, timer);
    } else {
      this.#mountToast(toast);
    }
    return toast.id;
  }

  dismiss(id?: string) {
    return this.#target(id, (toast) => toast.dismiss("programmatic"));
  }

  remove(id?: string) {
    return this.#target(id, (toast) => toast.removeImmediately("programmatic"));
  }

  pause(id?: string) {
    return this.#target(id, (toast) => toast.pauseRemoval("manual"));
  }

  resume(id?: string) {
    return this.#target(id, (toast) => toast.resumeRemoval("manual"));
  }

  update(id: string, options: ToastUpdate) {
    const toast = this.toasts.find((candidate) => candidate.id === id);
    return toast ? this.#updateToast(toast, options) : false;
  }

  done(id: string, options: ToastUpdate = {}) {
    const duration =
      options.duration ??
      this.config.defaults?.success?.duration ??
      this.config.defaults?.default?.duration ??
      this.config.duration ??
      this.#containerDuration() ??
      3000;
    return this.update(id, {
      type: "success",
      progress: 1,
      ...options,
      duration,
    });
  }

  clearQueue() {
    const queued = this.toasts.filter((toast) => toast.queued);
    for (const toast of queued) toast.removeImmediately("discarded");
    return queued.length;
  }

  isActive(id: string) {
    return this.toasts.some((toast) => toast.id === id && !toast.closing);
  }

  getActive() {
    return this.toasts
      .filter((toast) => !toast.closing)
      .map((toast) => toast.snapshot());
  }

  getHistory(): ToastSnapshot[] {
    return this.history.map((snapshot) => ({
      ...snapshot,
      ...(snapshot.data ? { data: { ...snapshot.data } } : {}),
    }));
  }
  expand() {
    for (const toast of this.toasts) toast.setExpanded();
    this.isToastsExpanded = true;
  }

  collapse() {
    for (const toast of this.toasts) toast.setCollapsed();
    this.isToastsExpanded = false;
  }

  refresh() {
    if (this.destroyed) return;
    const containerPosition = this.positions;
    const isDarkTheme = this.isDarkTheme;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const groups = new Map<string, Toast[]>();

    for (const toast of this.toasts) {
      if (!toast.mounted || toast.closing) continue;
      const position = toast.options.position
        ? this.#getPosition(toast.options.position)
        : {
            xPosition: toast.options.xPosition ?? containerPosition.xPosition,
            yPosition: toast.options.yPosition ?? containerPosition.yPosition,
          };
      toast.setFront(false);
      toast.setXPosition(position.xPosition);
      toast.setYPosition(position.yPosition);
      const theme = toast.options.theme;
      toast.setTheme(
        theme === "dark" ||
          (theme === "system" && prefersDark) ||
          (theme == null && isDarkTheme)
          ? "dark"
          : "light",
      );
      const key = `${position.yPosition}-${position.xPosition}`;
      const group = groups.get(key);
      group ? group.push(toast) : groups.set(key, [toast]);
    }

    for (const chronological of groups.values()) {
      const overflow = this.config.overflow ?? "hide";
      const visible = new Set<Toast>();
      if (overflow === "queue") {
        chronological
          .slice(0, this.maxToasts)
          .forEach((toast) => visible.add(toast));
      } else {
        chronological
          .slice(-this.maxToasts)
          .forEach((toast) => visible.add(toast));
      }
      for (const toast of chronological) {
        if (overflow === "queue") toast.setQueued(!visible.has(toast));
        else if (visible.has(toast)) toast.show();
        else toast.hide();
      }

      const layout = chronological.filter((toast) => visible.has(toast));
      if (this.config.newestOnTop === false) layout.reverse();
      layout.forEach((toast, index) => toast.setIndex(layout.length - index));
      const front = layout.at(-1);
      if (!front) continue;
      let height = 0;
      let previousHeight = 0;
      for (let index = layout.length - 1; index >= 0; index--) {
        const toast = layout[index];
        if (!toast) continue;
        height += previousHeight;
        toast.setCollapsedHeight(front.height);
        toast.setSpaceAbove(height);
        previousHeight = toast.height + (this.config.dense ? 6 : 10);
      }
      front.setFront(true);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.#abortController.abort();
    this.resizeObserver.disconnect();
    for (const timer of this.#delayedMounts.values())
      window.clearTimeout(timer);
    this.#delayedMounts.clear();
    for (const toast of [...this.toasts]) toast.removeImmediately("destroy");
    this.toasts = [];
    this.onDestroy?.();
    this.onDestroy = null;
  }

  #resolveOptions(options: ToastOptions): ToastOptions {
    const typeDefaults =
      options.type === "promise" || options.type === "custom"
        ? undefined
        : this.config.defaults?.[options.type as StandardToastType];
    const resolved: ToastOptions = {
      ...this.config.defaults?.default,
      ...typeDefaults,
      ...options,
    };
    if (resolved.type === "loading" && resolved.duration == null) {
      resolved.duration = 0;
    }
    if (resolved.duration == null) {
      resolved.duration =
        this.config.duration ?? this.#containerDuration() ?? 0;
    }
    resolved.closeButton ??= this.config.closeButton ?? this.enableCloseButton;
    if (resolved.theme === undefined && this.config.theme !== undefined) {
      resolved.theme = this.config.theme;
    }
    if (resolved.position === undefined && this.config.position !== undefined) {
      resolved.position = this.config.position;
    }
    if (
      resolved.richColors === undefined &&
      this.config.richColors !== undefined
    ) {
      resolved.richColors = this.config.richColors;
    }
    resolved.useRichColors =
      resolved.richColors ??
      resolved.useRichColors ??
      this.container.getAttribute("rich-colors") === "true";
    if (resolved.unstyled === undefined) {
      resolved.unstyled =
        this.config.unstyled ?? this.container.hasAttribute("unstyled");
    }
    resolved.dismissible ??= true;
    resolved.pauseOnHover ??= true;
    resolved.swipeDirections ??= this.#defaultSwipeDirections(
      resolved.position ?? this.config.position ?? "bottom-right",
    );
    return resolved;
  }

  #findDuplicate(options: ToastOptions, active: ToastSnapshot[]) {
    const dedupe: ToastDedupe =
      options.dedupe === undefined
        ? (this.config.dedupe ?? false)
        : options.dedupe === true
          ? "message"
          : options.dedupe;
    if (dedupe === "message") {
      return (
        this.toasts.find(
          (toast) =>
            !toast.closing &&
            toast.options.message === options.message &&
            toast.options.type === options.type,
        )?.id ?? false
      );
    }
    if (typeof dedupe === "function") {
      try {
        return dedupe(Object.freeze({ ...options }), active);
      } catch (error) {
        reportConsumerError(error);
      }
    }
    return false;
  }

  #bindToast(toast: Toast) {
    toast.onUpdate = () => {
      if (toast.delayed && toast.promiseSettled) {
        toast.removeImmediately("discarded");
        return;
      }
      toast.updateHeight();
      this.refresh();
    };
    toast.onClose = (id, reason) => {
      const timer = this.#delayedMounts.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      this.#delayedMounts.delete(id);
      if (toast.contentElement)
        this.resizeObserver.unobserve(toast.contentElement);
      this.toasts = this.toasts.filter((candidate) => candidate.id !== id);
      this.#recordHistory(toast.snapshot());
      this.refresh();
      try {
        toast.options.onClose?.(id, reason);
      } catch (error) {
        reportConsumerError(error);
      }
    };
    toast.onRemove = (id, reason) => {
      try {
        toast.options.onRemove?.(id, reason);
      } catch (error) {
        reportConsumerError(error);
      }
    };
  }

  #mountToast(toast: Toast) {
    if (toast.closing || toast.mounted) return;
    this.container.appendChild(toast.element);
    toast.setMounted();
    toast.updateHeight();
    if (toast.contentElement) this.resizeObserver.observe(toast.contentElement);
    if (this.expandedByDefault) toast.setExpanded();
    else toast.setCollapsed();
    this.refresh();
  }

  #updateToast(toast: Toast, options: Partial<ToastOptions>) {
    const resolved = { ...options };
    if (resolved.richColors !== undefined) {
      resolved.useRichColors = resolved.richColors;
    }
    const previousContent = toast.contentElement;
    const updated = toast.update(resolved, options.duration !== undefined);
    if (!updated) return false;
    if (previousContent) this.resizeObserver.unobserve(previousContent);
    if (toast.contentElement && toast.mounted) {
      this.resizeObserver.observe(toast.contentElement);
    }
    this.refresh();
    return true;
  }

  #applyDiscardPolicy(newToast: Toast) {
    const overflow = this.config.overflow ?? "hide";
    if (overflow !== "discard-oldest" && overflow !== "discard-newest") {
      return false;
    }
    const position = this.#effectivePositionKey(newToast.options);
    const group = this.toasts.filter(
      (toast) => this.#effectivePositionKey(toast.options) === position,
    );
    if (group.length <= this.maxToasts) return false;
    if (overflow === "discard-newest") {
      newToast.removeImmediately("discarded");
      return true;
    }
    group[0]?.removeImmediately("discarded");
    return false;
  }

  #target(id: string | undefined, action: (toast: Toast) => boolean) {
    const targets =
      id === undefined
        ? [...this.toasts]
        : this.toasts.filter((toast) => toast.id === id);
    let changed = false;
    for (const toast of targets) changed = action(toast) || changed;
    return changed;
  }

  #recordHistory(snapshot: ToastSnapshot) {
    const limit = Math.max(0, this.config.historyLimit ?? 100);
    if (limit === 0) return;
    this.history.push(snapshot);
    if (this.history.length > limit) {
      this.history.splice(0, this.history.length - limit);
    }
  }

  #readMaxToasts() {
    const configured =
      this.config.maxToasts ??
      Number.parseInt(this.container.getAttribute("max-toasts") || "3", 10);
    return Number.isFinite(configured) && configured > 0 ? configured : 3;
  }

  #containerDuration() {
    const value = this.container.getAttribute("duration");
    if (value === null) return undefined;
    const duration = Number.parseInt(value, 10);
    return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
  }

  #getPosition(position: ToastPosition) {
    const [rawY, rawX] = position.split("-");
    const yPosition: "top" | "bottom" = rawY === "top" ? "top" : "bottom";
    const direction = getComputedStyle(this.container).direction;
    const logicalX =
      rawX === "start"
        ? direction === "rtl"
          ? "right"
          : "left"
        : rawX === "end"
          ? direction === "rtl"
            ? "left"
            : "right"
          : rawX;
    const xPosition: "left" | "right" | "center" =
      logicalX === "left" || logicalX === "center" ? logicalX : "right";
    return { xPosition, yPosition };
  }

  #effectivePositionKey(options: ToastOptions) {
    const position = options.position
      ? this.#getPosition(options.position)
      : {
          xPosition: options.xPosition ?? this.positions.xPosition,
          yPosition: options.yPosition ?? this.positions.yPosition,
        };
    return `${position.yPosition}-${position.xPosition}`;
  }

  #defaultSwipeDirections(position: ToastPosition): ToastSwipeDirection[] {
    const { xPosition, yPosition } = this.#getPosition(position);
    if (xPosition === "left") return ["left"];
    if (xPosition === "right") return ["right"];
    return [yPosition === "top" ? "up" : "down"];
  }

  #applyContainerConfig() {
    this.container.dataset.sonnerToaster = "";
    this.container.dataset.dense = this.config.dense ? "true" : "false";
    this.container.dataset.stack = this.expandedByDefault
      ? "expand"
      : "collapse";
    this.container.dataset.unstyled = this.config.unstyled ? "true" : "false";
    this.container.setAttribute(
      "aria-label",
      this.config.ariaLabel ??
        this.container.getAttribute("aria-label") ??
        "Notifications",
    );
  }

  #bindEvents() {
    const signal = this.#abortController.signal;
    this.container.addEventListener("mouseenter", () => this.#onMouseEnter(), {
      signal,
    });
    for (const type of ["mouseleave", "mouseout", "mousemove"] as const) {
      this.container.addEventListener(
        type,
        (event) => this.#onMouseOver(event),
        {
          signal,
        },
      );
    }
    this.container.addEventListener("focusin", () => this.#onFocusIn(), {
      signal,
    });
    this.container.addEventListener(
      "focusout",
      (event) => this.#onFocusOut(event),
      {
        signal,
      },
    );
    this.container.addEventListener(
      "keydown",
      (event) => this.#onKeyDown(event),
      {
        signal,
      },
    );
    document.addEventListener("keydown", (event) => this.#onHotkey(event), {
      signal,
    });
    document.addEventListener(
      "visibilitychange",
      () => {
        for (const toast of this.toasts) {
          document.hidden
            ? toast.pauseRemoval("visibility")
            : toast.resumeRemoval("visibility");
        }
      },
      { signal },
    );
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => this.refresh(), { signal });
  }

  #onMouseEnter() {
    if (!this.expandedByDefault) this.expand();
    for (const toast of this.toasts) {
      if (toast.options.pauseOnHover !== false) toast.pauseRemoval("pointer");
    }
  }

  #onMouseOver(event: MouseEvent) {
    const groups = new Map<
      string,
      { left: number; top: number; right: number; bottom: number }
    >();
    for (const toast of this.toasts) {
      if (!toast.mounted || toast.hidden) continue;
      const rect = toast.element.getBoundingClientRect();
      const key = `${toast.yPosition}-${toast.xPosition}`;
      const bounds = groups.get(key);
      if (bounds) {
        bounds.left = Math.min(bounds.left, rect.left);
        bounds.top = Math.min(bounds.top, rect.top);
        bounds.right = Math.max(bounds.right, rect.right);
        bounds.bottom = Math.max(bounds.bottom, rect.bottom);
      } else {
        groups.set(key, {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        });
      }
    }
    const inside = [...groups.values()].some(
      (bounds) =>
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom,
    );
    if (inside) return;
    if (!this.expandedByDefault) this.collapse();
    for (const toast of this.toasts) toast.resumeRemoval("pointer");
  }

  #onFocusIn() {
    if (!this.expandedByDefault) this.expand();
    for (const toast of this.toasts) toast.pauseRemoval("focus");
  }

  #onFocusOut(event: FocusEvent) {
    if (
      event.relatedTarget instanceof Node &&
      this.container.contains(event.relatedTarget)
    ) {
      return;
    }
    if (!this.expandedByDefault) this.collapse();
    for (const toast of this.toasts) toast.resumeRemoval("focus");
  }

  #onHotkey(event: KeyboardEvent) {
    const hotkey =
      this.config.hotkey === undefined ? "Alt+T" : this.config.hotkey;
    if (hotkey === false || !this.#matchesHotkey(event, hotkey)) return;
    event.preventDefault();
    this.#visibleToasts().at(-1)?.element.focus();
  }

  #onKeyDown(event: KeyboardEvent) {
    const visible = this.#visibleToasts();
    const current = visible.findIndex(
      (toast) => toast.element === document.activeElement,
    );
    if (current < 0) return;
    if (event.key === "Escape") {
      event.preventDefault();
      visible[current]?.dismiss("keyboard");
      return;
    }
    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    visible[
      (current + delta + visible.length) % visible.length
    ]?.element.focus();
  }

  #visibleToasts() {
    return this.toasts.filter(
      (toast) => toast.mounted && !toast.hidden && !toast.closing,
    );
  }

  #matchesHotkey(event: KeyboardEvent, hotkey: string) {
    const parts = hotkey
      .toLowerCase()
      .split("+")
      .map((part) => part.trim());
    const key = parts.at(-1);
    return (
      event.key.toLowerCase() === key &&
      event.altKey === parts.includes("alt") &&
      event.ctrlKey === parts.includes("ctrl") &&
      event.shiftKey === parts.includes("shift") &&
      event.metaKey === parts.includes("meta")
    );
  }

  #assertActive() {
    if (this.destroyed)
      throw new Error("This Vanilla Sonner toaster was destroyed.");
  }
}
