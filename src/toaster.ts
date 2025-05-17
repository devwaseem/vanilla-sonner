import Toast from "./toast.js";
import { ToastOptions } from './models';


export class Toaster {

  toasts: Toast[];
  container: HTMLElement;
  maxToasts: number;
  expandedByDefault: boolean;

  constructor() {
    this.toasts = [];
    const _container = document.getElementById("sonner-toast-container");
    if (!_container) {
      throw new Error("No container found");
    }
    this.container = _container;
    this.maxToasts = parseInt(this.container.getAttribute("max-toasts") || "3");

    let expanded = this.container.getAttribute("expanded") || "false";
    this.expandedByDefault = expanded == "true";
    if (!this.expandedByDefault) {
      this.container.addEventListener(
        "mouseenter",
        this.#onMouseEnter.bind(this)
      );
      this.container.addEventListener(
        "mouseleave",
        this.#onMouseLeave.bind(this)
      );
    }
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
    if (this.toasts.length >= this.maxToasts) {
      const oldToast = this.toasts.shift();
      if (oldToast) {
        oldToast.setLeaving();
      }
    }

    const container = this.container;
    const { xPosition, yPosition } = this.positions;
    const toast = new Toast({
      ...options,
      xPosition,
      yPosition,
    });

    container.appendChild(toast.element);


    this.toasts.push(toast);

    this.toasts.forEach((toast, index) => {
      toast.setFront(false);
      toast.setIndex(this.toasts.length - index);
    });

    toast.updateHeight();
    let height = 0;
    let lastElementHeight = 0;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      height += lastElementHeight;
      const existingToast = this.toasts[i];
      existingToast.setCollapsedHeight(toast.height);
      existingToast.setSpaceAbove(height);
      lastElementHeight = existingToast.height + 10;
    }

    if (this.expandedByDefault) {
      toast.setExpanded();
    }

    toast.setFront(true);
    toast.setMounted();
    toast.onRemove = (id) => {
      this.toasts = this.toasts.filter((toast) => toast.id != id);
    }
  }

  #onMouseEnter(_event: MouseEvent) {
    for (const toast of this.toasts) {
      toast.setExpanded();
    }
  }

  #onMouseLeave(_event: MouseEvent) {
    for (const toast of this.toasts) {
      toast.setCollapsed();
    }
  }
}
