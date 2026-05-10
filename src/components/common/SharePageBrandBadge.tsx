import { Link } from 'react-router-dom';

export default function SharePageBrandBadge() {
  return (
    <Link
      to="/"
      className="fixed bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-[6px] border border-[var(--border-neutral)] bg-[var(--bg-base)]/92 px-2.5 py-2 text-[12px] text-[var(--text-secondary)] shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-md transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
      aria-label="打开 OneFour 首页"
      title="打开 OneFour"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--text-primary)] text-[10px] font-bold text-[var(--bg-base)]">
        OF
      </span>
      <span className="font-medium">OneFour</span>
    </Link>
  );
}
