export default class Toast {
  constructor(options) {
    this.id = options.id;
    this.message = options.message;

    this.toast = document.createElement("div");
    this.xPosition = options.xPosition || "right";
    this.yPosition = options.yPosition || "bottom";
    this.#setup();

    this.removalTimer = null;
    this.lastRemovalPaused = Date.now();
    this.duration = options.duration || 5000;
    this.remainingTimeToRemove = null;
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
    this.toast.innerHTML = `
      <li>
      ${this.message}
      </li>
    `;

    this.toast.dataset.sonnerToast = "";
    this.toast.dataset.theme = "light";
    this.toast.dataset.mounted = false;
    this.toast.dataset.visible = false;
    this.toast.dataset.xPosition = this.xPosition;
    this.toast.dataset.yPosition = this.yPosition;
    this.setCollapsed();
  }

  setFront(value) {
    this.isFront = value;
    this.toast.dataset.front = value;
  }

  setXPosition(xPosition) {
    this.xPosition = xPosition;
    this.toast.dataset.xPosition = xPosition;
  }

  setYPosition(yPosition) {
    this.yPosition = yPosition;
    this.toast.dataset.yPosition = yPosition;
  }

  setIndex(index) {
    this.index = index;
    this.element.style.setProperty("--index", index);
  }

  revive() {
    this.toast.dataset.removed = false;
  }

  setLeaving() {
    this.toast.dataset.removed = true;
  }

  setMounted() {
    setTimeout(() => {
      this.toast.dataset.mounted = true;
    }, 0);
    this.#setupRemoval();
  }

  setSpaceAbove(value) {
    this.element.style.setProperty("--space-above", `${value}px`);
  }

  setExpanded(spaceAbove) {
    this.toast.dataset.expanded = true;
    // this.pauseRemoval();
  }

  setCollapsed() {
    this.toast.dataset.expanded = false;
    // this.resumeRemoval();
  }

  #setupRemoval() {
    this.removalTimer = setTimeout(() => {
      this.remove();
      this.removalTimer = null;
    }, this.duration);
  }

  pauseRemoval() {
    if (!this.removalTimer) {
      return;
    }
    clearTimeout(this.removalTimer);
    this.removalTimer = null;

    this.lastRemovalPaused = Date.now();
    this.remainingTimeToRemove = this.duration - elapsedTime;
    console.log(this.remainingTimeToRemove);
  }

  resumeRemoval() {
    if (!this.remainingTimeToRemove) {
      return;
    }
    this.removalTimer = setTimeout(() => {
      this.remove();
    }, this.remainingTimeToRemove);
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
