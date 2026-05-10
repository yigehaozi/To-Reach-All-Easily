import type { Message, Session } from '@/types/session';
import type { BulkGroupKey, BulkQueryResultData, BulkCheckStatus, QueryMode } from '@/types/query';

export interface SessionQueryItem {
  id: string;
  display: string;
  normalized: string;
  suffix: string | null;
  timestamp: number;
}

export interface SessionSuffixStat {
  suffix: string;
  count: number;
}

export interface SessionQueryAggregateItem {
  display: string;
  count: number;
}

export interface SessionBulkStatusStat {
  key: BulkCheckStatus;
  label: string;
  count: number;
}

export interface SessionBulkGroupStat {
  key: BulkGroupKey;
  label: string;
  count: number;
}

const BULK_STATUS_LABELS: Record<BulkCheckStatus, string> = {
  registered: '已注册',
  available: '未注册',
  unknown: '未知',
};

const BULK_GROUP_LABELS: Record<BulkGroupKey, string> = {
  generic: '通用后缀',
  country: '国别后缀',
  new: '新后缀',
  idn: '国际化',
};

export function getSessionLastConversationTimestamp(session?: Session): number | null {
  if (!session) return null;
  const lastMessage = session.messages[session.messages.length - 1];
  return lastMessage?.timestamp ?? session.updatedAt ?? null;
}

export function formatSessionConversationTime(timestamp?: number | null): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const isSameYear = date.getFullYear() === now.getFullYear();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (isSameYear) {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`;
  }

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

export function normalizeQueryDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const withoutPath = withoutScheme.split('/')[0]?.split('?')[0]?.split('#')[0] ?? withoutScheme;
  const withoutPort = withoutPath.replace(/:\d+$/, '');

  return withoutPort.replace(/^\.+|\.+$/g, '');
}

export function getTopLevelSuffix(domain: string): string | null {
  const parts = domain.split('.').filter(Boolean);
  if (parts.length < 2) return null;

  return `.${parts[parts.length - 1]}`;
}

function matchesMode(message: Message, mode: QueryMode): boolean {
  if (mode === 'bulk') {
    return message.queryMode === 'bulk';
  }

  return message.queryMode !== 'bulk';
}

export function getSessionQueryItems(messages: Message[], mode: QueryMode): SessionQueryItem[] {
  return messages
    .filter((message) => message.role === 'user' && matchesMode(message, mode))
    .map((message) => {
      const normalized = normalizeQueryDomain(message.content);
      return {
        id: message.id,
        display: normalized || message.content.trim(),
        normalized,
        suffix: getTopLevelSuffix(normalized),
        timestamp: message.timestamp,
      };
    })
    .filter((item) => item.display);
}

export function getSessionSuffixStats(items: SessionQueryItem[]): SessionSuffixStat[] {
  const counter = new Map<string, number>();

  items.forEach((item) => {
    if (!item.suffix) return;
    counter.set(item.suffix, (counter.get(item.suffix) ?? 0) + 1);
  });

  return Array.from(counter.entries())
    .map(([suffix, count]) => ({ suffix, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.suffix.localeCompare(b.suffix);
    });
}

export function getSessionQueryAggregateItems(items: SessionQueryItem[]): SessionQueryAggregateItem[] {
  const aggregateMap = new Map<string, SessionQueryAggregateItem>();
  const ordered: SessionQueryAggregateItem[] = [];

  items.forEach((item) => {
    const key = item.normalized || item.display;
    const existing = aggregateMap.get(key);

    if (existing) {
      existing.count += 1;
      return;
    }

    const nextItem: SessionQueryAggregateItem = {
      display: item.display,
      count: 1,
    };

    aggregateMap.set(key, nextItem);
    ordered.push(nextItem);
  });

  return ordered;
}

export function getSessionBulkResults(messages: Message[]): BulkQueryResultData[] {
  return messages
    .filter(
      (message) =>
        message.role === 'assistant' &&
        (message.kind === 'bulk' || message.queryMode === 'bulk') &&
        Boolean(message.bulkResult)
    )
    .map((message) => message.bulkResult)
    .filter((result): result is BulkQueryResultData => Boolean(result));
}

export function getSessionBulkStatusStats(results: BulkQueryResultData[]): SessionBulkStatusStat[] {
  const counter: Record<BulkCheckStatus, number> = {
    registered: 0,
    available: 0,
    unknown: 0,
  };

  results.forEach((result) => {
    counter.registered += result.summary.registered;
    counter.available += result.summary.available;
    counter.unknown += result.summary.unknown;
  });

  return (['registered', 'available', 'unknown'] as const).map((key) => ({
    key,
    label: BULK_STATUS_LABELS[key],
    count: counter[key],
  }));
}

export function getSessionBulkGroupStats(results: BulkQueryResultData[]): SessionBulkGroupStat[] {
  const counter: Record<BulkGroupKey, number> = {
    generic: 0,
    country: 0,
    new: 0,
    idn: 0,
  };

  results.forEach((result) => {
    result.groups.forEach((group) => {
      counter[group.key] += group.summary.total;
    });
  });

  return (['generic', 'country', 'new', 'idn'] as const).map((key) => ({
    key,
    label: BULK_GROUP_LABELS[key],
    count: counter[key],
  }));
}
