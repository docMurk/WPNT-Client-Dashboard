import type { Client, OutreachEntry, OutreachFormData } from '@/types/outreach';
import { mockClients, mockOutreachEntries } from '@/mock/seedData';

const CLIENTS_KEY = 'wpnt_clients';
const OUTREACH_KEY = 'wpnt_outreach';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function seedIfEmpty(): void {
  if (!localStorage.getItem(CLIENTS_KEY)) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(mockClients));
  }
  if (!localStorage.getItem(OUTREACH_KEY)) {
    localStorage.setItem(OUTREACH_KEY, JSON.stringify(mockOutreachEntries));
  }
}

function runMigrations(): void {
  const raw = localStorage.getItem(OUTREACH_KEY);
  if (!raw) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = JSON.parse(raw);
  let changed = false;

  for (const e of entries) {
    // Migration 1: "Other" → "Follow-Up"
    if (e.outreachType === 'Other') {
      e.outreachType = 'Follow-Up';
      changed = true;
    }

    // Migration 2: dollarAmount → dollarAmountMin/Max
    if ('dollarAmount' in e) {
      e.dollarAmountMin = e.dollarAmount;
      e.dollarAmountMax = e.dollarAmount;
      delete e.dollarAmount;
      changed = true;
    }

    // Migration 4: Add sharepointLink, declineNotes, crmOwner fields
    if (!('sharepointLink' in e)) { e.sharepointLink = ''; changed = true; }
    if (!('declineNotes' in e)) { e.declineNotes = ''; changed = true; }
    if (!('crmOwner' in e)) { e.crmOwner = ''; changed = true; }
  }

  if (changed) localStorage.setItem(OUTREACH_KEY, JSON.stringify(entries));

  // Migration 3: Remove previously-injected test entries (bp c11, Honeywell c12)
  const testTitles = [
    'bp - Proposal - 2025-05-12',
    'bp - Follow-Up - 2025-04-21',
    'Honeywell - Follow-Up - 2025-05-02',
  ];
  const filtered = entries.filter((e: { title?: string }) => !testTitles.includes(e.title ?? ''));
  if (filtered.length !== entries.length) {
    localStorage.setItem(OUTREACH_KEY, JSON.stringify(filtered));
  }

  // Remove test clients c11, c12
  const clientsRaw = localStorage.getItem(CLIENTS_KEY);
  if (clientsRaw) {
    const clients = JSON.parse(clientsRaw);
    const filteredClients = clients.filter((c: { id?: string }) => c.id !== 'c11' && c.id !== 'c12');
    if (filteredClients.length !== clients.length) {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(filteredClients));
    }
  }
}

// Initialize on import
seedIfEmpty();
runMigrations();

// --- Clients ---

export function getClients(): Client[] {
  const raw = localStorage.getItem(CLIENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getClient(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function createClient(data: Omit<Client, 'id'>): Client {
  const clients = getClients();
  const client: Client = { ...data, id: generateId() };
  clients.push(client);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  return client;
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  clients[idx] = { ...clients[idx], ...data };
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  return clients[idx];
}

// --- Outreach Entries ---

export function getOutreachEntries(): OutreachEntry[] {
  const raw = localStorage.getItem(OUTREACH_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getOutreachEntry(id: string): OutreachEntry | undefined {
  return getOutreachEntries().find((e) => e.id === id);
}

export function createOutreachEntry(data: OutreachFormData): OutreachEntry {
  const entries = getOutreachEntries();
  const entry: OutreachEntry = {
    ...data,
    id: generateId(),
    title: `${data.clientName} - ${data.outreachType} - ${data.dateSent}`,
    isArchived: false,
  };
  entries.push(entry);
  localStorage.setItem(OUTREACH_KEY, JSON.stringify(entries));
  return entry;
}

export function updateOutreachEntry(
  id: string,
  data: Partial<OutreachEntry>,
): OutreachEntry | undefined {
  const entries = getOutreachEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  entries[idx] = { ...entries[idx], ...data };
  localStorage.setItem(OUTREACH_KEY, JSON.stringify(entries));
  return entries[idx];
}

export function deleteOutreachEntry(id: string): boolean {
  const entries = getOutreachEntries();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  localStorage.setItem(OUTREACH_KEY, JSON.stringify(filtered));
  return true;
}

export function archiveOutreachEntry(id: string): OutreachEntry | undefined {
  return updateOutreachEntry(id, { isArchived: true });
}

export function restoreOutreachEntry(id: string): OutreachEntry | undefined {
  return updateOutreachEntry(id, { isArchived: false });
}
