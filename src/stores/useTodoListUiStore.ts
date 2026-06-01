import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Dashboard } from '../types/dashboard';

export interface TodoListUiState {
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

const createTodoListUiState = (set: (next: Partial<TodoListUiState> | ((state: TodoListUiState) => Partial<TodoListUiState>)) => void): TodoListUiState => ({
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
});

export const createTodoListUiStore = () => createStore<TodoListUiState>((set) => createTodoListUiState(set));

export const useTodoListUiStore = create<TodoListUiState>((set) => createTodoListUiState(set));
