import { Check, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/useUIStore";

export function Footer() {
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocus = useUIStore((s) => s.toggleFocus);

  return (
    <footer className="flex h-8 items-center gap-3 border-t px-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Check className="h-3 w-3" />
        已保存
      </span>
      <Separator orientation="vertical" className="h-4" />
      <span>0 字 / 本章</span>
      <Separator orientation="vertical" className="h-4" />
      <span>今日 0 字</span>

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
