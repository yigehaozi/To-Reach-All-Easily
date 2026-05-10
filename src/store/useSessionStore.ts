import { create } from 'zustand';
import type { Session, Message } from '@/types/session';
import type { QueryMode } from '@/types/query';
import {
  getSessions,
  deleteSession as deleteSessionFromStorage,
  createNewSession,
  addMessageToSession,
  updateMessageInSession as updateMessageInSessionInStorage,
} from '@/utils/sessionStorage';

interface ActiveSessionIdByMode {
  single: string | null;
  bulk: string | null;
}

interface SessionState {
  sessions: Session[];
  activeSessionIdByMode: ActiveSessionIdByMode;
  startNewSession: (mode: QueryMode) => Session;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  appendMessageToSession: (sessionId: string, message: Message, fallbackMode?: QueryMode) => Session | null;
  updateMessageInSession: (
    sessionId: string,
    messageId: string,
    updater: (message: Message) => Message
  ) => Session | null;
  ensureActiveSession: (mode: QueryMode) => Session;
}

const initialSessions = getSessions();

function isUnusedSession(session: Session): boolean {
  return session.messages.length === 0;
}

function getFirstSessionByMode(sessions: Session[], mode: QueryMode): Session | null {
  return sessions.find((session) => session.mode === mode) ?? null;
}

function getInitialActiveSessionIdByMode(sessions: Session[]): ActiveSessionIdByMode {
  return {
    single: getFirstSessionByMode(sessions, 'single')?.id ?? null,
    bulk: getFirstSessionByMode(sessions, 'bulk')?.id ?? null,
  };
}

function findReusableSession(
  sessions: Session[],
  mode: QueryMode,
  activeSessionId: string | null
): Session | null {
  const activeSession = activeSessionId
    ? sessions.find((session) => session.id === activeSessionId && session.mode === mode)
    : null;

  if (activeSession && isUnusedSession(activeSession)) {
    return activeSession;
  }

  return sessions.find((session) => session.mode === mode && isUnusedSession(session)) ?? null;
}

function upsertSession(sessions: Session[], nextSession: Session): Session[] {
  return [nextSession, ...sessions.filter((session) => session.id !== nextSession.id)];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: initialSessions,
  activeSessionIdByMode: getInitialActiveSessionIdByMode(initialSessions),

  startNewSession: (mode) => {
    const { sessions, activeSessionIdByMode } = get();
    const reusableSession = findReusableSession(sessions, mode, activeSessionIdByMode[mode]);

    if (reusableSession) {
      set((state) => ({
        activeSessionIdByMode: {
          ...state.activeSessionIdByMode,
          [mode]: reusableSession.id,
        },
      }));
      return reusableSession;
    }

    const session = createNewSession(mode);
    set((state) => ({
      sessions: upsertSession(state.sessions, session),
      activeSessionIdByMode: {
        ...state.activeSessionIdByMode,
        [mode]: session.id,
      },
    }));
    return session;
  },

  selectSession: (id) => {
    const session = get().sessions.find((item) => item.id === id);
    if (!session) return;

    set((state) => ({
      activeSessionIdByMode: {
        ...state.activeSessionIdByMode,
        [session.mode]: session.id,
      },
    }));
  },

  deleteSession: (id) => {
    const deletedSession = get().sessions.find((session) => session.id === id);
    deleteSessionFromStorage(id);

    set((state) => {
      const sessions = state.sessions.filter((session) => session.id !== id);
      const activeSessionIdByMode = { ...state.activeSessionIdByMode };

      if (deletedSession && activeSessionIdByMode[deletedSession.mode] === id) {
        activeSessionIdByMode[deletedSession.mode] =
          getFirstSessionByMode(sessions, deletedSession.mode)?.id ?? null;
      }

      return {
        sessions,
        activeSessionIdByMode,
      };
    });
  },

  appendMessageToSession: (sessionId, message, fallbackMode = 'single') => {
    const updatedSession = addMessageToSession(sessionId, message, fallbackMode);

    if (!updatedSession) {
      return null;
    }

    set((state) => ({
      sessions: upsertSession(state.sessions, updatedSession),
      activeSessionIdByMode: {
        ...state.activeSessionIdByMode,
        [updatedSession.mode]: updatedSession.id,
      },
    }));

    return updatedSession;
  },

  updateMessageInSession: (sessionId, messageId, updater) => {
    const updatedSession = updateMessageInSessionInStorage(sessionId, messageId, updater);

    if (!updatedSession) {
      return null;
    }

    set((state) => ({
      sessions: upsertSession(state.sessions, updatedSession),
      activeSessionIdByMode: {
        ...state.activeSessionIdByMode,
        [updatedSession.mode]: updatedSession.id,
      },
    }));

    return updatedSession;
  },

  ensureActiveSession: (mode) => {
    const { sessions, activeSessionIdByMode } = get();
    const activeId = activeSessionIdByMode[mode];
    const activeSession = activeId
      ? sessions.find((session) => session.id === activeId && session.mode === mode)
      : null;

    if (activeSession) {
      return activeSession;
    }

    const firstSession = getFirstSessionByMode(sessions, mode);

    if (firstSession) {
      set((state) => ({
        activeSessionIdByMode: {
          ...state.activeSessionIdByMode,
          [mode]: firstSession.id,
        },
      }));
      return firstSession;
    }

    const session = createNewSession(mode);
    set((state) => ({
      sessions: upsertSession(state.sessions, session),
      activeSessionIdByMode: {
        ...state.activeSessionIdByMode,
        [mode]: session.id,
      },
    }));
    return session;
  },
}));
