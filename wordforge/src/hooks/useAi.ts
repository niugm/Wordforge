import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiRepo } from "@/services/db";
import type { AppErrorPayload } from "@/types/db";

function errMsg(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return (error as AppErrorPayload).message;
  }
  return String(error);
}

export function useAiPolish() {
  return useMutation({
    mutationFn: aiRepo.polish,
    onError: (error) => {
      toast.error(`AI 精修失败：${errMsg(error)}`);
    },
  });
}

export function useAiPolishStream() {
  return useMutation({
    mutationFn: aiRepo.polishStream,
    onError: (error) => {
      const message = errMsg(error);
      if (message.includes("ai stream cancelled")) return;
      toast.error(`AI 流式精修失败：${message}`);
    },
  });
}

export function useCancelAiPolishStream() {
  return useMutation({
    mutationFn: aiRepo.cancelPolishStream,
    onError: (error) => {
      toast.error(`停止生成失败：${errMsg(error)}`);
    },
  });
}
