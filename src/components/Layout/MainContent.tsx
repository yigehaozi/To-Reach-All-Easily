import { ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import QueryModeToggle from './QueryModeToggle';

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { sidebarCollapsed, toggleSidebar, sessionShellActive, setMobileMenuOpen } = useAppStore();

  return (
    <main className="flex-1 h-full overflow-hidden bg-[var(--bg-secondary)] p-2">
      <div
        id="onefour-main-shell"
        className="h-full bg-[var(--bg-base)] rounded-[var(--radius-lg)] overflow-hidden flex flex-col"
      >
        {!sessionShellActive ? (
          <header className="h-[48px] shrink-0 flex items-center justify-between px-3">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex items-center">
                <QueryModeToggle />
              </div>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="打开侧边栏"
                aria-label="打开侧边栏"
              >
                <PanelLeft size={16} />
              </button>
            </div>
            <div
              className={`hidden items-center gap-3 transition-all duration-200 md:flex ${
                sidebarCollapsed ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              <div className="flex items-center">
                <QueryModeToggle />
              </div>
              <button
                onClick={toggleSidebar}
                className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="展开侧边栏"
              >
                <PanelLeft size={16} />
              </button>
            </div>
            <div className="flex-1" />
            <div />
          </header>
        ) : null}
        <div className={`flex-1 ${sessionShellActive ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
          {children}
        </div>
      </div>
    </main>
  );
}
