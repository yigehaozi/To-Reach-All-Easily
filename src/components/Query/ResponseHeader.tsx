import type { AssistantMessageStatus } from '@/types/session';

interface ResponseHeaderProps {
  responseTime?: number;
  cached?: boolean;
  source?: string;
  status?: AssistantMessageStatus;
  label?: string;
  hideMeta?: boolean;
}

export default function ResponseHeader({
  responseTime,
  cached,
  source,
  status = 'success',
  label,
  hideMeta = false,
}: ResponseHeaderProps) {
  const isError = status === 'error';
  const metaParts = [
    label || (isError ? '查询异常' : 'WHOIS 分析'),
    source ? `来源 ${source}` : null,
    typeof responseTime === 'number' ? `耗时 ${responseTime.toFixed(2)}s` : null,
    cached ? '缓存命中' : null,
  ].filter(Boolean);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-[18px] w-[18px] items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="26" height="26" rx="4" fill="var(--brand-primary)" />
            <text x="13" y="17.5" textAnchor="middle" fill="white" fontFamily="SF Pro Text, -apple-system, system-ui, sans-serif" fontSize="12" fontWeight="700" letterSpacing="-0.5">OF</text>
          </svg>
        </div>
        <span className="text-[13px] font-medium text-[var(--text-primary)]">OneFour</span>
      </div>

      {!hideMeta && metaParts.length > 0 ? (
        <div className="flex min-w-0 items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
          <span className="h-px flex-1 bg-[var(--border-neutral)]" />
          <span className="min-w-0 text-center leading-5 break-words">{metaParts.join(' · ')}</span>
          <span className="h-px flex-1 bg-[var(--border-neutral)]" />
        </div>
      ) : null}
    </div>
  );
}
