import { AlignJustify, PanelLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import QueryModeToggle from '@/components/Layout/QueryModeToggle';

interface SessionConversationHeaderProps {
  title: string;
  lastConversationTime: string;
  insightsOpen: boolean;
  onToggleInsights: () => void;
  showInsightsToggle: boolean;
}

export default function SessionConversationHeader({
  title,
  lastConversationTime,
  insightsOpen,
  onToggleInsights,
  showInsightsToggle,
}: SessionConversationHeaderProps) {
  const { sidebarCollapsed, toggleSidebar, setMobileMenuOpen } = useAppStore();

  return (
    <div className="shrink-0 border-b border-[var(--border-neutral)] px-3 lg:px-6">
      <div className="flex h-12 items-center justify-between gap-3 lg:h-10 lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <QueryModeToggle />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]"
              title="展开侧边栏"
              aria-label="展开侧边栏"
            >
              <PanelLeft size={15} />
            </button>
          </div>

          {sidebarCollapsed ? (
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <QueryModeToggle />
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]"
                title="展开侧边栏"
                aria-label="展开侧边栏"
              >
                <PanelLeft size={16} />
              </button>
            </div>
          ) : null}

          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-[15px] font-semibold text-[var(--text-primary)] lg:text-[13px] lg:font-medium">
              {title}
            </h1>
            {lastConversationTime ? (
              <span className="shrink-0 text-[11px] text-[var(--text-tertiary)] lg:text-[11px]">
                {lastConversationTime}
              </span>
            ) : null}
          </div>
        </div>

        {showInsightsToggle ? (
          <button
            onClick={onToggleInsights}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]"
            title={insightsOpen ? '收起右侧边栏' : '展开右侧边栏'}
            aria-label={insightsOpen ? '收起右侧边栏' : '展开右侧边栏'}
          >
            <span className="hidden lg:inline-flex">
              {insightsOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </span>
            <span className="inline-flex lg:hidden">
              <AlignJustify size={15} />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
