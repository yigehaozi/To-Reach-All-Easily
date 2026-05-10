import type { WhoisResult } from './whois';
import type { BulkQueryResultData, QueryMode } from './query';

export type MessageRole = 'user' | 'assistant';
export type AssistantMessageStatus = 'pending' | 'success' | 'error';
export type MessageKind = 'whois' | 'bulk';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
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

export interface Session {
  id: string;
  title: string;
  mode: QueryMode;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}
