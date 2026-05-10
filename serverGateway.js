import { createStoredShare, getStoredShare } from './serverShareStore.js';

export const DEFAULT_UPSTREAM_API_ORIGIN = 'https://yisi.yun';
export const DEFAULT_UPSTREAM_API_KEY = '';
export const INTERNAL_REQUEST_HEADER_NAME = 'x-onefour-request';
export const INTERNAL_REQUEST_HEADER_VALUE = '1';
export const BULK_GROUP_KEYS = ['generic', 'country', 'new', 'idn'];

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const OLD_TLDS = new Set(['com', 'net', 'org', 'info', 'biz', 'name', 'pro', 'aero', 'coop', 'museum']);
const GROUP_LABELS = {
  generic: '通用后缀',
  country: '国家地区',
  new: '新后缀',
  idn: '国际化后缀',
};
const STATUS_ORDER = {
  available: 0,
  registered: 1,
  unknown: 2,
};

export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function isAllowedInternalApiRequest(req) {
  const headerValue = req.headers[INTERNAL_REQUEST_HEADER_NAME];

  if (Array.isArray(headerValue)) {
    return headerValue.includes(INTERNAL_REQUEST_HEADER_VALUE);
  }

  return headerValue === INTERNAL_REQUEST_HEADER_VALUE;
}

export function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve(undefined);
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

export function buildUpstreamHeaders(req, upstreamApiKey) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (
      HOP_BY_HOP_HEADERS.has(normalizedKey) ||
      normalizedKey === 'host' ||
      normalizedKey === 'content-length' ||
      normalizedKey === 'origin' ||
      normalizedKey === 'referer' ||
      normalizedKey === INTERNAL_REQUEST_HEADER_NAME
    ) {
      continue;
    }

    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  headers.set('accept-encoding', 'identity');

  if (req.headers.host) {
    headers.set('x-forwarded-host', req.headers.host);
  }

  headers.set('x-forwarded-proto', 'https');

  if (req.socket?.remoteAddress) {
    headers.set('x-forwarded-for', req.socket.remoteAddress);
  }

  if (upstreamApiKey) {
    headers.set('x-api-key', upstreamApiKey);
  }

  return headers;
}

async function parseJsonResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      status: false,
      code: 'INVALID_UPSTREAM_JSON',
      error: text || '上游响应不是有效 JSON',
    };
  }
}

async function requestUpstreamJson(req, upstreamApiOrigin, upstreamApiKey, pathname, init = {}) {
  const upstreamUrl = new URL(pathname, upstreamApiOrigin);

  if (init.searchParams) {
    Object.entries(init.searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      upstreamUrl.searchParams.set(key, String(value));
    });
  }

  const headers = buildUpstreamHeaders(req, upstreamApiKey);

  if (init.headers) {
    Object.entries(init.headers).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      headers.set(key, String(value));
    });
  }

  const response = await fetch(upstreamUrl, {
    method: init.method || 'GET',
    headers,
    body: init.body,
    redirect: 'manual',
  });

  const data = await parseJsonResponse(response);

  return {
    upstreamUrl,
    response,
    data,
  };
}

function sendSseHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

function sendSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sendForbiddenApiResponse(res) {
  sendJson(res, 403, {
    status: false,
    code: 'FORBIDDEN_DIRECT_API_ACCESS',
    error: '请通过前端应用正常发起查询请求。',
  });
}

function createProgressPayload(mode, phase, detail, extra = {}) {
  return {
    mode,
    phase,
    label: '查询中',
    detail,
    timestamp: Date.now(),
    ...extra,
  };
}

function normalizeBulkItems(items = []) {
  return [...items].sort((left, right) => {
    const statusDelta = (STATUS_ORDER[left.status] ?? 99) - (STATUS_ORDER[right.status] ?? 99);
    if (statusDelta !== 0) {
      return statusDelta;
    }

    return String(left.tld || '').localeCompare(String(right.tld || ''));
  });
}

function summarizeBulkItems(items = []) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary[item.status] += 1;
      return summary;
    },
    {
      total: 0,
      registered: 0,
      available: 0,
      unknown: 0,
    }
  );
}

function isIdnTld(tld) {
  return tld.startsWith('xn--') || Array.from(tld).some((char) => char.charCodeAt(0) > 127);
}

function filterTldsByGroup(allTlds, group) {
  return allTlds
    .filter((item) => {
      const tld = String(item?.tld || '').trim().toLowerCase();

      if (!tld) {
        return false;
      }

      if (group === 'idn') {
        return isIdnTld(tld);
      }

      if (isIdnTld(tld)) {
        return false;
      }

      if (group === 'generic') {
        return tld.length > 2 && OLD_TLDS.has(tld);
      }

      if (group === 'country') {
        return tld.length >= 1 && tld.length <= 2;
      }

      return tld.length > 2 && !OLD_TLDS.has(tld);
    })
    .map((item) => String(item.tld).trim().toLowerCase());
}

export async function handleCreateShareRequest(req, res) {
  if (!isAllowedInternalApiRequest(req)) {
    sendForbiddenApiResponse(res);
    return;
  }

  try {
    const body = await collectRequestBody(req);
    let payload = null;

    try {
      payload = body ? JSON.parse(body.toString('utf8')) : null;
    } catch {
      sendJson(res, 400, {
        status: false,
        code: 'INVALID_SHARE_PAYLOAD',
        error: '分享数据格式无效，无法生成链接。',
      });
      return;
    }

    const storedShare = await createStoredShare(payload);

    if (!storedShare) {
      sendJson(res, 400, {
        status: false,
        code: 'INVALID_SHARE_PAYLOAD',
        error: '分享数据无效，无法生成链接。',
      });
      return;
    }

    sendJson(res, 201, {
      id: storedShare.id,
      path: `/share/${storedShare.id}`,
      expiresAt: storedShare.expiresAt,
    });
  } catch (error) {
    sendJson(res, 500, {
      status: false,
      code: 'CREATE_SHARE_FAILED',
      error: error instanceof Error ? error.message : '分享链接生成失败',
    });
  }
}

export async function handleGetShareRequest(_req, res, requestUrl) {
  const shareId = requestUrl.pathname.replace(/^\/api\/shares\//, '').trim();

  const shareResult = await getStoredShare(shareId);

  if (shareResult.kind === 'expired') {
    sendJson(res, 410, {
      status: false,
      code: 'SHARE_EXPIRED',
      error: '该分享链接已过期。',
    });
    return;
  }

  if (shareResult.kind === 'missing') {
    sendJson(res, 404, {
      status: false,
      code: 'SHARE_NOT_FOUND',
      error: '未找到对应的分享结果。',
    });
    return;
  }

  sendJson(res, 200, shareResult.data);
}

export async function handleLookupStreamRequest(req, res, requestUrl, upstreamApiOrigin, upstreamApiKey) {
  if (!isAllowedInternalApiRequest(req)) {
    sendForbiddenApiResponse(res);
    return;
  }

  const query = requestUrl.searchParams.get('query')?.trim() || '';
  if (!query) {
    sendJson(res, 400, {
      status: false,
      code: 'MISSING_QUERY',
      error: '缺少 query 参数',
    });
    return;
  }

  sendSseHeaders(res);

  try {
    sendSseEvent(res, 'progress', createProgressPayload('single', 'request.received', '已接收查询请求'));
    sendSseEvent(res, 'progress', createProgressPayload('single', 'upstream.requesting', '正在请求 WHOIS 上游接口'));

    const { response, data } = await requestUpstreamJson(
      req,
      upstreamApiOrigin,
      upstreamApiKey,
      '/api/lookup',
      {
        method: 'GET',
        searchParams: {
          query,
        },
      }
    );

    sendSseEvent(
      res,
      'progress',
      createProgressPayload('single', 'upstream.responded', `已收到上游响应 · HTTP ${response.status}`)
    );

    sendSseEvent(res, 'progress', createProgressPayload('single', 'payload.parsed', '正在解析 WHOIS 数据'));
    sendSseEvent(res, 'progress', createProgressPayload('single', 'result.ready', '正在整理结构化结果'));

    sendSseEvent(res, 'result', data);
  } catch (error) {
    sendSseEvent(res, 'error', {
      mode: 'single',
      message: error instanceof Error ? error.message : 'WHOIS 查询失败',
    });
  } finally {
    res.end();
  }
}

export async function handleBulkStreamRequest(req, res, requestUrl, upstreamApiOrigin, upstreamApiKey) {
  if (!isAllowedInternalApiRequest(req)) {
    sendForbiddenApiResponse(res);
    return;
  }

  const query = requestUrl.searchParams.get('query')?.trim().toLowerCase() || '';
  if (!query) {
    sendJson(res, 400, {
      status: false,
      code: 'MISSING_QUERY',
      error: '缺少 query 参数',
    });
    return;
  }

  sendSseHeaders(res);

  try {
    sendSseEvent(res, 'progress', createProgressPayload('bulk', 'request.received', '已接收批量后缀查询请求'));
    sendSseEvent(res, 'progress', createProgressPayload('bulk', 'tlds.loading', '正在加载支持的后缀列表'));

    const { data: tldData } = await requestUpstreamJson(
      req,
      upstreamApiOrigin,
      upstreamApiKey,
      '/api/supported-tlds',
      {
        method: 'GET',
        searchParams: {
          status: 'enabled',
          limit: '10000',
        },
      }
    );

    const supportedTlds = Array.isArray(tldData?.data) ? tldData.data : [];

    sendSseEvent(
      res,
      'progress',
      createProgressPayload('bulk', 'tlds.loaded', `已获取支持后缀列表 · ${supportedTlds.length} 个`)
    );

    const settledGroups = await Promise.allSettled(
      BULK_GROUP_KEYS.map(async (group) => {
        const groupLabel = GROUP_LABELS[group];
        const tlds = filterTldsByGroup(supportedTlds, group);

        sendSseEvent(
          res,
          'progress',
          createProgressPayload('bulk', 'group.requesting', `正在检测${groupLabel}`, {
            groupKey: group,
          })
        );

        const { data } = await requestUpstreamJson(
          req,
          upstreamApiOrigin,
          upstreamApiKey,
          '/api/bulk-dns-check',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-initiated': 'true',
              'x-query-source': 'session-bulk',
            },
            body: JSON.stringify({ domain: query, tlds, group }),
          }
        );

        if (!data?.success) {
          sendSseEvent(
            res,
            'progress',
            createProgressPayload('bulk', 'group.failed', `${groupLabel}检测失败`, {
              groupKey: group,
            })
          );

          return {
            key: group,
            label: groupLabel,
            items: [],
            summary: {
              total: 0,
              registered: 0,
              available: 0,
              unknown: 0,
            },
            error: data?.error || '批量查询失败',
          };
        }

        const items = normalizeBulkItems(Array.isArray(data.results) ? data.results : []);
        const summary = summarizeBulkItems(items);

        sendSseEvent(
          res,
          'progress',
          createProgressPayload(
            'bulk',
            'group.completed',
            `${groupLabel}完成 · 已注册 ${summary.registered} / 未注册 ${summary.available} / 未知 ${summary.unknown}`,
            {
              groupKey: group,
              summary,
            }
          )
        );

        return {
          key: group,
          label: groupLabel,
          items,
          summary,
        };
      })
    );

    const groups = settledGroups.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const key = BULK_GROUP_KEYS[index];
      return {
        key,
        label: GROUP_LABELS[key],
        items: [],
        summary: {
          total: 0,
          registered: 0,
          available: 0,
          unknown: 0,
        },
        error: result.reason instanceof Error ? result.reason.message : '批量查询失败',
      };
    });

    if (groups.every((group) => group.summary.total === 0 && group.error)) {
      throw new Error(groups.find((group) => group.error)?.error || '批量查询失败');
    }

    sendSseEvent(res, 'progress', createProgressPayload('bulk', 'result.summarizing', '正在汇总批量后缀结果'));

    const summary = groups.reduce(
      (aggregate, group) => {
        aggregate.total += group.summary.total;
        aggregate.registered += group.summary.registered;
        aggregate.available += group.summary.available;
        aggregate.unknown += group.summary.unknown;
        return aggregate;
      },
      {
        total: 0,
        registered: 0,
        available: 0,
        unknown: 0,
      }
    );

    sendSseEvent(res, 'result', {
      query,
      checkedAt: Date.now(),
      summary,
      groups,
    });
  } catch (error) {
    sendSseEvent(res, 'error', {
      mode: 'bulk',
      message: error instanceof Error ? error.message : '批量查询失败',
    });
  } finally {
    res.end();
  }
}
