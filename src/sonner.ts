import "./style.scss";
import { Toaster } from "./toaster";

let _toaster: Toaster | undefined;

document.addEventListener("DOMContentLoaded", () => {
  _toaster = new Toaster();
});

interface ToastConfig {
  action?: { label: string; onClick: () => void };
  duration?: number;
}

function toast(message: string, config: ToastConfig = {}) {
  _toaster?.create({
    message: message,
    type: "plain",
    action: config.action,
    duration: config.duration,
  });
}

toast.message = function (
  title: string,
  description: string,
  config: ToastConfig = {},
) {
  _toaster?.create({
    type: "description",
    message: title,
    description,
    action: config.action,
    duration: config.duration,
  });
};

toast.info = function (message: string, config: ToastConfig = {}) {
  _toaster?.create({
    type: "info",
    message,
    action: config.action,
    duration: config.duration,
  });
};

toast.success = function (message: string, config: ToastConfig = {}) {
  _toaster?.create({
    type: "success",
    message,
    action: config.action,
    duration: config.duration,
  });
};

toast.warning = function (message: string, config: ToastConfig = {}) {
  _toaster?.create({
    type: "warning",
    message,
    action: config.action,
    duration: config.duration,
  });
};

toast.error = function (message: string, config: ToastConfig = {}) {
  _toaster?.create({
    type: "error",
    message,
    action: config.action,
    duration: config.duration,
  });
};

toast.promise = function (
  promise: Promise<any>,
  message: {
    loading: string;
    success: string;
    error: string;
  },
  config: ToastConfig = {},
) {
  _toaster?.create({
    type: "promise",
    promiseOptions: {
      promise,
      loadingMessage: message.loading,
      successMessage: message.success,
      errorMessage: message.error,
    },
    action: config.action,
    duration: config.duration,
  });
};

toast.custom = function (
  template_id: string,
  data: Record<string, string>,
  config: ToastConfig = {},
) {
  _toaster?.create({
    type: "custom",
    toastData: data,
    template_id,
    duration: config.duration,
  });
};

declare global {
  interface Window {
    toast: (message: string) => void;
  }
}

window.toast = toast;

export { Toaster, toast };
