import { useState, useRef, useEffect, forwardRef, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import type { QueryMode } from '@/types/query';
import { QUERY_MODE_HINTS, QUERY_MODE_PLACEHOLDERS, getQueryModeUiConfig } from '@/utils/queryMode';

interface QueryInputProps {
  onQuery: (domain: string) => void;
  loading: boolean;
  mode: QueryMode;
}

const QueryInput = forwardRef<HTMLTextAreaElement, QueryInputProps>(
  function QueryInput({ onQuery, loading, mode }, ref) {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const config = getQueryModeUiConfig(mode);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }, [value]);

    const handleSearch = () => {
      const trimmed = value.trim();
      if (!trimmed || loading) return;
      onQuery(trimmed);
      setValue('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSearch();
      }
    };

    const style = {
      '--query-accent': config.accent,
      '--query-accent-soft': config.accentSoft,
      '--query-accent-soft-hover': config.accentSoftHover,
      '--query-focus-shadow': config.focusShadow,
    } as CSSProperties;

    return (
      <div className="mx-auto w-full max-w-[860px]">
        <div
          className="relative rounded-[var(--radius-xl)] border border-[var(--border-neutral-l3)] bg-[var(--bg-base)] transition-all duration-[var(--transition-normal)] input-shadow focus-within:border-[var(--query-accent)] focus-within:shadow-[var(--query-focus-shadow)]"
          style={style}
        >
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={(node) => {
                (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
              }}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={QUERY_MODE_PLACEHOLDERS[mode]}
              disabled={loading}
              rows={1}
              className="w-full resize-none bg-transparent text-[13px] leading-[22px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-60"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">{QUERY_MODE_HINTS[mode]}</span>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!value.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--query-accent-soft)] text-[var(--query-accent)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--query-accent-soft-hover)] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={mode === 'bulk' ? '开始批量后缀查询' : '开始单域名查询'}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default QueryInput;
