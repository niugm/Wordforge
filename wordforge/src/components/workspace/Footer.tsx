import { CalendarDays, FileText, Focus, Pilcrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconLabel } from "@/components/ui/icon-label";
import { Separator } from "@/components/ui/separator";
import { useWritingStats } from "@/hooks/useSessions";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function Footer() {
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocus = useUIStore((s) => s.toggleFocus);
  const liveWordCount = useUIStore((s) => s.liveWordCount);
  const liveScopeWords = useUIStore((s) => s.liveScopeWords);
  const liveSessionWords = useUIStore((s) => s.liveSessionWords);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: stats } = useWritingStats(currentProjectId);
  const todayWords = (stats?.todayWords ?? 0) + liveSessionWords;

  return (
    <footer className="flex h-8 items-center gap-3 border-t px-3 text-xs text-muted-foreground">
      <IconLabel icon={FileText}>
        {liveWordCount != null ? `${liveWordCount} 字` : "0 字"}
      </IconLabel>
      <Separator orientation="vertical" className="h-4" />
      <IconLabel icon={Pilcrow}>
        {liveScopeWords != null
          ? `${liveScopeWords.label} ${liveScopeWords.words} 字`
          : "本段 0 字"}
      </IconLabel>
      <Separator orientation="vertical" className="h-4" />
      <IconLabel icon={CalendarDays}>今日 {todayWords} 字</IconLabel>

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
