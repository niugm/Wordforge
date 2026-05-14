import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaptersRepo } from "@/services/db";
import type { AppErrorPayload, Chapter, ChapterStatus } from "@/types/db";

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return (e as AppErrorPayload).message;
  return String(e);
}

const chaptersKey = (projectId: string) => ["chapters", projectId] as const;
const chapterKey = (id: string) => ["chapter", id] as const;

export function useChapters(projectId: string | null) {
  return useQuery({
    queryKey: chaptersKey(projectId ?? ""),
    queryFn: () => chaptersRepo.list({ projectId: projectId! }),
    enabled: !!projectId,
  });
}

export function useChapter(id: string | null) {
  return useQuery({
    queryKey: chapterKey(id ?? ""),
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
      qc.setQueryData(["chapter-content", vars.id], vars.contentJson);
      qc.setQueryData<Chapter[]>(chaptersKey(projectId), (prev) =>
        prev?.map((c) =>
          c.id === vars.id ? { ...c, wordCount: vars.wordCount, updatedAt: Date.now() } : c,
        ),
      );
      qc.setQueryData<Chapter | undefined>(chapterKey(vars.id), (prev) =>
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
    onSuccess: (_, vars) => {
      qc.setQueryData<Chapter[]>(chaptersKey(projectId), (prev) =>
        prev?.map((chapter) =>
          chapter.id === vars.id
            ? { ...chapter, title: vars.title, updatedAt: Date.now() }
            : chapter,
        ),
      );
      qc.setQueryData<Chapter | undefined>(chapterKey(vars.id), (prev) =>
        prev ? { ...prev, title: vars.title, updatedAt: Date.now() } : prev,
      );
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      qc.invalidateQueries({ queryKey: chapterKey(vars.id) });
      toast.success("已重命名");
    },
    onError: (e) => toast.error(`重命名失败：${errMsg(e)}`),
  });
}

export function useSetChapterStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.setStatus,
    onMutate: async (vars) => {
      const listKey = chaptersKey(projectId);
      const detailKey = chapterKey(vars.id);
      await Promise.all([
        qc.cancelQueries({ queryKey: listKey }),
        qc.cancelQueries({ queryKey: detailKey }),
      ]);

      const previousList = qc.getQueryData<Chapter[]>(listKey);
      const previousDetail = qc.getQueryData<Chapter>(detailKey);
      patchChapterStatus(qc, projectId, vars.id, vars.status);

      return { previousList, previousDetail };
    },
    onError: (e, vars, ctx) => {
      if (ctx?.previousList) qc.setQueryData(chaptersKey(projectId), ctx.previousList);
      if (ctx?.previousDetail) qc.setQueryData(chapterKey(vars.id), ctx.previousDetail);
      toast.error(`状态更新失败：${errMsg(e)}`);
    },
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      qc.invalidateQueries({ queryKey: chapterKey(vars.id) });
    },
  });
}

export function useMoveChapter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chaptersRepo.move,
    onSuccess: (_, vars) => {
      qc.setQueryData<Chapter[]>(chaptersKey(projectId), (prev) =>
        prev?.map((chapter) =>
          chapter.id === vars.id
            ? { ...chapter, parentId: vars.parentId, sort: vars.sort, updatedAt: Date.now() }
            : chapter,
        ),
      );
      qc.setQueryData<Chapter | undefined>(chapterKey(vars.id), (prev) =>
        prev ? { ...prev, parentId: vars.parentId, sort: vars.sort, updatedAt: Date.now() } : prev,
      );
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      qc.invalidateQueries({ queryKey: chapterKey(vars.id) });
    },
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
    onSuccess: (_, vars) => {
      qc.removeQueries({ queryKey: chapterKey(vars.id) });
      qc.removeQueries({ queryKey: ["chapter-content", vars.id] });
      qc.invalidateQueries({ queryKey: chaptersKey(projectId) });
      toast.success("章节已删除");
    },
    onError: (e) => toast.error(`删除失败：${errMsg(e)}`),
  });
}

function patchChapterStatus(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  id: string,
  status: ChapterStatus,
) {
  qc.setQueryData<Chapter[]>(chaptersKey(projectId), (prev) =>
    prev?.map((chapter) =>
      chapter.id === id ? { ...chapter, status, updatedAt: Date.now() } : chapter,
    ),
  );
  qc.setQueryData<Chapter | undefined>(chapterKey(id), (prev) =>
    prev ? { ...prev, status, updatedAt: Date.now() } : prev,
  );
}
