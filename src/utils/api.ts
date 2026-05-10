import type {
  WhoisResponse,
  QueryRecord,
  AuthResult,
  LoginParams,
  UserInfo,
  HistoryResult,
  HistoryParams,
} from '@/types/whois';
import type {
  BulkCheckItem,
  BulkGroupKey,
  BulkGroupSummary,
  BulkQueryResultData,
  QueryMode,
  SupportedTldItem,
} from '@/types/query';

export const PUBLIC_API_BASE = import.meta.env.VITE_PUBLIC_API_BASE || 'https://yisi.yun';
const API_BASE = import.meta.env.VITE_API_BASE || '';
const INTERNAL_REQUEST_HEADER = 'x-onefour-request';
const INTERNAL_REQUEST_VALUE = '1';

interface SupportedTldResponse {
  success?: boolean;
  data?: SupportedTldItem[];
}

interface BulkDnsCheckResponse {
  success: boolean;
  domain: string;
  results: BulkCheckItem[];
  error?: string;
}

export interface DocsLookupPlaygroundResult {
  url: string;
  status: number;
  statusText: string;
  responseTime: number;
  data: unknown;
}

export interface QueryStreamProgressEvent {
  mode: QueryMode;
  phase: string;
  label: string;
  detail: string;
  timestamp: number;
  groupKey?: BulkGroupKey;
  summary?: BulkGroupSummary;
}

interface StreamRequestOptions {
  onProgress?: (event: QueryStreamProgressEvent) => void;
  headers?: HeadersInit;
}

interface ParsedSseEvent {
  event: string;
  data: unknown;
}

function resolveRequestUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }

  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveRequestUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      [INTERNAL_REQUEST_HEADER]: INTERNAL_REQUEST_VALUE,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败 (${response.status})`);
  }

  return response.json();
}

async function parseErrorPayload(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as { error?: string; code?: string };
      return data.error || data.code || `请求失败 (${response.status})`;
    } catch {
      return `请求失败 (${response.status})`;
    }
  }

  try {
    const text = await response.text();
    return text.trim() || `请求失败 (${response.status})`;
  } catch {
    return `请求失败 (${response.status})`;
  }
}

function parseSseBlock(block: string): ParsedSseEvent | null {
  const trimmedBlock = block.trim();

  if (!trimmedBlock) {
    return null;
  }

  let eventName = 'message';
  const dataLines: string[] = [];

  trimmedBlock.split('\n').forEach((line) => {
    const normalizedLine = line.replace(/\r$/, '');

    if (normalizedLine.startsWith('event:')) {
      eventName = normalizedLine.slice(6).trim();
      return;
    }

    if (normalizedLine.startsWith('data:')) {
      dataLines.push(normalizedLine.slice(5).trimStart());
    }
  });

  if (!dataLines.length) {
    return null;
  }

  const rawData = dataLines.join('\n');

  try {
    return {
      event: eventName,
      data: JSON.parse(rawData),
    };
  } catch {
    return {
      event: eventName,
      data: rawData,
    };
  }
}

async function requestSseResult<T>(path: string, options: StreamRequestOptions = {}): Promise<T> {
  const response = await fetch(resolveRequestUrl(path), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      [INTERNAL_REQUEST_HEADER]: INTERNAL_REQUEST_VALUE,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorPayload(response));
  }

  if (!response.body) {
    throw new Error('SSE 响应为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultPayload: T | null = null;
  let streamError = '';

  const consumeBlock = (block: string) => {
    const parsedEvent = parseSseBlock(block);

    if (!parsedEvent) {
      return;
    }

    if (parsedEvent.event === 'progress') {
      options.onProgress?.(parsedEvent.data as QueryStreamProgressEvent);
      return;
    }

    if (parsedEvent.event === 'result') {
      resultPayload = parsedEvent.data as T;
      return;
    }

    if (parsedEvent.event === 'error') {
      const errorPayload = parsedEvent.data as { message?: string; error?: string } | string;
      streamError =
        typeof errorPayload === 'string'
          ? errorPayload
          : errorPayload.message || errorPayload.error || '查询失败';
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const blocks = buffer.split(/\n\n/);
    buffer = blocks.pop() ?? '';

    blocks.forEach(consumeBlock);

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    consumeBlock(buffer);
  }

  if (streamError) {
    throw new Error(streamError);
  }

  if (resultPayload === null) {
    throw new Error('查询中断，未收到最终结果');
  }

  return resultPayload;
}

export async function lookupWhois(query: string): Promise<WhoisResponse> {
  return requestJson<WhoisResponse>(`/api/lookup?query=${encodeURIComponent(query)}`, {
    method: 'GET',
  });
}

export async function streamWhoisLookup(
  query: string,
  options: StreamRequestOptions = {}
): Promise<WhoisResponse> {
  return requestSseResult<WhoisResponse>(`/api/lookup/stream?query=${encodeURIComponent(query)}`, {
    ...options,
    headers: {
      'x-user-initiated': 'true',
      'x-query-source': 'session-single',
      ...(options.headers ?? {}),
    },
  });
}

export function buildLookupRequestPath(query: string): string {
  return `/api/lookup?query=${encodeURIComponent(query)}`;
}

export async function lookupWhoisForDocs(query: string): Promise<DocsLookupPlaygroundResult> {
  const trimmedQuery = query.trim();
  const path = buildLookupRequestPath(trimmedQuery);
  const url = resolveRequestUrl(path);
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [INTERNAL_REQUEST_HEADER]: INTERNAL_REQUEST_VALUE,
        'x-user-initiated': 'true',
        'x-query-source': 'api-docs',
      },
    });

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      data = { error: '响应不是有效 JSON' };
    }

    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      responseTime: Number((finishedAt - startedAt).toFixed(2)),
      data,
    };
  } catch (error) {
    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return {
      url,
      status: 0,
      statusText: 'Network Error',
      responseTime: Number((finishedAt - startedAt).toFixed(2)),
      data: {
        error: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

export async function fetchSupportedTlds(): Promise<SupportedTldItem[]> {
  const response = await requestJson<SupportedTldResponse>('/api/supported-tlds?status=enabled&limit=10000', {
    method: 'GET',
  });

  return response.data ?? [];
}

export async function bulkDnsCheck(
  domain: string,
  tlds: string[],
  group?: BulkGroupKey
): Promise<BulkDnsCheckResponse> {
  return requestJson<BulkDnsCheckResponse>('/api/bulk-dns-check', {
    method: 'POST',
    headers: {
      'x-user-initiated': 'true',
      'x-query-source': 'session-bulk',
    },
    body: JSON.stringify({ domain, tlds, group }),
  });
}

export async function streamBulkLookup(
  query: string,
  options: StreamRequestOptions = {}
): Promise<BulkQueryResultData> {
  return requestSseResult<BulkQueryResultData>(
    `/api/bulk-dns-check/stream?query=${encodeURIComponent(query)}`,
    {
      ...options,
      headers: {
        'x-user-initiated': 'true',
        'x-query-source': 'session-bulk',
        ...(options.headers ?? {}),
      },
    }
  );
}

export const authApi = {
  login: async (params: LoginParams): Promise<AuthResult> => {
    void params;
    await new Promise((_, reject) => reject(new Error('Auth not implemented')));
    return { success: false };
  },
  logout: async (): Promise<void> => {
    throw new Error('Auth not implemented');
  },
  getUser: async (): Promise<UserInfo> => {
    throw new Error('Auth not implemented');
  },
};

export const historyApi = {
  getHistory: async (params?: HistoryParams): Promise<HistoryResult> => {
    void params;
    throw new Error('History API not implemented - using local storage');
  },
  saveHistory: async (record: QueryRecord): Promise<void> => {
    void record;
    throw new Error('History API not implemented - using local storage');
  },
  deleteHistory: async (id: string): Promise<void> => {
    void id;
    throw new Error('History API not implemented - using local storage');
  },
};
