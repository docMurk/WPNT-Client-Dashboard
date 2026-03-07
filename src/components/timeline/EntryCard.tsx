import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
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

  // Pending drop: keeps drag transform alive until the parent re-renders
  // with the new layout position, preventing the "teleport" glitch.
  const pendingDropRectRef = useRef<DOMRect | null>(null);
  const pendingDropDateRef = useRef<string | null>(null);

  // FLIP animation refs
  const dropRectRef = useRef<DOMRect | null>(null);
  const prevRectRef = useRef<DOMRect | null>(null);

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
          // Capture visual rect for FLIP animation after layout settles
          if (cardRef.current) {
            pendingDropRectRef.current = cardRef.current.getBoundingClientRect();
          }
          pendingDropDateRef.current = newDate;
          // Fire mutation — onMutate applies optimistic cache update.
          // Keep isDragging=true so the drag transform holds the card in place
          // until the parent re-renders with the new layout position.
          updateOutreach.mutate({ id: entry.id, data: { dateSent: newDate } });
          setDragTargetDate('');
        } else {
          setIsDragging(false);
          setDragOffsetX(0);
          setDragTargetDate('');
        }
      } else if (wasState === 'pending') {
        setIsDragging(false);
        setDragOffsetX(0);
        onToggle();
      }
    },
    [pixelToDate, entry.dateSent, entry.id, updateOutreach, onToggle],
  );

  // --- Pending drop resolution ---
  // When the parent re-renders with updated entry.dateSent (from the optimistic
  // cache update), this effect fires BEFORE the browser paints. It transfers
  // the captured drop rect to dropRectRef and clears isDragging — triggering
  // a synchronous re-render where the card is at its correct new layout
  // position with no drag transform. The FLIP effect then animates from the
  // drop position to the final position (usually a tiny or zero delta).
  // This MUST be declared before the FLIP useLayoutEffect.
  useLayoutEffect(() => {
    if (!pendingDropDateRef.current) return;
    if (entry.dateSent !== pendingDropDateRef.current) return;

    // The parent has re-rendered with the new position — safe to release drag
    dropRectRef.current = pendingDropRectRef.current;
    pendingDropRectRef.current = null;
    pendingDropDateRef.current = null;
    setIsDragging(false);
    setDragOffsetX(0);
  });

  // Universal FLIP animation: captures rect after every paint, animates any position change
  const styleLeft = (style.left as number) || 0;
  const styleVertical = ((style.bottom ?? style.top) as number) || 0;

  // Capture card rect after every paint (for non-dragged cards and between drags)
  useEffect(() => {
    if (cardRef.current && !isDragging) {
      prevRectRef.current = cardRef.current.getBoundingClientRect();
    }
  });

  // Before paint: compare old rect to new rect, animate delta via transform
  useLayoutEffect(() => {
    if (isZooming) {
      dropRectRef.current = null;
      return;
    }
    if (isDragging) {
      return;
    }

    const el = cardRef.current;
    if (!el) return;

    // Prefer drop rect (dragged card) over previous paint rect (all cards)
    const oldRect = dropRectRef.current ?? prevRectRef.current;
    dropRectRef.current = null;

    if (!oldRect) return;

    const newRect = el.getBoundingClientRect();
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    // Invert: place card at its old visual position
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transition = 'none';

    // Force reflow
    el.getBoundingClientRect();

    // Play: animate to final position
    el.style.transition = 'transform 300ms ease-out';
    el.style.transform = 'translate(0, 0)';

    const cleanup = () => {
      el.style.transform = '';
      el.style.transition = '';
    };
    el.addEventListener('transitionend', cleanup, { once: true });

    return () => el.removeEventListener('transitionend', cleanup);
  }, [styleLeft, styleVertical, isZooming, isDragging]);

  const dragStyle = isDragging
    ? { transform: `translateX(${dragOffsetX}px)`, zIndex: 50, cursor: 'grabbing' }
    : {};

  return (
    <div
      ref={cardRef}
      className="absolute"
      style={{ ...style, ...dragStyle }}
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
        className={`flex flex-col items-center gap-0.5 rounded-xl border border-wpnt-border bg-wpnt-card shadow-lg px-1.5 pt-2 pb-1 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow select-none ${
          isDragging ? 'shadow-2xl ring-2 ring-wpnt-blue/30' : isAging ? 'ring-2 ring-status-declined/40' : ''
        } ${isExpanded ? 'ring-2 ring-wpnt-blue/40' : ''}`}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        <ClientLogo clientId={entry.clientId} size={48} showLabel />

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
