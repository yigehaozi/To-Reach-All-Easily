interface NavigatorHoverTooltipProps {
  label: string;
}

export default function NavigatorHoverTooltip({ label }: NavigatorHoverTooltipProps) {
  return (
    <div className="pointer-events-none absolute left-[28px] top-1/2 z-20 -translate-y-1/2 opacity-0 transition-[opacity,transform] duration-150 ease-out -translate-x-px group-hover:translate-x-0 group-hover:opacity-100">
      <div className="relative inline-flex max-w-[150px] items-center rounded-[8px] bg-[var(--nav-tooltip-bg)] px-2.5 py-1.5 text-[12px] font-semibold leading-none text-[var(--nav-tooltip-text)] shadow-[var(--nav-tooltip-shadow)]">
        <span className="absolute left-0 top-1/2 h-[6px] w-[6px] -translate-x-[2px] -translate-y-1/2 rotate-45 rounded-[1px] bg-[var(--nav-tooltip-bg)]" />
        <span className="relative z-10 block truncate">{label}</span>
      </div>
    </div>
  );
}
