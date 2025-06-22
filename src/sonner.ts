import "./style.scss";
import { ToastOptions } from "./models";
import { Toaster } from "./toaster";

let _toaster: Toaster | undefined;

document.addEventListener("DOMContentLoaded", () => {
  _toaster = new Toaster();
});

function toast(
  message: string,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    message: message,
    type: "plain",
    duration
  });
}

toast.message = function (
  title: string,
  description: string,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "description",
    message: title,
    description,
    duration
  });
};

toast.info = function (
  message: string,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "info",
    message,
    duration
  });
};

toast.success = function (
  message: string,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "success",
    message,
    duration
  });
};

toast.warning = function (
  message: string,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "warning",
    message,
    duration
  });
};

toast.error = function (
  message: string,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "error",
    message,
    duration
  });
};

toast.promise = function (
  promise: Promise<any>,
  message: {
    initial: string,
    success: string,
    error: string
  },
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "promise",
    promiseOptions: {
      promise,
      initialMessage: message.initial,
      successMessage: message.success,
      errorMessage: message.error,
    },
    duration
  });
};

toast.custom = function (
  template_id: string,
  data: Record<string, string>,
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "custom",
    toastData: data,
    template_id,
    duration
  });
};

toast.action = function (
  message: string,
  action: { label: string; onClick: () => void },
  duration: number | undefined = undefined
) {
  _toaster?.create({
    type: "action",
    message,
    action,
    duration,
  });
};

declare global {
  interface Window {
    toast: (message: string) => void;
  }
}

window.toast = toast;

export { Toaster, toast };
