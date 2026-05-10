import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Loader2, RefreshCw, Share2 } from 'lucide-react';
import IconHoverTooltip from '@/components/common/IconHoverTooltip';
import type { SharedResultPayload } from '@/types/share';
import {
  buildAbsoluteShareUrl,
  copyTextToClipboard,
  createShare,
  isLikelyTouchDevice,
  isShareAbortError,
  shareUrlWithNativeSheet,
  supportsNativeShare,
} from '@/utils/share';
import { showToast } from '@/utils/toastBus';
import RawDataSection from './RawDataSection';

interface CompletionStatusProps {
  query: string;
  rawWhoisContent?: string;
  copyText?: string;
  onRefresh?: () => void;
  sharePayload?: SharedResultPayload;
  readOnly?: boolean;
}

const SHARE_DIALOG_EXIT_DURATION_MS = 220;

export default function CompletionStatus({
  query,
  rawWhoisContent,
  copyText,
  onRefresh,
  sharePayload,
  readOnly = false,
}: CompletionStatusProps) {
  const hasRawWhoisContent = Boolean(rawWhoisContent?.trim());
  const [sharing, setSharing] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState<string | null>(null);
  const [shareDialogClosing, setShareDialogClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const nativeShareSupported = supportsNativeShare();
  const isTouchDevice = isLikelyTouchDevice();

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!copyText?.trim()) {
      return;
    }

    try {
      await copyTextToClipboard(copyText);
      showToast({ message: '已复制查询结果', variant: 'success' });
    } catch {
      showToast({ message: '复制失败，请重试', variant: 'error' });
    }
  };

  const openShareDialog = (url: string) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setShareDialogClosing(false);
    setShareDialogUrl(url);
  };

  const closeShareDialog = () => {
    if (!shareDialogUrl || shareDialogClosing) {
      return;
    }

    setShareDialogClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setShareDialogUrl(null);
      setShareDialogClosing(false);
      closeTimerRef.current = null;
    }, SHARE_DIALOG_EXIT_DURATION_MS);
  };

  const handleNativeShare = async (url: string) => {
    try {
      await shareUrlWithNativeSheet(url, `${query} - OneFour`);
      closeShareDialog();
    } catch (error) {
      if (isShareAbortError(error)) {
        return;
      }

      showToast({ message: '当前环境无法直接调起系统分享，请复制链接后继续分享', variant: 'info' });
    }
  };

  const handleCopyShareLink = async (url: string) => {
    try {
      await copyTextToClipboard(url);
      closeShareDialog();
      showToast({ message: '分享链接已复制，2 小时内有效', variant: 'success' });
    } catch {
      showToast({ message: '复制失败，请长按上方链接手动复制', variant: 'error' });
    }
  };

  const handleShare = async () => {
    if (!sharePayload || sharing) {
      return;
    }

    setSharing(true);

    try {
      const response = await createShare(sharePayload);
      const shareUrl = buildAbsoluteShareUrl(response.path);

      if (isTouchDevice) {
        openShareDialog(shareUrl);
        return;
      }

      await copyTextToClipboard(shareUrl);
      showToast({ message: '分享链接已生成，2 小时内有效', variant: 'success' });
    } catch {
      showToast({ message: `${query} 的分享链接生成失败，请重试`, variant: 'error' });
    } finally {
      setSharing(false);
    }
  };

  const shareDialogPortal =
    shareDialogUrl && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={[
              'fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(15,23,42,0.16)] px-3 pb-3 pt-10 backdrop-blur-[1px]',
              shareDialogClosing ? 'animate-mobile-overlay-out' : 'animate-mobile-overlay-in',
            ].join(' ')}
            onClick={closeShareDialog}
          >
            <div
              className={[
                'w-full max-w-[520px] rounded-[18px] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-4 pb-4 pt-5 shadow-[var(--shadow-card)]',
                shareDialogClosing ? 'animate-mobile-share-sheet-out' : 'animate-mobile-share-sheet-in',
              ].join(' ')}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[17px] font-semibold text-[var(--text-primary)]">分享链接已生成</div>
                  <div className="text-[13px] leading-6 text-[var(--text-secondary)]">
                    链接 2 小时内有效。当前移动端浏览器限制较多，请继续分享或复制链接。
                  </div>
                </div>

                <div className="rounded-[12px] border border-[var(--border-neutral)] bg-[var(--bg-secondary)] px-3 py-3">
                  <input
                    value={shareDialogUrl}
                    readOnly
                    onFocus={(event) => {
                      event.currentTarget.select();
                    }}
                    className="w-full bg-transparent text-[13px] leading-6 text-[var(--text-primary)] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  {nativeShareSupported ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleNativeShare(shareDialogUrl);
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-[var(--text-primary)] px-4 py-3 text-[14px] font-medium text-[var(--bg-base)] transition-opacity hover:opacity-90"
                    >
                      系统分享
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyShareLink(shareDialogUrl);
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
                  >
                    复制链接
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="mt-4 flex items-center justify-end gap-1">
        <div className="flex items-center gap-1">
          {hasRawWhoisContent ? <RawDataSection rawWhoisContent={rawWhoisContent} /> : null}
          {!readOnly && copyText?.trim() ? (
            <div className="group relative">
              <button
                onClick={() => {
                  void handleCopy();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-secondary)]"
                aria-label="复制"
              >
                <Copy size={14} />
              </button>
              <IconHoverTooltip label="复制" />
            </div>
          ) : null}
          {!readOnly && sharePayload ? (
            <div className="group relative">
              <button
                onClick={() => {
                  void handleShare();
                }}
                disabled={sharing}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="分享"
              >
                {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              </button>
              <IconHoverTooltip label={sharing ? '生成中' : '分享'} />
            </div>
          ) : null}
          {!readOnly && onRefresh ? (
            <div className="group relative">
              <button
                onClick={() => {
                  onRefresh();
                  showToast({ message: '已重新发起查询', variant: 'info' });
                }}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-secondary)]"
                aria-label="重新查询"
              >
                <RefreshCw size={14} />
              </button>
              <IconHoverTooltip label="重试" align="right" />
            </div>
          ) : null}
        </div>
      </div>
      {shareDialogPortal}
    </>
  );
}
