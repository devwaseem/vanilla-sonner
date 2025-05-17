import { ToastOptions } from "./models";
import { Toaster } from "./toaster";

const toaster = new Toaster();

function toast(message: string) {
  toaster.create({
    message: message,
    mode: "plain",
  });
}

toast.custom = function (options: ToastOptions) {
  toaster.create(options);
};

toast.message = function (title: string, description: string) {
  toaster.create({
    mode: "description",
    message: title,
    description,
  });
};

toast.info = function (message: string) {
  toaster.create({
    mode: "info",
    message,
  })
}

toast.success = function (message: string) {
  toaster.create({
    mode: "success",
    message,
  })
}

toast.warning = function (message: string) {
  toaster.create({
    mode: "warning",
    message,
  })
}

toast.error = function (message: string) {
  toaster.create({
    mode: "error",
    message,
  })
}




declare global {
  interface Window {
    toast: (message: string) => void;
  }
}

window.toast = toast;

toast("Hello World");
toast("Hello World Again!");
toast.message("Hello World", "This is a description");

export { Toaster, toaster, toast };
