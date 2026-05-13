import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "eyecare";

type UIState = {
  theme: Theme;
  commandOpen: boolean;
  settingsOpen: boolean;
  searchOpen: boolean;
  focusMode: boolean;
  liveWordCount: number | null;

  setTheme: (theme: Theme) => void;
  toggleCommand: () => void;
  toggleSettings: () => void;
  toggleSearch: () => void;
  toggleFocus: () => void;
  setCommand: (open: boolean) => void;
  setSettings: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  setLiveWordCount: (n: number | null) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      commandOpen: false,
      settingsOpen: false,
      searchOpen: false,
      focusMode: false,
      liveWordCount: null,

      setTheme: (theme) => set({ theme }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
      toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
      toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
      setCommand: (open) => set({ commandOpen: open }),
      setSettings: (open) => set({ settingsOpen: open }),
      setSearch: (open) => set({ searchOpen: open }),
      setLiveWordCount: (n) => set({ liveWordCount: n }),
    }),
    {
      name: "wordforge-ui",
      version: 1,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<UIState>;
        return { theme: p.theme ?? "dark" } as UIState;
      },
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
