import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_UPSTREAM_API_KEY,
  DEFAULT_UPSTREAM_API_ORIGIN,
  buildUpstreamHeaders,
  collectRequestBody,
  handleCreateShareRequest,
  handleBulkStreamRequest,
  handleGetShareRequest,
  handleLookupStreamRequest,
  isAllowedInternalApiRequest,
  sendJson,
} from './serverGateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3002);
const upstreamApiOrigin = process.env.UPSTREAM_API_ORIGIN || DEFAULT_UPSTREAM_API_ORIGIN;
const upstreamApiKey =
  process.env.UPSTREAM_API_KEY ||
  process.env.VITE_API_KEY ||
  DEFAULT_UPSTREAM_API_KEY;

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.map', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
]);

function resolveFilePath(urlPathname) {
  const safePath = path.normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.[/\\])+/, '');
  const absolutePath = path.join(distDir, safePath);

  if (!absolutePath.startsWith(distDir)) {
    return null;
  }

  return absolutePath;
}

function setCacheHeaders(res, filePath) {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  res.setHeader('Cache-Control', 'no-cache');
}

async function proxyApiRequest(req, res, requestUrl) {
  if (!isAllowedInternalApiRequest(req)) {
    sendJson(res, 403, {
      status: false,
      code: 'FORBIDDEN_DIRECT_API_ACCESS',
      error: '请通过 OneFour 前端正常发起查询请求。',
    });
    return;
  }

  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstreamApiOrigin);
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      Allow: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      'Cache-Control': 'no-cache',
    });
    res.end();
    return;
  }

  const body = method === 'GET' || method === 'HEAD' ? undefined : await collectRequestBody(req);
  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: buildUpstreamHeaders(req, upstreamApiKey),
    body,
    redirect: 'manual',
  });

  res.statusCode = upstreamResponse.status;
  res.statusMessage = upstreamResponse.statusText;

  for (const [key, value] of upstreamResponse.headers.entries()) {
    const normalizedKey = key.toLowerCase();
    if (hopByHopHeaders.has(normalizedKey) || normalizedKey === 'content-length') {
      continue;
    }
    res.setHeader(key, value);
  }

  if (method === 'HEAD') {
    res.end();
    return;
  }

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  res.setHeader('Content-Length', String(responseBody.byteLength));
  res.end(responseBody);
}

async function sendIndex(res) {
  const html = await readFile(indexFile);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(html);
}

if (!existsSync(indexFile)) {
  console.error(`Missing build artifact: ${indexFile}`);
  console.error('Run `pnpm build` before starting the production server.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    const pathname = requestUrl.pathname;

    if (pathname === '/api/lookup/stream') {
      await handleLookupStreamRequest(req, res, requestUrl, upstreamApiOrigin, upstreamApiKey);
      return;
    }

    if (pathname === '/api/bulk-dns-check/stream') {
      await handleBulkStreamRequest(req, res, requestUrl, upstreamApiOrigin, upstreamApiKey);
      return;
    }

    if (pathname === '/api/shares' && req.method === 'POST') {
      await handleCreateShareRequest(req, res);
      return;
    }

    if (pathname.startsWith('/api/shares/') && req.method === 'GET') {
      await handleGetShareRequest(req, res, requestUrl);
      return;
    }

    if (pathname.startsWith('/api/')) {
      await proxyApiRequest(req, res, requestUrl);
      return;
    }

    const filePath = resolveFilePath(pathname);

    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      if (stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', mimeTypes.get(ext) || 'application/octet-stream');
        setCacheHeaders(res, filePath);
        createReadStream(filePath).pipe(res);
        return;
      }
    }

    await sendIndex(res);
  } catch (error) {
    console.error('Static server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`OneFourMiNi static server listening on http://${host}:${port}`);
});
