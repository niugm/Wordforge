import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { charactersRepo } from "@/services/db";
import type { AppErrorPayload } from "@/types/db";

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return (e as AppErrorPayload).message;
  return String(e);
}

const charactersKey = (projectId: string) => ["characters", projectId] as const;

export function useCharacters(projectId: string | null) {
  return useQuery({
    queryKey: charactersKey(projectId ?? ""),
    queryFn: () => charactersRepo.list({ projectId: projectId! }),
    enabled: !!projectId,
  });
}

export function useCreateCharacter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: charactersRepo.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: charactersKey(projectId) });
      toast.success("角色已创建");
    },
    onError: (e) => toast.error(`创建失败：${errMsg(e)}`),
  });
}

export function useUpdateCharacter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: charactersRepo.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: charactersKey(projectId) });
      toast.success("角色已更新");
    },
    onError: (e) => toast.error(`更新失败：${errMsg(e)}`),
  });
}

export function useDeleteCharacter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: charactersRepo.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: charactersKey(projectId) });
      toast.success("角色已删除");
    },
    onError: (e) => toast.error(`删除失败：${errMsg(e)}`),
  });
}
