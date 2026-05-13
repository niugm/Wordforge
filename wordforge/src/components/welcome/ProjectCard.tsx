import { Archive, ArchiveRestore, Pencil, Settings2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useArchiveProject } from "@/hooks/useProjects";
import type { Project } from "@/types/db";

type Props = {
  project: Project;
  onOpen: (project: Project) => void;
  onRename: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
};

export function ProjectCard({ project, onOpen, onRename, onEdit, onDelete }: Props) {
  const archive = useArchiveProject();
  const isArchived = project.archived === 1;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className="cursor-pointer p-4 transition-colors hover:bg-accent"
          onClick={() => onOpen(project)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{project.name}</div>
              {project.description && (
                <div className="truncate text-xs text-muted-foreground">
                  {project.description}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>更新于 {new Date(project.updatedAt).toLocaleDateString()}</span>
                {project.targetWordCount > 0 && (
                  <span>目标 {project.targetWordCount.toLocaleString()} 字</span>
                )}
              </div>
            </div>
            {isArchived && (
              <span className="ml-3 shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                已归档
              </span>
            )}
          </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={() => onRename(project)}>
          <Pencil className="mr-2 h-4 w-4" />
          重命名
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onEdit(project)}>
          <Settings2 className="mr-2 h-4 w-4" />
          编辑信息
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => archive.mutate({ id: project.id, archived: !isArchived })}
        >
          {isArchived ? (
            <>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              取消归档
            </>
          ) : (
            <>
              <Archive className="mr-2 h-4 w-4" />
              归档
            </>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => onDelete(project)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
