import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionsRepo } from "@/services/db";

export function useWritingStats(projectId: string | null) {
  return useQuery({
    queryKey: ["writing-stats", projectId ?? ""] as const,
    queryFn: () => sessionsRepo.getStats({ projectId: projectId! }),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });
}

export function useDailyWords(projectId: string | null, days = 30) {
  return useQuery({
    queryKey: ["daily-words", projectId ?? "", days] as const,
    queryFn: () => sessionsRepo.getDailyWords({ projectId: projectId!, days }),
    enabled: !!projectId,
  });
}

export function useStartSession() {
  return useMutation({
    mutationFn: sessionsRepo.start,
  });
}

export function useEndSession(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsRepo.end,
    onSuccess: () => {
      if (projectId) {
        qc.invalidateQueries({ queryKey: ["writing-stats", projectId] });
        qc.invalidateQueries({ queryKey: ["daily-words", projectId] });
      }
    },
  });
}
