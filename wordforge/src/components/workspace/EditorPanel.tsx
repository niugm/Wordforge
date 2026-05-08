import { Badge } from "@/components/ui/badge";

export function EditorPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <h2 className="text-lg font-medium">未选章节</h2>
        <Badge variant="secondary">草稿</Badge>
        <span className="ml-auto text-xs text-muted-foreground">0 字</span>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto px-8 py-12">
        <div className="max-w-prose text-center text-sm text-muted-foreground">
          <p>编辑器占位</p>
          <p className="mt-2 text-xs">TODO: F5 TipTap 接入（doc/07）</p>
        </div>
      </div>
    </div>
  );
}
