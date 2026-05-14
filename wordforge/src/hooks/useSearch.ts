import { useQuery } from "@tanstack/react-query";
import { searchRepo } from "@/services/db";

export function useChapterBodySearch(projectId: string | null, query: string) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ["chapter-body-search", projectId ?? "", normalized] as const,
    queryFn: () => searchRepo.chapterBody({ projectId: projectId!, query: normalized, limit: 20 }),
    enabled: !!projectId && normalized.length >= 2,
    staleTime: 10_000,
  });
}
