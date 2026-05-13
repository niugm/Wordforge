import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Underline } from "@tiptap/extension-underline";
import { BubbleMenu } from "@tiptap/react/menus";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AlertCircle, Bold, Check, Italic, Loader2, Strikethrough, Underline as UnderlineIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "@/components/workspace/EditorToolbar";
import { useChapter, useChapterContent, useUpdateChapterContent } from "@/hooks/useChapters";
import { useEndSession, useStartSession } from "@/hooks/useSessions";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import type { Chapter, ChapterStatus } from "@/types/db";

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
  const chapter = useChapter(chapterId);
  const content = useChapterContent(chapterId);

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

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function ChapterEditor({ chapter, initialContent }: { chapter: Chapter; initialContent: string }) {
  const update = useUpdateChapterContent(chapter.projectId);
  const startSession = useStartSession();
  const endSession = useEndSession(chapter.projectId);
  const setLiveWordCount = useUIStore((s) => s.setLiveWordCount);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [wordCount, setWordCount] = useState(chapter.wordCount);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartWordsRef = useRef<number>(chapter.wordCount);

  useEffect(() => {
    startSession.mutate(
      { projectId: chapter.projectId },
      {
        onSuccess: (session) => {
          sessionIdRef.current = session.id;
          sessionStartWordsRef.current = chapter.wordCount;
        },
      },
    );
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        const wordsWritten = Math.max(0, sessionStartWordsRef.current - chapter.wordCount);
        endSession.mutate({ id: sid, wordsWritten });
        sessionIdRef.current = null;
      }
      setLiveWordCount(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useEditor({
    extensions: [StarterKit, Underline, CharacterCount.configure({})],
    content: parseInitialContent(initialContent),
    autofocus: "end",
    editorProps: {
      attributes: {
        class:
          "ProseMirror min-h-[60vh] max-w-none px-8 py-8 focus:outline-none text-[15px] leading-7",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("pending");
      const chars = editor.storage.characterCount.characters() as number;
      setWordCount(chars);
      setLiveWordCount(chars);
      sessionStartWordsRef.current = chars;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const json = editor.getJSON();
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
      }, 500);
    },
  });

  useEffect(() => {
    setLiveWordCount(chapter.wordCount);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (!editor) return;
      const chars = editor.storage.characterCount.characters() as number;
      const json = editor.getJSON();
      update.mutate({
        id: chapter.id,
        contentJson: JSON.stringify(json),
        wordCount: chars,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMeta = STATUS_META[chapter.status];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <h2 className="truncate text-lg font-medium" title={chapter.title}>
          {chapter.title}
        </h2>
        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{wordCount} 字</span>
        <SaveIndicator status={saveStatus} />
      </div>
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-auto">
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
