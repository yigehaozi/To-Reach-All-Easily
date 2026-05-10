import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, Loader2 } from 'lucide-react';
import SharePageBrandBadge from '@/components/common/SharePageBrandBadge';
import BulkQueryResult from '@/components/Query/BulkQueryResult';
import QueryResult from '@/components/Query/QueryResult';
import { useTheme } from '@/hooks/useTheme';
import { getQueryModeLabel, getQueryModeUiConfig } from '@/utils/queryMode';
import { fetchSharedResult, ShareRequestError } from '@/utils/share';
import type { StoredSharedResult } from '@/types/share';

type SharedResultViewState = 'loading' | 'ready' | 'not-found' | 'expired' | 'error';

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SharedResultStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-6 py-7 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--bg-overlay)] text-[var(--text-primary)]">
        <AlertCircle size={18} />
      </div>
      <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">{title}</h1>
      <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{description}</p>
      <Link
        to="/"
        className="mt-5 inline-flex h-9 items-center rounded-[6px] bg-[var(--text-primary)] px-3.5 text-[12px] font-medium text-[var(--bg-base)] transition-opacity hover:opacity-90"
      >
        返回 OneFour
      </Link>
    </div>
  );
}

export default function SharedResultPage() {
  useTheme();
  const { shareId = '' } = useParams();
  const [viewState, setViewState] = useState<SharedResultViewState>('loading');
  const [sharedResult, setSharedResult] = useState<StoredSharedResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSharedResult = async () => {
      setViewState('loading');
      setSharedResult(null);
      setErrorMessage('');

      try {
        const result = await fetchSharedResult(shareId);

        if (cancelled) {
          return;
        }

        setSharedResult(result);
        setViewState('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ShareRequestError) {
          if (error.status === 404) {
            setViewState('not-found');
            return;
          }

          if (error.status === 410) {
            setViewState('expired');
            return;
          }
        }

        setErrorMessage(error instanceof Error ? error.message : '分享结果加载失败，请稍后重试。');
        setViewState('error');
      }
    };

    void loadSharedResult();

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  useEffect(() => {
    if (viewState === 'ready' && sharedResult) {
      document.title = `${sharedResult.query} - 分享结果 - OneFour`;
      return;
    }

    if (viewState === 'not-found') {
      document.title = '分享结果不存在 - OneFour';
      return;
    }

    if (viewState === 'expired') {
      document.title = '分享结果已过期 - OneFour';
      return;
    }

    if (viewState === 'error') {
      document.title = '分享结果加载失败 - OneFour';
      return;
    }

    document.title = '分享结果 - OneFour';
  }, [sharedResult, viewState]);

  const modeUiConfig = useMemo(() => {
    if (!sharedResult) {
      return null;
    }

    return getQueryModeUiConfig(sharedResult.mode);
  }, [sharedResult]);

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-secondary)] px-4 py-6 sm:px-6 md:px-8 md:py-10">
      <div
        className={[
          'mx-auto flex w-full max-w-[920px]',
          viewState === 'ready' ? 'min-h-full items-start justify-center' : 'min-h-full items-center justify-center',
        ].join(' ')}
      >
        {viewState === 'loading' ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-5 py-4 shadow-[var(--shadow-card)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-primary)]">
              <Loader2 size={16} className="animate-spin" />
            </span>
            <span className="text-[13px] text-[var(--text-secondary)]">正在加载分享结果…</span>
          </div>
        ) : null}

        {viewState === 'not-found' ? (
          <SharedResultStateCard
            title="结果不存在"
            description="这个分享链接不存在，或者已经被清理。请确认链接是否完整。"
          />
        ) : null}

        {viewState === 'expired' ? (
          <SharedResultStateCard
            title="结果已过期"
            description="这个分享链接已超过默认 2 小时有效期，请让分享者重新生成最新链接。"
          />
        ) : null}

        {viewState === 'error' ? (
          <SharedResultStateCard title="加载失败" description={errorMessage || '分享结果加载失败，请稍后重试。'} />
        ) : null}

        {viewState === 'ready' && sharedResult && modeUiConfig ? (
          <div className="w-full space-y-4">
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] shadow-[var(--shadow-card)]">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90"
                style={{
                  background: `linear-gradient(180deg, ${modeUiConfig.accentSoft} 0%, transparent 100%)`,
                }}
              />
              <div
                className="pointer-events-none absolute -right-12 -top-10 h-28 w-28 rounded-full blur-3xl"
                style={{ backgroundColor: modeUiConfig.accentSoft }}
              />

              <div className="relative px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        backgroundColor: modeUiConfig.accentSoft,
                        color: modeUiConfig.accent,
                      }}
                    >
                      {getQueryModeLabel(sharedResult.mode)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[var(--bg-base)]/78 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] backdrop-blur-sm">
                      分享结果
                    </span>
                    {sharedResult.status === 'error' ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/8 px-2.5 py-1 text-[11px] font-medium text-red-500 dark:text-red-400">
                        失败快照
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2.5">
                    <h1 className="break-all text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-[36px]">
                      {sharedResult.query}
                    </h1>
                    {sharedResult.status === 'error' ? (
                      <p className="max-w-[680px] text-[13px] leading-6 text-[var(--text-secondary)] sm:text-[14px]">
                        本次失败结果的只读快照，适合用于排查与沟通。
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--border-neutral)] pt-3 text-[12px] text-[var(--text-tertiary)]">
                    <span className="text-[var(--text-secondary)]">OneFour 分享</span>
                    <span className="hidden h-1 w-1 rounded-full bg-[var(--border-neutral-l3)] sm:block" />
                    <span>生成于 {formatDateTime(sharedResult.createdAt)}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-[var(--border-neutral-l3)] sm:block" />
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={12} />
                      <span>有效期至 {formatDateTime(sharedResult.expiresAt)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-5 py-5 shadow-[var(--shadow-card)] sm:px-6">
              {sharedResult.mode === 'bulk' ? (
                <BulkQueryResult
                  query={sharedResult.query}
                  data={sharedResult.bulkResult}
                  error={sharedResult.error}
                  responseTime={sharedResult.responseTime}
                  status={sharedResult.status}
                  readOnly
                />
              ) : (
                <QueryResult
                  query={sharedResult.query}
                  data={sharedResult.result}
                  rawData={sharedResult.rawData}
                  rawWhoisContent={sharedResult.rawWhoisContent}
                  responseTime={sharedResult.responseTime}
                  cached={sharedResult.cached}
                  source={sharedResult.source}
                  error={sharedResult.error}
                  status={sharedResult.status}
                  readOnly
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      <SharePageBrandBadge />
    </div>
  );
}
