import { Toaster } from "./toaster.js";

const toaster = new Toaster();

function toast(options) {
  toaster.create({
    ...options,
  });
}

window.toast = toast;

export { Toaster, toaster, toast };
