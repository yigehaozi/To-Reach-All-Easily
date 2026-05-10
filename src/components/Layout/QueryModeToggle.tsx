import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { getNextQueryMode, getQueryModeLabel, getQueryModeUiConfig } from '@/utils/queryMode';

interface QueryModeToggleProps {
  className?: string;
}

const BUTTON_HEIGHT = 32;
const LOGO_SIDE_PADDING_X = 4;
const LABEL_SIDE_PADDING_X = 10;
const ICON_SIZE = 26;
const LABEL_GAP = 10;
const LABEL_WIDTHS = {
  single: 38,
  bulk: 50,
} as const;

export default function QueryModeToggle({ className }: QueryModeToggleProps) {
  const { queryMode, toggleQueryMode } = useAppStore();
  const currentLabel = getQueryModeLabel(queryMode);
  const nextLabel = getQueryModeLabel(getNextQueryMode(queryMode));
  const config = getQueryModeUiConfig(queryMode);
  const isBulk = queryMode === 'bulk';
  const currentLabelWidth = isBulk ? LABEL_WIDTHS.bulk : LABEL_WIDTHS.single;
  const buttonWidth =
    LOGO_SIDE_PADDING_X + ICON_SIZE + LABEL_GAP + currentLabelWidth + LABEL_SIDE_PADDING_X;
  const logoLeft = LOGO_SIDE_PADDING_X;
  const logoRight = buttonWidth - LOGO_SIDE_PADDING_X - ICON_SIZE;
  const singleLabelLeft = LOGO_SIDE_PADDING_X + ICON_SIZE + LABEL_GAP;
  const bulkLabelLeft = LABEL_SIDE_PADDING_X;

  return (
    <button
      type="button"
      onClick={toggleQueryMode}
      className={cn(
        'group relative inline-flex shrink-0 overflow-hidden rounded-[8px] transition-[background-color,width] duration-200 ease-out',
        className
      )}
      style={{
        width: `${buttonWidth}px`,
        height: `${BUTTON_HEIGHT}px`,
        backgroundColor: config.accentSoft,
      }}
      title={`当前模式：${currentLabel}，点击切换到${nextLabel}`}
      aria-label={`当前模式：${currentLabel}，点击切换到${nextLabel}`}
    >
      <span
        className="absolute flex items-center justify-center rounded-[6px] bg-white text-[#0C0C0D] text-[12px] font-bold tracking-[-0.04em] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[left,right,transform] duration-200 ease-out"
        style={{
          top: `${(BUTTON_HEIGHT - ICON_SIZE) / 2}px`,
          left: `${isBulk ? logoRight : logoLeft}px`,
          width: `${ICON_SIZE}px`,
          height: `${ICON_SIZE}px`,
        }}
        aria-hidden="true"
      >
        OF
      </span>

      <span
        className="absolute whitespace-nowrap text-[12px] font-medium tracking-[0.02em] text-[var(--text-primary)] transition-[left,opacity,transform] duration-200 ease-out"
        style={{
          left: `${isBulk ? bulkLabelLeft : singleLabelLeft}px`,
          top: '50%',
          transform: `translateY(-50%) translateX(${isBulk ? '0' : '0'})`,
          opacity: isBulk ? 0 : 1,
        }}
      >
        单域名
      </span>

      <span
        className="absolute whitespace-nowrap text-[12px] font-medium tracking-[0.02em] text-[var(--text-primary)] transition-[left,opacity,transform] duration-200 ease-out"
        style={{
          left: `${isBulk ? bulkLabelLeft : singleLabelLeft}px`,
          top: '50%',
          transform: `translateY(-50%) translateX(${isBulk ? '0' : '0'})`,
          opacity: isBulk ? 1 : 0,
        }}
      >
        批量后缀
      </span>
    </button>
  );
}
