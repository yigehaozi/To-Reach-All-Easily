import type { QueryMode } from '@/types/query';
import { normalizeQueryDomain } from '@/utils/sessionConversation';

export interface QueryModeUiConfig {
  label: string;
  heroTitle: string;
  heroBeta?: boolean;
  placeholder: string;
  hint: string;
  emptyTitle: string;
  emptySubtitle: string;
  accent: string;
  accentSoft: string;
  accentSoftHover: string;
  focusShadow: string;
}

export const QUERY_MODE_UI_CONFIG: Record<QueryMode, QueryModeUiConfig> = {
  single: {
    label: '单域名',
    heroTitle: 'OneFour Whois',
    heroBeta: true,
    placeholder: '帮你查询域名注册信息、DNS 记录、到期时间等，输出专业级查询结果。',
    hint: '输入域名后按 Enter 查询',
    emptyTitle: '单域名',
    emptySubtitle: '查询域名 WHOIS、DNS、到期时间等注册信息。',
    accent: 'var(--brand-primary)',
    accentSoft: 'rgba(0, 110, 255, 0.16)',
    accentSoftHover: 'rgba(0, 110, 255, 0.24)',
    focusShadow: '0 0 0 3px rgba(0, 110, 255, 0.12)',
  },
  bulk: {
    label: '批量后缀',
    heroTitle: 'Bulk TLD Check',
    heroBeta: true,
    placeholder: '输入主体域名，如 qq 或 example，一次检查常见后缀是否已注册。',
    hint: '输入主体域名后按 Enter 批量查询',
    emptyTitle: '批量后缀',
    emptySubtitle: '输入主体域名后，批量检查 .com / .net / .cn 等后缀是否已注册。',
    accent: 'var(--brand-green)',
    accentSoft: 'rgba(15, 220, 120, 0.18)',
    accentSoftHover: 'rgba(15, 220, 120, 0.28)',
    focusShadow: '0 0 0 3px rgba(15, 220, 120, 0.14)',
  },
};

export const QUERY_MODE_LABELS: Record<QueryMode, string> = {
  single: QUERY_MODE_UI_CONFIG.single.label,
  bulk: QUERY_MODE_UI_CONFIG.bulk.label,
};

export const QUERY_MODE_PLACEHOLDERS: Record<QueryMode, string> = {
  single: QUERY_MODE_UI_CONFIG.single.placeholder,
  bulk: QUERY_MODE_UI_CONFIG.bulk.placeholder,
};

export const QUERY_MODE_HINTS: Record<QueryMode, string> = {
  single: QUERY_MODE_UI_CONFIG.single.hint,
  bulk: QUERY_MODE_UI_CONFIG.bulk.hint,
};

export const QUERY_MODE_EMPTY_TITLES: Record<QueryMode, string> = {
  single: QUERY_MODE_UI_CONFIG.single.emptyTitle,
  bulk: QUERY_MODE_UI_CONFIG.bulk.emptyTitle,
};

export const QUERY_MODE_EMPTY_SUBTITLES: Record<QueryMode, string> = {
  single: QUERY_MODE_UI_CONFIG.single.emptySubtitle,
  bulk: QUERY_MODE_UI_CONFIG.bulk.emptySubtitle,
};

export function getQueryModeLabel(mode: QueryMode): string {
  return QUERY_MODE_UI_CONFIG[mode].label;
}

export function getQueryModeUiConfig(mode: QueryMode): QueryModeUiConfig {
  return QUERY_MODE_UI_CONFIG[mode];
}

export function getNextQueryMode(mode: QueryMode): QueryMode {
  return mode === 'single' ? 'bulk' : 'single';
}

export function normalizeSingleQueryInput(input: string): string {
  return normalizeQueryDomain(input) || input.trim().toLowerCase();
}

export function normalizeBulkQueryInput(input: string): string {
  const normalized = normalizeQueryDomain(input);

  if (normalized) {
    return normalized.split('.')[0] ?? normalized;
  }

  return (
    input
      .trim()
      .toLowerCase()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .split('/')[0]
      ?.split('?')[0]
      ?.split('#')[0]
      ?.split('.')[0]
      ?.replace(/^\.+|\.+$/g, '') ?? ''
  );
}

export function inferEffectiveQueryMode(input: string): QueryMode {
  const normalized = normalizeQueryDomain(input);
  return normalized.includes('.') ? 'single' : 'bulk';
}
