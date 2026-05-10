import { Loader2 } from 'lucide-react';
import type { QueryMode } from '@/types/query';
import { getQueryModeUiConfig } from '@/utils/queryMode';
import ResponseHeader from './ResponseHeader';

interface PendingQueryResultProps {
  mode: QueryMode;
  detail?: string;
}

const MODE_LABEL: Record<QueryMode, string> = {
  single: 'WHOIS 查询',
  bulk: '批量后缀检测',
};

export default function PendingQueryResult({
  mode,
  detail,
}: PendingQueryResultProps) {
  const uiConfig = getQueryModeUiConfig(mode);

  return (
    <div className="w-full animate-fade-in">
      <ResponseHeader status="pending" label={MODE_LABEL[mode]} hideMeta />

      <section className="py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: uiConfig.accentSoft, color: uiConfig.accent }}
          >
            <Loader2 size={13} className="animate-spin" />
          </span>

          <p className="text-[13px] leading-6 text-[var(--text-secondary)]">
            {detail || '正在建立查询链路并等待上游返回结果。'}
          </p>
        </div>
      </section>
    </div>
  );
}
