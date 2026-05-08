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
import { useDeleteProject } from "@/hooks/useProjects";
import type { Project } from "@/types/db";

type Props = {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
};

export function DeleteProjectAlert({ project, onOpenChange }: Props) {
  const remove = useDeleteProject();

  async function handleConfirm() {
    if (!project) return;
    try {
      await remove.mutateAsync({ id: project.id });
      onOpenChange(false);
    } catch (e) {
      console.error("delete project failed", e);
    }
  }

  return (
    <AlertDialog open={!!project} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除作品 "{project?.name}"？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作不可撤销。该作品下的所有章节、角色、大纲、批注等数据都将一并删除。
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
