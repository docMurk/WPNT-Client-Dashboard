import { useRef, useState, useCallback, useLayoutEffect } from 'react';
import dayjs from 'dayjs';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { getAbbreviation } from '@/lib/programAbbreviations';
import { useUpdateOutreach } from '@/hooks/useOutreach';
import type { OutreachEntry } from '@/types/outreach';
import { CARD_WIDTH, CARD_HEIGHT } from '@/hooks/useTimelineLayout';

function formatCardDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    const k = Math.round((amount / 1000) * 2) / 2;
    if (k % 1 === 0) return `$${k}K`;
    return `$${k}K`;
  }
  return `$${amount}`;
}

function formatDollarRange(min: number | null, max: number | null): string {
  if (!max) return '';
  if (min && min !== max) {
    return `${formatCurrencyShort(min)}-${formatCurrencyShort(max).replace('$', '')}`;
  }
  return formatCurrencyShort(max);
}

const DRAG_THRESHOLD = 8;

interface EntryCardProps {
  entry: OutreachEntry;
  isExpanded: boolean;
  onToggle: () => void;
  section: 'proposal' | 'followUp';
  style: React.CSSProperties;
  isZooming: boolean;
  visibleTimeStart: number;
  visibleTimeEnd: number;
  containerWidth: number;
}

export function EntryCard({
  entry,
  isExpanded,
  onToggle,
  section,
  style,
  isZooming,
  visibleTimeStart,
  visibleTimeEnd,
  containerWidth,
}: EntryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragStateRef = useRef<'idle' | 'pending' | 'dragging'>('idle');
  const dragStartXRef = useRef(0);
  const dragStartLeftRef = useRef(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetDate, setDragTargetDate] = useState('');

  // FLIP animation ref — stores visual bounding rect at drop time
  const dropRectRef = useRef<DOMRect | null>(null);

  const updateOutreach = useUpdateOutreach();

  // Aging indicator (ring only, no text)
  const daysOpen = entry.status === 'Open' && entry.outreachType === 'Proposal'
    ? dayjs().diff(dayjs(entry.dateSent + 'T00:00:00'), 'day')
    : 0;
  const isAging = daysOpen >= 30;

  const abbrev = getAbbreviation(entry.programName);
  const dateLabel = formatCardDate(entry.dateSent);
  const dollarLabel =
    entry.outreachType === 'Proposal'
      ? formatDollarRange(entry.dollarAmountMin, entry.dollarAmountMax)
      : '';

  // Compute date from pixel position
  const pixelToDate = useCallback(
    (px: number) => {
      const timeSpan = visibleTimeEnd - visibleTimeStart;
      const centerX = px + CARD_WIDTH / 2;
      const time = visibleTimeStart + (centerX / containerWidth) * timeSpan;
      return dayjs(time).startOf('day').format('YYYY-MM-DD');
    },
    [visibleTimeStart, visibleTimeEnd, containerWidth],
  );

  // Drag pointer handlers
  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isExpanded) return;
      if (e.button !== 0) return;
      e.stopPropagation();
      dragStateRef.current = 'pending';
      dragStartXRef.current = e.clientX;
      dragStartLeftRef.current = (style.left as number) || 0;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isExpanded, style.left],
  );

  const handleCardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStateRef.current === 'idle') return;

      const dx = e.clientX - dragStartXRef.current;

      if (dragStateRef.current === 'pending' && Math.abs(dx) > DRAG_THRESHOLD) {
        dragStateRef.current = 'dragging';
        setIsDragging(true);
        e.stopPropagation();
      }

      if (dragStateRef.current === 'dragging') {
        e.stopPropagation();
        setDragOffsetX(dx);
        const newLeft = dragStartLeftRef.current + dx;
        setDragTargetDate(pixelToDate(newLeft));
      }
    },
    [pixelToDate],
  );

  const handleCardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasState = dragStateRef.current;
      dragStateRef.current = 'idle';

      if (wasState === 'dragging') {
        e.stopPropagation();
        const newLeft = dragStartLeftRef.current + (e.clientX - dragStartXRef.current);
        const newDate = pixelToDate(newLeft);

        if (newDate !== entry.dateSent) {
          // Capture visual rect before layout changes for 2D FLIP animation
          if (cardRef.current) {
            dropRectRef.current = cardRef.current.getBoundingClientRect();
          }
          updateOutreach.mutate({ id: entry.id, data: { dateSent: newDate } });
        }

        // Let React re-render with new layout position
        setIsDragging(false);
        setDragOffsetX(0);
        setDragTargetDate('');
      } else if (wasState === 'pending') {
        setIsDragging(false);
        setDragOffsetX(0);
        onToggle();
      }
    },
    [pixelToDate, entry.dateSent, entry.id, updateOutreach, onToggle],
  );

  // FLIP animation: after layout updates, animate from drop position to final position
  // Track both horizontal and vertical position for 2D FLIP
  const styleLeft = (style.left as number) || 0;
  const styleVertical = ((style.bottom ?? style.top) as number) || 0;

  useLayoutEffect(() => {
    const oldRect = dropRectRef.current;
    dropRectRef.current = null; // Always clear to prevent stale refs

    if (!oldRect) return;
    const el = cardRef.current;
    if (!el) return;

    const newRect = el.getBoundingClientRect();
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    // If the delta is negligible, skip animation
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    // Invert: place card at its old visual position (no transition)
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transition = 'none';

    // Force reflow so the browser registers the starting position
    el.getBoundingClientRect();

    // Play: animate to final position
    el.style.transition = 'transform 200ms ease-out';
    el.style.transform = 'translate(0, 0)';

    const cleanup = () => {
      el.style.transform = '';
      el.style.transition = '';
    };
    el.addEventListener('transitionend', cleanup, { once: true });

    return () => {
      el.removeEventListener('transitionend', cleanup);
    };
  }, [styleLeft, styleVertical]);

  // Keep transitions active even during drag — drag uses transform which doesn't conflict
  const transitionStyle =
    isZooming ? {} : { transition: 'left 150ms ease-out, top 150ms ease-out, bottom 150ms ease-out' };
  const dragStyle = isDragging
    ? { transform: `translateX(${dragOffsetX}px)`, zIndex: 50, cursor: 'grabbing' }
    : {};

  return (
    <div
      ref={cardRef}
      className="absolute"
      style={{ ...style, ...transitionStyle, ...dragStyle }}
    >
      {/* Date tooltip during drag */}
      {isDragging && dragTargetDate && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-wpnt-blue px-2 py-0.5 text-[10px] font-semibold text-white shadow-md"
          style={section === 'proposal' ? { top: '100%', marginTop: 4 } : { bottom: '100%', marginBottom: 4 }}
        >
          {dayjs(dragTargetDate).format('MMM D, YYYY')}
        </div>
      )}

      {/* Card */}
      <div
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        className={`flex flex-col items-center gap-0.5 rounded-xl border border-wpnt-border bg-white shadow-md px-3.5 pt-3.5 pb-2.5 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow select-none ${
          isDragging ? 'shadow-xl ring-2 ring-wpnt-blue/30' : isAging ? 'ring-2 ring-status-declined/40' : ''
        } ${isExpanded ? 'ring-2 ring-wpnt-blue/40' : ''}`}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        <ClientLogo clientId={entry.clientId} size={36} showLabel />

        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-wpnt-text whitespace-nowrap">
            {dateLabel}
            {abbrev && <span className="font-semibold"> - {abbrev}</span>}
          </span>
        </div>

        {dollarLabel && (
          <span className="text-[10px] font-bold text-proposal">
            {dollarLabel}
          </span>
        )}
      </div>
    </div>
  );
}
