import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsRepo } from "@/services/db";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useRenameProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.rename,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.archive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepo.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
