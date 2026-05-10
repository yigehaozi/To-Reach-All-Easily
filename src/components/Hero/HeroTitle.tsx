import { useEffect, useMemo, useState } from 'react';
import type { QueryMode } from '@/types/query';
import { getQueryModeUiConfig } from '@/utils/queryMode';

const TYPING_SPEED = 80;

interface HeroTitleProps {
  mode: QueryMode;
}

const FIRST_LETTER_MAP: Record<string, boolean> = {
  O: true,
  W: true,
  B: true,
  T: true,
  C: true,
};

function getWords(mode: QueryMode) {
  return mode === 'bulk'
    ? [
        { word: 'Bulk', start: 0 },
        { word: 'TLD', start: 5 },
        { word: 'Check', start: 9 },
      ]
    : [
        { word: 'OneFour', start: 0 },
        { word: 'Whois', start: 8 },
      ];
}

export default function HeroTitle({ mode }: HeroTitleProps) {
  const { heroTitle, heroBeta, accent } = getQueryModeUiConfig(mode);
  const [displayedLength, setDisplayedLength] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const words = useMemo(() => getWords(mode), [mode]);

  useEffect(() => {
    setDisplayedLength(0);
    setTypingDone(false);
  }, [heroTitle]);

  useEffect(() => {
    if (displayedLength < heroTitle.length) {
      const timer = setTimeout(() => {
        setDisplayedLength((length) => length + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timer);
    }

    setTypingDone(true);
  }, [displayedLength, heroTitle]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {words.map((wordInfo, wordIndex) => {
        if (displayedLength <= wordInfo.start) return null;

        const visibleChars = Math.min(displayedLength - wordInfo.start, wordInfo.word.length);
        const visiblePart = wordInfo.word.slice(0, visibleChars);

        return (
          <span key={`${wordInfo.word}-${wordIndex}`} className="inline-flex items-baseline">
            {visiblePart.split('').map((letter, letterIndex) => {
              const isFirst = letterIndex === 0 && FIRST_LETTER_MAP[letter];
              return (
                <span
                  key={`${wordInfo.word}-${letterIndex}`}
                  className={
                    isFirst
                      ? 'text-[42px] font-semibold leading-[1.1] tracking-[-1.6px]'
                      : 'text-[40px] font-semibold leading-[1.1] tracking-[-1.6px] text-[var(--text-primary)]'
                  }
                  style={isFirst ? { color: accent } : undefined}
                >
                  {letter}
                </span>
              );
            })}
          </span>
        );
      })}

      {heroBeta && typingDone ? (
        <span className="mt-2 self-start rounded-[6px] border border-[var(--border-neutral-l2)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] animate-fade-in">
          BETA
        </span>
      ) : null}
    </div>
  );
}
