import { useState, type FormEvent } from "react";
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
  const update = useUpdateProjectMeta();

  function handleOpenChange(open: boolean) {
    if (!open) update.reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={!!project} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {project && (
          <EditProjectForm
            key={project.id}
            project={project}
            isPending={update.isPending}
            onCancel={() => handleOpenChange(false)}
            onSubmit={async (description, targetWordCount) => {
              await update.mutateAsync({
                id: project.id,
                description,
                targetWordCount,
              });
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = {
  project: Project;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (description: string | null, targetWordCount: number) => Promise<void>;
};

function EditProjectForm({ project, isPending, onCancel, onSubmit }: FormProps) {
  const [description, setDescription] = useState(project.description ?? "");
  const [targetWordCount, setTargetWordCount] = useState(String(project.targetWordCount));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const count = Math.max(0, parseInt(targetWordCount, 10) || 0);
    try {
      await onSubmit(description.trim() || null, count);
    } catch {
      // error shown via toast
    }
  }

  return (
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          取消
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}
