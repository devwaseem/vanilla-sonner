export interface ToastOptions {
    type: "plain" | "description" | "success" | "info" | "warning" | "error" | "action" | "promise" | "custom";
    message?: string;
    theme?: "light" | "dark";
    description?: string;
    xPosition?: "left" | "right" | "center";
    yPosition?: "top" | "bottom";
    duration?: number;
    useRichColors?: boolean;
    action?: {
        label: string;
        onClick: () => void;
    }
    closeButton?: boolean;
    template_id?: string;
    toastData?: Record<string, string>;
    promiseOptions?: {
        promise: Promise<any>;
        initialMessage?: string;
        successMessage?: string;
        errorMessage?: string;
    }
    onClose?: (id: string) => void;
    onRemove?: (id: string) => void;
}