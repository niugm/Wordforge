import { Focus, Minimize2 } from "lucide-react";
import { Outlet, useMatch } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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
  const toggleFocus = useUIStore((s) => s.toggleFocus);
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
              <ResizablePanel
                id="left"
                defaultSize="22%"
                minSize="16%"
                maxSize="34%"
              >
                <LeftSidebar />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          <ResizablePanel
            id="center"
            defaultSize={showLeft && showRight ? "54%" : "78%"}
          >
            {hasChapterRoute ? <Outlet /> : <EditorPanel />}
          </ResizablePanel>

          {showRight && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="right"
                defaultSize="24%"
                minSize="18%"
                maxSize="36%"
              >
                <RightSidebar />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {!focusMode && <Footer />}

      {focusMode && (
        <div className="fixed top-3 right-3 flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 shadow-md">
            <Focus className="h-3.5 w-3.5" />
            专注模式
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1 shadow-md"
            onClick={toggleFocus}
            title="退出专注模式 (F11)"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            退出
          </Button>
        </div>
      )}
    </div>
  );
}
