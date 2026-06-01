import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface DragState {
  todoId: string;
}

export interface DropTarget {
  columnId: string;
  index: number;
}

export interface TodoListDndState {
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

const createTodoListDndState = (set: (next: Partial<TodoListDndState>) => void): TodoListDndState => ({
  ...initialDndState,
  setDragState: (next) => set({ dragState: next }),
  setDropTarget: (next) => set({ dropTarget: next }),
  setDashboardDragId: (next) => set({ dashboardDragId: next }),
  setDashboardDropIndex: (next) => set({ dashboardDropIndex: next }),
  resetDndState: () => set({ ...initialDndState }),
});

export const createTodoListDndStore = () => createStore<TodoListDndState>((set) => createTodoListDndState(set));

export const useTodoListDndStore = create<TodoListDndState>((set) => createTodoListDndState(set));
