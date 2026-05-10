import type { BulkQueryResultData } from '@/types/query';
import type { WhoisResult } from '@/types/whois';

const QUERY_NOTIFICATION_DISMISSED_KEY = 'onefour_query_completion_notification_dismissed';

export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported';

export interface QueryCompletionNotificationState {
  supported: boolean;
  permission: BrowserNotificationPermissionState;
  dismissed: boolean;
  enabled: boolean;
}

function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function readStorageFlag(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeStorageFlag(key: string, value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ignore persistence failures and keep the notification flow usable.
  }
}

function isMeaningfulText(value: string | undefined): value is string {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;

  return !['unknown', 'n/a', 'invalid date'].includes(normalized.toLowerCase());
}

function formatNotificationDate(value: string | undefined): string | null {
  if (!isMeaningfulText(value)) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSingleQueryNotificationBody(query: string, result?: WhoisResult): string {
  const parts: string[] = [];

  if (isMeaningfulText(result?.registrar)) {
    parts.push(`注册商 ${result.registrar.trim()}`);
  }

  const expirationDate = formatNotificationDate(result?.expirationDate);
  if (expirationDate) {
    parts.push(`到期 ${expirationDate}`);
  }

  return parts.join(' · ') || `${query} 的 WHOIS 查询结果已返回`;
}

function buildBulkQueryNotificationBody(data: BulkQueryResultData): string {
  return `已注册 ${data.summary.registered} · 未注册 ${data.summary.available} · 未知 ${data.summary.unknown}`;
}

export function getBrowserNotificationPermissionState(): BrowserNotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function getQueryCompletionNotificationState(): QueryCompletionNotificationState {
  const permission = getBrowserNotificationPermissionState();

  return {
    supported: permission !== 'unsupported',
    permission,
    dismissed: readStorageFlag(QUERY_NOTIFICATION_DISMISSED_KEY),
    enabled: permission === 'granted',
  };
}

export async function requestQueryCompletionNotificationPermission(): Promise<BrowserNotificationPermissionState | 'error'> {
  const currentPermission = getBrowserNotificationPermissionState();

  if (currentPermission === 'unsupported') {
    return 'unsupported';
  }

  if (currentPermission === 'granted') {
    writeStorageFlag(QUERY_NOTIFICATION_DISMISSED_KEY, false);
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      writeStorageFlag(QUERY_NOTIFICATION_DISMISSED_KEY, false);
    }
    return permission;
  } catch {
    return 'error';
  }
}

export function dismissQueryCompletionNotificationPrompt(): void {
  writeStorageFlag(QUERY_NOTIFICATION_DISMISSED_KEY, true);
}

export function showSingleQueryCompletionNotification(query: string, result?: WhoisResult): boolean {
  if (getBrowserNotificationPermissionState() !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification('WHOIS 查询已完成', {
      body: buildSingleQueryNotificationBody(query, result),
      tag: `onefour-single-${query}`,
      icon: '/favicon.svg',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function showBulkQueryCompletionNotification(query: string, data: BulkQueryResultData): boolean {
  if (getBrowserNotificationPermissionState() !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification('批量后缀查询已完成', {
      body: `${query} · ${buildBulkQueryNotificationBody(data)}`,
      tag: `onefour-bulk-${query}`,
      icon: '/favicon.svg',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
