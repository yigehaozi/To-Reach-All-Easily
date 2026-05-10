import type { CreateShareResponse, SharedResultPayload, StoredSharedResult } from '@/types/share';

const INTERNAL_REQUEST_HEADER = 'x-onefour-request';
const INTERNAL_REQUEST_VALUE = '1';
const API_BASE = import.meta.env.VITE_API_BASE || '';

function resolveRequestUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }

  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).toString();
  }

  return path;
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

export class ShareRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ShareRequestError';
    this.status = status;
  }
}

export async function createShare(payload: SharedResultPayload): Promise<CreateShareResponse> {
  const response = await fetch(resolveRequestUrl('/api/shares'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [INTERNAL_REQUEST_HEADER]: INTERNAL_REQUEST_VALUE,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ShareRequestError(response.status, await parseErrorPayload(response));
  }

  return response.json();
}

export async function fetchSharedResult(shareId: string): Promise<StoredSharedResult> {
  const response = await fetch(resolveRequestUrl(`/api/shares/${encodeURIComponent(shareId)}`), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new ShareRequestError(response.status, await parseErrorPayload(response));
  }

  return response.json();
}

export function buildAbsoluteShareUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}

export function isLikelyTouchDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  if (navigator.maxTouchPoints > 0) {
    return true;
  }

  return /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function supportsNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareUrlWithNativeSheet(url: string, title?: string): Promise<void> {
  if (!supportsNativeShare()) {
    throw new Error('当前环境不支持系统分享');
  }

  await navigator.share({
    title: title || 'OneFour 分享结果',
    url,
  });
}

export function isShareAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('当前环境不支持剪贴板');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('复制失败');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
