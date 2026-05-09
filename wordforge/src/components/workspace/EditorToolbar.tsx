import {
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = { editor: Editor | null };

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
      <HeadingButton editor={editor} level={1} label="H1" hint="一级标题" />
      <HeadingButton editor={editor} level={2} label="H2" hint="二级标题" />
      <HeadingButton editor={editor} level={3} label="H3" hint="三级标题" />

      <Divider />

      <MarkButton
        editor={editor}
        mark="bold"
        icon={Bold}
        hint="加粗 (Ctrl+B)"
        run={(e) => e.chain().focus().toggleBold().run()}
      />
      <MarkButton
        editor={editor}
        mark="italic"
        icon={Italic}
        hint="斜体 (Ctrl+I)"
        run={(e) => e.chain().focus().toggleItalic().run()}
      />
      <MarkButton
        editor={editor}
        mark="underline"
        icon={UnderlineIcon}
        hint="下划线 (Ctrl+U)"
        run={(e) => e.chain().focus().toggleUnderline().run()}
      />
      <MarkButton
        editor={editor}
        mark="strike"
        icon={Strikethrough}
        hint="删除线"
        run={(e) => e.chain().focus().toggleStrike().run()}
      />

      <Divider />

      <MarkButton
        editor={editor}
        mark="bulletList"
        icon={List}
        hint="无序列表"
        run={(e) => e.chain().focus().toggleBulletList().run()}
      />
      <MarkButton
        editor={editor}
        mark="orderedList"
        icon={ListOrdered}
        hint="有序列表"
        run={(e) => e.chain().focus().toggleOrderedList().run()}
      />

      <Divider />

      <MarkButton
        editor={editor}
        mark="blockquote"
        icon={Quote}
        hint="引用"
        run={(e) => e.chain().focus().toggleBlockquote().run()}
      />
      <MarkButton
        editor={editor}
        mark="codeBlock"
        icon={Code}
        hint="代码块"
        run={(e) => e.chain().focus().toggleCodeBlock().run()}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="水平分割线"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Divider() {
  return <Separator orientation="vertical" className="mx-1 h-5" />;
}

function HeadingButton({
  editor,
  level,
  label,
  hint,
}: {
  editor: Editor;
  level: 1 | 2 | 3;
  label: string;
  hint: string;
}) {
  const active = editor.isActive("heading", { level });
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-7 px-2 font-mono text-xs", active && "bg-accent text-accent-foreground")}
      title={hint}
      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
    >
      {label}
    </Button>
  );
}

function MarkButton({
  editor,
  mark,
  icon: Icon,
  hint,
  run,
}: {
  editor: Editor;
  mark: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  run: (editor: Editor) => void;
}) {
  const active = editor.isActive(mark);
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", active && "bg-accent text-accent-foreground")}
      title={hint}
      onClick={() => run(editor)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
