import { Toaster } from "./toaster";
import type { ToastConfig } from "./models";

let toaster: Toaster | undefined;

function getToaster() {
  toaster ??= new Toaster();
  return toaster;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", getToaster, { once: true });
  } else {
    getToaster();
  }
}

function toast(message: string, config: ToastConfig = {}) {
  getToaster().create({
    message: message,
    type: "plain",
    ...config,
  });
}

toast.message = function (
  title: string,
  description: string,
  config: ToastConfig = {},
) {
  getToaster().create({
    type: "description",
    message: title,
    description,
    ...config,
  });
};

toast.info = function (message: string, config: ToastConfig = {}) {
  getToaster().create({
    type: "info",
    message,
    ...config,
  });
};

toast.success = function (message: string, config: ToastConfig = {}) {
  getToaster().create({
    type: "success",
    message,
    ...config,
  });
};

toast.warning = function (message: string, config: ToastConfig = {}) {
  getToaster().create({
    type: "warning",
    message,
    ...config,
  });
};

toast.error = function (message: string, config: ToastConfig = {}) {
  getToaster().create({
    type: "error",
    message,
    ...config,
  });
};

toast.promise = function (
  promise: Promise<unknown>,
  message: {
    loading: string;
    success: string;
    error: string;
  },
  config: ToastConfig = {},
) {
  getToaster().create({
    type: "promise",
    promiseOptions: {
      promise,
      loadingMessage: message.loading,
      successMessage: message.success,
      errorMessage: message.error,
    },
    ...config,
  });
};

toast.custom = function (
  template_id: string,
  data: Record<string, string>,
  config: ToastConfig = {},
) {
  getToaster().create({
    type: "custom",
    toastData: data,
    template_id,
    ...config,
  });
};

declare global {
  interface Window {
    toast: typeof toast;
  }
}

if (typeof window !== "undefined") {
  window.toast = toast;
}

export { Toaster, toast };
export type { ToastAction, ToastConfig, ToastOptions } from "./models";
