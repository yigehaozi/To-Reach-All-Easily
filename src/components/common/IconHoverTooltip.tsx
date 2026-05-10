interface IconHoverTooltipProps {
  label: string;
  align?: 'left' | 'center' | 'right';
}

export default function IconHoverTooltip({
  label,
  align = 'center',
}: IconHoverTooltipProps) {
  const containerClassName =
    align === 'right'
      ? 'right-0 translate-x-0'
      : align === 'left'
        ? 'left-0 translate-x-0'
        : 'left-1/2 -translate-x-1/2';

  const arrowClassName =
    align === 'right'
      ? 'right-[10px] translate-y-[2px]'
      : align === 'left'
        ? 'left-[10px] translate-y-[2px]'
        : 'left-1/2 -translate-x-1/2 translate-y-[2px]';

  return (
    <div
      className={[
        'pointer-events-none absolute bottom-full z-20 mb-2 translate-y-px opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100',
        containerClassName,
      ].join(' ')}
    >
      <div className="relative inline-flex max-w-[150px] items-center rounded-[8px] bg-[var(--nav-tooltip-bg)] px-2.5 py-1.5 text-[12px] font-semibold leading-none text-[var(--nav-tooltip-text)] shadow-[var(--nav-tooltip-shadow)]">
        <span className="relative z-10 block truncate whitespace-nowrap">{label}</span>
        <span
          className={[
            'absolute bottom-0 h-[6px] w-[6px] rotate-45 rounded-[1px] bg-[var(--nav-tooltip-bg)]',
            arrowClassName,
          ].join(' ')}
        />
      </div>
    </div>
  );
}
