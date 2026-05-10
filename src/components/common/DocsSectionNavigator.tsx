import { useEffect, useState } from 'react';
import NavigatorHoverTooltip from '@/components/common/NavigatorHoverTooltip';
import { getNavigatorDotClassName } from '@/components/common/navigatorDot';

export interface DocsSectionAnchor {
  id: string;
  label: string;
}

interface DocsSectionNavigatorProps {
  anchors: DocsSectionAnchor[];
}

function findScrollContainer(element: HTMLElement | null): HTMLElement | Window {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflow = style.overflow;

    if (
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflow === 'auto' ||
      overflow === 'scroll'
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return window;
}

export default function DocsSectionNavigator({ anchors }: DocsSectionNavigatorProps) {
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);

  useEffect(() => {
    if (anchors.length === 0) {
      setActiveAnchorId(null);
      return;
    }

    setActiveAnchorId((current) =>
      current && anchors.some((anchor) => anchor.id === current) ? current : anchors[0].id
    );
  }, [anchors]);

  useEffect(() => {
    if (anchors.length === 0) return;

    const firstAnchorElement = document.getElementById(anchors[0].id);
    const scrollContainer = findScrollContainer(firstAnchorElement);
    let frameId = 0;

    const updateActiveAnchor = () => {
      frameId = 0;

      let viewportCenter = window.innerHeight / 2;

      if (scrollContainer !== window) {
        const containerRect = (scrollContainer as HTMLElement).getBoundingClientRect();
        viewportCenter = containerRect.top + containerRect.height / 2;
      }

      let nextActiveId = anchors[0].id;
      let minDistance = Number.POSITIVE_INFINITY;

      anchors.forEach((anchor) => {
        const element = document.getElementById(anchor.id);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);

        if (distance < minDistance) {
          minDistance = distance;
          nextActiveId = anchor.id;
        }
      });

      setActiveAnchorId(nextActiveId);
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateActiveAnchor);
    };

    scheduleUpdate();
    if (scrollContainer === window) {
      window.addEventListener('scroll', scheduleUpdate, { passive: true });
    } else {
      scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true });
    }
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (scrollContainer === window) {
        window.removeEventListener('scroll', scheduleUpdate);
      } else {
        scrollContainer.removeEventListener('scroll', scheduleUpdate);
      }
      window.removeEventListener('resize', scheduleUpdate);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [anchors]);

  if (anchors.length === 0) return null;

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="pointer-events-none absolute left-1 top-0 z-10 block h-full">
      <div className="pointer-events-auto sticky top-1/2 -translate-y-1/2">
        <div className="flex flex-col gap-2.5">
          {anchors.map((anchor) => (
            <div key={anchor.id} className="group relative flex h-5 items-center justify-center">
              <button
                type="button"
                onClick={() => handleNavigate(anchor.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full transition-all duration-150 ease-out"
                title={anchor.label}
                aria-label={`Navigate to section: ${anchor.label}`}
              >
                <span className={getNavigatorDotClassName(activeAnchorId === anchor.id)} />
              </button>

              <NavigatorHoverTooltip label={anchor.label} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
