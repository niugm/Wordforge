import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUpdateProjectMeta } from "@/hooks/useProjects";
import type { Project } from "@/types/db";

type Props = {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
};

export function EditProjectDialog({ project, onOpenChange }: Props) {
  const [description, setDescription] = useState("");
  const [targetWordCount, setTargetWordCount] = useState("0");
  const update = useUpdateProjectMeta();

  useEffect(() => {
    if (project) {
      setDescription(project.description ?? "");
      setTargetWordCount(String(project.targetWordCount));
    }
  }, [project]);

  function handleOpenChange(open: boolean) {
    if (!open) update.reset();
    onOpenChange(open);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!project) return;
    const count = Math.max(0, parseInt(targetWordCount, 10) || 0);
    try {
      await update.mutateAsync({
        id: project.id,
        description: description.trim() || null,
        targetWordCount: count,
      });
      onOpenChange(false);
    } catch {
      // error shown via toast
    }
  }

  return (
    <Dialog open={!!project} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>编辑项目信息</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="proj-desc" className="text-sm font-medium">
                简介
              </label>
              <Input
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话描述这部作品（可选）"
                maxLength={500}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="proj-target" className="text-sm font-medium">
                目标字数
              </label>
              <Input
                id="proj-target"
                type="number"
                min={0}
                step={1000}
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(e.target.value)}
                placeholder="0 表示不设目标"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={update.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
