import { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Play } from 'lucide-react';
import DocsSectionNavigator, { type DocsSectionAnchor } from '@/components/common/DocsSectionNavigator';
import { buildLookupRequestPath, lookupWhoisForDocs, PUBLIC_API_BASE, type DocsLookupPlaygroundResult } from '@/utils/api';
import { showToast } from '@/utils/toastBus';

const queryExamples = ['baidu.com', 'cloudflare.com', '8.8.8.8'] as const;
const supportedQueryTypes = ['域名', 'IP 地址', 'ASN'] as const;

const usageNotes = [
  '公开部署前请配置你自己的 WHOIS 上游服务和 API Key。',
  '如需使用 yisi.yun 默认上游，请前往 https://yisi.yun/api-docs 申请 API Key。',
  '如果上游服务要求署名、限流或白名单，请按对应服务条款配置。',
  '示例中的 Key 均为占位值，请不要提交真实凭据。',
] as const;

const errorCodes = [
  { code: 'INVALID_API_KEY', status: 401, desc: 'API Key 无效', solution: '检查 x-api-key 或 apiKey 是否正确' },
  { code: 'API_KEY_DISABLED', status: 401, desc: 'API Key 已禁用', solution: '确认 Key 状态是否可用' },
  { code: 'RATE_LIMIT_EXCEEDED', status: 429, desc: '超过频率限制', solution: '降低频率或申请更高额度' },
  { code: 'IP_NOT_ALLOWED', status: 403, desc: 'IP 不在白名单', solution: '检查白名单配置' },
] as const;

const rateLimitHeaders = [
  { name: 'X-RateLimit-Limit', desc: '限制数量' },
  { name: 'X-RateLimit-Remaining', desc: '剩余次数' },
  { name: 'X-RateLimit-Reset', desc: '重置时间' },
] as const;

const successResponseExample = JSON.stringify(
  {
    time: 0.82,
    status: true,
    cached: false,
    source: 'whois',
    result: {
      domain: 'baidu.com',
      registrar: 'Example Registrar, Inc.',
      creationDate: '1999-10-11T11:05:17.000Z',
      expirationDate: '2028-10-11T11:05:17.000Z',
      nameServers: ['NS1.EXAMPLE.COM', 'NS2.EXAMPLE.COM'],
    },
  },
  null,
  2
);

const errorResponseExample = JSON.stringify(
  {
    time: 0.03,
    status: false,
    code: 'INVALID_API_KEY',
    error: 'Invalid API key',
  },
  null,
  2
);

const authHeaderExample = `curl "${PUBLIC_API_BASE}/api/lookup?query=example.com" \\
  -H "x-api-key: YOUR_API_KEY"`;

const authQueryExample = `curl "${PUBLIC_API_BASE}/api/lookup?query=example.com&apiKey=YOUR_API_KEY"`;

type CodeExampleLanguage = 'cURL' | 'JavaScript' | 'Python' | 'Go' | 'PHP';

interface ResponseFieldItem {
  name: string;
  type: string;
  desc: string;
  required?: boolean;
  example?: string;
}

interface ResponseFieldGroup {
  title: string;
  badge: string;
  fields: ResponseFieldItem[];
}

const responseFieldGroups: ResponseFieldGroup[] = [
  {
    title: '基础响应字段',
    badge: 'ALL',
    fields: [
      { name: 'time', type: 'number', desc: '响应时间', required: true, example: '2.12' },
      { name: 'status', type: 'boolean', desc: '请求状态', required: true, example: 'true' },
      { name: 'cached', type: 'boolean', desc: '是否为缓存结果', example: 'false' },
      { name: 'source', type: 'string', desc: '数据来源', example: 'whois' },
      { name: 'result', type: 'object', desc: '查询结果对象', required: true, example: '-' },
    ],
  },
  {
    title: '域名查询字段',
    badge: 'DOMAIN',
    fields: [
      { name: 'result.domain', type: 'string', desc: '域名', example: 'baidu.com' },
      { name: 'result.registrar', type: 'string', desc: '注册商', example: 'MarkMonitor Information Technology (Shanghai) Co., Ltd.' },
      { name: 'result.registrarURL', type: 'string', desc: '注册商 URL', example: 'http://www.markmonitor.com' },
      { name: 'result.ianaId', type: 'string', desc: 'IANA ID', example: '3838' },
      { name: 'result.whoisServer', type: 'string', desc: 'WHOIS 服务器', example: 'whois.markmonitor.com' },
      { name: 'result.creationDate', type: 'string', desc: '创建时间', example: '1999-10-11T11:05:17.000Z' },
      { name: 'result.expirationDate', type: 'string', desc: '到期时间', example: '2028-10-11T11:05:17.000Z' },
      { name: 'result.updatedDate', type: 'string', desc: '更新时间', example: '2025-04-08T01:08:58.000Z' },
      { name: 'result.status', type: 'object[]', desc: '域名状态', example: '[{"status":"clientDeleteProhibited"}]' },
      { name: 'result.nameServers', type: 'string[]', desc: '名称服务器', example: '["NS1.BAIDU.COM", "NS2.BAIDU.COM"]' },
      { name: 'result.dnssec', type: 'string', desc: 'DNSSEC 状态', example: 'unsigned' },
      { name: 'result.rawWhoisContent', type: 'string', desc: '原始 WHOIS 内容', example: 'Domain: baidu.com ...' },
      { name: 'result.domainAge', type: 'number', desc: '域名年龄', example: '26' },
      { name: 'result.remainingDays', type: 'number', desc: '剩余天数', example: '1109' },
      { name: 'result.domainNotFound', type: 'boolean', desc: '域名是否未注册', example: 'false' },
    ],
  },
  {
    title: '错误响应字段',
    badge: 'ERROR',
    fields: [
      { name: 'time', type: 'number', desc: '响应时间', required: true, example: '0.05' },
      { name: 'status', type: 'boolean', desc: '请求状态（失败时为 false）', required: true, example: 'false' },
      { name: 'code', type: 'string', desc: '错误码', example: 'INVALID_API_KEY' },
      { name: 'error', type: 'string', desc: '错误信息', required: true, example: 'Invalid API key' },
    ],
  },
];

const docsSectionAnchors: DocsSectionAnchor[] = [
  { id: 'usage-notes', label: '使用须知' },
  { id: 'playground', label: '在线测试' },
  { id: 'interface-info', label: '接口信息' },
  { id: 'query-params', label: '查询参数' },
  { id: 'auth', label: '认证方式' },
  { id: 'success-response', label: '成功响应' },
  { id: 'examples', label: '代码示例' },
  { id: 'error-codes', label: '错误码' },
  { id: 'rate-limit', label: '速率限制' },
  { id: 'response-fields', label: '响应字段' },
];

function buildCodeExamples(query: string): Record<CodeExampleLanguage, string> {
  const safeQuery = query.trim() || 'baidu.com';
  const requestUrl = `${PUBLIC_API_BASE}${buildLookupRequestPath(safeQuery)}`;

  return {
    cURL: `curl -X GET "${requestUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY"`,
    JavaScript: `const response = await fetch(
  '${requestUrl}',
  {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY',
    },
  }
);
const data = await response.json();`,
    Python: `import requests

response = requests.get(
    '${PUBLIC_API_BASE}/api/lookup',
    params={'query': '${safeQuery}'},
    headers={'x-api-key': 'YOUR_API_KEY'}
)
data = response.json()`,
    Go: `package main

import (
    "fmt"
    "io"
    "net/http"
)

func main() {
    req, _ := http.NewRequest("GET", "${requestUrl}", nil)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`,
    PHP: `<?php
$ch = curl_init("${requestUrl}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: YOUR_API_KEY"
    ],
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`,
  };
}

function formatResultJson(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export default function DocsPage() {
  const [exampleQuery, setExampleQuery] = useState('baidu.com');
  const [activeCodeLang, setActiveCodeLang] = useState<CodeExampleLanguage>('cURL');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<DocsLookupPlaygroundResult | null>(null);

  useEffect(() => {
    document.title = 'API 文档 - OneFour';
  }, []);

  const normalizedQuery = exampleQuery.trim() || 'baidu.com';
  const previewUrl = `${PUBLIC_API_BASE}${buildLookupRequestPath(normalizedQuery)}`;
  const codeExamples = useMemo(() => buildCodeExamples(normalizedQuery), [normalizedQuery]);
  const activeCodeExample = codeExamples[activeCodeLang];
  const playgroundCurlCommand = codeExamples.cURL;
  const resultJson = useMemo(
    () => (playgroundResult ? formatResultJson(playgroundResult.data) : '// 发送请求后将在这里展示响应 JSON'),
    [playgroundResult]
  );

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(playgroundCurlCommand);
      showToast({ message: '已复制 cURL 命令', variant: 'success' });
    } catch {
      showToast({ message: '复制失败，请重试', variant: 'error' });
    }
  };

  const handleRunLookup = async () => {
    if (!normalizedQuery || playgroundLoading) return;

    setPlaygroundLoading(true);
    const result = await lookupWhoisForDocs(normalizedQuery);
    setPlaygroundResult(result);
    setPlaygroundLoading(false);
  };

  return (
    <div className="relative min-h-full p-6">
      <DocsSectionNavigator anchors={docsSectionAnchors} />

      <div className="mx-auto max-w-[840px] pl-10 sm:pl-11 md:pl-12 xl:pl-10">
        <div className="w-full max-w-[800px] xl:ml-auto">
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">API 接口文档</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mb-8">
            提供域名、IP、ASN 等查询的 REST API 接口，当前文档聚焦 <code className="font-mono text-[var(--text-primary)]">GET /api/lookup</code> 的接入说明、响应字段和在线测试能力。
          </p>

          <section id="usage-notes" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">使用须知</h2>
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] p-4 space-y-2 text-[12px] leading-6 text-[var(--text-secondary)]">
              {usageNotes.map((item) => (
                <div key={item}>• {item}</div>
              ))}
            </div>
          </section>

          <section id="playground" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">快速开始 / 在线测试</h2>
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-overlay)]">
                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] text-[var(--text-onbrand)] text-[11px] font-bold">GET</span>
                <code className="text-[13px] text-[var(--text-primary)] font-mono">/api/lookup</code>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {supportedQueryTypes.map((item) => (
                    <span key={item} className="rounded-full bg-[var(--bg-overlay)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                      {item}
                    </span>
                  ))}
                </div>

                <div>
                  <div className="text-[12px] text-[var(--text-tertiary)] mb-2">查询参数</div>
                  <input
                    value={exampleQuery}
                    onChange={(event) => setExampleQuery(event.target.value)}
                    placeholder="baidu.com"
                    className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--border-neutral)] bg-[var(--bg-base)] px-3 text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-primary)]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {queryExamples.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setExampleQuery(item)}
                      className="text-[11px] px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] font-mono hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRunLookup}
                    disabled={playgroundLoading || !normalizedQuery}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] text-[var(--text-onbrand)] text-[12px] font-medium hover:bg-[var(--brand-primary-hover)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {playgroundLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    发送请求
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-[12px] font-medium hover:bg-[var(--bg-overlay-hover)] transition-colors"
                  >
                    <Copy size={14} />
                    复制 cURL 命令
                  </button>
                </div>

                <div className="rounded-[var(--radius-lg)] bg-[var(--bg-overlay)] p-3">
                  <div className="text-[11px] text-[var(--text-tertiary)] mb-1">请求地址</div>
                  <code className="text-[11px] text-[var(--text-primary)] font-mono break-all block">{previewUrl}</code>
                </div>

                <div className="rounded-[var(--radius-lg)] bg-[var(--bg-overlay)] p-3">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className="text-[12px] font-medium text-[var(--text-primary)]">响应格式</div>
                    {playgroundResult ? (
                      <>
                        <span className="text-[11px] text-[var(--text-secondary)]">状态 {playgroundResult.status} · {playgroundResult.statusText}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">耗时 {playgroundResult.responseTime} ms</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--text-tertiary)]">发送请求后展示状态码、耗时和 JSON 响应</span>
                    )}
                  </div>
                  <pre className="min-h-[220px] text-[12px] text-[var(--text-primary)] leading-6 overflow-x-auto">{resultJson}</pre>
                </div>
              </div>
            </div>
          </section>

          <section id="interface-info" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">接口信息</h2>
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-overlay)]">
                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] text-[var(--text-onbrand)] text-[11px] font-bold">GET</span>
                <code className="text-[13px] text-[var(--text-primary)] font-mono">/api/lookup</code>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-[12px] text-[var(--text-secondary)] leading-6">
                  当前 API 专注于域名 WHOIS 查询，提供准确的注册信息、注册商、到期时间、DNS 服务器等详细数据。
                </div>
                <div className="flex gap-4 text-[12px]">
                  <span className="text-[var(--text-tertiary)]">Base URL</span>
                  <code className="text-[var(--text-primary)] font-mono">{PUBLIC_API_BASE}</code>
                </div>
                <div className="flex gap-4 text-[12px]">
                  <span className="text-[var(--text-tertiary)]">Endpoint</span>
                  <code className="text-[var(--text-primary)] font-mono">/api/lookup</code>
                </div>
                <div className="flex gap-4 text-[12px]">
                  <span className="text-[var(--text-tertiary)]">请求地址</span>
                  <code className="text-[var(--text-primary)] font-mono break-all">{previewUrl}</code>
                </div>
              </div>
            </div>
          </section>

          <section id="query-params" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">查询参数</h2>
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--bg-overlay)]">
                    <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">参数名</th>
                    <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">类型</th>
                    <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">必填</th>
                    <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">说明</th>
                    <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[var(--border-neutral)]">
                    <td className="px-4 py-2.5 font-mono text-[var(--brand-primary)]">query</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">string</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">必填</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">输入域名、IP 或 ASN 进行测试</td>
                    <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">baidu.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="auth" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">认证方式</h2>
            <div className="space-y-3">
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] p-4">
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">请求头方式 · x-api-key</div>
                <pre className="text-[12px] text-[var(--text-primary)] font-mono bg-[var(--bg-overlay)] rounded-[var(--radius-lg)] p-3 overflow-x-auto">{authHeaderExample}</pre>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] p-4">
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">查询参数方式 · apiKey</div>
                <pre className="text-[12px] text-[var(--text-primary)] font-mono bg-[var(--bg-overlay)] rounded-[var(--radius-lg)] p-3 overflow-x-auto">{authQueryExample}</pre>
              </div>
            </div>
          </section>

          <section id="success-response" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">成功响应示例</h2>
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)]">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">JSON / status / time</span>
              </div>
              <pre className="text-[12px] text-[var(--text-primary)] font-mono p-4 overflow-x-auto">{successResponseExample}</pre>
            </div>
          </section>

          <section id="examples" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">代码示例</h2>
            <div className="space-y-3">
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)]">
                  {(Object.keys(codeExamples) as CodeExampleLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveCodeLang(lang)}
                      className={[
                        'rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors',
                        activeCodeLang === lang
                          ? 'bg-[var(--brand-primary)] text-[var(--text-onbrand)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <pre className="text-[12px] text-[var(--text-primary)] font-mono p-4 overflow-x-auto">{activeCodeExample}</pre>
              </div>
            </div>
          </section>

          <section id="error-codes" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">错误码参考</h2>
            <div className="space-y-3">
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--bg-overlay)]">
                      <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">错误码</th>
                      <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">HTTP 状态码</th>
                      <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">说明</th>
                      <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">解决方案</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorCodes.map((err) => (
                      <tr key={err.code} className="border-t border-[var(--border-neutral)]">
                        <td className="px-4 py-2.5 font-mono text-red-500">{err.code}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{err.status}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{err.desc}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{err.solution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-overlay)]">
                  <span className="text-[12px] font-medium text-[var(--text-secondary)]">错误响应示例</span>
                </div>
                <pre className="text-[12px] text-[var(--text-primary)] font-mono p-4 overflow-x-auto">{errorResponseExample}</pre>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] p-4">
                <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">注意</div>
                <div className="text-[12px] leading-6 text-[var(--text-secondary)]">
                  遇到 401、403、429 时，优先检查认证方式、Key 状态、白名单与请求频率。
                </div>
              </div>
            </div>
          </section>

          <section id="rate-limit" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">速率限制</h2>
            <div className="space-y-3">
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] p-4 space-y-3">
                <div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">全局限制（基于 IP）</div>
                  <div className="text-[12px] text-[var(--text-secondary)]">每分钟 10 次，每小时 30 次</div>
                </div>
                <div className="border-t border-[var(--border-neutral)] pt-3">
                  <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">API Key 限制</div>
                  <div className="text-[12px] text-[var(--text-secondary)]">每分钟 20 次，每小时 50 次，每天 300 次</div>
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--bg-overlay)]">
                      <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">响应头</th>
                      <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateLimitHeaders.map((item) => (
                      <tr key={item.name} className="border-t border-[var(--border-neutral)]">
                        <td className="px-4 py-2.5 font-mono text-[var(--text-primary)]">{item.name}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{item.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="response-fields" className="mb-8 scroll-mt-24">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">响应字段</h2>
            <div className="space-y-3">
              {responseFieldGroups.map((group) => (
                <div key={group.title} className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[var(--bg-overlay)]">
                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{group.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--bg-base)] text-[var(--text-tertiary)] font-medium">{group.badge}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-t border-[var(--border-neutral)] bg-[var(--bg-base)]">
                          <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">字段名</th>
                          <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">类型</th>
                          <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">说明</th>
                          <th className="text-left px-4 py-2.5 text-[var(--text-tertiary)] font-medium">示例</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.fields.map((field) => (
                          <tr key={`${group.title}-${field.name}`} className="border-t border-[var(--border-neutral)]">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <code className="font-mono text-[var(--text-primary)]">{field.name}</code>
                                {field.required ? <span className="text-[11px] text-red-500">*</span> : null}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">{field.type}</td>
                            <td className="px-4 py-2.5 text-[var(--text-secondary)]">{field.desc}</td>
                            <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">{field.example ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center py-8 text-[11px] text-[var(--text-tertiary)]">
            © 2026 OneFour · 数据来源：OneFour
          </div>
        </div>
      </div>
    </div>
  );
}
