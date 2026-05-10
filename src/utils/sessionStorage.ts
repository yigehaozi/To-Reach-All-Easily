import type { Session, Message, AssistantMessageStatus, MessageKind } from '@/types/session';
import type { WhoisResult } from '@/types/whois';
import type { BulkQueryResultData, QueryMode } from '@/types/query';

const STORAGE_KEY = 'onefour_sessions';

interface AssistantMessageInput {
  content: string;
  queryMode?: QueryMode;
  kind?: MessageKind;
  summary?: string;
  result?: WhoisResult;
  bulkResult?: BulkQueryResultData;
  rawData?: unknown;
  rawWhoisContent?: string;
  error?: string;
  responseTime?: number;
  source?: string;
  cached?: boolean;
  status?: AssistantMessageStatus;
}

function normalizeQueryMode(mode: unknown): QueryMode {
  return mode === 'bulk' ? 'bulk' : 'single';
}

function isModeMatchedUserMessage(message: Message, mode: QueryMode): boolean {
  if (message.role !== 'user') {
    return false;
  }

  if (mode === 'bulk') {
    return message.queryMode === 'bulk';
  }

  return message.queryMode !== 'bulk';
}

function normalizeMessage(input: unknown, sessionMode: QueryMode): Message | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<Message>;

  if (typeof raw.id !== 'string' || typeof raw.role !== 'string') {
    return null;
  }

  return {
    ...raw,
    id: raw.id,
    role: raw.role === 'assistant' ? 'assistant' : 'user',
    content: typeof raw.content === 'string' ? raw.content : '',
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
    queryMode: normalizeQueryMode(raw.queryMode ?? sessionMode),
    kind: raw.kind === 'bulk' ? 'bulk' : raw.kind === 'whois' ? 'whois' : undefined,
    status:
      raw.status === 'error'
        ? 'error'
        : raw.status === 'success'
          ? 'success'
          : raw.status === 'pending'
            ? 'pending'
            : undefined,
  };
}

function normalizeSession(input: unknown): Session | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<Session>;

  if (typeof raw.id !== 'string') {
    return null;
  }

  const mode = normalizeQueryMode(raw.mode);
  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .map((message) => normalizeMessage(message, mode))
        .filter((message): message is Message => Boolean(message))
    : [];

  return {
    id: raw.id,
    title: generateTitle(messages, mode),
    mode,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    messages,
  };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generateTitle(messages: Message[], mode: QueryMode): string {
  const firstUserMessage =
    messages.find((message) => isModeMatchedUserMessage(message, mode)) ??
    messages.find((message) => message.role === 'user');
  if (!firstUserMessage) {
    return '新会话';
  }

  const content = firstUserMessage.content.trim();
  return content.length > 30 ? `${content.substring(0, 30)}…` : content || '新会话';
}

export function getSessions(): Session[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);
    return Array.isArray(parsed)
      ? parsed
          .map((session) => normalizeSession(session))
          .filter((session): session is Session => Boolean(session))
      : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session): void {
  const sessions = getSessions().filter((item) => item.id !== session.id);
  const updatedSession: Session = {
    ...session,
    mode: normalizeQueryMode(session.mode),
    title: generateTitle(session.messages, normalizeQueryMode(session.mode)),
    updatedAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify([updatedSession, ...sessions]));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((session) => session.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function createNewSession(mode: QueryMode = 'single'): Session {
  const now = Date.now();
  const session: Session = {
    id: generateId(),
    title: '新会话',
    mode,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  saveSession(session);
  return session;
}

export function addMessageToSession(
  sessionId: string,
  message: Message,
  fallbackMode: QueryMode = 'single'
): Session {
  const sessions = getSessions();
  let session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    session = createNewSession(fallbackMode);
  }

  const nextSession: Session = {
    ...session,
    mode: normalizeQueryMode(session.mode ?? fallbackMode),
    messages: [...session.messages, { ...message, queryMode: normalizeQueryMode(message.queryMode ?? session.mode) }],
  };

  saveSession(nextSession);

  return {
    ...nextSession,
    title: generateTitle(nextSession.messages, nextSession.mode),
    updatedAt: Date.now(),
  };
}

export function updateMessageInSession(
  sessionId: string,
  messageId: string,
  updater: (message: Message) => Message
): Session | null {
  const sessions = getSessions();
  const session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    return null;
  }

  let updated = false;
  const messages = session.messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    updated = true;
    return {
      ...updater(message),
      id: message.id,
      role: message.role,
      queryMode: normalizeQueryMode(message.queryMode ?? session.mode),
    };
  });

  if (!updated) {
    return null;
  }

  const nextSession: Session = {
    ...session,
    messages,
  };

  saveSession(nextSession);

  return {
    ...nextSession,
    title: generateTitle(nextSession.messages, nextSession.mode),
    updatedAt: Date.now(),
  };
}

export type DateGroup = 'today' | 'yesterday' | 'earlier';

export interface SessionGroup {
  label: string;
  sessions: Session[];
}

export function groupSessionsByDate(sessions: Session[]): SessionGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: Record<DateGroup, Session[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  sessions.forEach((session) => {
    if (session.updatedAt >= today) {
      groups.today.push(session);
    } else if (session.updatedAt >= yesterday) {
      groups.yesterday.push(session);
    } else {
      groups.earlier.push(session);
    }
  });

  const result: SessionGroup[] = [];
  if (groups.today.length > 0) result.push({ label: '今天', sessions: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: '昨天', sessions: groups.yesterday });
  if (groups.earlier.length > 0) result.push({ label: '更早', sessions: groups.earlier });

  return result;
}

export function createUserMessage(content: string, queryMode: QueryMode = 'single'): Message {
  return {
    id: generateId(),
    role: 'user',
    content,
    timestamp: Date.now(),
    queryMode,
  };
}

export function createAssistantMessage({
  content,
  queryMode,
  kind,
  summary,
  result,
  bulkResult,
  rawData,
  rawWhoisContent,
  error,
  responseTime,
  source,
  cached,
  status,
}: AssistantMessageInput): Message {
  return {
    id: generateId(),
    role: 'assistant',
    content,
    queryMode,
    kind,
    summary,
    timestamp: Date.now(),
    result,
    bulkResult,
    rawData: rawData ?? result,
    rawWhoisContent,
    error,
    responseTime,
    source,
    cached,
    status,
  };
}
