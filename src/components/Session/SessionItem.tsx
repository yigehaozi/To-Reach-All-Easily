import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/useSessionStore';
import { useAppStore } from '@/store/useAppStore';
import type { Session } from '@/types/session';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
}

function formatSessionMeta(updatedAt: number): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const value = date.getTime();

  if (value >= todayStart) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (value >= yesterdayStart) {
    return '昨天';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  return `${String(date.getFullYear()).slice(-2)}/${date.getMonth() + 1}/${date.getDate()}`;
}

export default function SessionItem({ session, isActive }: SessionItemProps) {
  const navigate = useNavigate();
  const { selectSession, deleteSession } = useSessionStore();
  const { setMobileMenuOpen } = useAppStore();
  const sessionMeta = formatSessionMeta(session.updatedAt);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(session.id);
  };

  const handleSelect = () => {
    selectSession(session.id);
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <button
      onClick={handleSelect}
      className={cn(
        'w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded-[6px] text-left group min-h-9',
        'transition-all duration-[var(--transition-fast)]',
        isActive
          ? 'bg-[rgba(86,99,119,0.1)]'
          : 'hover:bg-[var(--bg-overlay-hover)]'
      )}
    >
      <span
        className={cn(
          'text-[13px] font-normal truncate flex-1 min-w-0',
          isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
        )}
      >
        {session.title}
      </span>
      <span className="relative ml-1 w-10 shrink-0 text-right">
        <span
          className={cn(
            'block truncate text-[11px] text-[var(--text-tertiary)] transition-opacity duration-[var(--transition-fast)] group-hover:opacity-0',
            isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
          )}
        >
          {sessionMeta}
        </span>
        <span
          className="absolute inset-y-0 right-0 hidden items-center group-hover:flex"
        >
          <span
            onClick={handleDelete}
            className="flex p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--text-tertiary)] hover:text-red-500"
            title="删除会话"
            role="button"
            tabIndex={0}
          >
            <Trash2 size={14} />
          </span>
        </span>
      </span>
    </button>
  );
}
