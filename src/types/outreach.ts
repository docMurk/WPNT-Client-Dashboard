export type OutreachType = 'Proposal' | 'Follow-Up';
export type OutreachStatus = 'Open' | 'Accepted' | 'Declined' | 'No Response' | 'Other';

export interface Client {
  id: string;
  name: string;
  clientDomain: string;
  logoUrl: string;
  industry: string;
  isActive: boolean;
}

export interface OutreachEntry {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  outreachType: OutreachType;
  senderName: string;
  senderEmail: string;
  dateSent: string; // ISO date string
  dollarAmountMin: number | null;
  dollarAmountMax: number | null;
  participantCount: number | null;
  programName: string;
  programDescription: string;
  status: OutreachStatus;
  outcomeSpend: boolean;
  spendAmount: number | null;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  notes: string;
  documentLink: string;
  sharepointLink: string;
  declineNotes: string;
  crmOwner: '' | 'Justin' | 'Sam';
  isArchived: boolean;
}

export interface FilterState {
  outreachTypes: OutreachType[];
  clientIds: string[];
  programNames: string[];
  dateRange: { start: string | null; end: string | null };
  statuses: OutreachStatus[];
  searchQuery: string;
}

export interface OutreachFormData {
  clientId: string;
  clientName: string;
  outreachType: OutreachType;
  senderName: string;
  senderEmail: string;
  dateSent: string;
  dollarAmountMin: number | null;
  dollarAmountMax: number | null;
  participantCount: number | null;
  programName: string;
  programDescription: string;
  status: OutreachStatus;
  outcomeSpend: boolean;
  spendAmount: number | null;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  notes: string;
  documentLink: string;
  sharepointLink: string;
  declineNotes: string;
  crmOwner: '' | 'Justin' | 'Sam';
}
