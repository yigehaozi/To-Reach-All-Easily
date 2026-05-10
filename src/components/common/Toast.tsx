import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, CheckCircle2, CircleAlert, X } from 'lucide-react';
import { setToastHandler, type ToastPayload, type ToastVariant } from '@/utils/toastBus';

interface ToastState {
  mounted: boolean;
  visible: boolean;
  message: string;
  variant: ToastVariant;
}

interface ToastAnchorRect {
  left: number;
  width: number;
}

const DEFAULT_DURATION = 2200;
const MAIN_SHELL_ID = 'onefour-main-shell';

export default function Toast() {
  const [toast, setToast] = useState<ToastState>({
    mounted: false,
    visible: false,
    message: '',
    variant: 'info',
  });
  const [anchorRect, setAnchorRect] = useState<ToastAnchorRect | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  const syncAnchorPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mainShell = document.getElementById(MAIN_SHELL_ID);
    if (!mainShell) {
      setAnchorRect(null);
      return;
    }

    const rect = mainShell.getBoundingClientRect();
    setAnchorRect({
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    setToast((prev) => ({ ...prev, visible: false }));
    unmountTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, mounted: false }));
    }, 180);
  }, [clearTimers]);

  const show = useCallback((payload: string | ToastPayload) => {
    clearTimers();
    const normalized =
      typeof payload === 'string'
        ? { message: payload, variant: 'info' as const, duration: DEFAULT_DURATION }
        : {
            message: payload.message,
            variant: payload.variant ?? 'info',
            duration: payload.duration ?? DEFAULT_DURATION,
          };

    setToast({
      mounted: true,
      visible: false,
      message: normalized.message,
      variant: normalized.variant,
    });

    requestAnimationFrame(() => {
      setToast((prev) => ({ ...prev, visible: true }));
    });

    hideTimerRef.current = window.setTimeout(() => {
      hide();
    }, normalized.duration);
  }, [clearTimers, hide]);

  useEffect(() => {
    setToastHandler(show);
    return () => {
      setToastHandler(null);
      clearTimers();
    };
  }, [clearTimers, show]);

  useEffect(() => {
    syncAnchorPosition();

    if (typeof window === 'undefined') {
      return;
    }

    const mainShell = document.getElementById(MAIN_SHELL_ID);
    const handleResize = () => {
      syncAnchorPosition();
    };

    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (mainShell && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        syncAnchorPosition();
      });
      observer.observe(mainShell);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [syncAnchorPosition]);

  if (!toast.mounted) return null;

  const Icon = toast.variant === 'success' ? CheckCircle2 : toast.variant === 'error' ? CircleAlert : Bell;
  const iconClassName =
    toast.variant === 'success'
      ? 'text-emerald-500'
      : toast.variant === 'error'
        ? 'text-red-500'
        : 'text-[var(--toast-icon)]';

  return (
    <div
      className="pointer-events-none fixed top-6 z-[2000] px-4"
      style={
        anchorRect
          ? {
              left: `${anchorRect.left}px`,
              width: `${anchorRect.width}px`,
            }
          : {
              left: '0px',
              width: '100vw',
            }
      }
    >
      <div
        className={`mx-auto flex w-fit max-w-full transition-[opacity,transform] duration-200 ease-out ${
          toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex min-h-12 items-center gap-3 rounded-[6px] border border-[var(--toast-border)] bg-[var(--toast-bg)] px-4 py-3 text-[13px] text-[var(--toast-text)] shadow-[var(--toast-shadow)] backdrop-blur-sm">
          <Icon size={18} className={`shrink-0 ${iconClassName}`} strokeWidth={1.9} />
          <span className="min-w-0 max-w-[min(60vw,320px)] truncate font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={hide}
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] text-[var(--toast-close)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--toast-text)]"
            aria-label="关闭通知"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
