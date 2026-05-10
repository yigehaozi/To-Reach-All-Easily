import { useEffect, useMemo, useState } from 'react';
import type { QueryMode } from '@/types/query';
import { getQueryModeUiConfig } from '@/utils/queryMode';
import HeroTitle from './HeroTitle';
import HeroSubtitle from './HeroSubtitle';

interface HeroSectionProps {
  mode: QueryMode;
}

export default function HeroSection({ mode }: HeroSectionProps) {
  const [typingDone, setTypingDone] = useState(false);
  const heroTitle = getQueryModeUiConfig(mode).heroTitle;
  const totalChars = useMemo(() => heroTitle.length, [heroTitle]);

  useEffect(() => {
    setTypingDone(false);
    const typingTime = totalChars * 80 + 200;
    const timer = setTimeout(() => setTypingDone(true), typingTime);
    return () => clearTimeout(timer);
  }, [totalChars]);

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'var(--brand-gradient)',
          filter: 'blur(80px)',
        }}
      />
      <div className="relative">
        <HeroTitle mode={mode} />
        <HeroSubtitle mode={mode} visible={typingDone} />
      </div>
    </div>
  );
}
