import type { ReactNode } from 'react';

interface ResultCardProps {
  title: string;
  children: ReactNode;
}

export default function ResultCard({ title, children }: ResultCardProps) {
  return (
    <section className="border-b border-[var(--border-neutral)] py-4 last:border-b-0 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}
