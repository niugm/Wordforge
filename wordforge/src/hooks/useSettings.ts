import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsRepo } from "@/services/db";

export function useBackupSettings() {
  return useQuery({
    queryKey: ["backup-settings"] as const,
    queryFn: settingsRepo.getBackupSettings,
  });
}

export function useUpdateBackupSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsRepo.updateBackupSettings,
    onSuccess: (settings) => {
      qc.setQueryData(["backup-settings"], settings);
      toast.success("备份设置已保存");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "保存备份设置失败");
    },
  });
}

export function useBackupNow() {
  return useMutation({
    mutationFn: settingsRepo.backupNow,
    onSuccess: (result) => {
      toast.success("备份已完成", { description: result.path });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "备份失败");
    },
  });
}
