import { Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function TitleBar() {
  const toggleLeft = useWorkspaceStore((s) => s.toggleLeft);
  const toggleSettings = useUIStore((s) => s.toggleSettings);

  return (
    <header className="flex h-12 items-center gap-2 border-b px-3">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleLeft}>
        <Menu className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-5" />
      <nav className="flex items-center gap-1 text-sm">
        <span className="font-medium">Wordforge</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">未选作品</span>
        <span className="text-muted-foreground">/</span>
        <span>未选章节</span>
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
