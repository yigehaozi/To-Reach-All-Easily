import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'types', label: '查询类型', icon: Layers, path: '/types' },
  { id: 'docs', label: 'API 文档', icon: FileText, path: '/docs' },
];

export default function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveNav, setMobileMenuOpen } = useAppStore();

  const handleNav = (item: typeof navItems[0]) => {
    setActiveNav(item.id);
    navigate(item.path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="shrink-0 px-2 pb-2 pt-3">
      <nav className="flex flex-col gap-0.5 rounded-[10px] bg-[rgba(86,99,119,0.04)] px-2 py-2 dark:bg-[rgba(255,255,255,0.04)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={cn(
                'flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-[12px] font-medium transition-all duration-[var(--transition-fast)] w-full text-left',
                isActive
                  ? 'bg-[rgba(86,99,119,0.1)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)]'
              )}
            >
              <Icon size={15} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
