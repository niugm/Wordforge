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
import { useCreateProject } from "@/hooks/useProjects";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
};

export function NewProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateProject();

  function reset() {
    setName("");
    setDescription("");
    create.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const project = await create.mutateAsync({
        name: trimmed,
        description: description.trim() || null,
      });
      reset();
      onOpenChange(false);
      onCreated?.(project.id);
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
            <DialogTitle>新建作品</DialogTitle>
            <DialogDescription>给你的下一部作品起个名字</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="project-name" className="text-sm font-medium">
                名称 <span className="text-destructive">*</span>
              </label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：雾起小说"
                autoFocus
                maxLength={120}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="project-desc" className="text-sm font-medium">
                简介（可选）
              </label>
              <Input
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一两句话概括"
                maxLength={400}
              />
            </div>

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
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
