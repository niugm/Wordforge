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
import { useRenameChapter } from "@/hooks/useChapters";
import type { Chapter } from "@/types/db";

type FormProps = {
  chapter: Chapter;
  onClose: () => void;
};

function RenameForm({ chapter, onClose }: FormProps) {
  const [title, setTitle] = useState(chapter.title);
  const rename = useRenameChapter(chapter.projectId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || trimmed === chapter.title) {
      onClose();
      return;
    }
    try {
      await rename.mutateAsync({ id: chapter.id, title: trimmed });
      onClose();
    } catch {
      // inline error
    }
  }

  const errorMsg =
    rename.error instanceof Error
      ? rename.error.message
      : rename.error
        ? String(rename.error)
        : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>重命名章节</DialogTitle>
        <DialogDescription>修改章节标题</DialogDescription>
      </DialogHeader>

      <div className="space-y-1">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={200} />
        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={rename.isPending}>
          取消
        </Button>
        <Button type="submit" disabled={!title.trim() || rename.isPending}>
          {rename.isPending ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type Props = {
  chapter: Chapter | null;
  onOpenChange: (open: boolean) => void;
};

export function RenameChapterDialog({ chapter, onOpenChange }: Props) {
  return (
    <Dialog open={!!chapter} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {chapter && (
          <RenameForm key={chapter.id} chapter={chapter} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
