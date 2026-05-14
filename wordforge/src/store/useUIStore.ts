import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WordCountMode } from "@/lib/wordCount";

export type Theme = "light" | "dark" | "eyecare";
export type EditorFontFamily = "sans" | "serif" | "mono";

export type EditorPreferences = {
  fontFamily: EditorFontFamily;
  fontSize: number;
  lineHeight: number;
  measure: number;
};

const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontFamily: "sans",
  fontSize: 15,
  lineHeight: 1.75,
  measure: 760,
};

type UIState = {
  theme: Theme;
  editorPreferences: EditorPreferences;
  wordCountMode: WordCountMode;
  commandOpen: boolean;
  settingsOpen: boolean;
  searchOpen: boolean;
  focusMode: boolean;
  liveWordCount: number | null;
  liveParagraphWords: number | null;
  liveSessionWords: number;

  setTheme: (theme: Theme) => void;
  setEditorPreferences: (prefs: Partial<EditorPreferences>) => void;
  resetEditorPreferences: () => void;
  setWordCountMode: (mode: WordCountMode) => void;
  toggleCommand: () => void;
  toggleSettings: () => void;
  toggleSearch: () => void;
  toggleFocus: () => void;
  setCommand: (open: boolean) => void;
  setSettings: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  setLiveWordCount: (n: number | null) => void;
  setLiveParagraphWords: (n: number | null) => void;
  setLiveSessionWords: (n: number) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      editorPreferences: DEFAULT_EDITOR_PREFERENCES,
      wordCountMode: "characters",
      commandOpen: false,
      settingsOpen: false,
      searchOpen: false,
      focusMode: false,
      liveWordCount: null,
      liveParagraphWords: null,
      liveSessionWords: 0,

      setTheme: (theme) => set({ theme }),
      setEditorPreferences: (prefs) =>
        set((s) => ({ editorPreferences: { ...s.editorPreferences, ...prefs } })),
      resetEditorPreferences: () => set({ editorPreferences: DEFAULT_EDITOR_PREFERENCES }),
      setWordCountMode: (mode) => set({ wordCountMode: mode }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
      toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
      toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
      setCommand: (open) => set({ commandOpen: open }),
      setSettings: (open) => set({ settingsOpen: open }),
      setSearch: (open) => set({ searchOpen: open }),
      setLiveWordCount: (n) => set({ liveWordCount: n }),
      setLiveParagraphWords: (n) => set({ liveParagraphWords: n }),
      setLiveSessionWords: (n) => set({ liveSessionWords: Math.max(0, n) }),
    }),
    {
      name: "wordforge-ui",
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<UIState>;
        return {
          theme: p.theme ?? "dark",
          editorPreferences: {
            ...DEFAULT_EDITOR_PREFERENCES,
            ...(p.editorPreferences ?? {}),
          },
          wordCountMode: p.wordCountMode ?? "characters",
        } as UIState;
      },
      partialize: (state) => ({
        theme: state.theme,
        editorPreferences: state.editorPreferences,
        wordCountMode: state.wordCountMode,
        focusMode: state.focusMode,
      }),
    },
  ),
);
