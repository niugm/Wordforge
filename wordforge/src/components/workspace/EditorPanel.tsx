import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Underline } from "@tiptap/extension-underline";
import { BubbleMenu } from "@tiptap/react/menus";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertCircle,
  Bold,
  Check,
  Italic,
  Loader2,
  Sparkles,
  Strikethrough,
  Underline as UnderlineIcon,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditorToolbar } from "@/components/workspace/EditorToolbar";
import {
  useChapter,
  useChapterContent,
  useCreateChapterRevision,
  useUpdateChapterContent,
} from "@/hooks/useChapters";
import { useEndSession, useStartSession } from "@/hooks/useSessions";
import { countWritingText, WORD_COUNT_MODE_LABELS } from "@/lib/wordCount";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { AiPolishKind, Chapter, ChapterStatus } from "@/types/db";

const AUTOSAVE_MS = 500;
const IDLE_SESSION_END_MS = 30_000;
const MAX_AI_TEXT_CHARS = 5000;

const AI_BUBBLE_ACTIONS: Array<{
  kind: AiPolishKind;
  label: string;
  description: string;
}> = [
  { kind: "condense", label: "凝练", description: "删去拖沓，保留信息" },
  { kind: "expand", label: "扩写", description: "补足细节和节奏" },
  { kind: "describe", label: "描写", description: "增强感官画面" },
  { kind: "tone", label: "语气", description: "稳定叙事质感" },
  { kind: "free", label: "自由指令", description: "带着选区去右侧填写要求" },
];

const STATUS_META: Record<
  ChapterStatus,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  draft: { label: "草稿", variant: "outline" },
  revising: { label: "修订中", variant: "secondary" },
  done: { label: "已完成", variant: "default" },
};

export function EditorPanel() {
  const { id } = useParams<{ id: string }>();
  const chapterId = id ?? null;

  if (!chapterId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="max-w-prose text-center text-sm text-muted-foreground">
            <p>未选章节</p>
            <p className="mt-2 text-xs">从左侧"章节"面板选择一章，或点 + 新建。</p>
          </div>
        </div>
      </div>
    );
  }

  return <ChapterLoader chapterId={chapterId} />;
}

function ChapterLoader({ chapterId }: { chapterId: string }) {
  const setCurrentChapter = useWorkspaceStore((s) => s.setCurrentChapter);
  const chapter = useChapter(chapterId);
  const content = useChapterContent(chapterId);

  useEffect(() => {
    setCurrentChapter(chapterId);
  }, [chapterId, setCurrentChapter]);

  if (chapter.error || content.error) {
    const err = chapter.error ?? content.error;
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-sm text-destructive">
          <AlertCircle className="mx-auto h-5 w-5" />
          <p className="mt-2">加载失败：{err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    );
  }

  if (!chapter.data || content.data === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载中...
      </div>
    );
  }

  return <ChapterEditor key={chapterId} chapter={chapter.data} initialContent={content.data} />;
}

function parseInitialContent(raw: string): object | string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return parsed as object;
    }
  } catch {
    // fall through
  }
  return "";
}

function getEditorWordCount(editor: Editor, mode: Parameters<typeof countWritingText>[1]) {
  return countWritingText(editor.getText(), mode);
}

function getCurrentScopeWords(editor: Editor, mode: Parameters<typeof countWritingText>[1]) {
  const { from, to, empty, $from } = editor.state.selection;
  if (!empty) {
    const text = editor.state.doc.textBetween(from, to, " ");
    return { label: "选中" as const, words: countWritingText(text, mode) };
  }
  return { label: "本段" as const, words: countWritingText($from.parent.textContent, mode) };
}

function getCurrentAiContext(editor: Editor, chapterId: string, preferredKind?: AiPolishKind) {
  const { from, to, empty, $from } = editor.state.selection;
  if (!empty) {
    return {
      chapterId,
      source: "selection" as const,
      preferredKind,
      text: editor.state.doc.textBetween(from, to, "\n").trim(),
      from,
      to,
      capturedAt: Date.now(),
    };
  }

  const paragraphFrom = $from.start();
  const paragraphTo = $from.end();
  return {
    chapterId,
    source: "paragraph" as const,
    preferredKind,
    text: $from.parent.textContent.trim(),
    from: paragraphFrom,
    to: paragraphTo,
    capturedAt: Date.now(),
  };
}

function findTextRangeInDoc(editor: Editor, quote: string) {
  const normalizedQuote = normalizeLocateText(quote);
  if (!normalizedQuote) return null;

  const normalizedDoc = normalizeEditorTextWithPositions(editor);
  const start = normalizedDoc.text.indexOf(normalizedQuote);
  if (start < 0) return null;

  const end = start + normalizedQuote.length;
  return {
    from: normalizedDoc.positions[start].from,
    to: normalizedDoc.positions[end - 1].to,
  };
}

function normalizeLocateText(text: string) {
  return text.replace(/\s+/gu, "");
}

function normalizeEditorTextWithPositions(editor: Editor) {
  let text = "";
  const positions: Array<{ from: number; to: number }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return true;
    let localOffset = 0;
    for (const char of Array.from(node.text ?? "")) {
      const from = pos + localOffset;
      const to = from + char.length;
      localOffset += char.length;
      if (/\s/u.test(char)) continue;
      text += char;
      positions.push({ from, to });
    }
    return true;
  });
  return { text, positions };
}

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function ChapterEditor({ chapter, initialContent }: { chapter: Chapter; initialContent: string }) {
  const update = useUpdateChapterContent(chapter.projectId);
  const createRevision = useCreateChapterRevision();
  const startSession = useStartSession();
  const endSession = useEndSession(chapter.projectId);
  const setLiveWordCount = useUIStore((s) => s.setLiveWordCount);
  const setLiveScopeWords = useUIStore((s) => s.setLiveScopeWords);
  const setLiveSessionWords = useUIStore((s) => s.setLiveSessionWords);
  const setAiEditorContext = useUIStore((s) => s.setAiEditorContext);
  const aiApplyRequest = useUIStore((s) => s.aiApplyRequest);
  const clearAiApplyRequest = useUIStore((s) => s.clearAiApplyRequest);
  const aiReviewLocateRequest = useUIStore((s) => s.aiReviewLocateRequest);
  const clearAiReviewLocateRequest = useUIStore((s) => s.clearAiReviewLocateRequest);
  const setRightCollapsed = useWorkspaceStore((s) => s.setRightCollapsed);
  const editorPreferences = useUIStore((s) => s.editorPreferences);
  const wordCountMode = useUIStore((s) => s.wordCountMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [wordCount, setWordCount] = useState(chapter.wordCount);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartWordsRef = useRef<number>(chapter.wordCount);
  const currentWordsRef = useRef<number>(chapter.wordCount);
  const processedAiApplyIdRef = useRef<number | null>(null);
  const processedAiReviewLocateIdRef = useRef<number | null>(null);

  function saveNow(editorInstance: Editor | null) {
    if (!editorInstance) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const chars = getEditorWordCount(editorInstance, wordCountMode);
    currentWordsRef.current = chars;
    const json = editorInstance.getJSON();
    setSaveStatus("saving");
    update.mutate(
      {
        id: chapter.id,
        contentJson: JSON.stringify(json),
        wordCount: chars,
      },
      {
        onSuccess: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("error"),
      },
    );
  }

  function startWritingSession(startWords = currentWordsRef.current) {
    if (sessionIdRef.current || startSession.isPending) return;
    startSession.mutate(
      { projectId: chapter.projectId },
      {
        onSuccess: (session) => {
          sessionIdRef.current = session.id;
          sessionStartWordsRef.current = startWords;
          setLiveSessionWords(0);
        },
      },
    );
  }

  function endWritingSession() {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const wordsWritten = Math.max(0, currentWordsRef.current - sessionStartWordsRef.current);
    endSession.mutate({ id: sid, wordsWritten });
    sessionIdRef.current = null;
    sessionStartWordsRef.current = currentWordsRef.current;
    setLiveSessionWords(0);
  }

  function scheduleIdleSessionEnd() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      saveNow(editorRef.current);
      endWritingSession();
      idleTimer.current = null;
    }, IDLE_SESSION_END_MS);
  }

  function sendScopeToAi(editorInstance: Editor | null, preferredKind?: AiPolishKind) {
    if (!editorInstance) return;
    const context = getCurrentAiContext(editorInstance, chapter.id, preferredKind);
    if (!context.text) {
      toast.info("当前段落没有可精修的正文");
      return;
    }
    if (context.text.length > MAX_AI_TEXT_CHARS) {
      toast.info("选区较长，建议按段落分批处理");
      return;
    }
    setAiEditorContext(context);
    setRightCollapsed(false);
    toast.success(context.source === "selection" ? "已送入 AI 面板" : "已送入当前段落");
  }

  useEffect(() => {
    startWritingSession(chapter.wordCount);
    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
      saveNow(editorRef.current);
      endWritingSession();
      setLiveWordCount(null);
      setLiveScopeWords(null);
      setLiveSessionWords(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useEditor({
    extensions: [StarterKit, Underline, CharacterCount.configure({})],
    content: parseInitialContent(initialContent),
    autofocus: "end",
    editorProps: {
      attributes: {
        class: "ProseMirror mx-auto min-h-[60vh] px-8 py-8 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("pending");
      const chars = getEditorWordCount(editor, wordCountMode);
      if (!sessionIdRef.current) {
        startWritingSession(currentWordsRef.current);
      }
      setWordCount(chars);
      setLiveWordCount(chars);
      setLiveScopeWords(getCurrentScopeWords(editor, wordCountMode));
      currentWordsRef.current = chars;
      setLiveSessionWords(chars - sessionStartWordsRef.current);
      scheduleIdleSessionEnd();

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveNow(editor);
      }, AUTOSAVE_MS);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const updateScopeWords = () => setLiveScopeWords(getCurrentScopeWords(editor, wordCountMode));
    updateScopeWords();
    editor.on("selectionUpdate", updateScopeWords);
    editor.on("transaction", updateScopeWords);
    return () => {
      editor.off("selectionUpdate", updateScopeWords);
      editor.off("transaction", updateScopeWords);
    };
  }, [editor, setLiveScopeWords, wordCountMode]);

  useEffect(() => {
    if (
      !editor ||
      !aiApplyRequest ||
      aiApplyRequest.chapterId !== chapter.id ||
      processedAiApplyIdRef.current === aiApplyRequest.id
    ) {
      return;
    }
    processedAiApplyIdRef.current = aiApplyRequest.id;
    const request = aiApplyRequest;
    const beforeJson = JSON.stringify(editor.getJSON());

    createRevision.mutate(
      {
        chapterId: chapter.id,
        contentJson: beforeJson,
        wordCountDelta: 0,
        source: "ai_polish",
      },
      {
        onSuccess: () => {
          editor.chain().focus().setTextSelection({ from: request.from, to: request.to }).run();
          if (request.mode === "replace") {
            editor.chain().focus().insertContent(request.text).run();
          } else {
            editor
              .chain()
              .focus()
              .setTextSelection(request.to)
              .insertContent({
                type: "paragraph",
                content: [{ type: "text", text: request.text }],
              })
              .run();
          }

          const afterWords = getEditorWordCount(editor, wordCountMode);
          currentWordsRef.current = afterWords;
          setWordCount(afterWords);
          setLiveWordCount(afterWords);
          setLiveScopeWords(getCurrentScopeWords(editor, wordCountMode));
          setLiveSessionWords(afterWords - sessionStartWordsRef.current);
          toast.success(request.mode === "replace" ? "已替换原文" : "已插入下方");
        },
        onSettled: () => clearAiApplyRequest(request.id),
      },
    );
  }, [
    aiApplyRequest,
    chapter.id,
    clearAiApplyRequest,
    createRevision,
    editor,
    setLiveScopeWords,
    setLiveSessionWords,
    setLiveWordCount,
    wordCountMode,
  ]);

  useEffect(() => {
    if (
      !editor ||
      !aiReviewLocateRequest ||
      aiReviewLocateRequest.chapterId !== chapter.id ||
      processedAiReviewLocateIdRef.current === aiReviewLocateRequest.id
    ) {
      return;
    }
    processedAiReviewLocateIdRef.current = aiReviewLocateRequest.id;
    const request = aiReviewLocateRequest;
    const range = findTextRangeInDoc(editor, request.quote);
    if (!range) {
      toast.info("未能在正文中定位这条建议");
      clearAiReviewLocateRequest(request.id);
      return;
    }
    editor.chain().focus().setTextSelection(range).run();
    editor.commands.scrollIntoView();
    toast.success("已定位到建议原文");
    clearAiReviewLocateRequest(request.id);
  }, [aiReviewLocateRequest, chapter.id, clearAiReviewLocateRequest, editor]);

  useEffect(() => {
    if (!editor) return;
    function onKey(event: KeyboardEvent) {
      const mod = /Mac|iPhone|iPad/i.test(navigator.platform) ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === "j") {
        event.preventDefault();
        sendScopeToAi(editor);
      }
    }
    const root = editor.view.dom;
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      const chars = getEditorWordCount(editor, wordCountMode);
      setWordCount(chars);
      setLiveWordCount(chars);
      setLiveScopeWords(getCurrentScopeWords(editor, wordCountMode));
      currentWordsRef.current = chars;
      setLiveSessionWords(chars - sessionStartWordsRef.current);
    }, 0);
    return () => clearTimeout(timer);
  }, [editor, setLiveScopeWords, setLiveSessionWords, setLiveWordCount, wordCountMode]);

  useEffect(() => {
    setLiveWordCount(chapter.wordCount);
    setLiveScopeWords({ label: "本段", words: 0 });
    setLiveSessionWords(0);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMeta = STATUS_META[chapter.status];
  const editorFontClass =
    editorPreferences.fontFamily === "serif"
      ? "font-serif"
      : editorPreferences.fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <h2 className="truncate text-lg font-medium" title={chapter.title}>
          {chapter.title}
        </h2>
        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {wordCount} 字 · {WORD_COUNT_MODE_LABELS[wordCountMode]}
        </span>
        <SaveIndicator status={saveStatus} />
      </div>
      <EditorToolbar editor={editor} />
      <div
        className={cn("flex-1 overflow-auto", editorFontClass, focusMode && "wf-focus-mode")}
        style={
          {
            "--wf-editor-font-size": `${editorPreferences.fontSize}px`,
            "--wf-editor-line-height": editorPreferences.lineHeight,
            "--wf-editor-measure": `${editorPreferences.measure}px`,
          } as React.CSSProperties
        }
      >
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: "top" }}
            className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
          >
            <BubbleBtn
              active={editor.isActive("bold")}
              title="加粗"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive("italic")}
              title="斜体"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive("underline")}
              title="下划线"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive("strike")}
              title="删除线"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </BubbleBtn>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  title="AI 精修"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {AI_BUBBLE_ACTIONS.map((action) => (
                  <DropdownMenuItem
                    key={action.kind}
                    onSelect={() => sendScopeToAi(editor, action.kind)}
                    className="items-start gap-2 py-2"
                  >
                    <Wand2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{action.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function BubbleBtn({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", active && "bg-accent text-accent-foreground")}
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { icon: React.ReactNode; text: string; cls: string }> = {
    idle: { icon: null, text: "", cls: "text-muted-foreground" },
    pending: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "正在编辑",
      cls: "text-muted-foreground",
    },
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "保存中",
      cls: "text-muted-foreground",
    },
    saved: {
      icon: <Check className="h-3 w-3" />,
      text: "已保存",
      cls: "text-muted-foreground",
    },
    error: {
      icon: <AlertCircle className="h-3 w-3" />,
      text: "保存失败",
      cls: "text-destructive",
    },
  };
  const m = map[status];
  if (!m.text) return null;
  return (
    <span className={cn("flex items-center gap-1 text-xs", m.cls)}>
      {m.icon}
      {m.text}
    </span>
  );
}
