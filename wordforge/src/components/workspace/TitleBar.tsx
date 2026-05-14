import { useEffect } from "react";
import { Menu, Settings } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useChapter } from "@/hooks/useChapters";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function TitleBar() {
  const toggleLeft = useWorkspaceStore((s) => s.toggleLeft);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const currentChapterId = useWorkspaceStore((s) => s.currentChapterId);
  const toggleSettings = useUIStore((s) => s.toggleSettings);

  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === currentProjectId) ?? null;
  const { data: currentChapter } = useChapter(currentChapterId);

  useEffect(() => {
    const title = currentProject ? `${currentProject.name} — Wordforge` : "Wordforge";
    getCurrentWindow().setTitle(title).catch(() => {});
  }, [currentProject]);

  return (
    <header className="flex h-12 items-center gap-2 border-b px-3">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleLeft}>
        <Menu className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-5 self-center" />
      <nav className="flex min-w-0 items-center gap-1 text-sm">
        <span className="font-medium">Wordforge</span>
        <span className="text-muted-foreground">/</span>
        <span className={cn("truncate", !currentProject && "text-muted-foreground")}>
          {currentProject?.name ?? "未选作品"}
        </span>
        <span className="text-muted-foreground">/</span>
        <span
          className={cn("truncate", !currentChapter && "text-muted-foreground")}
          title={currentChapter?.title}
        >
          {currentChapter?.title ?? "未选章节"}
        </span>
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
