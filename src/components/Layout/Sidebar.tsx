import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import SessionList from '@/components/Session/SessionList';
import SidebarNav from './SidebarNav';
import { useAppStore } from '@/store/useAppStore';
import { useSessionStore } from '@/store/useSessionStore';
import { cn } from '@/lib/utils';

interface SidebarProps {
  mobileOverlay?: boolean;
}

export default function Sidebar({ mobileOverlay = false }: SidebarProps) {
  const navigate = useNavigate();
  const { sidebarCollapsed, setMobileMenuOpen, queryMode } = useAppStore();
  const { startNewSession } = useSessionStore();

  const handleNewQuery = () => {
    startNewSession(queryMode);
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-[var(--bg-secondary)] shrink-0 overflow-hidden',
        'transition-[width,opacity,min-width] duration-200 ease-in-out',
        mobileOverlay
          ? 'w-full min-w-0 opacity-100'
          : sidebarCollapsed
            ? 'w-0 min-w-0 opacity-0'
            : 'w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] opacity-100'
      )}
    >
      <SidebarHeader />
      <div className="px-3 pb-4 pt-1 shrink-0">
        <button
          onClick={handleNewQuery}
          className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--bg-base)] px-3 py-2 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
        >
          <Search size={15} strokeWidth={1.9} />
          <span>新建查询</span>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!sidebarCollapsed && (
          <>
            <div className="flex-1 min-h-0">
              <SessionList />
            </div>
            <SidebarNav />
          </>
        )}
      </div>
      <SidebarFooter />
    </aside>
  );
}
