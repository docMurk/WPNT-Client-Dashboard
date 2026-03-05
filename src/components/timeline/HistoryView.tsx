import { useState, useMemo } from 'react';
import { ArchiveRestore, ArrowUpDown } from 'lucide-react';
import { useFilteredOutreach, useUpdateOutreach } from '@/hooks/useOutreach';
import { useOutreachStore } from '@/store/outreachStore';
import { ClientLogo } from '@/components/clients/ClientLogo';

type SortKey = 'dateSent' | 'clientName' | 'dollarAmountMax' | 'status' | 'outreachType';
type SortDir = 'asc' | 'desc';

const TYPE_BADGES: Record<string, string> = {
  Proposal: 'bg-proposal/10 text-proposal',
  'Follow-Up': 'bg-follow-up/10 text-follow-up',
};

const STATUS_BADGES: Record<string, string> = {
  Open: 'bg-status-open/10 text-status-open',
  Accepted: 'bg-status-accepted/10 text-status-accepted',
  Declined: 'bg-status-declined/10 text-status-declined',
  'No Response': 'bg-status-no-response/10 text-status-no-response',
  Other: 'bg-status-other/10 text-status-other',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function HistoryView() {
  const archivedEntries = useFilteredOutreach(true);
  const updateOutreach = useUpdateOutreach();
  const { openDetail } = useOutreachStore();

  const [sortKey, setSortKey] = useState<SortKey>('dateSent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedEntries = useMemo(() => {
    return [...archivedEntries].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'dateSent':
          cmp = a.dateSent.localeCompare(b.dateSent);
          break;
        case 'clientName':
          cmp = a.clientName.localeCompare(b.clientName);
          break;
        case 'dollarAmountMax':
          cmp = (a.dollarAmountMax ?? 0) - (b.dollarAmountMax ?? 0);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'outreachType':
          cmp = a.outreachType.localeCompare(b.outreachType);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [archivedEntries, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleRestore = (id: string) => {
    updateOutreach.mutate({ id, data: { isArchived: false } });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-wpnt-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-wpnt-body">History</h2>
          <p className="text-xs text-wpnt-text mt-0.5">
            {sortedEntries.length} archived {sortedEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {sortedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-wpnt-text">
            <p className="text-lg font-medium">No archived entries</p>
            <p className="text-sm mt-1">
              Archived entries from the timeline will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-wpnt-surface border-b border-wpnt-border">
                <SortHeader
                  label="Client"
                  sortKey="clientName"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Type"
                  sortKey="outreachType"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Date Sent"
                  sortKey="dateSent"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Amount"
                  sortKey="dollarAmountMax"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Status"
                  sortKey="status"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-wpnt-text">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`border-b border-wpnt-border hover:bg-wpnt-surface/50 cursor-pointer transition-colors ${
                    idx % 2 === 1 ? 'bg-wpnt-alt-row' : ''
                  }`}
                  onClick={() => openDetail(entry.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ClientLogo clientId={entry.clientId} size={24} />
                      <span className="text-sm font-medium text-wpnt-body">
                        {entry.clientName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-semibold ${TYPE_BADGES[entry.outreachType]}`}
                    >
                      {entry.outreachType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-wpnt-text">
                    {formatDate(entry.dateSent)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-wpnt-body">
                    {entry.dollarAmountMax
                      ? entry.dollarAmountMin && entry.dollarAmountMin !== entry.dollarAmountMax
                        ? `${formatCurrency(entry.dollarAmountMin)} - ${formatCurrency(entry.dollarAmountMax)}`
                        : formatCurrency(entry.dollarAmountMax)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[entry.status] ?? ''}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(entry.id);
                      }}
                      className="flex items-center gap-1 rounded-md border border-wpnt-border px-2 py-1 text-xs text-wpnt-blue hover:bg-wpnt-surface transition-colors"
                      title="Restore to Timeline"
                    >
                      <ArchiveRestore size={12} />
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th className="px-4 py-2.5 text-left">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-wpnt-text hover:text-wpnt-body"
      >
        {label}
        <ArrowUpDown
          size={10}
          className={isActive ? 'text-wpnt-blue' : 'opacity-30'}
        />
        {isActive && (
          <span className="text-[8px] text-wpnt-blue">
            {currentDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );
}
