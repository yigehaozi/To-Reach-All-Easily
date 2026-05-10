import { useEffect, useMemo, useState } from 'react';
import type { QueryMode } from '@/types/query';

interface HeroSubtitleProps {
  mode: QueryMode;
  visible?: boolean;
}

function getSubtitle(mode: QueryMode): string {
  return mode === 'bulk'
    ? '输入主体域名后，批量检查 .com / .net / .cn 等后缀是否已注册。'
    : '查询域名 WHOIS、DNS、到期时间等注册信息。';
}

export default function HeroSubtitle({ mode, visible = false }: HeroSubtitleProps) {
  const [show, setShow] = useState(false);
  const subtitle = useMemo(() => getSubtitle(mode), [mode]);

  useEffect(() => {
    setShow(false);
    if (visible) {
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    }
  }, [subtitle, visible]);

  return (
    <p
      className={`mt-3 text-center text-[15px] font-normal leading-[20px] text-[var(--text-secondary)] transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {subtitle}
    </p>
  );
}
