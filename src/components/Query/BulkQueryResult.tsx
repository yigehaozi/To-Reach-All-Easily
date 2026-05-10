import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { AssistantMessageStatus } from '@/types/session';
import type { SharedBulkSnapshot } from '@/types/share';
import type {
  BulkCheckItem,
  BulkCheckStatus,
  BulkGroupKey,
  BulkGroupResult,
  BulkQueryResultData,
} from '@/types/query';
import ResultCard from './ResultCard';
import ResponseHeader from './ResponseHeader';
import CompletionStatus from './CompletionStatus';

interface BulkQueryResultProps {
  query: string;
  data?: BulkQueryResultData;
  error?: string;
  responseTime?: number;
  status?: AssistantMessageStatus;
  onRefresh?: () => void;
  onDomainClick?: (domain: string) => void;
  readOnly?: boolean;
}

const STATUS_TEXT: Record<BulkCheckStatus, string> = {
  available: '未注册',
  registered: '已注册',
  unknown: '未知',
};

const GROUP_ORDER: BulkGroupKey[] = ['generic', 'country', 'new', 'idn'];

const STATUS_BADGE_TONE: Record<BulkCheckStatus, string> = {
  available: 'border-emerald-500/18 bg-emerald-500/[0.05] text-emerald-600 dark:text-emerald-400',
  registered: 'border-[var(--border-neutral)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]',
  unknown: 'border-amber-500/18 bg-amber-500/[0.05] text-amber-600 dark:text-amber-400',
};

const STATUS_TAG_TONE: Record<BulkCheckStatus, string> = {
  available: 'border-emerald-500/16 bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400',
  registered: 'border-[var(--border-neutral)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]',
  unknown: 'border-amber-500/16 bg-amber-500/[0.03] text-amber-600 dark:text-amber-400',
};

function BulkStatusBadge({
  status,
  count,
  compact = false,
}: {
  status: BulkCheckStatus;
  count: number;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] border px-2.5 py-1 text-[11px] font-medium',
        compact ? 'gap-1' : 'gap-1.5',
        STATUS_BADGE_TONE[status]
      )}
    >
      <span>{STATUS_TEXT[status]}</span>
      <span>{count}</span>
    </span>
  );
}

function BulkValueTag({
  status,
  value,
  clickable = false,
  onClick,
  title,
}: {
  status: BulkCheckStatus;
  value: string;
  clickable?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const sharedClassName = cn(
    'rounded-[6px] border px-2 py-0.5 font-mono text-[11px]',
    STATUS_TAG_TONE[status],
    clickable
      ? 'transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]'
      : undefined
  );

  if (clickable && onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClassName} title={title}>
        {value}
      </button>
    );
  }

  return <span className={sharedClassName}>{value}</span>;
}

function BulkStatusRow({
  groupKey,
  status,
  items,
  onDomainClick,
}: {
  groupKey: string;
  status: BulkCheckStatus;
  items: BulkCheckItem[];
  onDomainClick?: (domain: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const previewItems = expanded ? items : items.slice(0, 12);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-start gap-4">
      <span className="w-20 shrink-0 pt-1 text-[12px] text-[var(--text-tertiary)]">
        {STATUS_TEXT[status]}
      </span>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <BulkStatusBadge status={status} count={items.length} compact />
          {items.length > 12 ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="text-[11px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {expanded ? '收起' : `展开 ${items.length}`}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {previewItems.map((item) => (
            <BulkValueTag
              key={`${groupKey}-${status}-${item.fullDomain}`}
              status={status}
              value={item.fullDomain}
              clickable={status === 'registered' && Boolean(onDomainClick)}
              onClick={
                status === 'registered' && onDomainClick ? () => onDomainClick(item.fullDomain) : undefined
              }
              title={
                status === 'registered' && onDomainClick ? `查看 ${item.fullDomain} 的单域名查询` : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BulkOverviewCard({ query, data }: { query: string; data: BulkQueryResultData }) {
  const overviewQuery = data.query || query;

  return (
    <ResultCard title="检测概览">
      <div className="space-y-2.5">
        <div className="flex items-start gap-4">
          <span className="w-20 shrink-0 text-[12px] text-[var(--text-tertiary)]">查询主体</span>
          <span className="break-all font-mono text-[13px] text-[var(--text-primary)]">{overviewQuery}</span>
        </div>

        <div className="flex items-start gap-4">
          <span className="w-20 shrink-0 text-[12px] text-[var(--text-tertiary)]">检测总数</span>
          <span className="font-mono text-[13px] text-[var(--text-primary)]">{data.summary.total}</span>
        </div>

        <div className="flex items-start gap-4">
          <span className="w-20 shrink-0 text-[12px] text-[var(--text-tertiary)]">结果统计</span>
          <div className="flex flex-wrap gap-2">
            <BulkStatusBadge status="available" count={data.summary.available} compact />
            <BulkStatusBadge status="registered" count={data.summary.registered} compact />
            <BulkStatusBadge status="unknown" count={data.summary.unknown} compact />
          </div>
        </div>
      </div>
    </ResultCard>
  );
}

function BulkGroupCard({
  group,
  onDomainClick,
}: {
  group: BulkGroupResult;
  onDomainClick?: (domain: string) => void;
}) {
  const statusLists = useMemo(
    () => ({
      available: group.items.filter((item) => item.status === 'available'),
      registered: group.items.filter((item) => item.status === 'registered'),
      unknown: group.items.filter((item) => item.status === 'unknown'),
    }),
    [group.items]
  );

  const orderedStatuses: BulkCheckStatus[] = ['available', 'registered', 'unknown'];
  const visibleStatusRows = orderedStatuses
    .map((status) => ({ status, items: statusLists[status] }))
    .filter((entry) => entry.items.length > 0);

  return (
    <ResultCard title={group.label}>
      {group.error ? (
        <div className="rounded-[6px] border border-amber-500/20 bg-amber-500/6 px-3 py-3 text-[12px] leading-5 text-amber-600 dark:text-amber-400">
          {group.error}
        </div>
      ) : visibleStatusRows.length > 0 ? (
        <div className="space-y-4">
          {visibleStatusRows.map((entry) => (
            <BulkStatusRow
              key={`${group.key}-${entry.status}`}
              groupKey={group.key}
              status={entry.status}
              items={entry.items}
              onDomainClick={onDomainClick}
            />
          ))}
        </div>
      ) : (
        <p className="text-[12px] leading-5 text-[var(--text-tertiary)]">
          当前分组暂无可展示的检测结果。
        </p>
      )}
    </ResultCard>
  );
}

export default function BulkQueryResult({
  query,
  data,
  error,
  responseTime,
  status = 'success',
  onRefresh,
  onDomainClick,
  readOnly = false,
}: BulkQueryResultProps) {
  const isError = status === 'error' || Boolean(error);
  const failureMessage = error?.trim() || '批量查询失败，请稍后重试。';
  const orderedGroups = useMemo(() => {
    if (!data?.groups) {
      return [];
    }

    const orderMap = new Map(GROUP_ORDER.map((key, index) => [key, index]));
    return [...data.groups].sort(
      (left, right) => (orderMap.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(right.key) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [data?.groups]);
  const sharePayload: SharedBulkSnapshot = {
    mode: 'bulk',
    query,
    status: isError ? 'error' : 'success',
    bulkResult: data,
    rawData: data,
    error: isError ? failureMessage : undefined,
    responseTime,
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden animate-fade-in">
      <ResponseHeader
        responseTime={responseTime}
        status={isError ? 'error' : 'success'}
        label={isError ? '批量查询异常' : '批量后缀检测'}
      />

      <div className="space-y-4">
        {isError ? (
          <div className="rounded-[6px] border border-red-500/20 bg-red-500/5 px-4 py-4 text-[13px] leading-6 text-red-500">
            {failureMessage}
          </div>
        ) : data ? (
          <div>
            <BulkOverviewCard query={query} data={data} />
            {orderedGroups.map((group) => (
              <BulkGroupCard key={group.key} group={group} onDomainClick={onDomainClick} />
            ))}
          </div>
        ) : null}
      </div>

      <CompletionStatus
        query={query}
        onRefresh={onRefresh}
        sharePayload={sharePayload}
        readOnly={readOnly}
      />
    </div>
  );
}
