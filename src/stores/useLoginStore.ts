import { createContext, createElement, useContext, useState, type ReactNode } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface LoginState {
  email: string;
  password: string;
  isSignUp: boolean;
  error: string;
  info: string;
  loading: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  toggleSignUp: () => void;
  setError: (error: string) => void;
  setInfo: (info: string) => void;
  startLoading: () => void;
  stopLoading: () => void;
  clearMessages: () => void;
  resetState: () => void;
}

const initialState = {
  email: '',
  password: '',
  isSignUp: false,
  error: '',
  info: '',
  loading: false,
} as const;

const createLoginStoreState = (set: (next: Partial<LoginState> | ((state: LoginState) => Partial<LoginState>)) => void): LoginState => ({
  ...initialState,
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  toggleSignUp: () => set((state) => ({ isSignUp: !state.isSignUp })),
  setError: (error) => set({ error }),
  setInfo: (info) => set({ info }),
  startLoading: () => set({ loading: true, error: '', info: '' }),
  stopLoading: () => set({ loading: false }),
  clearMessages: () => set({ error: '', info: '' }),
  resetState: () => set({ ...initialState }),
});

export const createLoginStore = () =>
  createStore<LoginState>((set) => createLoginStoreState(set));

const LoginStoreContext = createContext<StoreApi<LoginState> | null>(null);

export const LoginStoreProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(createLoginStore);
  return createElement(LoginStoreContext.Provider, { value: store }, children);
};

export const useLoginStore = <T,>(selector: (state: LoginState) => T): T => {
  const store = useContext(LoginStoreContext);
  if (!store) {
    throw new Error('useLoginStore must be used within LoginStoreProvider');
  }
  return useStore(store, selector);
};
