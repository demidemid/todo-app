import { create } from 'zustand';

export interface DragState {
  todoId: string;
}

export interface DropTarget {
  columnId: string;
  index: number;
}

interface TodoListDndState {
  dragState: DragState | null;
  dropTarget: DropTarget | null;
  dashboardDragId: string | null;
  dashboardDropIndex: number | null;
  setDragState: (next: DragState | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  setDashboardDragId: (next: string | null) => void;
  setDashboardDropIndex: (next: number | null) => void;
  resetDndState: () => void;
}

const initialDndState = {
  dragState: null,
  dropTarget: null,
  dashboardDragId: null,
  dashboardDropIndex: null,
} as const;

export const useTodoListDndStore = create<TodoListDndState>((set) => ({
  ...initialDndState,
  setDragState: (next) => set({ dragState: next }),
  setDropTarget: (next) => set({ dropTarget: next }),
  setDashboardDragId: (next) => set({ dashboardDragId: next }),
  setDashboardDropIndex: (next) => set({ dashboardDropIndex: next }),
  resetDndState: () => set({ ...initialDndState }),
}));
