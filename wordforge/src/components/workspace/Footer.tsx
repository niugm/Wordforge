import { Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWritingStats } from "@/hooks/useSessions";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function Footer() {
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocus = useUIStore((s) => s.toggleFocus);
  const liveWordCount = useUIStore((s) => s.liveWordCount);
  const liveParagraphWords = useUIStore((s) => s.liveParagraphWords);
  const liveSessionWords = useUIStore((s) => s.liveSessionWords);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: stats } = useWritingStats(currentProjectId);
  const todayWords = (stats?.todayWords ?? 0) + liveSessionWords;

  return (
    <footer className="flex h-8 items-center gap-3 border-t px-3 text-xs text-muted-foreground">
      <span>{liveWordCount != null ? `${liveWordCount} 字 / 本章` : "0 字 / 本章"}</span>
      <Separator orientation="vertical" className="h-4" />
      <span>{liveParagraphWords != null ? `本段 ${liveParagraphWords} 字` : "本段 0 字"}</span>
      <Separator orientation="vertical" className="h-4" />
      <span>今日 {todayWords} 字</span>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-6 gap-1 text-xs"
        onClick={toggleFocus}
      >
        <Focus className="h-3 w-3" />
        {focusMode ? "退出专注" : "专注模式"}
      </Button>
    </footer>
  );
}
