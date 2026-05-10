import { RefObject, useEffect, useRef, useState } from 'react';
import NavigatorHoverTooltip from '@/components/common/NavigatorHoverTooltip';
import { getNavigatorDotClassName } from '@/components/common/navigatorDot';

interface SessionMessageAnchor {
  id: string;
  label: string;
}

interface SessionMessageNavigatorProps {
  anchors: SessionMessageAnchor[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

const NAVIGATOR_VISIBLE_COUNT = 10;
const NAVIGATOR_ITEM_SIZE = 20;
const NAVIGATOR_ITEM_GAP = 6;

export default function SessionMessageNavigator({
  anchors,
  scrollContainerRef,
}: SessionMessageNavigatorProps) {
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || anchors.length === 0) return;

    let frameId = 0;

    const updateActiveAnchor = () => {
      frameId = 0;

      const containerRect = scrollContainer.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      let nextActiveId = anchors[0].id;
      let minDistance = Number.POSITIVE_INFINITY;

      anchors.forEach((anchor) => {
        const element = document.getElementById(anchor.id);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - containerCenter);

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
    scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      scrollContainer.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [anchors, scrollContainerRef]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !activeAnchorId) {
      return;
    }

    const activeItem = itemRefs.current[activeAnchorId];

    if (!activeItem) {
      return;
    }

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    const viewportTop = viewport.scrollTop;
    const viewportBottom = viewportTop + viewport.clientHeight;

    if (itemTop < viewportTop) {
      viewport.scrollTo({
        top: itemTop,
        behavior: 'smooth',
      });
      return;
    }

    if (itemBottom > viewportBottom) {
      viewport.scrollTo({
        top: itemBottom - viewport.clientHeight,
        behavior: 'smooth',
      });
    }
  }, [activeAnchorId]);

  if (anchors.length === 0) return null;

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  return (
    <div className="pointer-events-none absolute left-1 top-1/2 block -translate-y-1/2 overflow-visible">
      <div
        ref={viewportRef}
        className="navigator-scrollbar-none pointer-events-none overflow-y-auto overscroll-contain"
        style={{
          maxHeight: `${NAVIGATOR_VISIBLE_COUNT * NAVIGATOR_ITEM_SIZE + (NAVIGATOR_VISIBLE_COUNT - 1) * NAVIGATOR_ITEM_GAP}px`,
          width: '188px',
        }}
      >
        <div className="flex w-5 flex-col gap-1.5">
          {anchors.map((anchor) => (
            <div
              key={anchor.id}
              ref={(node) => {
                itemRefs.current[anchor.id] = node;
              }}
              className="pointer-events-auto group relative flex h-5 w-5 items-center"
            >
              <button
                type="button"
                onClick={() => handleNavigate(anchor.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full transition-all duration-150 ease-out"
                title={anchor.label}
                aria-label={`Navigate to message: ${anchor.label}`}
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
