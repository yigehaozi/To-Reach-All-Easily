import { Bell, Loader2, X } from 'lucide-react';

interface QueryCompletionNotificationPromptProps {
  loading?: boolean;
  onEnable: () => void;
  onClose: () => void;
}

export default function QueryCompletionNotificationPrompt({
  loading = false,
  onEnable,
  onClose,
}: QueryCompletionNotificationPromptProps) {
  return (
    <div className="mx-auto w-full max-w-[420px] animate-fade-in">
      <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-4 py-3 shadow-[var(--shadow-card)]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
          <Bell size={15} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-[0.01em] text-[var(--text-primary)]">
            ONEFOUR 查询完成时接收通知
          </p>
        </div>

        <button
          type="button"
          onClick={onEnable}
          disabled={loading}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-[6px] bg-[var(--text-primary)] px-3 text-[12px] font-medium text-[var(--bg-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : '开启'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]"
          aria-label="关闭通知提示"
          title="关闭通知提示"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
