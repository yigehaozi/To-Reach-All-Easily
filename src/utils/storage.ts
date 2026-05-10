import type { QueryRecord } from '@/types/whois';

const STORAGE_KEY = 'onefour_query_history';
const MAX_RECORDS = 50;

export function getHistory(): QueryRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveQuery(record: QueryRecord): void {
  const history = getHistory();
  const existing = history.findIndex((h) => h.query === record.query);
  if (existing >= 0) {
    history.splice(existing, 1);
  }
  history.unshift(record);
  if (history.length > MAX_RECORDS) {
    history.splice(MAX_RECORDS);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function deleteQuery(id: string): void {
  const history = getHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
