import { useSessionStore } from '@/store/useSessionStore';
import { useAppStore } from '@/store/useAppStore';
import SessionItem from './SessionItem';
import { getQueryModeLabel } from '@/utils/queryMode';

export default function SessionList() {
  const { sessions, activeSessionIdByMode } = useSessionStore();
  const { queryMode } = useAppStore();
  const visibleSessions = sessions.filter((session) => session.mode === queryMode);
  const activeSessionId = activeSessionIdByMode[queryMode];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {visibleSessions.length === 0 ? (
          <div className="px-2 py-6 text-[12px] leading-5 text-[var(--text-tertiary)]">
            还没有{getQueryModeLabel(queryMode)}会话，点击上方“新建查询”开始。
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visibleSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
