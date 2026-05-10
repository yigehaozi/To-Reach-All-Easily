import type { AssistantMessageStatus } from '@/types/session';
import type { WhoisResult } from '@/types/whois';
import type { SharedWhoisSnapshot } from '@/types/share';
import { buildWhoisDisplayCopyText, buildWhoisDisplaySections } from '@/utils/whoisDisplay';
import ResultCard from './ResultCard';
import ResponseHeader from './ResponseHeader';
import CompletionStatus from './CompletionStatus';

interface QueryResultProps {
  query: string;
  data?: WhoisResult;
  rawData?: unknown;
  rawWhoisContent?: string;
  responseTime?: number;
  cached?: boolean;
  source?: string;
  error?: string;
  status?: AssistantMessageStatus;
  onRefresh?: () => void;
  readOnly?: boolean;
}

function resolveRawWhoisContent(
  rawWhoisContent?: string,
  rawData?: unknown,
  data?: WhoisResult
): string | undefined {
  if (typeof rawWhoisContent === 'string' && rawWhoisContent.trim()) {
    return rawWhoisContent;
  }

  if (typeof data?.rawWhoisContent === 'string' && data.rawWhoisContent.trim()) {
    return data.rawWhoisContent;
  }

  if (
    rawData &&
    typeof rawData === 'object' &&
    'rawWhoisContent' in rawData &&
    typeof (rawData as Record<string, unknown>).rawWhoisContent === 'string'
  ) {
    const fallbackValue = (rawData as Record<string, string>).rawWhoisContent;
    return fallbackValue.trim() ? fallbackValue : undefined;
  }

  return undefined;
}

function looksLikeWhoisFailure(data?: WhoisResult): boolean {
  if (!data) return false;

  const registrar = typeof data.registrar === 'string' ? data.registrar : '';
  const whoisServer = typeof data.whoisServer === 'string' ? data.whoisServer : '';

  return whoisServer === 'api.error' || registrar.includes('API Error');
}

function getFailureMessage(data?: WhoisResult, error?: string): string {
  if (error?.trim()) {
    return error;
  }

  if (looksLikeWhoisFailure(data)) {
    return 'WHOIS 查询失败，上游接口未返回有效结果。';
  }

  return '查询失败，请稍后重试。';
}

export default function QueryResult({
  query,
  data,
  rawData,
  rawWhoisContent,
  responseTime,
  cached,
  source,
  error,
  status = 'success',
  onRefresh,
  readOnly = false,
}: QueryResultProps) {
  const isError = status === 'error' || Boolean(error) || looksLikeWhoisFailure(data);
  const resolvedRawWhoisContent = resolveRawWhoisContent(rawWhoisContent, rawData, data);
  const failureMessage = getFailureMessage(data, error);
  const displaySections = buildWhoisDisplaySections(data);
  const copyText = isError
    ? `查询：${query}\n\n${failureMessage}`
    : `查询：${query}\n\n${buildWhoisDisplayCopyText(data)}`;
  const sharePayload: SharedWhoisSnapshot = {
    mode: 'single',
    query,
    status: isError ? 'error' : 'success',
    result: data,
    rawWhoisContent: resolvedRawWhoisContent,
    rawData: rawData ?? data,
    error: isError ? failureMessage : undefined,
    responseTime,
    source,
    cached,
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden animate-fade-in">
      <ResponseHeader
        responseTime={responseTime}
        cached={cached}
        source={source}
        status={isError ? 'error' : 'success'}
      />

      <div className="space-y-4">
        {isError ? (
          <div className="rounded-[6px] border border-red-500/20 bg-red-500/5 px-4 py-4 text-[13px] leading-6 text-red-500">
            {failureMessage}
          </div>
        ) : data ? (
          <div>
            {displaySections.map((section) => (
              <ResultCard key={section.key} title={section.title}>
                <div className="space-y-3">
                  {section.blocks.map((block, blockIndex) => (
                    <div key={`${section.key}-${block.title ?? 'default'}-${blockIndex}`}>
                      {block.title ? (
                        <div className="mb-1.5 text-[12px] text-[var(--text-tertiary)]">{block.title}</div>
                      ) : null}

                      <div className="space-y-2.5">
                        {block.fields.map((field) => (
                          <div key={field.key} className="flex items-start gap-4">
                            <span className="w-24 shrink-0 whitespace-nowrap text-[12px] text-[var(--text-tertiary)]">
                              {field.label}
                            </span>
                            {field.variant === 'tags' && Array.isArray(field.value) ? (
                              <div className="flex flex-wrap gap-1.5">
                                {field.value.map((item, index) => (
                                  <span
                                    key={`${field.key}-${item}-${index}`}
                                    className="rounded-full bg-[var(--bg-overlay)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="break-all font-mono text-[13px] text-[var(--text-primary)]">
                                {field.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ResultCard>
            ))}
          </div>
        ) : null}
      </div>

      <CompletionStatus
        query={query}
        rawWhoisContent={resolvedRawWhoisContent}
        copyText={copyText}
        onRefresh={onRefresh}
        sharePayload={sharePayload}
        readOnly={readOnly}
      />
    </div>
  );
}
