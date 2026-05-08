import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  currentProjectId: string | null;
  currentChapterId: string | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;

  setCurrentProject: (id: string | null) => void;
  setCurrentChapter: (id: string | null) => void;
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
      leftCollapsed: false,
      rightCollapsed: false,

      setCurrentProject: (id) => set({ currentProjectId: id }),
      setCurrentChapter: (id) => set({ currentChapterId: id }),
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
        leftCollapsed: state.leftCollapsed,
        rightCollapsed: state.rightCollapsed,
      }),
    },
  ),
);
