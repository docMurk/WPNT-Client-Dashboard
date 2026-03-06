import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { X, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useOutreachStore } from '@/store/outreachStore';
import {
  useClients,
  useCreateOutreach,
  useUpdateOutreach,
  useCreateClient,
  useOutreachEntries,
} from '@/hooks/useOutreach';
import type { OutreachFormData, OutreachType } from '@/types/outreach';

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  clientName: z.string().min(1),
  outreachType: z.enum(['Proposal', 'Follow-Up'] as const),
  senderName: z.string().min(1, 'Sender is required'),
  senderEmail: z.string().email('Invalid email').or(z.literal('')),
  dateSent: z.string().min(1, 'Date is required'),
  dollarAmountMin: z.number().nullable(),
  dollarAmountMax: z.number().nullable(),
  participantCount: z.number().nullable(),
  participantCountMax: z.number().nullable(),
  programName: z.string(),
  programDescription: z.string(),
  status: z.enum(['Open', 'Accepted', 'Declined', 'No Response', 'Other'] as const),
  outcomeSpend: z.boolean(),
  spendAmount: z.number().nullable(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactTitle: z.string(),
  notes: z.string(),
  documentLink: z.string(),
  sharepointLink: z.string(),
  declineNotes: z.string(),
  crmOwner: z.enum(['', 'Justin', 'Sam'] as const),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  clientId: '',
  clientName: '',
  outreachType: 'Proposal',
  senderName: '',
  senderEmail: '',
  dateSent: new Date().toISOString().split('T')[0],
  dollarAmountMin: null,
  dollarAmountMax: null,
  participantCount: null,
  participantCountMax: null,
  programName: '',
  programDescription: '',
  status: 'Open',
  outcomeSpend: false,
  spendAmount: null,
  contactName: '',
  contactEmail: '',
  contactTitle: '',
  notes: '',
  documentLink: '',
  sharepointLink: '',
  declineNotes: '',
  crmOwner: '',
};

export function OutreachForm() {
  const { isFormOpen, editingEntryId, closeForm, prefillData, clearPrefill } = useOutreachStore();
  const { data: clients = [] } = useClients();
  const { data: entries = [] } = useOutreachEntries();
  const createOutreach = useCreateOutreach();
  const updateOutreach = useUpdateOutreach();
  const createClient = useCreateClient();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    required: true,
    program: false,
    contact: false,
    notes: false,
  });
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDomain, setNewClientDomain] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const isEditing = !!editingEntryId;
  const editingEntry = entries.find((e) => e.id === editingEntryId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const outreachType = watch('outreachType');
  const clientId = watch('clientId');
  const crmOwner = watch('crmOwner');
  const status = watch('status');

  useEffect(() => {
    if (isFormOpen) {
      if (editingEntry) {
        reset({
          clientId: editingEntry.clientId,
          clientName: editingEntry.clientName,
          outreachType: editingEntry.outreachType,
          senderName: editingEntry.senderName,
          senderEmail: editingEntry.senderEmail,
          dateSent: editingEntry.dateSent,
          dollarAmountMin: editingEntry.dollarAmountMin,
          dollarAmountMax: editingEntry.dollarAmountMax,
          participantCount: editingEntry.participantCount,
          participantCountMax: editingEntry.participantCountMax,
          programName: editingEntry.programName,
          programDescription: editingEntry.programDescription,
          status: editingEntry.status,
          outcomeSpend: editingEntry.outcomeSpend,
          spendAmount: editingEntry.spendAmount,
          contactName: editingEntry.contactName,
          contactEmail: editingEntry.contactEmail,
          contactTitle: editingEntry.contactTitle,
          notes: editingEntry.notes,
          documentLink: editingEntry.documentLink,
          sharepointLink: editingEntry.sharepointLink,
          declineNotes: editingEntry.declineNotes,
          crmOwner: editingEntry.crmOwner,
        });
        setExpandedSections({
          required: true,
          program: !!(editingEntry.programName || editingEntry.participantCount),
          contact: !!editingEntry.contactName,
          notes: !!(editingEntry.notes || editingEntry.documentLink || editingEntry.sharepointLink),
        });
      } else if (prefillData) {
        reset({ ...defaultValues, ...prefillData });
        setExpandedSections({
          required: true,
          program: !!(prefillData.programName || prefillData.participantCount),
          contact: !!(prefillData.contactName),
          notes: !!(prefillData.notes),
        });
        clearPrefill();
      } else {
        reset(defaultValues);
        setExpandedSections({
          required: true,
          program: false,
          contact: false,
          notes: false,
        });
      }
      setShowNewClient(false);
      setClientSearch('');
    }
  }, [isFormOpen, editingEntry, reset]);

  if (!isFormOpen) return null;

  const filteredClients = clients
    .filter((c) => c.isActive)
    .filter(
      (c) =>
        !clientSearch ||
        c.name.toLowerCase().includes(clientSearch.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClientSelect = (id: string) => {
    const client = clients.find((c) => c.id === id);
    if (client) {
      setValue('clientId', client.id);
      setValue('clientName', client.name);
    }
  };

  const handleCreateClient = () => {
    if (!newClientName.trim()) return;
    createClient.mutate(
      {
        name: newClientName.trim(),
        clientDomain: newClientDomain.trim(),
        logoUrl: '',
        industry: '',
        isActive: true,
      },
      {
        onSuccess: (client) => {
          setValue('clientId', client.id);
          setValue('clientName', client.name);
          setShowNewClient(false);
          setNewClientName('');
          setNewClientDomain('');
        },
      },
    );
  };

  const onSubmit = (data: FormValues) => {
    const formData: OutreachFormData = {
      ...data,
      dollarAmountMin: data.dollarAmountMin || null,
      dollarAmountMax: data.dollarAmountMax || null,
      participantCount: data.participantCount || null,
      participantCountMax: data.participantCountMax || null,
      spendAmount: data.spendAmount || null,
    };

    if (isEditing && editingEntryId) {
      updateOutreach.mutate(
        { id: editingEntryId, data: formData },
        { onSuccess: () => closeForm() },
      );
    } else {
      createOutreach.mutate(formData, { onSuccess: () => closeForm() });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeForm} />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-wpnt-border px-5 py-4">
          <h2 className="text-base font-semibold text-wpnt-body">
            {isEditing ? 'Edit Entry' : 'New Outreach Entry'}
          </h2>
          <button
            onClick={closeForm}
            className="rounded-md p-1.5 text-wpnt-text hover:bg-wpnt-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
            {/* Required Section */}
            <FormSection
              title="Required"
              expanded={expandedSections.required}
              onToggle={() => toggleSection('required')}
            >
              {/* Client Picker */}
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Client *
                </label>
                {!showNewClient ? (
                  <div className="mt-1 space-y-1.5">
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                    />
                    <div className="max-h-32 overflow-y-auto rounded-md border border-wpnt-border">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleClientSelect(c.id)}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                            clientId === c.id
                              ? 'bg-wpnt-blue/10 text-wpnt-blue font-medium'
                              : 'hover:bg-wpnt-surface'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewClient(true)}
                      className="flex items-center gap-1 text-xs text-wpnt-blue hover:underline"
                    >
                      <Plus size={12} />
                      Create New Client
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 space-y-2 rounded-md border border-wpnt-border p-3">
                    <input
                      type="text"
                      placeholder="Client name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue"
                    />
                    <input
                      type="text"
                      placeholder="Domain (e.g., acme.com)"
                      value={newClientDomain}
                      onChange={(e) => setNewClientDomain(e.target.value)}
                      className="w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateClient}
                        className="rounded-md bg-wpnt-blue px-3 py-1 text-xs text-white hover:bg-wpnt-blue/90"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewClient(false)}
                        className="rounded-md border border-wpnt-border px-3 py-1 text-xs text-wpnt-text hover:bg-wpnt-surface"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {errors.clientId && (
                  <p className="mt-1 text-xs text-status-declined">
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Outreach Type *
                </label>
                <div className="mt-1 flex gap-2">
                  {(['Proposal', 'Follow-Up'] as OutreachType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setValue('outreachType', type)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          outreachType === type
                            ? 'border-wpnt-blue bg-wpnt-blue text-white'
                            : 'border-wpnt-border text-wpnt-text hover:bg-wpnt-surface'
                        }`}
                      >
                        {type}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Sender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-wpnt-text">
                    Sender Name *
                  </label>
                  <input
                    {...register('senderName', { required: 'Required' })}
                    className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                  />
                  {errors.senderName && (
                    <p className="mt-1 text-xs text-status-declined">
                      {errors.senderName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-wpnt-text">
                    Sender Email
                  </label>
                  <input
                    {...register('senderEmail')}
                    type="email"
                    className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Date Sent *
                </label>
                <input
                  {...register('dateSent', { required: 'Required' })}
                  type="date"
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
                {errors.dateSent && (
                  <p className="mt-1 text-xs text-status-declined">
                    {errors.dateSent.message}
                  </p>
                )}
              </div>

              {/* Dollar Amount Range (proposals only) */}
              {outreachType === 'Proposal' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-wpnt-text">
                      Min Amount
                    </label>
                    <input
                      {...register('dollarAmountMin', { valueAsNumber: true })}
                      type="number"
                      placeholder="e.g., 35000"
                      className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-wpnt-text">
                      Max Amount
                    </label>
                    <input
                      {...register('dollarAmountMax', { valueAsNumber: true })}
                      type="number"
                      placeholder="e.g., 45000"
                      className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                    />
                  </div>
                </div>
              )}

              {/* CRM Owner */}
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  CRM
                </label>
                <div className="mt-1 flex gap-2">
                  {(['Justin', 'Sam'] as const).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setValue('crmOwner', crmOwner === name ? '' : name)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        crmOwner === name
                          ? 'border-wpnt-blue bg-wpnt-blue text-white'
                          : 'border-wpnt-border text-wpnt-text hover:bg-wpnt-surface'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </FormSection>

            {/* Program Details Section */}
            <FormSection
              title="Program Details"
              expanded={expandedSections.program}
              onToggle={() => toggleSection('program')}
            >
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Program Name
                </label>
                <input
                  {...register('programName')}
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-wpnt-text">
                    Min Participants
                  </label>
                  <input
                    {...register('participantCount', { valueAsNumber: true })}
                    type="number"
                    className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-wpnt-text">
                    Max Participants
                  </label>
                  <input
                    {...register('participantCountMax', { valueAsNumber: true })}
                    type="number"
                    className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Description
                </label>
                <textarea
                  {...register('programDescription')}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30 resize-none"
                />
              </div>
            </FormSection>

            {/* Client Contact Section */}
            <FormSection
              title="Client Contact"
              expanded={expandedSections.contact}
              onToggle={() => toggleSection('contact')}
            >
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Contact Name
                </label>
                <input
                  {...register('contactName')}
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Contact Email
                </label>
                <input
                  {...register('contactEmail')}
                  type="email"
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Contact Title
                </label>
                <input
                  {...register('contactTitle')}
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
            </FormSection>

            {/* Notes & Links Section */}
            <FormSection
              title="Notes & Links"
              expanded={expandedSections.notes}
              onToggle={() => toggleSection('notes')}
            >
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  Document Link
                </label>
                <input
                  {...register('documentLink')}
                  type="url"
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-wpnt-text">
                  SharePoint Folder
                </label>
                <input
                  {...register('sharepointLink')}
                  type="url"
                  placeholder="https://wpnt.sharepoint.com/..."
                  className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30"
                />
              </div>
              {status === 'Declined' && (
                <div>
                  <label className="text-xs font-medium text-wpnt-text">
                    Decline Notes
                  </label>
                  <textarea
                    {...register('declineNotes')}
                    rows={2}
                    placeholder="Reason for decline..."
                    className="mt-1 w-full rounded-md border border-wpnt-border px-3 py-1.5 text-sm outline-none focus:border-wpnt-blue focus:ring-1 focus:ring-wpnt-blue/30 resize-none"
                  />
                </div>
              )}
            </FormSection>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-wpnt-border px-5 py-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-wpnt-border px-4 py-2 text-sm font-medium text-wpnt-text hover:bg-wpnt-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-wpnt-blue px-4 py-2 text-sm font-medium text-white hover:bg-wpnt-blue/90 transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function FormSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-wpnt-border pb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2.5 text-sm font-semibold text-wpnt-body"
      >
        {title}
        {expanded ? (
          <ChevronDown size={14} className="text-wpnt-text" />
        ) : (
          <ChevronRight size={14} className="text-wpnt-text" />
        )}
      </button>
      {expanded && <div className="space-y-3 pb-3">{children}</div>}
    </div>
  );
}
