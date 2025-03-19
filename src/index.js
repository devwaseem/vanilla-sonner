import { Toaster } from "./toaster.js";

const toaster = new Toaster();

function toast(options) {
  toaster.create({
    ...options,
  });
}

toast.hello = function () {
  alert("hello");
};

window.toast = toast;
