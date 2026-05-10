import { Monitor, Sun, Moon, PanelLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import QueryModeToggle from './QueryModeToggle';

const THEME_MODE_LABELS = {
  system: '跟随设备',
  light: '浅色模式',
  dark: '深色模式',
} as const;

const NEXT_THEME_MODE = {
  system: 'light',
  light: 'dark',
  dark: 'system',
} as const;

export default function SidebarHeader() {
  const { toggleSidebar, setMobileMenuOpen } = useAppStore();
  const { themeMode, resolvedTheme, toggleTheme } = useTheme();
  const nextThemeMode = NEXT_THEME_MODE[themeMode];
  const currentThemeLabel =
    themeMode === 'system' ? `${THEME_MODE_LABELS.system}（${resolvedTheme === 'dark' ? '深色' : '浅色'}）` : THEME_MODE_LABELS[themeMode];

  return (
    <div className="flex items-center justify-between px-3 h-[56px] shrink-0">
      <QueryModeToggle />

      <div className="hidden items-center gap-1 md:flex">
        <button
          onClick={toggleTheme}
          className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)] transition-colors duration-[var(--transition-fast)]"
          title={`当前主题：${currentThemeLabel}，点击切换到${THEME_MODE_LABELS[nextThemeMode]}`}
          aria-label={`当前主题：${currentThemeLabel}，点击切换到${THEME_MODE_LABELS[nextThemeMode]}`}
        >
          {themeMode === 'system' ? (
            <Monitor size={16} />
          ) : themeMode === 'dark' ? (
            <Sun size={16} />
          ) : (
            <Moon size={16} />
          )}
        </button>
        <button
          onClick={toggleSidebar}
          className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)] transition-colors duration-[var(--transition-fast)]"
          title="收起侧边栏"
        >
          <PanelLeft size={16} />
        </button>
      </div>

      <button
        onClick={() => setMobileMenuOpen(false)}
        className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)] md:hidden"
        title="收起侧边栏"
        aria-label="收起侧边栏"
      >
        <PanelLeft size={15} />
      </button>
    </div>
  );
}
