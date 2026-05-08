import { Outlet, useMatch } from "react-router";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EditorPanel } from "@/components/workspace/EditorPanel";
import { Footer } from "@/components/workspace/Footer";
import { LeftSidebar } from "@/components/workspace/LeftSidebar";
import { RightSidebar } from "@/components/workspace/RightSidebar";
import { TitleBar } from "@/components/workspace/TitleBar";
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function Workspace() {
  useGlobalHotkeys();

  const leftCollapsed = useWorkspaceStore((s) => s.leftCollapsed);
  const rightCollapsed = useWorkspaceStore((s) => s.rightCollapsed);
  const focusMode = useUIStore((s) => s.focusMode);
  const hasChapterRoute = useMatch("/workspace/chapter/:id");

  const showLeft = !leftCollapsed && !focusMode;
  const showRight = !rightCollapsed && !focusMode;

  return (
    <div className="flex h-screen flex-col">
      {!focusMode && <TitleBar />}

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {showLeft && (
            <>
              <ResizablePanel defaultSize={18} minSize={12} maxSize={32}>
                <LeftSidebar />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          <ResizablePanel defaultSize={showLeft && showRight ? 60 : 80}>
            {hasChapterRoute ? <Outlet /> : <EditorPanel />}
          </ResizablePanel>

          {showRight && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={22} minSize={14} maxSize={36}>
                <RightSidebar />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {!focusMode && <Footer />}
    </div>
  );
}
