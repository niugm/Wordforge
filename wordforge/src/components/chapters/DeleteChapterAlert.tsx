import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteChapter } from "@/hooks/useChapters";
import type { Chapter } from "@/types/db";

type Props = {
  chapter: Chapter | null;
  childCount: number;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
};

export function DeleteChapterAlert({ chapter, childCount, onOpenChange, onDeleted }: Props) {
  const remove = useDeleteChapter(chapter?.projectId ?? "");

  async function handleConfirm() {
    if (!chapter) return;
    try {
      await remove.mutateAsync({ id: chapter.id });
      onDeleted?.(chapter.id);
      onOpenChange(false);
    } catch (e) {
      console.error("delete chapter failed", e);
    }
  }

  return (
    <AlertDialog open={!!chapter} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除章节 "{chapter?.title}"？</AlertDialogTitle>
          <AlertDialogDescription>
            {childCount > 0
              ? `此章节下还有 ${childCount} 个子节点，将一并删除。此操作不可撤销。`
              : "此操作不可撤销。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={remove.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {remove.isPending ? "删除中..." : "确认删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
