export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastPayload {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

let toastHandler: ((payload: string | ToastPayload) => void) | null = null;

export function setToastHandler(handler: ((payload: string | ToastPayload) => void) | null) {
  toastHandler = handler;
}

export function showToast(payload: string | ToastPayload) {
  toastHandler?.(payload);
}
