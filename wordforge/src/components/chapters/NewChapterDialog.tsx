import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateChapter } from "@/hooks/useChapters";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentId: string | null;
  parentTitle?: string | null;
  onCreated?: (chapterId: string) => void;
};

export function NewChapterDialog({
  open,
  onOpenChange,
  projectId,
  parentId,
  parentTitle,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const create = useCreateChapter(projectId);

  function reset() {
    setTitle("");
    create.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const chapter = await create.mutateAsync({
        projectId,
        parentId,
        title: trimmed,
      });
      reset();
      onOpenChange(false);
      onCreated?.(chapter.id);
    } catch {
      // 错误状态由 create.error 显示
    }
  }

  const errorMsg =
    create.error instanceof Error
      ? create.error.message
      : create.error
        ? String(create.error)
        : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{parentId ? "新建子章节" : "新建章节"}</DialogTitle>
            <DialogDescription>
              {parentTitle ? `归属于「${parentTitle}」` : "顶层章节"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <label htmlFor="chapter-title" className="text-sm font-medium">
              标题 <span className="text-destructive">*</span>
            </label>
            <Input
              id="chapter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：第一章 雾起"
              autoFocus
              maxLength={200}
            />
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={create.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={!title.trim() || create.isPending}>
              {create.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
