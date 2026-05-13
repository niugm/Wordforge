import { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMoveChapter } from "@/hooks/useChapters";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types/db";

type Props = {
  chapter: Chapter | null;
  chapters: Chapter[];
  projectId: string;
  onOpenChange: (open: boolean) => void;
};

type FlatItem = { chapter: Chapter; depth: number };

function collectDescendantIds(id: string, all: Chapter[]): Set<string> {
  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of all) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
    }
  }
  return ids;
}

function buildFlat(parentId: string | null, available: Chapter[], depth: number): FlatItem[] {
  const children = available
    .filter((c) => (c.parentId ?? null) === parentId)
    .sort((a, b) => a.sort - b.sort);
  return children.flatMap((c) => [{ chapter: c, depth }, ...buildFlat(c.id, available, depth + 1)]);
}

export function MoveChapterDialog({ chapter, chapters, projectId, onOpenChange }: Props) {
  const [selectedParentId, setSelectedParentId] = useState<string | null | undefined>(undefined);
  const move = useMoveChapter(projectId);

  const { available, flatList } = useMemo(() => {
    if (!chapter) return { available: [], flatList: [] };
    const excluded = collectDescendantIds(chapter.id, chapters);
    const avail = chapters.filter((c) => !excluded.has(c.id));
    return { available: avail, flatList: buildFlat(null, avail, 0) };
  }, [chapter, chapters]);

  const currentParentId = chapter?.parentId ?? null;
  const effectiveSelected = selectedParentId === undefined ? currentParentId : selectedParentId;

  async function handleConfirm() {
    if (!chapter || selectedParentId === undefined) return;
    const siblings = chapters.filter(
      (c) => (c.parentId ?? null) === selectedParentId && c.id !== chapter.id,
    );
    const newSort =
      siblings.length > 0 ? Math.max(...siblings.map((c) => c.sort)) + 1 : 0;
    try {
      await move.mutateAsync({ id: chapter.id, parentId: selectedParentId, sort: newSort });
      onOpenChange(false);
    } catch {
      // error shown via toast
    }
  }

  const unchanged = selectedParentId === undefined || selectedParentId === currentParentId;

  return (
    <Dialog open={!!chapter} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>移动「{chapter?.title}」到...</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-72 rounded-md border">
          <ul className="p-1">
            <li>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent",
                  effectiveSelected === null && "bg-accent font-medium",
                )}
                onClick={() => setSelectedParentId(null)}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                顶层（无父章节）
              </button>
            </li>
            {flatList.map(({ chapter: c, depth }) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent",
                    effectiveSelected === c.id && "bg-accent font-medium",
                  )}
                  style={{ paddingLeft: 12 + depth * 14 }}
                  onClick={() => setSelectedParentId(c.id)}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </button>
              </li>
            ))}
            {available.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                没有可选的目标位置
              </li>
            )}
          </ul>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={move.isPending}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={unchanged || move.isPending}>
            {move.isPending ? "移动中..." : "移动"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
