import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectsRepo } from "@/services/db";
import type { AppErrorPayload } from "@/types/db";

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return (e as AppErrorPayload).message;
  return String(e);
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectsRepo.list,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("作品已创建");
    },
    onError: (e) => toast.error(`创建失败：${errMsg(e)}`),
  });
}

export function useRenameProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.rename,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("已重命名");
    },
    onError: (e) => toast.error(`重命名失败：${errMsg(e)}`),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.archive,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(vars.archived ? "已归档" : "已恢复");
    },
    onError: (e) => toast.error(`操作失败：${errMsg(e)}`),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("作品已删除");
    },
    onError: (e) => toast.error(`删除失败：${errMsg(e)}`),
  });
}
