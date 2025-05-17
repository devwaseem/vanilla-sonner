import { ToastOptions } from './models';
import { descriptionTemplate, buildTemplate } from './templates';

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

  isFront: boolean;
  index: number;

  constructor(options: ToastOptions) {
    this.id = `toast-${Math.random().toString(26).substring(4)}-${Date.now()}`;
    this.options = options;

    this.toast = document.createElement("div");
    this.xPosition = options.xPosition || "right";
    this.yPosition = options.yPosition || "bottom";
    this.#setup();

    this.timeStarted = Date.now();
    this.removalTimer = null;
    this.lastRemovalPaused = Date.now();
    this.duration = options.duration || 5000;
    this.remainingTimeToRemove = this.duration;
    this.height = 0;
    this.onRemove = null;
  }

  get element() {
    return this.toast;
  }

  updateHeight() {
    this.height = this.toast.getBoundingClientRect().height;
  }

  #setup() {

    if (this.options.mode == "plain") {
      this.#setupPlainToast();
    } else if (this.options.mode == "description") {
      this.#setupDescriptionToast();
    }

    this.toast.dataset.sonnerToast = "";
    this.toast.dataset.theme = "light";
    this.toast.dataset.mounted = "false";
    this.toast.dataset.removed = "false"
    this.toast.dataset.expanded = "false"
    this.toast.dataset.xPosition = this.xPosition;
    this.toast.dataset.yPosition = this.yPosition;
  }

  setCollapsedHeight(height: number) {
    this.toast.style.setProperty("--collapsed-height", `${height}px`);
  }

  #setupPlainToast() {
    this.toast.innerHTML = `
      <li data-toast-plain>
      ${this.options.message}
      </li>
    `
  }

  #setupDescriptionToast() {
    this.toast.innerHTML = buildTemplate(descriptionTemplate, {
      title: this.options.message,
      description: this.options.description || "",
    })
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

  revive() {
    this.toast.dataset.removed = "false";
  }

  setLeaving() {
    this.toast.dataset.removed = "true";
  }

  setMounted() {
    setTimeout(() => {
      this.toast.dataset.mounted = "true";
    }, 10);
    this.#setupRemoval();
  }

  setSpaceAbove(value: number) {
    this.element.style.setProperty("--space-above", `${value}px`);
  }

  setExpanded() {
    this.toast.dataset.expanded = "true";
    this.pauseRemoval();
  }

  setCollapsed() {
    this.toast.dataset.expanded = "false";
    if (!this.removalTimer) {
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
    this.remainingTimeToRemove = Math.max(0, this.remainingTimeToRemove - (Date.now() - this.timeStarted));
  }

  resumeRemoval() {
    this.removalTimer = setTimeout(() => {
      this.remove();
      this.removalTimer = null;
    }, this.remainingTimeToRemove! + 1000);
    this.timeStarted = Date.now();
  }

  remove() {
    this.setLeaving();
    setTimeout(() => {
      this.element.remove();
      if (this.onRemove) {
        this.onRemove(this.toast.id);
      }
    }, 3000);
  }
}
