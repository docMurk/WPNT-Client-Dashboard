import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { ZoomIn, ZoomOut, Calendar, Upload } from 'lucide-react';
import { useFilteredOutreach } from '@/hooks/useOutreach';
import { useOutreachStore } from '@/store/outreachStore';
import {
  useTimelineLayout,
  CARD_HEIGHT,
  STACK_OFFSET,
} from '@/hooks/useTimelineLayout';
import { DateAxis } from './DateAxis';
import { EntryCard } from './EntryCard';
import { CardDetailPanel } from './CardDetailPanel';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { getAbbreviation } from '@/lib/programAbbreviations';
import { parseDocument, type ParseResult } from '@/lib/documentParser';
import { UploadPreview } from './UploadPreview';

const MIN_ZOOM = 7 * 24 * 60 * 60 * 1000; // 1 week
const MAX_ZOOM = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years

function formatCardDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

export function CalendarTimelineView() {
  const entries = useFilteredOutreach(false);
  const { expandedEntryId, expandEntry, collapseEntry, openDetail, openForm, timelineZoomTo, clearTimelineZoom } = useOutreachStore();

  // Time range state
  const [visibleTimeStart, setVisibleTimeStart] = useState(
    dayjs().subtract(6, 'month').valueOf(),
  );
  const [visibleTimeEnd, setVisibleTimeEnd] = useState(
    dayjs().add(3, 'month').valueOf(),
  );

  // Container width measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Listen for zoom requests from sidebar
  useEffect(() => {
    if (timelineZoomTo) {
      setVisibleTimeStart(timelineZoomTo.start);
      setVisibleTimeEnd(timelineZoomTo.end);
      clearTimelineZoom();
    }
  }, [timelineZoomTo, clearTimelineZoom]);

  // Zoom state for disabling transitions during rapid zoom
  const [isZooming, setIsZooming] = useState(false);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pan state
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartTimeRef = useRef(0);

  // Layout calculation
  const layout = useTimelineLayout(
    entries,
    containerWidth,
    visibleTimeStart,
    visibleTimeEnd,
  );

  // Zoom via wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseRatio = mouseX / rect.width;

      const span = visibleTimeEnd - visibleTimeStart;
      const factor = e.deltaY > 0 ? 1.15 : 0.87; // zoom out / zoom in
      let newSpan = span * factor;
      newSpan = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newSpan));

      const mouseTime =
        visibleTimeStart + mouseRatio * (visibleTimeEnd - visibleTimeStart);
      const newStart = mouseTime - mouseRatio * newSpan;
      const newEnd = mouseTime + (1 - mouseRatio) * newSpan;

      setVisibleTimeStart(newStart);
      setVisibleTimeEnd(newEnd);

      // Flag zooming to disable transitions
      setIsZooming(true);
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => setIsZooming(false), 200);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [visibleTimeStart, visibleTimeEnd]);

  // Pan state for disabling transitions during pan
  const [isPanning, setIsPanning] = useState(false);
  const timeStartRef = useRef(visibleTimeStart);
  const timeEndRef = useRef(visibleTimeEnd);
  timeStartRef.current = visibleTimeStart;
  timeEndRef.current = visibleTimeEnd;
  const rafRef = useRef<number | null>(null);

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // left click only
      isPanningRef.current = true;
      setIsPanning(true);
      panStartXRef.current = e.clientX;
      panStartTimeRef.current = timeStartRef.current;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartXRef.current;
      const span = timeEndRef.current - timeStartRef.current;
      const timeDelta = -(dx / containerWidth) * span;
      const newStart = panStartTimeRef.current + timeDelta;
      const newEnd = panStartTimeRef.current + timeDelta + span;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setVisibleTimeStart(newStart);
        setVisibleTimeEnd(newEnd);
      });
    },
    [containerWidth],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Button zoom
  const zoom = useCallback(
    (factor: number) => {
      const center = (visibleTimeStart + visibleTimeEnd) / 2;
      const span = visibleTimeEnd - visibleTimeStart;
      let newSpan = span * factor;
      newSpan = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newSpan));
      setVisibleTimeStart(center - newSpan / 2);
      setVisibleTimeEnd(center + newSpan / 2);
    },
    [visibleTimeStart, visibleTimeEnd],
  );

  const goToToday = useCallback(() => {
    const span = visibleTimeEnd - visibleTimeStart;
    const now = dayjs().valueOf();
    setVisibleTimeStart(now - span / 2);
    setVisibleTimeEnd(now + span / 2);
  }, [visibleTimeStart, visibleTimeEnd]);

  // Region heights — proportional split so axis stays at ~75% on all screen sizes
  const MIN_PROPOSAL_HEIGHT = 3 * STACK_OFFSET + 40;
  const proposalMinContent = Math.max(
    MIN_PROPOSAL_HEIGHT,
    layout.maxProposalStack * STACK_OFFSET + 40,
  );
  const followUpMinContent = Math.max(
    CARD_HEIGHT + 40,
    layout.maxFollowUpStack * STACK_OFFSET + 40,
  );
  const availableHeight = containerHeight - 40; // minus axis height
  const proposalHeight = Math.max(proposalMinContent, availableHeight * 0.75);
  const followUpHeight = Math.max(followUpMinContent, availableHeight * 0.25);

  // Year boundary lines (Jan 1 of each year)
  const yearBoundaryLines = useMemo(() => {
    if (containerWidth === 0) return [];
    const span = visibleTimeEnd - visibleTimeStart;
    if (span <= 0) return [];
    const lines: { x: number; year: number }[] = [];
    const startYear = dayjs(visibleTimeStart).year();
    const endYear = dayjs(visibleTimeEnd).year();
    for (let y = startYear; y <= endYear + 1; y++) {
      const jan1 = dayjs(`${y}-01-01`).valueOf();
      const x = ((jan1 - visibleTimeStart) / span) * containerWidth;
      if (x > -10 && x < containerWidth + 10) {
        lines.push({ x, year: y });
      }
    }
    return lines;
  }, [visibleTimeStart, visibleTimeEnd, containerWidth]);

  // File drag-and-drop state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadResult, setUploadResult] = useState<ParseResult | null>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const result = await parseDocument(file);
    setUploadResult(result);
  }, []);

  // Overflow dropdown state
  const [openOverflow, setOpenOverflow] = useState<string | null>(null);

  if (containerWidth === 0) {
    return (
      <div className="flex flex-col h-full">
        <div ref={containerRef} className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none cursor-grab active:cursor-grabbing bg-wpnt-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File drop overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-wpnt-blue bg-wpnt-blue/[0.08] pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-wpnt-blue">
              <Upload size={32} />
              <span className="text-sm font-semibold">Drop file to add entry</span>
              <span className="text-xs text-wpnt-text">.docx, .pdf, or .msg</span>
            </div>
          </div>
        )}

        {/* Year boundary lines (Jan 1 vertical dotted lines) */}
        {yearBoundaryLines.map(({ x, year }) => (
          <div
            key={year}
            className="absolute pointer-events-none"
            style={{
              left: x,
              top: 0,
              bottom: 0,
              zIndex: 1,
            }}
          >
            <div
              className="absolute"
              style={{
                left: -1,
                top: 0,
                bottom: 0,
                width: 0,
                borderLeft: '1px dotted var(--year-line-color)',
              }}
            />
          </div>
        ))}

        {/* Floating zoom controls — bottom-right */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-lg border border-wpnt-border bg-wpnt-card/90 px-2 py-1.5 backdrop-blur-sm">
          <button
            onClick={() => zoom(0.5)}
            className="rounded-md p-1 text-wpnt-text hover:bg-wpnt-surface transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => zoom(2)}
            className="rounded-md p-1 text-wpnt-text hover:bg-wpnt-surface transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <div className="h-4 w-px bg-wpnt-border" />
          <button
            onClick={goToToday}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-wpnt-text hover:bg-wpnt-surface transition-colors"
            title="Go to Today"
          >
            <Calendar size={12} className="inline mr-1" />
            Today
          </button>
        </div>

        {/* Proposals section */}
        <div className="relative" style={{ height: proposalHeight }}>
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-wpnt-text/60 z-10">
            Proposals
          </span>

          {layout.proposals.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-wpnt-text/40">
              No proposals in this range
            </div>
          )}

          {layout.proposals.map((card) => (
            <EntryCard
              key={card.entry.id}
              entry={card.entry}
              isExpanded={expandedEntryId === card.entry.id}
              onToggle={() =>
                expandedEntryId === card.entry.id
                  ? collapseEntry()
                  : expandEntry(card.entry.id)
              }
              section="proposal"
              isZooming={isZooming || isPanning}
              visibleTimeStart={visibleTimeStart}
              visibleTimeEnd={visibleTimeEnd}
              containerWidth={containerWidth}
              style={{
                left: card.x,
                bottom: -card.y - CARD_HEIGHT, // y is negative for proposals, position from bottom
              }}
            />
          ))}

          {/* +N more badges for proposals */}
          {layout.proposalColumns
            .filter((col) => col.overflowCount > 0)
            .map((col) => (
              <div
                key={col.id}
                className="absolute z-20"
                style={{
                  left: col.x + 50,
                  bottom: 4,
                }}
              >
                <button
                  onClick={() =>
                    setOpenOverflow(openOverflow === col.id ? null : col.id)
                  }
                  className="rounded-full bg-wpnt-blue px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-wpnt-blue/80"
                >
                  +{col.overflowCount} more
                </button>
                {openOverflow === col.id && (
                  <div className="absolute bottom-full mb-1 left-0 w-56 rounded-lg border border-wpnt-border bg-wpnt-card shadow-xl p-2 space-y-1 z-50">
                    {col.cards
                      .filter((c) => c.isOverflow)
                      .map((c) => (
                        <button
                          key={c.entry.id}
                          onClick={() => {
                            setOpenOverflow(null);
                            openDetail(c.entry.id);
                          }}
                          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-wpnt-surface text-left"
                        >
                          <ClientLogo
                            clientId={c.entry.clientId}
                            size={20}
                          />
                          <span className="truncate font-medium text-wpnt-body">
                            {c.entry.clientName}
                          </span>
                          <span className="text-wpnt-text ml-auto whitespace-nowrap">
                            {formatCardDate(c.entry.dateSent)}
                            {getAbbreviation(c.entry.programName) &&
                              ` - ${getAbbreviation(c.entry.programName)}`}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Date axis */}
        <DateAxis
          visibleTimeStart={visibleTimeStart}
          visibleTimeEnd={visibleTimeEnd}
          containerWidth={containerWidth}
        />

        {/* Follow-ups section */}
        <div className="relative" style={{ height: followUpHeight }}>
          {layout.followUps.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-wpnt-text/40">
              No follow-ups in this range
            </div>
          )}

          {layout.followUps.map((card) => (
            <EntryCard
              key={card.entry.id}
              entry={card.entry}
              isExpanded={expandedEntryId === card.entry.id}
              onToggle={() =>
                expandedEntryId === card.entry.id
                  ? collapseEntry()
                  : expandEntry(card.entry.id)
              }
              section="followUp"
              isZooming={isZooming || isPanning}
              visibleTimeStart={visibleTimeStart}
              visibleTimeEnd={visibleTimeEnd}
              containerWidth={containerWidth}
              style={{
                left: card.x,
                top: card.y,
              }}
            />
          ))}

          {/* +N more badges for follow-ups */}
          {layout.followUpColumns
            .filter((col) => col.overflowCount > 0)
            .map((col) => (
              <div
                key={col.id}
                className="absolute z-20"
                style={{
                  left: col.x + 50,
                  top: 4,
                }}
              >
                <button
                  onClick={() =>
                    setOpenOverflow(openOverflow === col.id ? null : col.id)
                  }
                  className="rounded-full bg-wpnt-blue px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-wpnt-blue/80"
                >
                  +{col.overflowCount} more
                </button>
                {openOverflow === col.id && (
                  <div className="absolute top-full mt-1 left-0 w-56 rounded-lg border border-wpnt-border bg-wpnt-card shadow-xl p-2 space-y-1 z-50">
                    {col.cards
                      .filter((c) => c.isOverflow)
                      .map((c) => (
                        <button
                          key={c.entry.id}
                          onClick={() => {
                            setOpenOverflow(null);
                            openDetail(c.entry.id);
                          }}
                          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-wpnt-surface text-left"
                        >
                          <ClientLogo
                            clientId={c.entry.clientId}
                            size={20}
                          />
                          <span className="truncate font-medium text-wpnt-body">
                            {c.entry.clientName}
                          </span>
                          <span className="text-wpnt-text ml-auto whitespace-nowrap">
                            {formatCardDate(c.entry.dateSent)}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}

          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider text-wpnt-text/60 z-10">
            Post-Program Outreach
          </span>
        </div>

        {/* Card detail panel */}
        {expandedEntryId && (() => {
          const allCards = [...layout.proposals, ...layout.followUps];
          const card = allCards.find((c) => c.entry.id === expandedEntryId);
          if (!card) return null;
          const isProposal = card.entry.outreachType === 'Proposal';
          const cardTop = isProposal
            ? proposalHeight + card.y + CARD_HEIGHT  // proposals: y is negative from bottom
            : proposalHeight + 40 + card.y; // follow-ups: after axis
          return (
            <CardDetailPanel
              entry={card.entry}
              cardX={card.x}
              cardTop={cardTop}
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              onClose={collapseEntry}
              onEdit={() => {
                collapseEntry();
                openForm(card.entry.id);
              }}
              onViewFull={() => {
                collapseEntry();
                openDetail(card.entry.id);
              }}
            />
          );
        })()}
      </div>

      {/* Upload preview modal */}
      {uploadResult && (
        <UploadPreview
          result={uploadResult}
          onClose={() => setUploadResult(null)}
          onEntryCreated={() => {}}
        />
      )}
    </div>
  );
}
