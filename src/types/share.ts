import type { BulkQueryResultData } from './query';
import type { WhoisResult } from './whois';

export type SharedResultMode = 'single' | 'bulk';
export type SharedResultStatus = 'success' | 'error';

interface SharedResultBase {
  mode: SharedResultMode;
  query: string;
  status: SharedResultStatus;
  responseTime?: number;
  source?: string;
  cached?: boolean;
  error?: string;
  rawData?: unknown;
}

export interface SharedWhoisSnapshot extends SharedResultBase {
  mode: 'single';
  result?: WhoisResult;
  rawWhoisContent?: string;
}

export interface SharedBulkSnapshot extends SharedResultBase {
  mode: 'bulk';
  bulkResult?: BulkQueryResultData;
}

export type SharedResultPayload = SharedWhoisSnapshot | SharedBulkSnapshot;

export type StoredSharedResult = SharedResultPayload & {
  id: string;
  createdAt: number;
  expiresAt: number;
};

export interface CreateShareResponse {
  id: string;
  path: string;
  expiresAt: number;
}
