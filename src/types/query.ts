export type QueryMode = 'single' | 'bulk';

export type BulkCheckStatus = 'registered' | 'available' | 'unknown';
export type BulkGroupKey = 'generic' | 'country' | 'new' | 'idn';

export interface SupportedTldItem {
  tld: string;
  category?: string;
}

export interface BulkCheckItem {
  tld: string;
  fullDomain: string;
  status: BulkCheckStatus;
  queryTimeMs: number;
}

export interface BulkGroupSummary {
  total: number;
  registered: number;
  available: number;
  unknown: number;
}

export interface BulkGroupResult {
  key: BulkGroupKey;
  label: string;
  items: BulkCheckItem[];
  summary: BulkGroupSummary;
  error?: string;
}

export interface BulkQueryResultData {
  query: string;
  checkedAt: number;
  summary: BulkGroupSummary;
  groups: BulkGroupResult[];
}
