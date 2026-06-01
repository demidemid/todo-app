import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { DashboardColumn } from '../types/dashboard';
import type { Todo } from '../types/todo';

type SetStateAction<T> = T | ((prev: T) => T);

type Setter<T> = (next: SetStateAction<T>) => void;

export interface DragState {
  todoId: string;
}

export interface DropTarget {
  columnId: string;
  index: number;
}

interface TodoListControllerState {
  title: string;
  description: string;
  isCreateModalOpen: boolean;
  createCardDashboardId: string | null;
  createCardColumnId: string | null;
  isCreateDashboardModalOpen: boolean;
  dashboardName: string;
  columnDraft: string;
  dashboardColumns: string[];
  dashboardFormError: string;
  dashboardActionError: string;
  isEditDashboardModalOpen: boolean;
  editingDashboardId: string | null;
  editingDashboardName: string;
  editingDashboardColumns: DashboardColumn[];
  editingColumnDraft: string;
  editingTodoId: string | null;
  editingTitle: string;
  editingDescription: string;
  modalTodo: Todo | null;
}

type ControllerSetterName<K extends string> = `set${Capitalize<K>}`;

type TodoListControllerSetters = {
  [K in keyof TodoListControllerState as ControllerSetterName<string & K>]: Setter<TodoListControllerState[K]>;
};

export type TodoListControllerStoreState = TodoListControllerState & TodoListControllerSetters & {
  resetControllerUiState: () => void;
};

type SetControllerStoreState = (
  partial:
    | Partial<TodoListControllerStoreState>
    | ((state: TodoListControllerStoreState) => Partial<TodoListControllerStoreState>)
) => void;

const initialState: TodoListControllerState = {
  title: '',
  description: '',
  isCreateModalOpen: false,
  createCardDashboardId: null,
  createCardColumnId: null,
  isCreateDashboardModalOpen: false,
  dashboardName: '',
  columnDraft: '',
  dashboardColumns: [],
  dashboardFormError: '',
  dashboardActionError: '',
  isEditDashboardModalOpen: false,
  editingDashboardId: null,
  editingDashboardName: '',
  editingDashboardColumns: [],
  editingColumnDraft: '',
  editingTodoId: null,
  editingTitle: '',
  editingDescription: '',
  modalTodo: null,
};

const resolveNext = <T,>(next: SetStateAction<T>, prev: T): T => (
  typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
);

const toSetterName = <K extends keyof TodoListControllerState>(key: K) =>
  (`set${String(key).charAt(0).toUpperCase()}${String(key).slice(1)}` as ControllerSetterName<string & K>);

const createSetters = (set: SetControllerStoreState) => {
  const entries = Object.keys(initialState).map((rawKey) => {
    const key = rawKey as keyof TodoListControllerState;
    const setterName = toSetterName(key);

    const setter = (next: SetStateAction<TodoListControllerState[typeof key]>) => {
      set((state) => ({
        [key]: resolveNext(next, state[key]),
      }));
    };

    return [setterName, setter] as const;
  });

  return Object.fromEntries(entries) as TodoListControllerSetters;
};

const createTodoListControllerStoreState = (set: SetControllerStoreState): TodoListControllerStoreState => ({
  ...initialState,
  resetControllerUiState: () => set({ ...initialState }),
  ...createSetters(set),
});

export const createTodoListControllerStore = () => createStore<TodoListControllerStoreState>((set) => createTodoListControllerStoreState(set));

export const useTodoListControllerStore = create<TodoListControllerStoreState>((set) => createTodoListControllerStoreState(set));

export const useTodoListControllerSlice = useTodoListControllerStore;
