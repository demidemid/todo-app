import { createContext, useContext } from 'react';
import { useStore, type StoreApi } from 'zustand';
import {
  createTodoListUiStore,
  useTodoListUiStore,
  type TodoListUiState,
} from './useTodoListUiStore';
import {
  createTodoListControllerStore,
  useTodoListControllerStore,
  type TodoListControllerStoreState,
} from './useTodoListControllerStore';
import {
  createTodoListDndStore,
  useTodoListDndStore,
  type TodoListDndState,
} from './useTodoListDndStore';

export interface TodoListStores {
  uiStore: StoreApi<TodoListUiState>;
  controllerStore: StoreApi<TodoListControllerStoreState>;
  dndStore: StoreApi<TodoListDndState>;
}

const fallbackStores: TodoListStores = {
  uiStore: useTodoListUiStore,
  controllerStore: useTodoListControllerStore,
  dndStore: useTodoListDndStore,
};

export const createScopedTodoListStores = (): TodoListStores => ({
  uiStore: createTodoListUiStore(),
  controllerStore: createTodoListControllerStore(),
  dndStore: createTodoListDndStore(),
});

export const TodoListStoresContext = createContext<TodoListStores | null>(null);

const useTodoListStores = (): TodoListStores => useContext(TodoListStoresContext) ?? fallbackStores;

export const useHasTodoListStoresProvider = (): boolean => useContext(TodoListStoresContext) != null;

export const useTodoListUiStoreScoped = <T,>(selector: (state: TodoListUiState) => T): T => {
  const { uiStore } = useTodoListStores();
  return useStore(uiStore, selector);
};

export const useTodoListControllerStoreScoped = <T,>(
  selector: (state: TodoListControllerStoreState) => T,
): T => {
  const { controllerStore } = useTodoListStores();
  return useStore(controllerStore, selector);
};

export const useTodoListDndStoreScoped = <T,>(selector: (state: TodoListDndState) => T): T => {
  const { dndStore } = useTodoListStores();
  return useStore(dndStore, selector);
};
