import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WordCountMode } from "@/lib/wordCount";
import type { AiPolishKind } from "@/types/db";

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
  preferredKind?: AiPolishKind;
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

export type AiReviewLocateRequest = {
  id: number;
  chapterId: string;
  quote: string;
  instruction?: string;
  replacementText?: string;
};

export type AiReviewRewriteRequest = {
  id: number;
  chapterId: string;
  text: string;
  from: number;
  to: number;
  instruction: string;
};

export type AiReviewIgnoredIssues = Record<string, string[]>;

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
  aiReviewLocateRequest: AiReviewLocateRequest | null;
  aiReviewRewriteRequest: AiReviewRewriteRequest | null;
  aiReviewIgnoredIssues: AiReviewIgnoredIssues;

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
  requestAiReviewLocate: (request: Omit<AiReviewLocateRequest, "id">) => void;
  clearAiReviewLocateRequest: (id: number) => void;
  requestAiReviewRewrite: (request: Omit<AiReviewRewriteRequest, "id">) => void;
  clearAiReviewRewriteRequest: (id: number) => void;
  toggleAiReviewIgnoredIssue: (chapterId: string, issueKey: string) => void;
  pruneAiReviewIgnoredIssues: (chapterId: string, issueKeys: string[]) => void;
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
      aiReviewLocateRequest: null,
      aiReviewRewriteRequest: null,
      aiReviewIgnoredIssues: {},

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
      requestAiReviewLocate: (request) =>
        set({ aiReviewLocateRequest: { ...request, id: Date.now() }, aiPanelTab: "ai" }),
      clearAiReviewLocateRequest: (id) =>
        set((state) => ({
          aiReviewLocateRequest:
            state.aiReviewLocateRequest?.id === id ? null : state.aiReviewLocateRequest,
        })),
      requestAiReviewRewrite: (request) =>
        set({
          aiReviewRewriteRequest: { ...request, id: Date.now() },
          aiPanelTab: "ai",
        }),
      clearAiReviewRewriteRequest: (id) =>
        set((state) => ({
          aiReviewRewriteRequest:
            state.aiReviewRewriteRequest?.id === id ? null : state.aiReviewRewriteRequest,
        })),
      toggleAiReviewIgnoredIssue: (chapterId, issueKey) =>
        set((state) => {
          const current = new Set(state.aiReviewIgnoredIssues[chapterId] ?? []);
          if (current.has(issueKey)) {
            current.delete(issueKey);
          } else {
            current.add(issueKey);
          }
          return {
            aiReviewIgnoredIssues: {
              ...state.aiReviewIgnoredIssues,
              [chapterId]: [...current],
            },
          };
        }),
      pruneAiReviewIgnoredIssues: (chapterId, issueKeys) =>
        set((state) => {
          const allowed = new Set(issueKeys);
          const current = state.aiReviewIgnoredIssues[chapterId] ?? [];
          const next = current.filter((issueKey) => allowed.has(issueKey));
          if (next.length === current.length) return state;
          return {
            aiReviewIgnoredIssues: {
              ...state.aiReviewIgnoredIssues,
              [chapterId]: next,
            },
          };
        }),
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
          aiReviewIgnoredIssues: p.aiReviewIgnoredIssues ?? {},
        } as UIState;
      },
      partialize: (state) => ({
        theme: state.theme,
        editorPreferences: state.editorPreferences,
        wordCountMode: state.wordCountMode,
        focusMode: state.focusMode,
        aiReviewIgnoredIssues: state.aiReviewIgnoredIssues,
      }),
    },
  ),
);
