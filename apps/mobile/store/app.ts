import { create } from 'zustand';
import type { Screen } from '../types';

interface AppStore {
  screen: Screen;
  isInitializing: boolean;
  isLoggedIn: boolean;
  loading: boolean;
  setScreen: (screen: Screen) => void;
  setIsInitializing: (v: boolean) => void;
  setIsLoggedIn: (v: boolean) => void;
  setLoading: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  screen: 'Login',
  isInitializing: true,
  isLoggedIn: false,
  loading: false,
  setScreen: (screen) => set({ screen }),
  setIsInitializing: (isInitializing) => set({ isInitializing }),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  setLoading: (loading) => set({ loading }),
}));
