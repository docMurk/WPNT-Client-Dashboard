import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOutreachEntries,
  getClients,
  createOutreachEntry,
  updateOutreachEntry,
  deleteOutreachEntry,
  createClient,
  updateClient,
} from '@/lib/dataService';
import type { OutreachFormData, OutreachEntry, Client } from '@/types/outreach';
import { useFilterStore } from '@/store/filterStore';

export function useOutreachEntries() {
  return useQuery({
    queryKey: ['outreach'],
    queryFn: getOutreachEntries,
  });
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  });
}

export function useFilteredOutreach(includeArchived = false) {
  const { data: entries = [] } = useOutreachEntries();
  const { outreachTypes, clientIds, programNames, dateRange, statuses, searchQuery } = useFilterStore();

  return entries.filter((entry) => {
    if (!includeArchived && entry.isArchived) return false;
    if (includeArchived && !entry.isArchived) return false;

    if (outreachTypes.length > 0 && !outreachTypes.includes(entry.outreachType)) return false;
    if (clientIds.length > 0 && !clientIds.includes(entry.clientId)) return false;
    if (programNames.length > 0 && !programNames.includes(entry.programName)) return false;
    if (statuses.length > 0 && !statuses.includes(entry.status)) return false;

    if (dateRange.start && entry.dateSent < dateRange.start) return false;
    if (dateRange.end && entry.dateSent > dateRange.end) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        entry.clientName.toLowerCase().includes(q) ||
        entry.senderName.toLowerCase().includes(q) ||
        entry.programName.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        entry.contactName.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });
}

export function useCreateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OutreachFormData) => Promise.resolve(createOutreachEntry(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach'] });
    },
  });
}

export function useUpdateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OutreachEntry> }) =>
      Promise.resolve(updateOutreachEntry(id, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach'] });
    },
  });
}

export function useDeleteOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(deleteOutreachEntry(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach'] });
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Client, 'id'>) => Promise.resolve(createClient(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      Promise.resolve(updateClient(id, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
