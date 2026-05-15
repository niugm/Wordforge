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

export type LiveScopeWords = {
  label: "本段" | "选中";
  words: number;
};

export type AiEditorContext = {
  chapterId: string;
  source: "selection" | "paragraph";
  text: string;
  from: number;
  to: number;
  capturedAt: number;
};

export type AiApplyMode = "replace" | "insertBelow";

export type AiApplyRequest = {
  id: number;
  chapterId: string;
  mode: AiApplyMode;
  text: string;
  from: number;
  to: number;
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
  liveScopeWords: LiveScopeWords | null;
  liveSessionWords: number;
  aiPanelTab: "ai" | "notes" | "history";
  aiEditorContext: AiEditorContext | null;
  aiApplyRequest: AiApplyRequest | null;

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
  setLiveScopeWords: (value: LiveScopeWords | null) => void;
  setLiveSessionWords: (n: number) => void;
  setAiPanelTab: (tab: UIState["aiPanelTab"]) => void;
  setAiEditorContext: (context: AiEditorContext | null) => void;
  requestAiApply: (request: Omit<AiApplyRequest, "id">) => void;
  clearAiApplyRequest: (id: number) => void;
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
      liveScopeWords: null,
      liveSessionWords: 0,
      aiPanelTab: "ai",
      aiEditorContext: null,
      aiApplyRequest: null,

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
      setLiveScopeWords: (value) => set({ liveScopeWords: value }),
      setLiveSessionWords: (n) => set({ liveSessionWords: Math.max(0, n) }),
      setAiPanelTab: (tab) => set({ aiPanelTab: tab }),
      setAiEditorContext: (context) => set({ aiEditorContext: context, aiPanelTab: "ai" }),
      requestAiApply: (request) =>
        set({ aiApplyRequest: { ...request, id: Date.now() }, aiPanelTab: "ai" }),
      clearAiApplyRequest: (id) =>
        set((state) => ({
          aiApplyRequest: state.aiApplyRequest?.id === id ? null : state.aiApplyRequest,
        })),
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
