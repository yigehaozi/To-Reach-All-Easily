import { Globe, Server, Shield, Search, Layers, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { QueryMode } from '@/types/query';

const queryTypes = [
  {
    icon: Globe,
    title: '域名 WHOIS 查询',
    desc: '查询域名的注册信息，包括注册商、注册时间、到期时间、DNS 服务器、域名状态等完整数据。',
    examples: ['baidu.com', 'google.com', 'github.com'],
    available: true,
    mode: 'single' as QueryMode,
    iconBgClass: 'bg-[var(--brand-primary)]/10',
    iconTextClass: 'text-[var(--brand-primary)]',
    badgeClass: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
    buttonClass: 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-onbrand)]',
  },
  {
    icon: Layers,
    title: '批量后缀查询',
    desc: '输入主体域名后，批量检查 .com / .net / .cn 等常见后缀是否已注册，并按后缀类型输出结果。',
    examples: ['qq', 'example', 'openai'],
    available: true,
    mode: 'bulk' as QueryMode,
    iconBgClass: 'bg-[var(--brand-green)]/10',
    iconTextClass: 'text-[var(--brand-green)]',
    badgeClass: 'bg-[var(--brand-green)]/10 text-[var(--brand-green)]',
    buttonClass: 'bg-[var(--brand-green)] hover:opacity-90 text-[var(--text-onbrand)]',
  },
  {
    icon: Server,
    title: 'IP 地址查询',
    desc: '查询 IP 地址的归属地、ASN 信息、网络运营商等详细数据。',
    examples: ['8.8.8.8', '1.1.1.1'],
    available: false,
    iconBgClass: 'bg-[var(--bg-overlay)]',
    iconTextClass: 'text-[var(--text-tertiary)]',
    badgeClass: 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]',
  },
  {
    icon: Shield,
    title: 'ASN 查询',
    desc: '查询自治系统号（ASN）的详细信息，包括路由策略、IP 前缀等。',
    examples: ['AS13335', 'AS15169'],
    available: false,
    iconBgClass: 'bg-[var(--bg-overlay)]',
    iconTextClass: 'text-[var(--text-tertiary)]',
    badgeClass: 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]',
  },
  {
    icon: Search,
    title: 'SSL 证书查询',
    desc: '查询网站的 SSL/TLS 证书信息，包括颁发机构、有效期、证书链等。',
    examples: ['baidu.com', 'google.com'],
    available: false,
    iconBgClass: 'bg-[var(--bg-overlay)]',
    iconTextClass: 'text-[var(--text-tertiary)]',
    badgeClass: 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]',
  },
];

export default function TypesPage() {
  const navigate = useNavigate();
  const { setQueryMode } = useAppStore();

  useEffect(() => {
    document.title = '查询类型 - OneFour';
  }, []);

  const handleStartQuery = (mode: QueryMode) => {
    setQueryMode(mode);
    navigate('/');
  };

  return (
    <div className="min-h-full p-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">查询类型</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mb-6">
          OneFour 支持多种网络信息查询，当前已开放域名 WHOIS 查询和批量后缀查询，更多类型持续开发中。
        </p>

        <div className="space-y-4">
          {queryTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.title}
                className="rounded-[var(--radius-xl)] border border-[var(--border-neutral)] p-5 hover:bg-[var(--bg-overlay)] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 ${type.iconBgClass}`}>
                    <Icon size={20} className={type.iconTextClass} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{type.title}</h3>
                      {type.available ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-[var(--radius-full)] font-medium ${type.badgeClass}`}>
                          已上线
                        </span>
                      ) : (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-[var(--radius-full)] font-medium ${type.badgeClass}`}>
                          即将上线
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-[18px] mb-3">
                      {type.desc}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[var(--text-tertiary)]">示例:</span>
                      {type.examples.map((ex) => (
                        <code key={ex} className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] font-mono">
                          {ex}
                        </code>
                      ))}
                    </div>
                  </div>
                  {type.available && (
                    <button
                      onClick={() => handleStartQuery(type.mode)}
                      className={`shrink-0 flex items-center gap-1 px-3 h-8 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${type.buttonClass}`}
                    >
                      去查询
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
