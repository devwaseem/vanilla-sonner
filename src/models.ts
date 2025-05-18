export interface ToastOptions {
    type: "plain" | "description" | "success" | "info" | "warning" | "error" | "action";
    message: string;
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
}