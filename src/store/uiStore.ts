import { create } from 'zustand';

interface UiState {
  searchOpen: boolean;
  mobileNavOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

/** Ephemeral UI state (not persisted). */
export const useUiStore = create<UiState>()((set) => ({
  searchOpen: false,
  mobileNavOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
