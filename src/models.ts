export type ToastType =
  | "plain"
  | "description"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "loading"
  | "promise"
  | "custom";

export type StandardToastType = Exclude<ToastType, "promise" | "custom">;

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "top-start"
  | "top-end"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "bottom-start"
  | "bottom-end";

export type ToastTheme = "light" | "dark" | "system";
export type ToastSwipeDirection = "left" | "right" | "up" | "down";
export type ToastOverflow =
  | "hide"
  | "queue"
  | "discard-oldest"
  | "discard-newest";
export type ToastCloseReason =
  | "timeout"
  | "close-button"
  | "action"
  | "programmatic"
  | "swipe"
  | "click"
  | "keyboard"
  | "destroy"
  | "discarded";
export type ToastState = "delayed" | "queued" | "visible" | "closing";

export type ToastAction = {
  label: string;
  onClick: (id: string) => void | false | Promise<void | false>;
};

export interface ToastConfig {
  id?: string;
  toasterId?: string;
  action?: ToastAction;
  duration?: number;
  delay?: number;
  closeButton?: boolean;
  theme?: ToastTheme;
  position?: ToastPosition;
  richColors?: boolean;
  important?: boolean;
  progress?: number;
  dismissible?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  swipeDirections?: ToastSwipeDirection[];
  swipeThreshold?: number;
  unstyled?: boolean;
  dedupe?: boolean | "message";
  data?: Record<string, unknown>;
  onClose?: (id: string, reason: ToastCloseReason) => void;
  onRemove?: (id: string, reason: ToastCloseReason) => void;
}

export interface ToastUpdate extends ToastConfig {
  message?: string;
  description?: string;
  type?: StandardToastType;
}

export type ToastPromiseResult = string | ToastUpdate;

export interface ToastPromiseMessages<T> {
  loading: ToastPromiseResult;
  success: ToastPromiseResult | ((value: T) => ToastPromiseResult);
  error: ToastPromiseResult | ((error: unknown) => ToastPromiseResult);
}

export interface ToastOptions extends ToastConfig {
  type: ToastType;
  message?: string;
  description?: string;
  xPosition?: "left" | "right" | "center";
  yPosition?: "top" | "bottom";
  useRichColors?: boolean;
  template_id?: string;
  toastData?: Record<string, string>;
  promiseOptions?: {
    promise: Promise<unknown>;
    successResult: (value: unknown) => ToastPromiseResult;
    errorResult: (error: unknown) => ToastPromiseResult;
  };
}

export interface ToastSnapshot {
  id: string;
  type: ToastType;
  message?: string;
  description?: string;
  position?: ToastPosition;
  progress?: number;
  state: ToastState;
  createdAt: number;
  closedAt?: number;
  closeReason?: ToastCloseReason;
  data?: Readonly<Record<string, unknown>>;
}

export type ToastDedupe =
  | false
  | "message"
  | ((
      next: Readonly<ToastOptions>,
      active: readonly ToastSnapshot[],
    ) => string | false);

export interface ToasterConfig {
  id?: string;
  maxToasts?: number;
  overflow?: ToastOverflow;
  position?: ToastPosition;
  duration?: number;
  closeButton?: boolean;
  theme?: ToastTheme;
  richColors?: boolean;
  expanded?: boolean;
  stack?: "expand" | "collapse";
  newestOnTop?: boolean;
  dense?: boolean;
  unstyled?: boolean;
  hotkey?: string | false;
  ariaLabel?: string;
  historyLimit?: number;
  dedupe?: ToastDedupe;
  defaults?: Partial<Record<StandardToastType | "default", ToastConfig>>;
  beforeCreate?: (
    next: Readonly<ToastOptions>,
    active: readonly ToastSnapshot[],
  ) => ToastOptions | false;
}

export interface ToastAPI {
  (message: string, config?: ToastConfig): string;
  message(title: string, description: string, config?: ToastConfig): string;
  info(message: string, config?: ToastConfig): string;
  success(message: string, config?: ToastConfig): string;
  warning(message: string, config?: ToastConfig): string;
  error(message: string, config?: ToastConfig): string;
  loading(message: string, config?: ToastConfig): string;
  promise<T>(
    promise: Promise<T>,
    messages: ToastPromiseMessages<T>,
    config?: ToastConfig,
  ): Promise<T>;
  custom(
    templateId: string,
    data: Record<string, string>,
    config?: ToastConfig,
  ): string;
  update(id: string, options: ToastUpdate): boolean;
  done(id: string, options?: ToastUpdate): boolean;
  dismiss(id?: string): boolean;
  remove(id?: string): boolean;
  pause(id?: string): boolean;
  resume(id?: string): boolean;
  clearQueue(): number;
  isActive(id: string): boolean;
  getActive(): ToastSnapshot[];
  getHistory(): ToastSnapshot[];
  configure(config: Partial<ToasterConfig>): void;
  destroy(): void;
  for(toasterId: string): ToastAPI;
}
