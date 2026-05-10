import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import IconHoverTooltip from '@/components/common/IconHoverTooltip';

interface RawDataSectionProps {
  rawWhoisContent?: string;
}

export default function RawDataSection({ rawWhoisContent }: RawDataSectionProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const hasRawWhoisContent = Boolean(rawWhoisContent?.trim());
  const closeTimerRef = useRef<number | null>(null);
  const portalTarget =
    typeof document !== 'undefined'
      ? document.getElementById('onefour-session-main-column') ??
        document.getElementById('onefour-session-canvas') ??
        document.body
      : null;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleOpen = () => {
    if (!hasRawWhoisContent) return;

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setOpen(true);
    window.requestAnimationFrame(() => {
      setVisible(true);
    });
  };

  const handleClose = () => {
    setVisible(false);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 180);
  };

  const modal = open ? (
    <div
      className="absolute inset-0 z-[1150] flex items-center justify-center bg-transparent"
      onMouseDown={handleClose}
    >
      <div
        className={[
          'relative z-10 mx-4 flex max-h-[72vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] shadow-[0_24px_80px_rgba(15,23,42,0.18)] transition-[opacity,transform] duration-200 ease-out',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0',
        ].join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-neutral)] px-5">
          <div className="text-[14px] font-medium text-[var(--text-primary)]">原始 WHOIS</div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap break-words rounded-[var(--radius-lg)] bg-[var(--bg-overlay)] px-4 py-4 font-mono text-[12px] leading-6 text-[var(--text-secondary)]">
            {rawWhoisContent}
          </pre>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="group relative">
        <button
          type="button"
          onClick={handleOpen}
          disabled={!hasRawWhoisContent}
          aria-label={hasRawWhoisContent ? '查看原始 WHOIS' : '暂无原始 WHOIS 数据'}
          className={[
            'flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors',
            hasRawWhoisContent
              ? 'hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-secondary)]'
              : 'cursor-not-allowed opacity-50',
          ].join(' ')}
        >
          <FileText size={14} />
        </button>
        <IconHoverTooltip label={hasRawWhoisContent ? '原始 WHOIS' : '暂无原始 WHOIS 数据'} />
      </div>
      {open && portalTarget ? createPortal(modal, portalTarget) : null}
    </>
  );
}
