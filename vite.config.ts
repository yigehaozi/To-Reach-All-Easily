import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';
import {
  DEFAULT_UPSTREAM_API_KEY,
  DEFAULT_UPSTREAM_API_ORIGIN,
  handleCreateShareRequest,
  handleBulkStreamRequest,
  handleGetShareRequest,
  handleLookupStreamRequest,
  INTERNAL_REQUEST_HEADER_NAME,
  isAllowedInternalApiRequest,
  sendJson,
} from './serverGateway.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const upstreamApiKey =
    env.UPSTREAM_API_KEY ||
    env.VITE_API_KEY ||
    process.env.UPSTREAM_API_KEY ||
    process.env.VITE_API_KEY ||
    DEFAULT_UPSTREAM_API_KEY;
  const upstreamApiOrigin = env.UPSTREAM_API_ORIGIN || process.env.UPSTREAM_API_ORIGIN || DEFAULT_UPSTREAM_API_ORIGIN;

  return {
    build: {
      sourcemap: 'hidden',
    },
    server: {
      proxy: {
        '/api': {
          target: upstreamApiOrigin,
          changeOrigin: true,
          secure: true,
          headers: upstreamApiKey ? { 'x-api-key': upstreamApiKey } : undefined,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader(INTERNAL_REQUEST_HEADER_NAME);
            });
          },
        },
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'maskable-icon-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'OneFour',
          short_name: 'OneFour',
          description: 'OneFour 域名 WHOIS 与批量后缀查询工具',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'onefour-api-guard',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/')) {
              next();
              return;
            }

            const requestUrl = new URL(req.url, 'http://127.0.0.1');
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

            if (!isAllowedInternalApiRequest(req)) {
              sendJson(res, 403, {
                status: false,
                code: 'FORBIDDEN_DIRECT_API_ACCESS',
                error: '请通过前端应用正常发起查询请求。',
              });
              return;
            }

            next();
          });
        },
      },
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      tsconfigPaths()
    ]
  }
})
