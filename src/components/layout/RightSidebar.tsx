import { useMemo } from 'react';
import { Search, X, RotateCcw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useOutreachStore } from '@/store/outreachStore';
import { useFilterStore } from '@/store/filterStore';
import { useClients, useOutreachEntries } from '@/hooks/useOutreach';
import { ChipSelector } from '@/components/timeline/ChipSelector';
import { getAbbreviation } from '@/lib/programAbbreviations';
import type { OutreachType, OutreachStatus } from '@/types/outreach';

dayjs.extend(quarterOfYear);

const OUTREACH_TYPES: { value: OutreachType; label: string; color: string }[] = [
  { value: 'Proposal', label: 'Proposals', color: 'bg-proposal' },
  { value: 'Follow-Up', label: 'Follow-Ups', color: 'bg-follow-up' },
];

const STATUSES: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'Open', label: 'Open', color: 'bg-status-open' },
  { value: 'Accepted', label: 'Accepted', color: 'bg-status-accepted' },
  { value: 'Declined', label: 'Declined', color: 'bg-status-declined' },
  { value: 'No Response', label: 'No Response', color: 'bg-status-no-response' },
  { value: 'Other', label: 'Other', color: 'bg-status-other' },
];

interface ZoomPreset {
  label: string;
  getRange: () => { start: number; end: number };
}

const ZOOM_PRESETS: ZoomPreset[] = [
  {
    label: 'Last 30d',
    getRange: () => ({
      start: dayjs().subtract(30, 'day').subtract(2, 'day').valueOf(),
      end: dayjs().add(2, 'day').valueOf(),
    }),
  },
  {
    label: 'Last 90d',
    getRange: () => ({
      start: dayjs().subtract(90, 'day').subtract(5, 'day').valueOf(),
      end: dayjs().add(5, 'day').valueOf(),
    }),
  },
  {
    label: 'This year',
    getRange: () => ({
      start: dayjs().startOf('year').subtract(10, 'day').valueOf(),
      end: dayjs().endOf('year').add(10, 'day').valueOf(),
    }),
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RightSidebar() {
  const { rightSidebarCollapsed, toggleRightSidebar, openForm, setTimelineZoom } = useOutreachStore();
  const {
    outreachTypes,
    clientIds,
    programNames,
    dateRange,
    statuses,
    searchQuery,
    toggleOutreachType,
    toggleClientId,
    setClientIds,
    toggleProgramName,
    setProgramNames,
    setDateRange,
    toggleStatus,
    setSearchQuery,
    resetFilters,
  } = useFilterStore();
  const { data: clients = [] } = useClients();
  const { data: entries = [] } = useOutreachEntries();

  const clientItems = useMemo(
    () =>
      clients
        .filter((c) => c.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, label: c.name })),
    [clients],
  );

  const programItems = useMemo(() => {
    const programSet = new Map<string, string>();
    for (const entry of entries) {
      if (entry.programName && !programSet.has(entry.programName)) {
        programSet.set(entry.programName, getAbbreviation(entry.programName));
      }
    }
    return Array.from(programSet.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, abbrev]) => ({
        id: name,
        label: name,
        subLabel: abbrev,
      }));
  }, [entries]);

  const hasActiveFilters =
    outreachTypes.length > 0 ||
    clientIds.length > 0 ||
    programNames.length > 0 ||
    dateRange.start !== null ||
    dateRange.end !== null ||
    statuses.length > 0 ||
    searchQuery !== '';

  // Quarter info
  const currentQuarter = dayjs().quarter();
  const currentYear = dayjs().year();
  const quarterProposals = entries.filter(
    (e) =>
      e.outreachType === 'Proposal' &&
      dayjs(e.dateSent + 'T00:00:00').quarter() === currentQuarter &&
      dayjs(e.dateSent + 'T00:00:00').year() === currentYear,
  );
  const quarterTotal = quarterProposals.reduce(
    (sum, e) => sum + (e.dollarAmountMax ?? 0),
    0,
  );

  return (
    <>
      {/* Toggle button — always visible on the edge */}
      <button
        onClick={toggleRightSidebar}
        className="absolute top-4 z-30 flex h-20 w-14 items-center justify-center rounded-l-md border border-r-0 border-wpnt-border bg-white shadow-md text-wpnt-text hover:bg-wpnt-surface hover:shadow-lg transition-all"
        style={{ right: rightSidebarCollapsed ? 0 : 320 }}
      >
        {rightSidebarCollapsed ? <ChevronLeft size={48} /> : <ChevronRight size={48} />}
      </button>

      {/* Sidebar panel */}
      <aside
        className={`flex flex-col bg-white overflow-y-auto overflow-x-hidden transition-all duration-200 shrink-0 ${
          rightSidebarCollapsed ? 'w-0' : 'w-80'
        }`}
        style={{ boxShadow: '-6px 0 20px -4px rgba(0,0,0,0.15)' }}
      >
        <div className="w-80 min-w-[320px]">
          {/* Title */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <h2 className="text-sm font-semibold text-wpnt-blue">Client Engagement</h2>
          </div>

          {/* Search */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-wpnt-text"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-wpnt-border bg-white pl-9 pr-8 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-wpnt-text hover:text-wpnt-body"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text mb-3.5 block">
              Type
            </span>
            <div className="flex flex-col gap-1.5">
              {OUTREACH_TYPES.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => toggleOutreachType(value)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                    outreachTypes.includes(value)
                      ? 'border-transparent bg-wpnt-blue text-white shadow-sm'
                      : 'border-wpnt-border bg-white text-wpnt-text shadow-sm hover:shadow hover:border-wpnt-blue/30'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text mb-3.5 block">
              Status
            </span>
            <div className="flex flex-col gap-1.5">
              {STATUSES.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => toggleStatus(value)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                    statuses.includes(value)
                      ? 'border-transparent bg-wpnt-blue text-white shadow-sm'
                      : 'border-wpnt-border bg-white text-wpnt-text shadow-sm hover:shadow hover:border-wpnt-blue/30'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Client */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text mb-3.5 block">
              Client
            </span>
            <ChipSelector
              label="Select Clients"
              items={clientItems}
              selectedIds={clientIds}
              onToggle={toggleClientId}
              onClear={() => setClientIds([])}
              openDirection="left"
            />
          </div>

          {/* Program */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text mb-3.5 block">
              Program
            </span>
            <ChipSelector
              label="Select Programs"
              items={programItems}
              selectedIds={programNames}
              onToggle={toggleProgramName}
              onClear={() => setProgramNames([])}
              openDirection="left"
            />
          </div>

          {/* Timeline View */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text mb-2 block">
              View
            </span>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const range = preset.getRange();
                    setTimelineZoom(range.start, range.end);
                  }}
                  className="rounded-md border border-wpnt-border bg-white px-2 py-1.5 text-[10px] font-medium text-wpnt-text shadow-sm hover:shadow hover:border-wpnt-blue/30 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text mb-2 block">
              Date Filter
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start ?? ''}
                onChange={(e) => setDateRange(e.target.value || null, dateRange.end)}
                className="h-7 flex-1 min-w-0 rounded-md border border-wpnt-border bg-white px-2 text-[10px] outline-none focus:border-wpnt-blue"
              />
              <span className="text-[10px] text-wpnt-text shrink-0">&rarr;</span>
              <input
                type="date"
                value={dateRange.end ?? ''}
                onChange={(e) => setDateRange(dateRange.start, e.target.value || null)}
                className="h-7 flex-1 min-w-0 rounded-md border border-wpnt-border bg-white px-2 text-[10px] outline-none focus:border-wpnt-blue"
              />
            </div>
          </div>

          {/* Quarter info */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-wpnt-text">
                Q{currentQuarter} Proposed
              </span>
              <span className="text-sm font-bold text-wpnt-blue">
                {formatCurrency(quarterTotal)}
              </span>
            </div>
          </div>

          {/* New Entry button */}
          <div className="px-6 py-6 border-b border-wpnt-border">
            <button
              onClick={() => openForm()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-wpnt-blue px-3 py-2 text-sm font-medium text-white hover:bg-wpnt-blue/90 transition-colors"
            >
              <Plus size={14} />
              New Entry
            </button>
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <div className="px-6 py-6">
              <button
                onClick={resetFilters}
                className="flex w-full items-center justify-center gap-1 rounded-md border border-wpnt-border bg-white px-2 py-1.5 text-xs text-wpnt-text shadow-sm hover:shadow hover:border-wpnt-blue/30 transition-all"
              >
                <RotateCcw size={12} />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
