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
