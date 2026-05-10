import type {
  BulkCheckItem,
  BulkCheckStatus,
  BulkGroupKey,
  BulkGroupResult,
  BulkGroupSummary,
  BulkQueryResultData,
  SupportedTldItem,
} from '@/types/query';
import { bulkDnsCheck, fetchSupportedTlds } from '@/utils/api';

const OLD_TLDS = new Set(['com', 'net', 'org', 'info', 'biz', 'name', 'pro', 'aero', 'coop', 'museum']);

const GROUP_LABELS: Record<BulkGroupKey, string> = {
  generic: '通用后缀',
  country: '国家地区',
  new: '新后缀',
  idn: '国际化后缀',
};

const STATUS_ORDER: Record<BulkCheckStatus, number> = {
  available: 0,
  registered: 1,
  unknown: 2,
};

let supportedTldsPromise: Promise<SupportedTldItem[]> | null = null;

function isIdnTld(tld: string): boolean {
  return tld.startsWith('xn--') || Array.from(tld).some((char) => char.charCodeAt(0) > 127);
}

function filterTldsByGroup(allTlds: SupportedTldItem[], group: BulkGroupKey): string[] {
  return allTlds
    .filter((item) => {
      const tld = item.tld.trim().toLowerCase();

      if (!tld) {
        return false;
      }

      if (group === 'idn') {
        return isIdnTld(tld);
      }

      if (isIdnTld(tld)) {
        return false;
      }

      if (group === 'generic') {
        return tld.length > 2 && OLD_TLDS.has(tld);
      }

      if (group === 'country') {
        return tld.length >= 1 && tld.length <= 2;
      }

      return tld.length > 2 && !OLD_TLDS.has(tld);
    })
    .map((item) => item.tld.trim().toLowerCase());
}

function sortBulkItems(items: BulkCheckItem[]): BulkCheckItem[] {
  return [...items].sort((left, right) => {
    const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.tld.localeCompare(right.tld);
  });
}

function summarizeBulkItems(items: BulkCheckItem[]): BulkGroupSummary {
  return items.reduce<BulkGroupSummary>(
    (summary, item) => {
      summary.total += 1;
      summary[item.status] += 1;
      return summary;
    },
    {
      total: 0,
      registered: 0,
      available: 0,
      unknown: 0,
    }
  );
}

async function getSupportedTldsCached(): Promise<SupportedTldItem[]> {
  if (!supportedTldsPromise) {
    supportedTldsPromise = fetchSupportedTlds().catch((error) => {
      supportedTldsPromise = null;
      throw error;
    });
  }

  return supportedTldsPromise;
}

export async function runBulkAvailabilityQuery(domain: string): Promise<BulkQueryResultData> {
  const query = domain.trim().toLowerCase();

  if (!query) {
    throw new Error('请输入主体域名后再试');
  }

  const supportedTlds = await getSupportedTldsCached();
  const groups: BulkGroupKey[] = ['generic', 'country', 'new', 'idn'];

  const settledGroups = await Promise.allSettled(
    groups.map(async (group): Promise<BulkGroupResult> => {
      const tlds = filterTldsByGroup(supportedTlds, group);
      const response = await bulkDnsCheck(query, tlds, group);

      if (!response.success) {
        return {
          key: group,
          label: GROUP_LABELS[group],
          items: [],
          summary: {
            total: 0,
            registered: 0,
            available: 0,
            unknown: 0,
          },
          error: response.error || '批量查询失败',
        };
      }

      const items = sortBulkItems(response.results ?? []);

      return {
        key: group,
        label: GROUP_LABELS[group],
        items,
        summary: summarizeBulkItems(items),
      };
    })
  );

  const groupResults = settledGroups.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const key = groups[index];

    return {
      key,
      label: GROUP_LABELS[key],
      items: [],
      summary: {
        total: 0,
        registered: 0,
        available: 0,
        unknown: 0,
      },
      error: result.reason instanceof Error ? result.reason.message : '批量查询失败',
    } satisfies BulkGroupResult;
  });

  if (groupResults.every((group) => group.summary.total === 0 && group.error)) {
    throw new Error(groupResults.find((group) => group.error)?.error || '批量查询失败');
  }

  const summary = groupResults.reduce<BulkGroupSummary>(
    (aggregate, group) => {
      aggregate.total += group.summary.total;
      aggregate.registered += group.summary.registered;
      aggregate.available += group.summary.available;
      aggregate.unknown += group.summary.unknown;
      return aggregate;
    },
    {
      total: 0,
      registered: 0,
      available: 0,
      unknown: 0,
    }
  );

  return {
    query,
    checkedAt: Date.now(),
    summary,
    groups: groupResults,
  };
}
