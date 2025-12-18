import { mkdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(distDir, { recursive: true });

  const esJs = join(distDir, "vanilla-sonner.es.min.js");
  const esMjs = join(distDir, "vanilla-sonner.es.min.mjs");
  if (await fileExists(esJs)) {
    await copyFile(esJs, esMjs);
  } else if (!(await fileExists(esMjs))) {
    throw new Error(`Missing ESM build output: ${esJs}`);
  }

  const css = join(distDir, "vanilla-sonner.css");
  if (!(await fileExists(css))) {
    throw new Error(`Missing CSS build output: ${css}`);
  }
  const cssMin = join(distDir, "vanilla-sonner.min.css");
  if (!(await fileExists(cssMin))) {
    await copyFile(css, cssMin);
  }

  const dts = join(distDir, "index.d.ts");
  const dtsContents = `export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastConfig = {
  action?: ToastAction;
  duration?: number;
};

export type ToastPromiseMessages = {
  loading: string;
  success: string;
  error: string;
};

export type ToastOptions = {
  type:
    | "plain"
    | "description"
    | "success"
    | "info"
    | "warning"
    | "error"
    | "action"
    | "promise"
    | "custom";
  message?: string;
  theme?: "light" | "dark";
  description?: string;
  xPosition?: "left" | "right" | "center";
  yPosition?: "top" | "bottom";
  duration?: number;
  useRichColors?: boolean;
  action?: ToastAction;
  closeButton?: boolean;
  template_id?: string;
  toastData?: Record<string, string>;
  promiseOptions?: {
    promise: Promise<any>;
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
  };
  onClose?: (id: string) => void;
  onRemove?: (id: string) => void;
};

export declare class Toaster {
  toasts: unknown[];
  container: HTMLElement;
  maxToasts: number;
  expandedByDefault: boolean;
  enableCloseButton: boolean;
  isToastsExpanded: boolean;

  constructor();
  get isDarkTheme(): boolean;
  get positions(): { xPosition: string; yPosition: string };
  create(options: ToastOptions): void;
  expand(): void;
  collapse(): void;
  refresh(): void;
}

export type ToastFn = {
  (message: string, config?: ToastConfig): void;
  message: (title: string, description: string, config?: ToastConfig) => void;
  info: (message: string, config?: ToastConfig) => void;
  success: (message: string, config?: ToastConfig) => void;
  warning: (message: string, config?: ToastConfig) => void;
  error: (message: string, config?: ToastConfig) => void;
  promise: <T>(
    promise: Promise<T>,
    message: ToastPromiseMessages,
    config?: ToastConfig
  ) => void;
  custom: (
    template_id: string,
    data: Record<string, string>,
    config?: ToastConfig
  ) => void;
};

export declare const toast: ToastFn;

declare global {
  interface Window {
    toast: ToastFn;
  }
}
`;

  // Avoid rewriting if contents are unchanged (keeps tarballs stable).
  const prev = (await fileExists(dts)) ? await readFile(dts, "utf8") : null;
  if (prev !== dtsContents) {
    await writeFile(dts, dtsContents, "utf8");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
