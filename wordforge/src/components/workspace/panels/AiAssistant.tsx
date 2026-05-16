import { useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Clipboard,
  Copy,
  FileEdit,
  FileInput,
  Loader2,
  PenLine,
  Play,
  Replace,
  Scissors,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiPolishStream, useCancelAiPolishStream } from "@/hooks/useAi";
import { useAiCredentials } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { AiPolishKind, AiPolishResult, AiPolishStreamDelta, AiProvider } from "@/types/db";

const MAX_TEXT_CHARS = 5000;

const ACTIONS: Array<{
  kind: AiPolishKind;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    kind: "condense",
    label: "凝练",
    description: "删去拖沓，保留信息",
    icon: Scissors,
  },
  {
    kind: "expand",
    label: "扩写",
    description: "补足细节和节奏",
    icon: FileEdit,
  },
  {
    kind: "describe",
    label: "描写",
    description: "增强感官画面",
    icon: Wand2,
  },
  {
    kind: "tone",
    label: "语气",
    description: "稳定叙事质感",
    icon: PenLine,
  },
  {
    kind: "free",
    label: "指令",
    description: "按自定义要求改写",
    icon: Sparkles,
  },
];

export function AiAssistant() {
  const credentials = useAiCredentials();
  const polish = useAiPolishStream();
  const cancelPolish = useCancelAiPolishStream();
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const aiEditorContext = useUIStore((state) => state.aiEditorContext);
  const requestAiApply = useUIStore((state) => state.requestAiApply);
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [kind, setKind] = useState<AiPolishKind>("condense");
  const [manualText, setManualText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [detachedContextId, setDetachedContextId] = useState<number | null>(null);
  const [resultView, setResultView] = useState<"compare" | "result">("compare");
  const [streamText, setStreamText] = useState("");
  const [completedResult, setCompletedResult] = useState<AiPolishResult | null>(null);
  const [interruptedResult, setInterruptedResult] = useState<AiPolishResult | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const streamTextRef = useRef("");

  const activeCredential = credentials.data?.find((item) => item.provider === provider);
  const configuredProviders = useMemo(
    () => credentials.data?.filter((item) => item.hasApiKey) ?? [],
    [credentials.data],
  );
  const usesEditorContext =
    !!aiEditorContext && detachedContextId !== aiEditorContext.capturedAt;
  const activeKind =
    usesEditorContext && aiEditorContext?.preferredKind ? aiEditorContext.preferredKind : kind;
  const selectedAction = ACTIONS.find((action) => action.kind === activeKind) ?? ACTIONS[0];
  const SelectedActionIcon = selectedAction.icon;
  const text = usesEditorContext ? aiEditorContext.text : manualText;
  const charCount = text.trim().length;
  const canApplyToEditor =
    !!completedResult?.resultText &&
    !!aiEditorContext &&
    usesEditorContext &&
    text.trim() === aiEditorContext.text.trim();
  const displayResult =
    completedResult ??
    interruptedResult ??
    (streamText
      ? ({
          provider,
          model: activeCredential?.model ?? "streaming",
          kind: activeKind,
          originalText: text,
          resultText: streamText,
        } satisfies AiPolishResult)
      : null);
  const canContinue = !!interruptedResult?.resultText && !completedResult && !polish.isPending;
  const disabledReason =
    !activeCredential?.hasApiKey
      ? "先在设置里配置 OpenAI 兼容密钥"
      : charCount === 0
        ? "输入一段需要精修的正文"
        : charCount > MAX_TEXT_CHARS
          ? "文本过长，建议按段落分批处理"
          : activeKind === "free" && instruction.trim().length === 0
            ? "填写自由指令"
            : null;

  async function runPolish(options?: { continueFrom?: string }) {
    if (disabledReason) {
      toast.info(disabledReason);
      return;
    }
    const requestId = crypto.randomUUID();
    activeRequestIdRef.current = requestId;
    const continuingText = options?.continueFrom?.trim() ?? "";
    streamTextRef.current = continuingText;
    setStreamText(continuingText);
    setCompletedResult(null);
    setInterruptedResult(null);
    setResultView("result");

    const unlisten = await listen<AiPolishStreamDelta>("ai-polish-stream-delta", (event) => {
      if (event.payload.requestId !== activeRequestIdRef.current) return;
      streamTextRef.current += event.payload.delta;
      setStreamText(streamTextRef.current);
    });

    try {
      const result = await polish.mutateAsync({
        requestId,
        provider,
        kind: activeKind,
        text,
        instruction: activeKind === "free" ? instruction : null,
        projectId: currentProjectId,
        continueFrom: continuingText || null,
      });
      if (activeRequestIdRef.current === requestId) {
        setCompletedResult(result);
        streamTextRef.current = result.resultText;
        setStreamText(result.resultText);
        setResultView("compare");
      }
    } catch {
      const partialText = streamTextRef.current.trim();
      if (activeRequestIdRef.current === requestId && partialText.length > 0) {
        setInterruptedResult({
          provider,
          model: activeCredential?.model ?? "streaming",
          kind: activeKind,
          originalText: text,
          resultText: streamTextRef.current,
        });
      }
    } finally {
      unlisten();
      if (activeRequestIdRef.current === requestId) activeRequestIdRef.current = null;
    }
  }

  async function stopPolish() {
    const requestId = activeRequestIdRef.current;
    if (!requestId) return;
    await cancelPolish.mutateAsync({ requestId });
    if (streamTextRef.current.trim()) {
      setInterruptedResult({
        provider,
        model: activeCredential?.model ?? "streaming",
        kind: activeKind,
        originalText: text,
        resultText: streamTextRef.current,
      });
    }
    toast.info("已请求停止生成，可稍后继续");
  }

  function continuePolish() {
    if (!interruptedResult?.resultText) return;
    void runPolish({ continueFrom: interruptedResult.resultText });
  }

  async function copyResult() {
    const result = displayResult?.resultText;
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("已复制 AI 建议");
  }

  function applyResult(mode: "replace" | "insertBelow") {
    const result = completedResult?.resultText.trim();
    if (!result || !aiEditorContext || !canApplyToEditor) {
      toast.info("这条建议没有绑定到当前编辑器选区");
      return;
    }
    requestAiApply({
      chapterId: aiEditorContext.chapterId,
      mode,
      text: result,
      from: aiEditorContext.from,
      to: aiEditorContext.to,
    });
  }

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 text-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          AI 精修
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          选中正文点 AI，或按 Ctrl/Cmd+J 送入当前段落；确认后再替换或插入正文。
        </p>
      </div>

      {aiEditorContext && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-primary">
            <FileInput className="h-3.5 w-3.5" />
            已绑定{aiEditorContext.source === "selection" ? "选区" : "当前段落"}
          </div>
          <p className="mt-1 text-muted-foreground">
            {aiEditorContext.preferredKind
              ? `已预选「${selectedAction.label}」。应用结果会写入编辑器，并在替换前保存修订记录。`
              : "应用结果会写入编辑器，并在替换前保存一条 AI 修订记录。"}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">模型配置</label>
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value as AiProvider)}
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {(credentials.data ?? [{ provider: "openai" as AiProvider, hasApiKey: false }]).map(
            (item) => (
              <option key={item.provider} value={item.provider}>
                {providerLabel(item.provider)}
                {item.hasApiKey ? "" : "（未配置）"}
              </option>
            ),
          )}
        </select>
        {configuredProviders.length === 0 && (
          <p className="text-xs text-muted-foreground">当前还没有可用密钥。</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">精修动作</label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const active = action.kind === activeKind;
            return (
              <button
                key={action.kind}
                type="button"
                onClick={() => {
                  setKind(action.kind);
                  if (aiEditorContext) setDetachedContextId(aiEditorContext.capturedAt);
                }}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-muted/70",
                  active
                    ? "border-primary/45 bg-primary/5 text-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Icon className={cn("h-3.5 w-3.5", active && "text-primary")} />
                  {action.label}
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                  {action.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeKind === "free" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">自由指令</label>
          <Textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="例如：让这一段更克制，减少形容词，但保留压迫感。"
            className="min-h-20 resize-none text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-muted-foreground">原文</label>
          <span
            className={cn(
              "text-[11px] text-muted-foreground",
              charCount > MAX_TEXT_CHARS && "text-destructive",
            )}
          >
            {charCount}/{MAX_TEXT_CHARS}
          </span>
        </div>
        <Textarea
          value={text}
          onChange={(event) => {
            setManualText(event.target.value);
            if (aiEditorContext) setDetachedContextId(aiEditorContext.capturedAt);
          }}
          placeholder="粘贴需要精修的一段正文..."
          className="min-h-40 resize-none text-sm leading-6"
        />
      </div>

      {polish.isPending ? (
        <Button
          variant="secondary"
          onClick={stopPolish}
          disabled={cancelPolish.isPending}
          className="w-full"
        >
          {cancelPolish.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          停止生成
        </Button>
      ) : (
        <Button onClick={() => runPolish()} className="w-full">
          <SelectedActionIcon className="h-4 w-4" />
          {`生成${selectedAction.label}建议`}
        </Button>
      )}
      {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}

      {displayResult && (
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              {polish.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Clipboard className="h-3.5 w-3.5 text-primary" />
              )}
              AI 建议
            </div>
            <span className="truncate text-[11px] text-muted-foreground">
              {providerLabel(displayResult.provider)} · {displayResult.model}
            </span>
          </div>
          <div className="flex rounded-md border bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setResultView("compare")}
              className={cn(
                "flex-1 rounded-sm px-2 py-1.5 transition-colors",
                resultView === "compare"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              对照
            </button>
            <button
              type="button"
              onClick={() => setResultView("result")}
              className={cn(
                "flex-1 rounded-sm px-2 py-1.5 transition-colors",
                resultView === "result"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              仅建议
            </button>
          </div>
          {resultView === "compare" && completedResult ? (
            <DiffCompare original={completedResult.originalText} result={completedResult.resultText} />
          ) : (
            <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-6">
              {displayResult.resultText}
              {polish.isPending && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-primary align-middle" />}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {canApplyToEditor && (
              <>
                <Button variant="default" size="sm" onClick={() => applyResult("replace")}>
                  <Replace className="h-3.5 w-3.5" />
                  替换原文
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyResult("insertBelow")}>
                  <FileInput className="h-3.5 w-3.5" />
                  插入下方
                </Button>
              </>
            )}
            {canContinue && (
              <Button variant="default" size="sm" onClick={continuePolish}>
                <Play className="h-3.5 w-3.5" />
                继续生成
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyResult} disabled={polish.isPending}>
              <Copy className="h-3.5 w-3.5" />
              复制
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => runPolish()}
              disabled={polish.isPending}
            >
              {polish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              重试
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffCompare({ original, result }: { original: string; result: string }) {
  const diff = getSimpleTextDiff(original, result);

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <DiffPane
        title="原文"
        unchangedBefore={diff.prefix}
        changed={diff.originalChanged}
        unchangedAfter={diff.suffix}
        changedClassName="bg-destructive/10 text-destructive line-through decoration-destructive/70"
        emptyLabel="无删减"
      />
      <DiffPane
        title="AI 建议"
        unchangedBefore={diff.prefix}
        changed={diff.resultChanged}
        unchangedAfter={diff.suffix}
        changedClassName="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        emptyLabel="无新增"
      />
    </div>
  );
}

function DiffPane({
  title,
  unchangedBefore,
  changed,
  unchangedAfter,
  changedClassName,
  emptyLabel,
}: {
  title: string;
  unchangedBefore: string;
  changed: string;
  unchangedAfter: string;
  changedClassName: string;
  emptyLabel: string;
}) {
  return (
    <div className="min-h-28 rounded-md border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium">{title}</span>
        <span className="text-[11px] text-muted-foreground">
          {changed ? "高亮为变动部分" : emptyLabel}
        </span>
      </div>
      <div className="max-h-80 overflow-auto whitespace-pre-wrap p-3 text-sm leading-6">
        {unchangedBefore}
        {changed && <span className={cn("rounded-sm px-0.5", changedClassName)}>{changed}</span>}
        {unchangedAfter}
      </div>
    </div>
  );
}

function getSimpleTextDiff(original: string, result: string) {
  let prefixLength = 0;
  const maxPrefix = Math.min(original.length, result.length);
  while (prefixLength < maxPrefix && original[prefixLength] === result[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  const maxSuffix = maxPrefix - prefixLength;
  while (
    suffixLength < maxSuffix &&
    original[original.length - 1 - suffixLength] === result[result.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return {
    prefix: original.slice(0, prefixLength),
    suffix: suffixLength > 0 ? original.slice(original.length - suffixLength) : "",
    originalChanged: original.slice(prefixLength, original.length - suffixLength),
    resultChanged: result.slice(prefixLength, result.length - suffixLength),
  };
}

function providerLabel(provider: AiProvider) {
  switch (provider) {
    case "openai":
      return "OpenAI 兼容";
    case "anthropic":
      return "Anthropic";
    case "gemini":
      return "Gemini";
  }
}
