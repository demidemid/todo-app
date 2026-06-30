import { createContext, createElement, useContext, useState, type ReactNode } from 'react'
import { useStore, type StoreApi } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { DEFAULT_USER_PROFILE_AVATAR_ID } from '../utils/userProfileAvatars'

export interface UserProfilePageState {
  name: string
  avatarId: string
  loadingProfile: boolean
  profileError: string
  saveLoading: boolean
  saveError: string
  saveSuccess: string
  setName: (name: string) => void
  setAvatarId: (avatarId: string) => void
  startProfileLoading: () => void
  completeProfileLoading: (name: string, avatarId: string) => void
  failProfileLoading: (error: string) => void
  startSaving: () => void
  completeSaving: (normalizedName: string) => void
  failSaving: (error: string) => void
  resetState: () => void
}

const initialState = {
  name: '',
  avatarId: DEFAULT_USER_PROFILE_AVATAR_ID,
  loadingProfile: true,
  profileError: '',
  saveLoading: false,
  saveError: '',
  saveSuccess: '',
} as const

const createUserProfilePageStoreState = (set: (next: Partial<UserProfilePageState>) => void): UserProfilePageState => ({
  ...initialState,
  setName: (name) => set({ name }),
  setAvatarId: (avatarId) => set({ avatarId }),
  startProfileLoading: () => set({ loadingProfile: true, profileError: '' }),
  completeProfileLoading: (name, avatarId) => set({ name, avatarId, loadingProfile: false, profileError: '' }),
  failProfileLoading: (error) => set({ loadingProfile: false, profileError: error }),
  startSaving: () => set({ saveLoading: true, saveError: '', saveSuccess: '' }),
  completeSaving: (normalizedName) => set({ name: normalizedName, saveLoading: false, saveSuccess: 'Profile saved' }),
  failSaving: (error) => set({ saveLoading: false, saveError: error }),
  resetState: () => set({ ...initialState }),
})

export const createUserProfilePageStore = () =>
  createStore<UserProfilePageState>((set) => createUserProfilePageStoreState(set))

const UserProfilePageStoreContext = createContext<StoreApi<UserProfilePageState> | null>(null)

export const UserProfilePageStoreProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(createUserProfilePageStore)
  return createElement(UserProfilePageStoreContext.Provider, { value: store }, children)
}

export const useUserProfilePageStore = <T,>(selector: (state: UserProfilePageState) => T): T => {
  const store = useContext(UserProfilePageStoreContext)
  if (!store) {
    throw new Error('useUserProfilePageStore must be used within UserProfilePageStoreProvider')
  }
  return useStore(store, selector)
}
