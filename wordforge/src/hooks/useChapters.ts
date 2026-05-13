import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaptersRepo } from "@/services/db";
import type { AppErrorPayload, Chapter } from "@/types/db";

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return (e as AppErrorPayload).message;
  return String(e);
}

const chaptersKey = (projectId: string) => ["chapters", projectId] as const;

export function useChapters(projectId: string | null) {
  return useQuery({
    queryKey: chaptersKey(projectId ?? ""),
    queryFn: () => chaptersRepo.list({ projectId: projectId! }),
    enabled: !!projectId,
  });
}

export function useChapter(id: string | null) {
  return useQuery({
    queryKey: ["chapter", id ?? ""] as const,
    queryFn: () => chaptersRepo.get({ id: id! }),
    enabled: !!id,
  });
}

export function useChapterContent(id: string | null) {
  return useQuery({
    queryKey: ["chapter-content", id ?? ""] as const,
    queryFn: () => chaptersRepo.getContent({ id: id! }),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUpdateChapterContent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.updateContent,
    onSuccess: (_, vars) => {
      qc.setQueryData<Chapter[]>(chaptersKey(projectId), (prev) =>
        prev?.map((c) =>
          c.id === vars.id ? { ...c, wordCount: vars.wordCount, updatedAt: Date.now() } : c,
        ),
      );
      qc.setQueryData<Chapter | undefined>(["chapter", vars.id], (prev) =>
        prev ? { ...prev, wordCount: vars.wordCount, updatedAt: Date.now() } : prev,
      );
    },
    onError: (e) => toast.error(`保存失败：${errMsg(e)}`),
  });
}

export function useCreateChapter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      toast.success("章节已创建");
    },
    onError: (e) => toast.error(`创建失败：${errMsg(e)}`),
  });
}

export function useRenameChapter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.rename,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      toast.success("已重命名");
    },
    onError: (e) => toast.error(`重命名失败：${errMsg(e)}`),
  });
}

export function useSetChapterStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.setStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: chaptersKey(projectId) }),
    onError: (e) => toast.error(`状态更新失败：${errMsg(e)}`),
  });
}

export function useMoveChapter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.move,
    onSuccess: () => qc.invalidateQueries({ queryKey: chaptersKey(projectId) }),
    onError: (e) => toast.error(`移动失败：${errMsg(e)}`),
  });
}

export function useReorderChapters(projectId: string) {
  const qc = useQueryClient();
  const key = chaptersKey(projectId);
  return useMutation({
    mutationFn: chaptersRepo.reorder,
    onMutate: async ({ items }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Chapter[]>(key);
      if (previous) {
        const sortById = new Map(items.map((i) => [i.id, i.sort]));
        qc.setQueryData<Chapter[]>(
          key,
          previous.map((c) => (sortById.has(c.id) ? { ...c, sort: sortById.get(c.id)! } : c)),
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

export function useDeleteChapter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      toast.success("章节已删除");
    },
    onError: (e) => toast.error(`删除失败：${errMsg(e)}`),
  });
}
