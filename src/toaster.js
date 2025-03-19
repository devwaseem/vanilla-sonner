import Toast from "./toast.js";

export class Toaster {
  constructor() {
    this.toasts = [];
    this.container = document.getElementById("sonner-toast-container");

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

  create(options) {
    if (this.toasts.length >= this.maxToasts) {
      const oldToast = this.toasts.shift();
      oldToast.setLeaving();
    }

    const container = this.container;
    const { xPosition, yPosition } = this.positions;
    const toast = new Toast({
      message: options.message,
      xPosition,
      yPosition,
    });

    container.appendChild(toast.element);
    toast.updateHeight();

    this.toasts.push(toast);

    this.toasts.forEach((toast, index) => {
      toast.setFront(false);
      toast.setIndex(this.toasts.length - index);
      toast.setXPosition(xPosition);
      toast.setYPosition(yPosition);
    });

    let height = 0;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const existingToast = this.toasts[i];
      existingToast.setSpaceAbove(height);
      height += toast.height;
    }

    if (this.expandedByDefault) {
      toast.setExpanded();
    }

    toast.setFront(true);
    toast.setMounted();
  }

  #onMouseEnter(event) {
    for (const toast of this.toasts) {
      toast.setExpanded();
    }
  }

  #onMouseLeave(event) {
    for (const toast of this.toasts) {
      toast.setCollapsed();
    }
  }
}
