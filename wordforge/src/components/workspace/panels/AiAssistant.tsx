import { useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useParams } from "react-router";
import { listen } from "@tauri-apps/api/event";
import {
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  FileEdit,
  FileInput,
  KeyRound,
  Loader2,
  LocateFixed,
  PenLine,
  Play,
  Replace,
  RotateCcw,
  Scissors,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAiPolishStream, useAiReviewChapter, useCancelAiPolishStream } from "@/hooks/useAi";
import { useAiCredentials } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type {
  AiChapterReviewIssue,
  AiChapterReviewResult,
  AiPolishKind,
  AiPolishResult,
  AiPolishStreamDelta,
  AiProvider,
} from "@/types/db";

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
  const params = useParams<{ id: string }>();
  const credentials = useAiCredentials();
  const polish = useAiPolishStream();
  const review = useAiReviewChapter();
  const cancelPolish = useCancelAiPolishStream();
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const storedChapterId = useWorkspaceStore((state) => state.currentChapterId);
  const aiEditorContext = useUIStore((state) => state.aiEditorContext);
  const requestAiApply = useUIStore((state) => state.requestAiApply);
  const requestAiReviewLocate = useUIStore((state) => state.requestAiReviewLocate);
  const [mode, setMode] = useState<"polish" | "review">("polish");
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [kind, setKind] = useState<AiPolishKind>("condense");
  const [manualText, setManualText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [detachedContextId, setDetachedContextId] = useState<number | null>(null);
  const [resultView, setResultView] = useState<"compare" | "result">("compare");
  const [streamText, setStreamText] = useState("");
  const [completedResult, setCompletedResult] = useState<AiPolishResult | null>(null);
  const [interruptedResult, setInterruptedResult] = useState<AiPolishResult | null>(null);
  const [reviewResult, setReviewResult] = useState<AiChapterReviewResult | null>(null);
  const [reviewSeverityFilter, setReviewSeverityFilter] = useState<
    "all" | AiChapterReviewIssue["severity"]
  >("all");
  const [showIgnoredReviewIssues, setShowIgnoredReviewIssues] = useState(false);
  const [ignoredReviewIssues, setIgnoredReviewIssues] = useState<Set<string>>(() => new Set());
  const activeRequestIdRef = useRef<string | null>(null);
  const streamTextRef = useRef("");

  const activeCredential = credentials.data?.find((item) => item.provider === provider);
  const configuredProviders = useMemo(
    () => credentials.data?.filter((item) => item.hasApiKey) ?? [],
    [credentials.data],
  );
  const providerOptions = credentials.data ?? [
    { provider: "openai" as AiProvider, baseUrl: null, model: null, hasApiKey: false },
  ];
  const usesEditorContext = !!aiEditorContext && detachedContextId !== aiEditorContext.capturedAt;
  const activeKind =
    usesEditorContext && aiEditorContext?.preferredKind ? aiEditorContext.preferredKind : kind;
  const selectedAction = ACTIONS.find((action) => action.kind === activeKind) ?? ACTIONS[0];
  const SelectedActionIcon = selectedAction.icon;
  const activeChapterId = params.id ?? storedChapterId;
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
  const disabledReason = !activeCredential?.hasApiKey
    ? "先在设置里配置 OpenAI 兼容密钥"
    : charCount === 0
      ? "输入一段需要精修的正文"
      : charCount > MAX_TEXT_CHARS
        ? "文本过长，建议按段落分批处理"
        : activeKind === "free" && instruction.trim().length === 0
          ? "填写自由指令"
          : null;
  const reviewDisabledReason = !activeCredential?.hasApiKey
    ? "先在设置里配置 OpenAI 兼容密钥"
    : !currentProjectId || !activeChapterId
      ? "先选择一个需要校审的章节"
      : null;
  const reviewIssues = reviewResult?.issues ?? [];
  const visibleReviewIssues = reviewIssues.filter((issue, index) => {
    const issueKey = getReviewIssueKey(issue, index);
    const severityMatches =
      reviewSeverityFilter === "all" || issue.severity === reviewSeverityFilter;
    const ignoredMatches = showIgnoredReviewIssues || !ignoredReviewIssues.has(issueKey);
    return severityMatches && ignoredMatches;
  });
  const ignoredReviewIssueCount = reviewIssues.filter((issue, index) =>
    ignoredReviewIssues.has(getReviewIssueKey(issue, index)),
  ).length;

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

  async function runReview() {
    if (reviewDisabledReason) {
      toast.info(reviewDisabledReason);
      return;
    }
    const result = await review.mutateAsync({
      provider,
      projectId: currentProjectId!,
      chapterId: activeChapterId!,
    });
    setReviewResult(result);
    setReviewSeverityFilter("all");
    setShowIgnoredReviewIssues(false);
    setIgnoredReviewIssues(new Set());
  }

  async function copyReviewIssue(issue: AiChapterReviewIssue) {
    await navigator.clipboard.writeText(
      `【${reviewCategoryLabel(issue.category)} · ${reviewSeverityLabel(issue.severity)}】${issue.location}\n问题：${issue.problem}\n建议：${issue.suggestion}`,
    );
    toast.success("已复制校审建议");
  }

  function locateReviewIssue(issue: AiChapterReviewIssue) {
    if (!activeChapterId) return;
    if (!issue.quote.trim()) {
      toast.info("这条建议没有可定位的原文引文");
      return;
    }
    requestAiReviewLocate({
      chapterId: activeChapterId,
      quote: issue.quote,
    });
  }

  function toggleReviewIssueIgnored(issue: AiChapterReviewIssue, index: number) {
    const issueKey = getReviewIssueKey(issue, index);
    setIgnoredReviewIssues((current) => {
      const next = new Set(current);
      if (next.has(issueKey)) {
        next.delete(issueKey);
      } else {
        next.add(issueKey);
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 text-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          AI 写作助手
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          精修处理选区和段落；校审会读取当前章节全文并给出问题列表。
        </p>
      </div>

      <div className="flex rounded-md border bg-muted/30 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("polish")}
          className={cn(
            "flex-1 rounded-sm px-2 py-1.5 transition-colors",
            mode === "polish"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          精修
        </button>
        <button
          type="button"
          onClick={() => setMode("review")}
          className={cn(
            "flex-1 rounded-sm px-2 py-1.5 transition-colors",
            mode === "review"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          校审
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">模型配置</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  activeCredential?.hasApiKey
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <KeyRound className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {providerLabel(provider)}
                  {activeCredential?.hasApiKey ? "" : "（未配置）"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {activeCredential?.model?.trim() || "未设置模型"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {providerOptions.map((item) => {
              const selected = item.provider === provider;
              return (
                <DropdownMenuItem
                  key={item.provider}
                  onSelect={() => setProvider(item.provider)}
                  className="items-start gap-2 p-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      item.hasApiKey
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs font-medium">
                      {providerLabel(item.provider)}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          item.hasApiKey
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.hasApiKey ? "已配置" : "未配置"}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {item.model?.trim() || "未设置模型"}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {configuredProviders.length === 0 && (
          <p className="text-xs text-muted-foreground">当前还没有可用密钥。</p>
        )}
      </div>

      {mode === "polish" ? (
        <>
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
                <DiffCompare
                  original={completedResult.originalText}
                  result={completedResult.resultText}
                />
              ) : (
                <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-6">
                  {displayResult.resultText}
                  {polish.isPending && (
                    <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-primary align-middle" />
                  )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyResult}
                  disabled={polish.isPending}
                >
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
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-primary">
              <Clipboard className="h-3.5 w-3.5" />
              章节校审
            </div>
            <p className="mt-1 text-muted-foreground">
              校审会发送当前章节全文，按逻辑、连贯、人物口吻和伏笔一致性返回最多 8 条建议。
            </p>
          </div>

          <Button onClick={runReview} disabled={review.isPending} className="w-full">
            {review.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            生成章节校审
          </Button>
          {reviewDisabledReason && (
            <p className="text-xs text-muted-foreground">{reviewDisabledReason}</p>
          )}

          {reviewResult && (
            <div className="space-y-3 rounded-lg border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-xs font-medium">
                  <p className="truncate">《{reviewResult.chapterTitle}》校审</p>
                  <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                    {reviewResult.issues.length > 0
                      ? `${reviewResult.issues.length} 条建议`
                      : "未发现明显问题"}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {providerLabel(reviewResult.provider)} · {reviewResult.model}
                </span>
              </div>

              {reviewResult.issues.length > 0 && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", "high", "medium", "low"] as const).map((severity) => (
                      <button
                        key={severity}
                        type="button"
                        onClick={() => setReviewSeverityFilter(severity)}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px] transition-colors",
                          reviewSeverityFilter === severity
                            ? "border-primary/35 bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {severity === "all" ? "全部" : reviewSeverityLabel(severity)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowIgnoredReviewIssues((value) => !value)}
                      className={cn(
                        "ml-auto rounded-full border px-2 py-1 text-[11px] transition-colors",
                        showIgnoredReviewIssues
                          ? "border-primary/35 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      已忽略 {ignoredReviewIssueCount}
                    </button>
                  </div>
                </div>
              )}

              {reviewResult.issues.length === 0 ? (
                <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  这一章暂未发现明显的逻辑、连贯、口吻或伏笔问题。
                </div>
              ) : visibleReviewIssues.length === 0 ? (
                <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  当前筛选下没有可显示的校审建议。
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleReviewIssues.map((issue) => {
                    const originalIndex = reviewResult.issues.indexOf(issue);
                    const issueKey = getReviewIssueKey(issue, originalIndex);
                    const ignored = ignoredReviewIssues.has(issueKey);
                    return (
                      <ReviewIssueCard
                        key={`${issue.category}-${issue.location}-${originalIndex}`}
                        issue={issue}
                        ignored={ignored}
                        onCopy={() => copyReviewIssue(issue)}
                        onLocate={() => locateReviewIssue(issue)}
                        onToggleIgnored={() => toggleReviewIssueIgnored(issue, originalIndex)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffCompare({ original, result }: { original: string; result: string }) {
  const diff = useMemo(() => getTokenTextDiff(original, result), [original, result]);

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <DiffPane
        title="原文"
        segments={diff.original}
        changedClassName="bg-destructive/10 text-destructive line-through decoration-destructive/70"
        changedCount={diff.removedCount}
        emptyLabel="无删减"
      />
      <DiffPane
        title="AI 建议"
        segments={diff.result}
        changedClassName="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        changedCount={diff.addedCount}
        emptyLabel="无新增"
      />
    </div>
  );
}

function DiffPane({
  title,
  segments,
  changedClassName,
  changedCount,
  emptyLabel,
}: {
  title: string;
  segments: DiffDisplaySegment[];
  changedClassName: string;
  changedCount: number;
  emptyLabel: string;
}) {
  return (
    <div className="min-h-28 rounded-md border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium">{title}</span>
        <span className="text-[11px] text-muted-foreground">
          {changedCount > 0 ? `${changedCount} 处变动` : emptyLabel}
        </span>
      </div>
      <div className="max-h-80 overflow-auto whitespace-pre-wrap p-3 text-sm leading-6">
        {segments.map((segment, index) =>
          segment.changed ? (
            <span key={index} className={cn("rounded-sm px-0.5", changedClassName)}>
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </div>
    </div>
  );
}

function ReviewIssueCard({
  issue,
  ignored,
  onCopy,
  onLocate,
  onToggleIgnored,
}: {
  issue: AiChapterReviewIssue;
  ignored: boolean;
  onCopy: () => void;
  onLocate: () => void;
  onToggleIgnored: () => void;
}) {
  return (
    <div className={cn("space-y-2 rounded-md border bg-muted/25 p-3", ignored && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              reviewCategoryClass(issue.category),
            )}
          >
            {reviewCategoryLabel(issue.category)}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              reviewSeverityClass(issue.severity),
            )}
          >
            {reviewSeverityLabel(issue.severity)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={onLocate}
            disabled={!issue.quote.trim()}
            title={issue.quote.trim() ? "定位原文" : "缺少原文引文"}
          >
            <LocateFixed className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onCopy} title="复制建议">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={onToggleIgnored}
            title={ignored ? "恢复显示" : "忽略建议"}
          >
            {ignored ? <RotateCcw className="h-3.5 w-3.5" /> : "忽略"}
          </Button>
        </div>
      </div>
      {issue.location && (
        <p className="text-[11px] font-medium text-muted-foreground">{issue.location}</p>
      )}
      {issue.quote && (
        <p className="rounded border-l-2 border-primary/30 bg-background/70 px-2 py-1 text-xs leading-5 text-muted-foreground">
          {issue.quote}
        </p>
      )}
      <div className="space-y-1 text-sm leading-6">
        <p>{issue.problem}</p>
        <p className="text-muted-foreground">{issue.suggestion}</p>
      </div>
    </div>
  );
}

type DiffToken = {
  text: string;
  key: string;
};

type DiffSegment = {
  type: "equal" | "remove" | "add";
  text: string;
};

type DiffDisplaySegment = {
  text: string;
  changed: boolean;
};

type SegmenterLike = {
  segment(input: string): Iterable<{ segment: string }>;
};

const MAX_DIFF_COMPARISONS = 250_000;

function getTokenTextDiff(original: string, result: string) {
  const originalTokens = tokenizeForDiff(original);
  const resultTokens = tokenizeForDiff(result);
  const segments = diffTokenRanges(originalTokens, resultTokens).flatMap((segment) =>
    segment.text ? [segment] : [],
  );

  const originalSegments = mergeDisplaySegments(
    segments
      .filter((segment) => segment.type !== "add")
      .map((segment) => ({
        text: segment.text,
        changed: segment.type === "remove",
      })),
  );
  const resultSegments = mergeDisplaySegments(
    segments
      .filter((segment) => segment.type !== "remove")
      .map((segment) => ({
        text: segment.text,
        changed: segment.type === "add",
      })),
  );

  return {
    original: originalSegments,
    result: resultSegments,
    removedCount: countChangedRuns(originalSegments),
    addedCount: countChangedRuns(resultSegments),
  };
}

function tokenizeForDiff(text: string): DiffToken[] {
  const SegmenterCtor = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity?: "word" | "grapheme" | "sentence" },
      ) => SegmenterLike;
    }
  ).Segmenter;

  if (SegmenterCtor) {
    const segmenter = new SegmenterCtor(["zh", "en"], { granularity: "word" });
    return [...segmenter.segment(text)].map(({ segment }) => ({
      text: segment,
      key: segment,
    }));
  }

  return (text.match(/\s+|[A-Za-z0-9_]+|[\u4e00-\u9fff]|[^\sA-Za-z0-9_\u4e00-\u9fff]/gu) ?? []).map(
    (token) => ({ text: token, key: token }),
  );
}

function diffTokenRanges(original: DiffToken[], result: DiffToken[]): DiffSegment[] {
  if (original.length === 0 && result.length === 0) return [];
  if (original.length === 0) return [{ type: "add", text: joinTokens(result) }];
  if (result.length === 0) return [{ type: "remove", text: joinTokens(original) }];

  let prefixLength = 0;
  while (
    prefixLength < original.length &&
    prefixLength < result.length &&
    original[prefixLength].key === result[prefixLength].key
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < original.length - prefixLength &&
    suffixLength < result.length - prefixLength &&
    original[original.length - 1 - suffixLength].key ===
      result[result.length - 1 - suffixLength].key
  ) {
    suffixLength += 1;
  }

  const prefix = original.slice(0, prefixLength);
  const originalMiddle = original.slice(prefixLength, original.length - suffixLength);
  const resultMiddle = result.slice(prefixLength, result.length - suffixLength);
  const suffix = suffixLength > 0 ? original.slice(original.length - suffixLength) : [];

  return mergeDiffSegments([
    ...(prefix.length > 0 ? [{ type: "equal" as const, text: joinTokens(prefix) }] : []),
    ...diffTokenMiddle(originalMiddle, resultMiddle),
    ...(suffix.length > 0 ? [{ type: "equal" as const, text: joinTokens(suffix) }] : []),
  ]);
}

function diffTokenMiddle(original: DiffToken[], result: DiffToken[]): DiffSegment[] {
  if (original.length === 0 && result.length === 0) return [];
  if (original.length === 0) return [{ type: "add", text: joinTokens(result) }];
  if (result.length === 0) return [{ type: "remove", text: joinTokens(original) }];
  if (original.length * result.length > MAX_DIFF_COMPARISONS) {
    return [
      { type: "remove", text: joinTokens(original) },
      { type: "add", text: joinTokens(result) },
    ];
  }

  const match = findLongestCommonTokenRun(original, result);
  if (match.length === 0) {
    return [
      { type: "remove", text: joinTokens(original) },
      { type: "add", text: joinTokens(result) },
    ];
  }

  return mergeDiffSegments([
    ...diffTokenMiddle(original.slice(0, match.originalStart), result.slice(0, match.resultStart)),
    {
      type: "equal",
      text: joinTokens(original.slice(match.originalStart, match.originalStart + match.length)),
    },
    ...diffTokenMiddle(
      original.slice(match.originalStart + match.length),
      result.slice(match.resultStart + match.length),
    ),
  ]);
}

function findLongestCommonTokenRun(original: DiffToken[], result: DiffToken[]) {
  const positionsByKey = new Map<string, number[]>();
  result.forEach((token, index) => {
    const positions = positionsByKey.get(token.key);
    if (positions) {
      positions.push(index);
    } else {
      positionsByKey.set(token.key, [index]);
    }
  });

  let best = { originalStart: 0, resultStart: 0, length: 0 };
  let previousLengths = new Map<number, number>();

  original.forEach((token, originalIndex) => {
    const nextLengths = new Map<number, number>();
    for (const resultIndex of positionsByKey.get(token.key) ?? []) {
      const length = (previousLengths.get(resultIndex - 1) ?? 0) + 1;
      nextLengths.set(resultIndex, length);
      if (length > best.length) {
        best = {
          originalStart: originalIndex - length + 1,
          resultStart: resultIndex - length + 1,
          length,
        };
      }
    }
    previousLengths = nextLengths;
  });

  return best;
}

function joinTokens(tokens: DiffToken[]) {
  return tokens.map((token) => token.text).join("");
}

function mergeDiffSegments(segments: DiffSegment[]) {
  return segments.reduce<DiffSegment[]>((merged, segment) => {
    const previous = merged[merged.length - 1];
    if (previous?.type === segment.type) {
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
    return merged;
  }, []);
}

function mergeDisplaySegments(segments: DiffDisplaySegment[]) {
  return segments.reduce<DiffDisplaySegment[]>((merged, segment) => {
    const previous = merged[merged.length - 1];
    if (previous?.changed === segment.changed) {
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
    return merged;
  }, []);
}

function countChangedRuns(segments: DiffDisplaySegment[]) {
  return segments.filter((segment) => segment.changed && segment.text.trim().length > 0).length;
}

function getReviewIssueKey(issue: AiChapterReviewIssue, index: number) {
  return [index, issue.category, issue.severity, issue.location, issue.quote, issue.problem].join(
    "::",
  );
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

function reviewCategoryLabel(category: AiChapterReviewIssue["category"]) {
  switch (category) {
    case "logic":
      return "逻辑";
    case "continuity":
      return "连贯";
    case "voice":
      return "口吻";
    case "foreshadowing":
      return "伏笔";
  }
}

function reviewCategoryClass(category: AiChapterReviewIssue["category"]) {
  switch (category) {
    case "logic":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "continuity":
      return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "voice":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "foreshadowing":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
}

function reviewSeverityLabel(severity: AiChapterReviewIssue["severity"]) {
  switch (severity) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

function reviewSeverityClass(severity: AiChapterReviewIssue["severity"]) {
  switch (severity) {
    case "high":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "medium":
      return "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "low":
      return "border-border bg-background text-muted-foreground";
  }
}
