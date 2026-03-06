import { create } from 'zustand';
import type { OutreachFormData } from '@/types/outreach';

interface OutreachUIState {
  selectedEntryId: string | null;
  isDetailOpen: boolean;
  isFormOpen: boolean;
  editingEntryId: string | null;
  rightSidebarCollapsed: boolean;
  expandedEntryId: string | null;
  prefillData: Partial<OutreachFormData> | null;
  timelineZoomTo: { start: number; end: number } | null;

  openDetail: (id: string) => void;
  closeDetail: () => void;
  openForm: (editId?: string) => void;
  openFormWithPrefill: (data: Partial<OutreachFormData>) => void;
  closeForm: () => void;
  clearPrefill: () => void;
  toggleRightSidebar: () => void;
  expandEntry: (id: string) => void;
  collapseEntry: () => void;
  setTimelineZoom: (start: number, end: number) => void;
  clearTimelineZoom: () => void;
}

export const useOutreachStore = create<OutreachUIState>((set) => ({
  selectedEntryId: null,
  isDetailOpen: false,
  isFormOpen: false,
  editingEntryId: null,
  rightSidebarCollapsed: true,
  expandedEntryId: null,
  prefillData: null,
  timelineZoomTo: null,

  openDetail: (id) => set({ selectedEntryId: id, isDetailOpen: true, isFormOpen: false, editingEntryId: null, prefillData: null }),
  closeDetail: () => set({ selectedEntryId: null, isDetailOpen: false }),
  openForm: (editId) => set({ isFormOpen: true, editingEntryId: editId ?? null, isDetailOpen: false, selectedEntryId: null }),
  openFormWithPrefill: (data) => set({ isFormOpen: true, editingEntryId: null, prefillData: data, isDetailOpen: false, selectedEntryId: null }),
  closeForm: () => set({ isFormOpen: false, editingEntryId: null, prefillData: null }),
  clearPrefill: () => set({ prefillData: null }),
  toggleRightSidebar: () => set((s) => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
  expandEntry: (id) => set({ expandedEntryId: id }),
  collapseEntry: () => set({ expandedEntryId: null }),
  setTimelineZoom: (start, end) => set({ timelineZoomTo: { start, end } }),
  clearTimelineZoom: () => set({ timelineZoomTo: null }),
}));
