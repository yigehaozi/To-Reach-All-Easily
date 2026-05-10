import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from '@/components/Layout/Sidebar';
import MainContent from '@/components/Layout/MainContent';
import MobileMenu from '@/components/common/MobileMenu';
import LoginModal from '@/components/common/LoginModal';
import Toast from '@/components/common/Toast';
import HomePage from '@/pages/HomePage';
import HistoryPage from '@/pages/HistoryPage';
import TypesPage from '@/pages/TypesPage';
import DocsPage from '@/pages/DocsPage';
import SharedResultPage from '@/pages/SharedResultPage';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { usePwaRegistration } from '@/hooks/usePwaRegistration';

const MOBILE_SIDEBAR_ANIMATION_MS = 220;
type MobileSidebarPhase = 'hidden' | 'entering' | 'entered' | 'exiting';

function StandardAppLayout() {
  const { mobileMenuOpen } = useAppStore();
  const [mobileSidebarPhase, setMobileSidebarPhase] = useState<MobileSidebarPhase>(
    mobileMenuOpen ? 'entered' : 'hidden'
  );
  const mobileSidebarMounted = mobileSidebarPhase !== 'hidden';

  useEffect(() => {
    let timeoutId: number | undefined;

    if (mobileMenuOpen) {
      setMobileSidebarPhase((currentPhase) =>
        currentPhase === 'entered' ? currentPhase : 'entering'
      );
      timeoutId = window.setTimeout(() => {
        setMobileSidebarPhase('entered');
      }, MOBILE_SIDEBAR_ANIMATION_MS);
    } else {
      setMobileSidebarPhase((currentPhase) => {
        if (currentPhase === 'hidden') {
          return currentPhase;
        }

        return 'exiting';
      });
      timeoutId = window.setTimeout(() => {
        setMobileSidebarPhase('hidden');
      }, MOBILE_SIDEBAR_ANIMATION_MS);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-full w-full">
      <div className="hidden shrink-0 md:block">
        <Sidebar />
      </div>

      {mobileSidebarMounted ? (
        <div className="fixed inset-0 z-[1100] md:hidden">
          <button
            type="button"
            className={cn(
              'absolute inset-0 bg-black/18 backdrop-blur-[2px]',
              mobileSidebarPhase === 'entering'
                ? 'animate-mobile-overlay-in'
                : mobileSidebarPhase === 'exiting'
                  ? 'animate-mobile-overlay-out'
                  : 'opacity-100'
            )}
            onClick={() => useAppStore.getState().setMobileMenuOpen(false)}
            aria-label="关闭侧边栏"
          />

          <div
            className={cn(
              'absolute inset-y-3 left-3 w-[min(300px,calc(100vw-48px))] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-neutral)] bg-[var(--bg-secondary)] shadow-[var(--shadow-card)]',
              mobileSidebarPhase === 'entering'
                ? 'animate-mobile-sidebar-in'
                : mobileSidebarPhase === 'exiting'
                  ? 'animate-mobile-sidebar-out'
                  : 'translate-x-0 scale-100 opacity-100'
            )}
            style={{ transformOrigin: 'left center' }}
          >
            <Sidebar mobileOverlay />
          </div>
        </div>
      ) : null}

      <MobileMenu />
      <MainContent><Outlet /></MainContent>
      <LoginModal />
    </div>
  );
}

export default function App() {
  usePwaRegistration();

  return (
    <Router>
      <Routes>
        <Route path="/share/:shareId" element={<SharedResultPage />} />
        <Route element={<StandardAppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/types" element={<TypesPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>
      </Routes>
      <Toast />
    </Router>
  );
}
