import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { settingsRepo } from "@/services/db";
import type { AiProvider } from "@/types/db";

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

export function useAiCredentials() {
  return useQuery({
    queryKey: ["ai-credentials"] as const,
    queryFn: settingsRepo.listAiCredentials,
  });
}

export function useSaveAiCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsRepo.saveAiCredential,
    onSuccess: (credential) => {
      qc.setQueryData(["ai-credentials"], (current: unknown) =>
        Array.isArray(current)
          ? current.map((item) =>
              item && typeof item === "object" && "provider" in item
                ? (item as { provider: AiProvider }).provider === credential.provider
                  ? credential
                  : item
                : item,
            )
          : current,
      );
      qc.invalidateQueries({ queryKey: ["ai-credentials"] });
      toast.success("AI 配置已保存");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "保存 AI 配置失败");
    },
  });
}

export function useDeleteAiCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsRepo.deleteAiCredential,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-credentials"] });
      toast.success("AI 密钥已删除");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "删除 AI 密钥失败");
    },
  });
}

export function useExportProject() {
  return useMutation({
    mutationFn: settingsRepo.exportProject,
    onSuccess: (result) => {
      toast.success(`导出完成：${result.fileCount} 个文件`, {
        description: result.path,
        action: {
          label: "打开位置",
          onClick: () => {
            revealItemInDir(result.path).catch((error) => {
              toast.error(error instanceof Error ? error.message : "打开导出位置失败");
            });
          },
        },
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "导出失败");
    },
  });
}

export function useExportChapter() {
  return useMutation({
    mutationFn: settingsRepo.exportChapter,
    onSuccess: (result) => {
      toast.success("章节导出完成", {
        description: result.path,
        action: {
          label: "打开位置",
          onClick: () => {
            revealItemInDir(result.path).catch((error) => {
              toast.error(error instanceof Error ? error.message : "打开导出位置失败");
            });
          },
        },
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "导出章节失败");
    },
  });
}
