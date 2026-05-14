import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { outlinesRepo } from "@/services/db";
import type { AppErrorPayload, OutlineNode } from "@/types/db";

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return (e as AppErrorPayload).message;
  return String(e);
}

const outlinesKey = (projectId: string) => ["outlines", projectId] as const;

export function useOutlines(projectId: string | null) {
  return useQuery({
    queryKey: outlinesKey(projectId ?? ""),
    queryFn: () => outlinesRepo.list({ projectId: projectId! }),
    enabled: !!projectId,
  });
}

export function useCreateOutline(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: outlinesRepo.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outlinesKey(projectId) });
      toast.success("大纲节点已创建");
    },
    onError: (e) => toast.error(`创建失败：${errMsg(e)}`),
  });
}

export function useUpdateOutline(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: outlinesRepo.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outlinesKey(projectId) });
      toast.success("大纲节点已更新");
    },
    onError: (e) => toast.error(`更新失败：${errMsg(e)}`),
  });
}

export function useMoveOutline(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: outlinesRepo.move,
    onSuccess: () => qc.invalidateQueries({ queryKey: outlinesKey(projectId) }),
    onError: (e) => toast.error(`移动失败：${errMsg(e)}`),
  });
}

export function useReorderOutlines(projectId: string) {
  const qc = useQueryClient();
  const key = outlinesKey(projectId);
  return useMutation({
    mutationFn: outlinesRepo.reorder,
    onMutate: async ({ items }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<OutlineNode[]>(key);
      if (previous) {
        const sortById = new Map(items.map((item) => [item.id, item.sort]));
        qc.setQueryData<OutlineNode[]>(
          key,
          previous.map((node) =>
            sortById.has(node.id) ? { ...node, sort: sortById.get(node.id)! } : node,
          ),
        );
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error(`排序失败：${errMsg(err)}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteOutline(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: outlinesRepo.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outlinesKey(projectId) });
      toast.success("大纲节点已删除");
    },
    onError: (e) => toast.error(`删除失败：${errMsg(e)}`),
  });
}
