import { Toaster } from "./toaster";
import type {
  ToastAPI,
  ToastConfig,
  ToasterConfig,
  ToastOptions,
  ToastPromiseMessages,
  ToastPromiseResult,
  ToastUpdate,
} from "./models";

let defaultToaster: Toaster | undefined;
let defaultConfig: ToasterConfig = {};
const namedToasters = new Map<string, { toaster: Toaster; api: ToastAPI }>();

function requireBrowser() {
  if (typeof document === "undefined") {
    throw new Error("Vanilla Sonner toast creation requires a browser DOM.");
  }
}

function getDefaultToaster() {
  requireBrowser();
  defaultToaster ??= new Toaster("#sonner-toast-container", defaultConfig);
  return defaultToaster;
}

function getNamedToaster(id: string) {
  const entry = namedToasters.get(id);
  if (!entry) throw new Error(`Vanilla Sonner toaster not found: ${id}`);
  return entry.toaster;
}

function normalizePromiseResult(result: ToastPromiseResult) {
  return typeof result === "string" ? { message: result } : result;
}

function createFacade(resolveToaster: () => Toaster): ToastAPI {
  const resolveFor = (config?: ToastConfig) =>
    config?.toasterId ? getNamedToaster(config.toasterId) : resolveToaster();

  const api = ((message: string, config: ToastConfig = {}) =>
    resolveFor(config).create({
      message,
      type: "plain",
      ...config,
    })) as ToastAPI;

  api.message = (title, description, config = {}) =>
    resolveFor(config).create({
      type: "description",
      message: title,
      description,
      ...config,
    });
  api.info = (message, config = {}) =>
    resolveFor(config).create({ type: "info", message, ...config });
  api.success = (message, config = {}) =>
    resolveFor(config).create({ type: "success", message, ...config });
  api.warning = (message, config = {}) =>
    resolveFor(config).create({ type: "warning", message, ...config });
  api.error = (message, config = {}) =>
    resolveFor(config).create({ type: "error", message, ...config });
  api.loading = (message, config = {}) =>
    resolveFor(config).create({
      type: "loading",
      message,
      duration: 0,
      ...config,
    });
  api.promise = <T>(
    promise: Promise<T>,
    messages: ToastPromiseMessages<T>,
    config: ToastConfig = {},
  ) => {
    const loading = normalizePromiseResult(messages.loading);
    const success = messages.success;
    const error = messages.error;
    resolveFor(config).create({
      ...loading,
      ...config,
      type: "promise",
      promiseOptions: {
        promise,
        successResult:
          typeof success === "function"
            ? (value) => success(value as T)
            : () => success,
        errorResult: typeof error === "function" ? error : () => error,
      },
    });
    return promise;
  };
  api.custom = (templateId, data, config = {}) =>
    resolveFor(config).create({
      type: "custom",
      toastData: data,
      template_id: templateId,
      ...config,
    });
  api.update = (id, options) => resolveToaster().update(id, options);
  api.done = (id, options) => resolveToaster().done(id, options);
  api.dismiss = (id) => resolveToaster().dismiss(id);
  api.remove = (id) => resolveToaster().remove(id);
  api.pause = (id) => resolveToaster().pause(id);
  api.resume = (id) => resolveToaster().resume(id);
  api.clearQueue = () => resolveToaster().clearQueue();
  api.isActive = (id) => resolveToaster().isActive(id);
  api.getActive = () => resolveToaster().getActive();
  api.getHistory = () => resolveToaster().getHistory();
  api.configure = (config) => resolveToaster().configure(config);
  api.destroy = () => resolveToaster().destroy();
  api.for = (id) => {
    const entry = namedToasters.get(id);
    if (!entry) throw new Error(`Vanilla Sonner toaster not found: ${id}`);
    return entry.api;
  };
  return api;
}

const toast = createFacade(getDefaultToaster);

const originalConfigure = toast.configure;
toast.configure = (config: Partial<ToasterConfig>) => {
  defaultConfig = {
    ...defaultConfig,
    ...config,
    defaults: { ...defaultConfig.defaults, ...config.defaults },
  };
  if (defaultToaster) originalConfigure(config);
};

toast.destroy = () => {
  defaultToaster?.destroy();
  defaultToaster = undefined;
};

function createToaster(
  target: string | HTMLElement,
  config: ToasterConfig = {},
): ToastAPI {
  requireBrowser();
  const toaster = new Toaster(target, config);
  let api: ToastAPI;
  api = createFacade(() => toaster);
  const id = config.id ?? toaster.container.id;
  if (id) {
    const existing = namedToasters.get(id);
    if (existing && existing.toaster !== toaster) {
      toaster.destroy();
      throw new Error(`Vanilla Sonner toaster already exists: ${id}`);
    }
    namedToasters.set(id, { toaster, api });
    toaster.onDestroy = () => {
      if (namedToasters.get(id)?.toaster === toaster) namedToasters.delete(id);
    };
  }
  return api;
}

declare global {
  interface Window {
    toast: ToastAPI;
  }
}

if (typeof window !== "undefined") window.toast = toast;

export { createToaster, Toaster, toast };
export type {
  StandardToastType,
  ToastAction,
  ToastAPI,
  ToastCloseReason,
  ToastConfig,
  ToastDedupe,
  ToastOptions,
  ToastOverflow,
  ToastPosition,
  ToastPromiseMessages,
  ToastPromiseResult,
  ToastSnapshot,
  ToastState,
  ToastSwipeDirection,
  ToastTheme,
  ToastType,
  ToastUpdate,
  ToasterConfig,
} from "./models";
