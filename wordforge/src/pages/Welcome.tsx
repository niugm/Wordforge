import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Feather, FilePlus } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { DeleteProjectAlert } from "@/components/welcome/DeleteProjectAlert";
import { NewProjectDialog } from "@/components/welcome/NewProjectDialog";
import { ProjectCard } from "@/components/welcome/ProjectCard";
import { RenameProjectDialog } from "@/components/welcome/RenameProjectDialog";
import { useProjects } from "@/hooks/useProjects";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Project } from "@/types/db";

export function Welcome() {
  const navigate = useNavigate();
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const setCurrentProject = useWorkspaceStore((s) => s.setCurrentProject);

  const { data: projects, isLoading, error } = useProjects();

  useEffect(() => {
    if (isLoading || error) return;
    if (!currentProjectId) return;
    const exists = (projects ?? []).some((p) => p.id === currentProjectId && p.archived === 0);
    if (exists) navigate("/workspace", { replace: true });
  }, [isLoading, error, projects, currentProjectId, navigate]);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const { active, archived } = useMemo(() => {
    const list = projects ?? [];
    return {
      active: list.filter((p) => p.archived === 0),
      archived: list.filter((p) => p.archived === 1),
    };
  }, [projects]);

  function openProject(p: Project) {
    setCurrentProject(p.id);
    navigate("/workspace");
  }

  function handleCreated(projectId: string) {
    setCurrentProject(projectId);
    navigate("/workspace");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-12 py-16">
      <div className="flex flex-col items-center gap-3">
        <Feather className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-heading font-bold tracking-tight">Wordforge</h1>
        <p className="text-muted-foreground text-sm">本地优先的桌面写作工坊</p>
      </div>

      <Button size="lg" onClick={() => setCreateOpen(true)}>
        <FilePlus className="mr-2 h-4 w-4" />
        新建作品
      </Button>

      <section className="w-full max-w-2xl">
        {error && (
          <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            加载失败：{error instanceof Error ? error.message : String(error)}
          </p>
        )}

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">加载中...</p>
        )}

        {!isLoading && !error && active.length === 0 && archived.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            还没有作品。点上方按钮开始你的第一部作品。
          </p>
        )}

        {active.length > 0 && (
          <div className="space-y-2">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              进行中（{active.length}）
            </h2>
            <div className="grid gap-2">
              {active.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={openProject}
                  onRename={setRenameTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </div>
        )}

        {archived.length > 0 && (
          <div className="mt-6 space-y-2">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setArchivedExpanded((v) => !v)}
            >
              {archivedExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              已归档（{archived.length}）
            </button>
            {archivedExpanded && (
              <div className="grid gap-2">
                {archived.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onOpen={openProject}
                    onRename={setRenameTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <NewProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
      <RenameProjectDialog
        project={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <DeleteProjectAlert
        project={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </main>
  );
}
