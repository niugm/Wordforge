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
import { useRenameProject } from "@/hooks/useProjects";
import type { Project } from "@/types/db";

type Props = {
  project: Project;
  onClose: () => void;
};

function RenameForm({ project, onClose }: Props) {
  const [name, setName] = useState(project.name);
  const rename = useRenameProject();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      onClose();
      return;
    }
    try {
      await rename.mutateAsync({ id: project.id, name: trimmed });
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
        <DialogTitle>重命名作品</DialogTitle>
        <DialogDescription>修改作品名称</DialogDescription>
      </DialogHeader>

      <div className="space-y-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={120}
        />
        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={rename.isPending}>
          取消
        </Button>
        <Button type="submit" disabled={!name.trim() || rename.isPending}>
          {rename.isPending ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type WrapperProps = {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
};

export function RenameProjectDialog({ project, onOpenChange }: WrapperProps) {
  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {project && (
          <RenameForm
            key={project.id}
            project={project}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
