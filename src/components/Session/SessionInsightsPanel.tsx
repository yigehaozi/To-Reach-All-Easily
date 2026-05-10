import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { QueryMode } from '@/types/query';
import { useAppStore } from '@/store/useAppStore';
import { SESSION_INSIGHTS_PANEL_WIDTH } from '@/utils/sessionLayout';
import type {
  SessionBulkGroupStat,
  SessionBulkStatusStat,
  SessionQueryAggregateItem,
  SessionSuffixStat,
} from '@/utils/sessionConversation';

interface SessionInsightsPanelProps {
  open: boolean;
  mode: QueryMode;
  queries: SessionQueryAggregateItem[];
  suffixStats: SessionSuffixStat[];
  bulkStatusStats: SessionBulkStatusStat[];
  bulkGroupStats: SessionBulkGroupStat[];
}

const MOBILE_PANEL_ANIMATION_MS = 180;

function StatList({
  items,
  emptyText,
  showCountBadge = true,
}: {
  items: Array<{ label: string; count: number }>;
  emptyText: string;
  showCountBadge?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-[12px] leading-5 text-[var(--text-tertiary)]">{emptyText}</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex min-h-7 items-center justify-between gap-3 text-[12px]">
          <span className="min-w-0 break-all leading-5 text-[var(--text-secondary)]">{item.label}</span>
          {showCountBadge ? (
            <span className="shrink-0 rounded-full bg-[var(--bg-overlay)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]">
              {item.count}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SessionInsightsContent({
  mode,
  queries,
  suffixStats,
  bulkStatusStats,
  bulkGroupStats,
}: Omit<SessionInsightsPanelProps, 'open'>) {
  const singleQueryItems = queries.map((item) => ({
    label: item.display,
    count: item.count,
  }));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {mode === 'single' ? (
        <>
          <section className="pb-8">
            <h2 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">当前会话查询域名</h2>
            <StatList
              items={singleQueryItems}
              emptyText="当前会话还没有可展示的域名查询。"
            />
          </section>

          <section className="border-t border-[var(--border-neutral)] pt-8">
            <h2 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">后缀统计</h2>
            <StatList
              items={suffixStats.map((item) => ({ label: item.suffix, count: item.count }))}
              emptyText="当前会话还没有足够的数据生成后缀统计。"
            />
          </section>
        </>
      ) : (
        <>
          <section className="pb-8">
            <h2 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">检测结果</h2>
            <StatList
              items={bulkStatusStats.map((item) => ({ label: item.label, count: item.count }))}
              emptyText="当前会话还没有可展示的批量检测结果。"
            />
          </section>

          <section className="border-t border-[var(--border-neutral)] pt-8">
            <h2 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">后缀类型</h2>
            <StatList
              items={bulkGroupStats.map((item) => ({ label: item.label, count: item.count }))}
              emptyText="当前会话还没有足够的数据生成后缀类型统计。"
            />
          </section>
        </>
      )}
    </div>
  );
}

export default function SessionInsightsPanel({
  open,
  mode,
  queries,
  suffixStats,
  bulkStatusStats,
  bulkGroupStats,
}: SessionInsightsPanelProps) {
  const { setSessionInsightsOpen } = useAppStore();
  const [mobilePanelMounted, setMobilePanelMounted] = useState(open);
  const [mobilePanelVisible, setMobilePanelVisible] = useState(open);
  const panelWidth = open ? SESSION_INSIGHTS_PANEL_WIDTH : 0;

  useEffect(() => {
    if (open) {
      setMobilePanelMounted(true);
      const frameId = window.requestAnimationFrame(() => {
        setMobilePanelVisible(true);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    setMobilePanelVisible(false);
    const timeoutId = window.setTimeout(() => {
      setMobilePanelMounted(false);
    }, MOBILE_PANEL_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  return (
    <>
      {mobilePanelMounted ? (
        <div className="absolute inset-0 z-30 lg:hidden">
          <button
            type="button"
            onClick={() => setSessionInsightsOpen(false)}
            className={cn(
              'absolute inset-0 transition-opacity duration-200 ease-out',
              mobilePanelVisible ? 'opacity-100' : 'opacity-0'
            )}
            aria-label="关闭会话信息面板"
          />
          <div
            className={cn(
              'absolute right-3 top-3 max-h-[calc(100%-24px)] w-[min(360px,calc(100%-24px))] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-base)] shadow-[var(--shadow-card)] transition-[opacity,transform] duration-200 ease-out',
              mobilePanelVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-1 scale-[0.985] opacity-0'
            )}
            style={{ transformOrigin: 'top right' }}
          >
            <SessionInsightsContent
              mode={mode}
              queries={queries}
              suffixStats={suffixStats}
              bulkStatusStats={bulkStatusStats}
              bulkGroupStats={bulkGroupStats}
            />
          </div>
        </div>
      ) : null}

      <aside
        className={cn(
          'hidden shrink-0 bg-[var(--bg-base)] transition-[width,min-width,opacity,border-color] duration-200 ease-out lg:flex',
          open
            ? 'border-l border-[var(--border-neutral)] opacity-100'
            : 'border-l border-transparent opacity-0'
        )}
        style={{ width: panelWidth, minWidth: panelWidth }}
      >
        <div
          className={cn(
            'flex h-full flex-col overflow-hidden',
            open ? 'pointer-events-auto' : 'pointer-events-none'
          )}
          style={{ width: SESSION_INSIGHTS_PANEL_WIDTH }}
        >
          <SessionInsightsContent
            mode={mode}
            queries={queries}
            suffixStats={suffixStats}
            bulkStatusStats={bulkStatusStats}
            bulkGroupStats={bulkGroupStats}
          />
        </div>
      </aside>
    </>
  );
}
