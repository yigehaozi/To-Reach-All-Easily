import { cn } from '@/lib/utils';

export function getNavigatorDotClassName(active: boolean): string {
  return cn(
    'block rounded-full transition-all duration-150 ease-out',
    active
      ? 'h-[9px] w-[9px] bg-[var(--text-primary)] opacity-96 shadow-[0_0_0_5px_rgba(86,99,119,0.08)] group-hover:h-[10px] group-hover:w-[10px] group-hover:opacity-100 group-hover:shadow-[0_0_0_6px_rgba(86,99,119,0.1)]'
      : 'h-[7px] w-[7px] bg-[var(--navigator-dot-inactive-bg)] opacity-100 group-hover:h-[9px] group-hover:w-[9px] group-hover:bg-[var(--text-secondary)] group-hover:opacity-56'
  );
}
