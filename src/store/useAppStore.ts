import { create } from 'zustand';
import type { QueryMode } from '@/types/query';

const QUERY_MODE_STORAGE_KEY = 'onefour_query_mode';

function getInitialQueryMode(): QueryMode {
  if (typeof window === 'undefined') {
    return 'single';
  }

  try {
    return window.localStorage.getItem(QUERY_MODE_STORAGE_KEY) === 'bulk' ? 'bulk' : 'single';
  } catch {
    return 'single';
  }
}

function persistQueryMode(mode: QueryMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(QUERY_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore persistence failures and keep UI responsive.
  }
}

interface AppState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  loginModalOpen: boolean;
  sessionInsightsOpen: boolean;
  sessionShellActive: boolean;
  queryMode: QueryMode;
  activeNav: string;
  toggleSidebar: () => void;
  toggleSessionInsights: () => void;
  toggleQueryMode: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setLoginModalOpen: (open: boolean) => void;
  setSessionInsightsOpen: (open: boolean) => void;
  setSessionShellActive: (active: boolean) => void;
  setQueryMode: (mode: QueryMode) => void;
  setActiveNav: (nav: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  loginModalOpen: false,
  sessionInsightsOpen: false,
  sessionShellActive: false,
  queryMode: getInitialQueryMode(),
  activeNav: 'query',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleSessionInsights: () => set((state) => ({ sessionInsightsOpen: !state.sessionInsightsOpen })),
  toggleQueryMode: () =>
    set((state) => {
      const queryMode = state.queryMode === 'single' ? 'bulk' : 'single';
      persistQueryMode(queryMode);
      return { queryMode };
    }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  setSessionInsightsOpen: (open) => set({ sessionInsightsOpen: open }),
  setSessionShellActive: (active) => set({ sessionShellActive: active }),
  setQueryMode: (queryMode) => {
    persistQueryMode(queryMode);
    set({ queryMode });
  },
  setActiveNav: (nav) => set({ activeNav: nav }),
}));
