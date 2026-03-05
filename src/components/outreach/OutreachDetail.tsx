import { useState, useEffect } from 'react';
import { X, Archive, ArchiveRestore, ExternalLink, DollarSign, Pencil, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useOutreachStore } from '@/store/outreachStore';
import { useOutreachEntries, useUpdateOutreach, useDeleteOutreach } from '@/hooks/useOutreach';
import { ClientLogo } from '@/components/clients/ClientLogo';
import type { OutreachStatus } from '@/types/outreach';

const TYPE_COLORS: Record<string, string> = {
  Proposal: 'bg-proposal',
  'Follow-Up': 'bg-follow-up',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-status-open',
  Accepted: 'bg-status-accepted',
  Declined: 'bg-status-declined',
  'No Response': 'bg-status-no-response',
  Other: 'bg-status-other',
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
    month: 'long',
    day: 'numeric',
  });
}

export function OutreachDetail() {
  const { selectedEntryId, isDetailOpen, closeDetail, openForm } = useOutreachStore();
  const { data: entries = [] } = useOutreachEntries();
  const updateOutreach = useUpdateOutreach();
  const deleteOutreach = useDeleteOutreach();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const entry = entries.find((e) => e.id === selectedEntryId);

  // Reset confirmation when switching entries or closing
  useEffect(() => {
    setConfirmDelete(false);
  }, [selectedEntryId, isDetailOpen]);

  // Slide-in animation on open
  useEffect(() => {
    if (isDetailOpen) {
      setIsClosing(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    } else {
      setIsVisible(false);
    }
  }, [isDetailOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      closeDetail();
    }, 200);
  };

  if (!isDetailOpen && !isClosing) return null;
  if (!entry) return null;

  const daysOpen = entry.status === 'Open' && entry.outreachType === 'Proposal'
    ? dayjs().diff(dayjs(entry.dateSent + 'T00:00:00'), 'day')
    : 0;

  const handleStatusChange = (status: OutreachStatus) => {
    updateOutreach.mutate({ id: entry.id, data: { status } });
  };

  const handleArchiveToggle = () => {
    updateOutreach.mutate({
      id: entry.id,
      data: { isArchived: !entry.isArchived },
    });
    if (!entry.isArchived) handleClose();
  };

  const handleDelete = () => {
    deleteOutreach.mutate(entry.id, {
      onSuccess: () => handleClose(),
    });
  };

  const handleOutcomeToggle = () => {
    updateOutreach.mutate({
      id: entry.id,
      data: {
        outcomeSpend: !entry.outcomeSpend,
        spendAmount: !entry.outcomeSpend ? entry.dollarAmountMax : null,
      },
    });
  };

  const handleSpendAmountChange = (value: string) => {
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      updateOutreach.mutate({
        id: entry.id,
        data: { spendAmount: amount },
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{ backgroundColor: isVisible ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0)' }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col border-l border-wpnt-border bg-[#FAFBFD] shadow-xl transition-transform duration-200 ease-out"
        style={{ transform: isVisible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-wpnt-border px-8 py-5">
          <div className="flex items-center gap-3">
            <ClientLogo clientId={entry.clientId} size={36} />
            <div>
              <h2 className="text-base font-semibold text-wpnt-body">
                {entry.clientName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-semibold text-white ${TYPE_COLORS[entry.outreachType]}`}
                >
                  {entry.outreachType}
                </span>
                <span className="text-xs text-wpnt-text">
                  {formatDate(entry.dateSent)}
                </span>
                {daysOpen > 0 && (
                  <span className={`text-xs font-medium ${daysOpen >= 30 ? 'text-status-declined' : 'text-wpnt-text'}`}>
                    ({daysOpen}d open)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                handleClose();
                openForm(entry.id);
              }}
              className="rounded-md p-1.5 text-wpnt-text hover:bg-wpnt-surface transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={handleClose}
              className="rounded-md p-1.5 text-wpnt-text hover:bg-wpnt-surface transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Status */}
          <Section title="Status">
            <div className="flex items-center gap-2">
              {(['Open', 'Accepted', 'Declined', 'No Response', 'Other'] as OutreachStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      entry.status === status
                        ? 'border-transparent text-white ' + STATUS_COLORS[status]
                        : 'border-wpnt-border text-wpnt-text hover:bg-wpnt-surface'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`}
                    />
                    {status}
                  </button>
                ),
              )}
            </div>
          </Section>

          {/* Financial */}
          {(entry.outreachType === 'Proposal' || entry.dollarAmountMax) && (
            <Section title="Financial">
              <div className="space-y-3">
                {entry.dollarAmountMax && (
                  <DetailRow
                    label="Proposal Amount"
                    value={
                      entry.dollarAmountMin && entry.dollarAmountMin !== entry.dollarAmountMax
                        ? `${formatCurrency(entry.dollarAmountMin)} - ${formatCurrency(entry.dollarAmountMax)}`
                        : formatCurrency(entry.dollarAmountMax)
                    }
                  />
                )}

                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <span className="text-xs text-wpnt-text">
                    Resulted in Spend
                  </span>
                  <button
                    onClick={handleOutcomeToggle}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      entry.outcomeSpend ? 'bg-status-accepted' : 'bg-wpnt-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        entry.outcomeSpend ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {entry.outcomeSpend && (
                  <div>
                    <label className="text-xs text-wpnt-text">
                      Spend Amount
                    </label>
                    <div className="relative mt-1">
                      <DollarSign
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-wpnt-text"
                      />
                      <input
                        type="number"
                        value={entry.spendAmount ?? ''}
                        onChange={(e) =>
                          handleSpendAmountChange(e.target.value)
                        }
                        className="w-full rounded-md border border-wpnt-border py-1.5 pl-7 pr-3 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Program Details */}
          {(entry.programName || entry.participantCount) && (
            <Section title="Program Details">
              <div className="space-y-2">
                {entry.programName && (
                  <DetailRow label="Program" value={entry.programName} />
                )}
                {entry.participantCount && (
                  <DetailRow
                    label="Participants"
                    value={entry.participantCount.toString()}
                  />
                )}
                {entry.programDescription && (
                  <div>
                    <span className="text-xs text-wpnt-text">Description</span>
                    <p className="mt-0.5 text-sm text-wpnt-body">
                      {entry.programDescription}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Separator between Description and CRM */}
          <div className="border-t border-wpnt-border/50 my-1" />

          {/* CRM */}
          <Section title="CRM">
            <DetailRow label="Owner" value={entry.crmOwner || 'Not assigned'} />
          </Section>

          {/* Client Contact */}
          {entry.contactName && (
            <Section title="Client Contact">
              <div className="space-y-2">
                <DetailRow label="Name" value={entry.contactName} />
                {entry.contactEmail && (
                  <DetailRow label="Email" value={entry.contactEmail} />
                )}
                {entry.contactTitle && (
                  <DetailRow label="Title" value={entry.contactTitle} />
                )}
              </div>
            </Section>
          )}

          {/* Notes */}
          {entry.notes && (
            <Section title="Notes">
              <p className="text-sm text-wpnt-body whitespace-pre-wrap">
                {entry.notes}
              </p>
            </Section>
          )}

          {/* Decline Notes */}
          {entry.declineNotes && (
            <Section title="Decline Notes">
              <p className="text-sm text-wpnt-body whitespace-pre-wrap">
                {entry.declineNotes}
              </p>
            </Section>
          )}

          {/* Document Link */}
          {entry.documentLink && (
            <Section title="Document">
              <a
                href={entry.documentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-wpnt-blue hover:underline"
              >
                <ExternalLink size={14} />
                View Document
              </a>
            </Section>
          )}

          {/* SharePoint Link */}
          {entry.sharepointLink && (
            <Section title="SharePoint">
              <a
                href={entry.sharepointLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-wpnt-blue hover:underline"
              >
                <ExternalLink size={14} />
                Open Proposal Folder
              </a>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-wpnt-border px-8 py-4 space-y-2">
          <button
            onClick={handleArchiveToggle}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              entry.isArchived
                ? 'border-wpnt-blue text-wpnt-blue hover:bg-wpnt-blue/5'
                : 'border-wpnt-border text-wpnt-text hover:bg-wpnt-surface'
            }`}
          >
            {entry.isArchived ? (
              <>
                <ArchiveRestore size={16} />
                Restore to Timeline
              </>
            ) : (
              <>
                <Archive size={16} />
                Archive Entry
              </>
            )}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-wpnt-border px-4 py-2 text-sm font-medium text-wpnt-text hover:bg-wpnt-surface transition-colors"
            >
              <Trash2 size={16} />
              Delete Entry
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-status-declined px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Trash2 size={16} />
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-wpnt-border px-4 py-2 text-sm font-medium text-wpnt-text hover:bg-wpnt-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-wpnt-text">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 items-baseline">
      <span className="text-xs text-wpnt-text">{label}</span>
      <span className="text-sm font-medium text-wpnt-body text-left">{value}</span>
    </div>
  );
}
