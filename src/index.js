import { Toaster } from "./toaster";

const toaster = new Toaster();

function toast(options) {
  toaster.create({
    ...options,
  });
}

window.toast = toast;

export { Toaster, toaster, toast };
