export interface ToastOptions {
    mode: "plain" | "description" | "success" | "info" | "warning" | "error" | "action";
    message: string;
    description?: string;
    xPosition?: string;
    yPosition?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    }
    closeButton?: boolean;
}