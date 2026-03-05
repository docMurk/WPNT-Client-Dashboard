import { create } from 'zustand';
import type { FilterState, OutreachType, OutreachStatus } from '@/types/outreach';

interface FilterActions {
  setOutreachTypes: (types: OutreachType[]) => void;
  toggleOutreachType: (type: OutreachType) => void;
  setClientIds: (ids: string[]) => void;
  toggleClientId: (id: string) => void;
  setProgramNames: (names: string[]) => void;
  toggleProgramName: (name: string) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  setStatuses: (statuses: OutreachStatus[]) => void;
  toggleStatus: (status: OutreachStatus) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  outreachTypes: [],
  clientIds: [],
  programNames: [],
  dateRange: { start: null, end: null },
  statuses: [],
  searchQuery: '',
};

export const useFilterStore = create<FilterState & FilterActions>((set) => ({
  ...initialState,

  setOutreachTypes: (types) => set({ outreachTypes: types }),

  toggleOutreachType: (type) =>
    set((state) => ({
      outreachTypes: state.outreachTypes.includes(type)
        ? state.outreachTypes.filter((t) => t !== type)
        : [...state.outreachTypes, type],
    })),

  setClientIds: (ids) => set({ clientIds: ids }),

  toggleClientId: (id) =>
    set((state) => ({
      clientIds: state.clientIds.includes(id)
        ? state.clientIds.filter((c) => c !== id)
        : [...state.clientIds, id],
    })),

  setProgramNames: (names) => set({ programNames: names }),

  toggleProgramName: (name) =>
    set((state) => ({
      programNames: state.programNames.includes(name)
        ? state.programNames.filter((n) => n !== name)
        : [...state.programNames, name],
    })),

  setDateRange: (start, end) => set({ dateRange: { start, end } }),

  setStatuses: (statuses) => set({ statuses }),

  toggleStatus: (status) =>
    set((state) => ({
      statuses: state.statuses.includes(status)
        ? state.statuses.filter((s) => s !== status)
        : [...state.statuses, status],
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  resetFilters: () => set(initialState),
}));
