import "./style.scss";
import { ToastOptions } from "./models";
import { Toaster } from "./toaster";

let _toaster: Toaster | undefined;

document.addEventListener("DOMContentLoaded", () => {
  _toaster = new Toaster();
});

function toast(message: string) {
  _toaster?.create({
    message: message,
    type: "plain",
  });
}

toast.custom = function (options: ToastOptions) {
  _toaster?.create(options);
};

toast.message = function (title: string, description: string) {
  _toaster?.create({
    type: "description",
    message: title,
    description,
  });
};

toast.info = function (message: string) {
  _toaster?.create({
    type: "info",
    message,
  });
};

toast.success = function (message: string) {
  _toaster?.create({
    type: "success",
    message,
  });
};

toast.warning = function (message: string) {
  _toaster?.create({
    type: "warning",
    message,
  });
};

toast.error = function (message: string) {
  _toaster?.create({
    type: "error",
    message,
  });
};

declare global {
  interface Window {
    toast: (message: string) => void;
  }
}

window.toast = toast;

export { Toaster, toast };
