import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LeftPanelTab = "chapters" | "characters" | "outline";

export type RecentCommand = {
  id: string;
  label: string;
  detail: string | null;
  kind: "nav" | "action" | "chapter" | "character" | "outline";
  targetId: string | null;
};

type WorkspaceState = {
  currentProjectId: string | null;
  currentChapterId: string | null;
  leftPanelTab: LeftPanelTab;
  recentCommands: RecentCommand[];
  leftCollapsed: boolean;
  rightCollapsed: boolean;

  setCurrentProject: (id: string | null) => void;
  setCurrentChapter: (id: string | null) => void;
  setLeftPanelTab: (tab: LeftPanelTab) => void;
  pushRecentCommand: (command: RecentCommand) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      currentChapterId: null,
      leftPanelTab: "chapters",
      recentCommands: [],
      leftCollapsed: false,
      rightCollapsed: false,

      setCurrentProject: (id) => set({ currentProjectId: id }),
      setCurrentChapter: (id) => set({ currentChapterId: id }),
      setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
      pushRecentCommand: (command) =>
        set((state) => ({
          recentCommands: [
            command,
            ...state.recentCommands.filter((item) => item.id !== command.id),
          ].slice(0, 6),
        })),
      toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
      setLeftCollapsed: (collapsed) => set({ leftCollapsed: collapsed }),
      setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),
    }),
    {
      name: "wordforge-workspace",
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        currentChapterId: state.currentChapterId,
        leftPanelTab: state.leftPanelTab,
        recentCommands: state.recentCommands,
        leftCollapsed: state.leftCollapsed,
        rightCollapsed: state.rightCollapsed,
      }),
    },
  ),
);
