import { create } from 'zustand';
import type { Dashboard } from '../types/dashboard';

interface TodoListUiState {
  dashboardHoverId: string | null;
  shareDashboardId: string | null;
  shareSelectedUserIds: string[];
  shareRecipientEmails: string;
  shareActionError: string;
  resetUiState: () => void;
  setDashboardHoverId: (dashboardId: string | null) => void;
  openShareModal: (dashboard: Dashboard) => void;
  closeShareModal: () => void;
  toggleShareUser: (targetUserId: string) => void;
  setShareRecipientEmails: (emails: string) => void;
  setShareActionError: (error: string) => void;
}

const initialState = {
  dashboardHoverId: null,
  shareDashboardId: null,
  shareSelectedUserIds: [],
  shareRecipientEmails: '',
  shareActionError: '',
};

export const useTodoListUiStore = create<TodoListUiState>((set) => ({
  ...initialState,
  resetUiState: () => {
    set({ ...initialState });
  },
  setDashboardHoverId: (dashboardId) => {
    set({ dashboardHoverId: dashboardId });
  },
  openShareModal: (dashboard) => {
    set({
      shareDashboardId: dashboard.id,
      shareSelectedUserIds: dashboard.sharedWith ?? [],
      shareRecipientEmails: (dashboard.sharedWithEmails ?? []).join(', '),
      shareActionError: '',
    });
  },
  closeShareModal: () => {
    set({
      shareDashboardId: null,
      shareSelectedUserIds: [],
      shareRecipientEmails: '',
      shareActionError: '',
    });
  },
  toggleShareUser: (targetUserId) => {
    set((state) => ({
      shareSelectedUserIds: state.shareSelectedUserIds.includes(targetUserId)
        ? state.shareSelectedUserIds.filter((userIdItem) => userIdItem !== targetUserId)
        : [...state.shareSelectedUserIds, targetUserId],
    }));
  },
  setShareRecipientEmails: (emails) => {
    set({ shareRecipientEmails: emails });
  },
  setShareActionError: (error) => {
    set({ shareActionError: error });
  },
}));
