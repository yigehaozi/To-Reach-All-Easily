import { X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function LoginModal() {
  const { loginModalOpen, setLoginModalOpen } = useAppStore();

  if (!loginModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      onClick={() => setLoginModalOpen(false)}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-[var(--bg-base)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] p-8 w-full max-w-[400px] mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setLoginModalOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full">
              <svg width="36" height="36" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="26" height="26" rx="4" fill="#0C0C0D" />
                <text x="13" y="17.5" textAnchor="middle" fill="#FFFFFF" fontFamily="SF Pro Text, -apple-system, system-ui, sans-serif" fontSize="12" fontWeight="700" letterSpacing="-0.5">OF</text>
              </svg>
            </div>

            <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">
              OneFour
            </h2>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="邮箱地址"
              className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-neutral-l2)] bg-[var(--bg-base)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-colors"
              disabled
            />
            <input
              type="password"
              placeholder="密码"
              className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-neutral-l2)] bg-[var(--bg-base)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-colors"
              disabled
            />
          </div>

          <button
            className="w-full h-10 mt-4 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] text-[var(--text-onbrand)] text-[13px] font-medium opacity-50 cursor-not-allowed"
            disabled
          >
            即将上线
          </button>

          <p className="mt-4 text-[11px] text-[var(--text-tertiary)]">
            登录功能正在开发中，敬请期待
          </p>
        </div>
      </div>
    </div>
  );
}
