export type ToastAction = {
  label: string;
  onClick: () => void | false;
};

export interface ToastConfig {
  action?: ToastAction;
  duration?: number;
}

export interface ToastOptions extends ToastConfig {
  type:
    | "plain"
    | "description"
    | "success"
    | "info"
    | "warning"
    | "error"
    | "promise"
    | "custom";
  message?: string;
  theme?: "light" | "dark";
  description?: string;
  xPosition?: "left" | "right" | "center";
  yPosition?: "top" | "bottom";
  useRichColors?: boolean;
  closeButton?: boolean;
  template_id?: string;
  toastData?: Record<string, string>;
  promiseOptions?: {
    promise: Promise<unknown>;
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
  };
  onClose?: (id: string) => void;
  onRemove?: (id: string) => void;
}
