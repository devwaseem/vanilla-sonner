export interface ToastOptions {
    mode: "plain" | "description" | "success" | "info" | "warning" | "error";
    message: string;
    description?: string;
    xPosition?: string;
    yPosition?: string;
    duration?: number;
}