import { useState, useEffect, useRef } from 'react';
import { X, Upload, AlertCircle, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import type { ParseResult, ExtractedProposal, ExtractedOutreach } from '@/lib/documentParser';
import { useClients, useCreateClient, useCreateOutreach } from '@/hooks/useOutreach';
import { useOutreachStore } from '@/store/outreachStore';
import type { OutreachFormData } from '@/types/outreach';

interface UploadPreviewProps {
  result: ParseResult;
  onClose: () => void;
  onEntryCreated: () => void;
}

export function UploadPreview({ result, onClose, onEntryCreated }: UploadPreviewProps) {
  const { data: clients = [] } = useClients();
  const createClient = useCreateClient();
  const createOutreach = useCreateOutreach();
  const { openFormWithPrefill } = useOutreachStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Local editable state — initialized from parse result
  const [clientName, setClientName] = useState('');
  const [clientDomain, setClientDomain] = useState('');
  const [dateSent, setDateSent] = useState('');
  const [programName, setProgramName] = useState('');
  const [dollarMin, setDollarMin] = useState<number | null>(null);
  const [dollarMax, setDollarMax] = useState<number | null>(null);
  const [senderName, setSenderName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (result.type === 'proposal') {
      const d = result.data as ExtractedProposal;
      setClientName(d.clientName);
      setClientDomain(d.clientDomain);
      setDateSent(dayjs().format('YYYY-MM-DD'));
      setProgramName(d.programName);
      setDollarMin(d.dollarAmountMin);
      setDollarMax(d.dollarAmountMax);
      setContactEmail(d.contactEmail);
    } else if (result.type === 'outreach') {
      const d = result.data as ExtractedOutreach;
      setClientName(d.clientName);
      setClientDomain(d.clientDomain);
      setDateSent(d.dateSent || dayjs().format('YYYY-MM-DD'));
      setProgramName(d.programName);
      setSenderName(d.senderName);
      setContactName(d.contactName);
      setContactEmail(d.contactEmail);
      setNotes(d.notes);
    }
  }, [result]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid catching the drop event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  if (result.type === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <div ref={panelRef} className="w-96 rounded-xl border border-wpnt-border bg-wpnt-card shadow-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-status-declined shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-wpnt-body">Upload Error</h3>
              <p className="mt-1 text-xs text-wpnt-text">{result.message}</p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-wpnt-border px-4 py-1.5 text-xs font-medium text-wpnt-text hover:bg-wpnt-surface transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProposal = result.type === 'proposal';

  // Check if client already exists (case-insensitive match)
  const matchingClient = clients.find(
    (c) => c.name.toLowerCase() === clientName.trim().toLowerCase(),
  );

  const handleConfirm = async () => {
    if (!clientName.trim()) return;
    setIsSubmitting(true);

    try {
      let clientId = matchingClient?.id;

      // Create client if new
      if (!clientId) {
        const newClient = await new Promise<{ id: string }>((resolve) => {
          createClient.mutate(
            {
              name: clientName.trim(),
              clientDomain: clientDomain.trim(),
              logoUrl: '',
              industry: '',
              isActive: true,
            },
            { onSuccess: resolve },
          );
        });
        clientId = newClient.id;
      }

      const formData: OutreachFormData = {
        clientId,
        clientName: clientName.trim(),
        outreachType: isProposal ? 'Proposal' : 'Follow-Up',
        senderName: senderName.trim(),
        senderEmail: result.type === 'outreach' ? (result.data as ExtractedOutreach).senderEmail : '',
        dateSent,
        dollarAmountMin: dollarMin,
        dollarAmountMax: dollarMax,
        participantCount: isProposal ? (result.data as ExtractedProposal).participantCount : null,
        participantCountMax: null,
        programName: programName.trim(),
        programDescription: isProposal ? (result.data as ExtractedProposal).programDescription : '',
        status: 'Open',
        outcomeSpend: false,
        spendAmount: null,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactTitle: '',
        notes: notes.trim(),
        documentLink: '',
        sharepointLink: '',
        declineNotes: '',
        crmOwner: '',
      };

      createOutreach.mutate(formData, {
        onSuccess: () => {
          onEntryCreated();
          onClose();
        },
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleEditAll = () => {
    const prefill: Partial<OutreachFormData> = {
      ...(matchingClient ? { clientId: matchingClient.id } : {}),
      clientName: clientName.trim(),
      outreachType: isProposal ? 'Proposal' : 'Follow-Up',
      senderName: senderName.trim(),
      senderEmail: result.type === 'outreach' ? (result.data as ExtractedOutreach).senderEmail : '',
      dateSent,
      dollarAmountMin: dollarMin,
      dollarAmountMax: dollarMax,
      participantCount: isProposal ? (result.data as ExtractedProposal).participantCount : null,
      programName: programName.trim(),
      programDescription: isProposal ? (result.data as ExtractedProposal).programDescription : '',
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      notes: notes.trim(),
      sharepointLink: '',
      declineNotes: '',
      crmOwner: '',
    };
    onClose();
    openFormWithPrefill(prefill);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={panelRef}
        className="w-[420px] rounded-xl border border-wpnt-border bg-wpnt-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-wpnt-border px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-wpnt-blue" />
            <h3 className="text-sm font-semibold text-wpnt-body">
              {isProposal ? 'New Proposal' : 'New Outreach Entry'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-wpnt-text hover:bg-wpnt-surface transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          {/* Client name + match indicator */}
          <div>
            <label className="text-xs font-medium text-wpnt-text">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
            />
            <p className="mt-0.5 text-[10px]">
              {matchingClient ? (
                <span className="text-status-accepted">Existing client</span>
              ) : clientName.trim() ? (
                <span className="text-wpnt-text">New — will be created</span>
              ) : null}
            </p>
          </div>

          {/* Client Domain */}
          <div>
            <label className="text-xs font-medium text-wpnt-text">
              Client Domain <span className="font-normal text-wpnt-text/60">(for logo)</span>
            </label>
            <input
              type="text"
              value={clientDomain}
              onChange={(e) => setClientDomain(e.target.value)}
              placeholder="e.g., acme.com"
              className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-wpnt-text">Date</label>
            <input
              type="date"
              value={dateSent}
              onChange={(e) => setDateSent(e.target.value)}
              className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
            />
          </div>

          {/* Program Name */}
          <div>
            <label className="text-xs font-medium text-wpnt-text">Program Name</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
            />
          </div>

          {/* Dollar range (proposals only) */}
          {isProposal && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-wpnt-text">Min Amount</label>
                <input
                  type="number"
                  value={dollarMin ?? ''}
                  onChange={(e) =>
                    setDollarMin(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="e.g., 31200"
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-wpnt-text">Max Amount</label>
                <input
                  type="number"
                  value={dollarMax ?? ''}
                  onChange={(e) =>
                    setDollarMax(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="e.g., 37500"
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
            </div>
          )}

          {/* Sender name (outreach only) */}
          {!isProposal && (
            <div>
              <label className="text-xs font-medium text-wpnt-text">Sender Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-wpnt-border px-5 py-3">
          <button
            onClick={handleEditAll}
            className="text-xs text-wpnt-blue hover:underline"
          >
            Edit all fields...
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-wpnt-border px-4 py-1.5 text-xs font-medium text-wpnt-text hover:bg-wpnt-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !clientName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-wpnt-blue px-4 py-1.5 text-xs font-medium text-white hover:bg-wpnt-blue/90 transition-colors disabled:opacity-50"
            >
              <Upload size={12} />
              Add to Timeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
