import { create } from "zustand";

interface UiState {
  loadingLabel: string | null;
  startLoading: (label: string) => void;
  stopLoading: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  loadingLabel: null,
  startLoading: (label) => set({ loadingLabel: label }),
  stopLoading: () => set({ loadingLabel: null }),
}));

