import { useCallback, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Copy,
  Download,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { IconLabel } from "@/components/ui/icon-label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DeleteChapterAlert } from "@/components/chapters/DeleteChapterAlert";
import { MoveChapterDialog } from "@/components/chapters/MoveChapterDialog";
import { NewChapterDialog } from "@/components/chapters/NewChapterDialog";
import { RenameChapterDialog } from "@/components/chapters/RenameChapterDialog";
import {
  useChapters,
  useDuplicateChapter,
  useReorderChapters,
  useSetChapterStatus,
} from "@/hooks/useChapters";
import { useExportChapter } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Chapter, ChapterStatus } from "@/types/db";

type TreeNode = Chapter & { children: TreeNode[] };

function buildTree(chapters: Chapter[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  chapters.forEach((c) => byId.set(c.id, { ...c, children: [] }));

  const roots: TreeNode[] = [];
  chapters.forEach((c) => {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const bySort = (a: TreeNode, b: TreeNode) => a.sort - b.sort;
  roots.sort(bySort);
  byId.forEach((n) => n.children.sort(bySort));
  return roots;
}

function countDescendants(node: TreeNode): number {
  let total = node.children.length;
  for (const c of node.children) total += countDescendants(c);
  return total;
}

const STATUS_META: Record<ChapterStatus, { label: string; dotClass: string }> = {
  draft: { label: "草稿", dotClass: "bg-muted-foreground/35" },
  revising: { label: "修订中", dotClass: "bg-amber-500/90" },
  done: { label: "已完成", dotClass: "bg-emerald-500/90" },
};

export function ChapterTree() {
  const navigate = useNavigate();
  const projectId = useWorkspaceStore((s) => s.currentProjectId);
  const currentChapterId = useWorkspaceStore((s) => s.currentChapterId);
  const setCurrentChapter = useWorkspaceStore((s) => s.setCurrentChapter);

  const { data: chapters, isLoading, error } = useChapters(projectId);
  const reorder = useReorderChapters(projectId ?? "");
  const duplicate = useDuplicateChapter(projectId ?? "");
  const exportChapter = useExportChapter();

  const tree = useMemo(() => buildTree(chapters ?? []), [chapters]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createTarget, setCreateTarget] = useState<{
    parentId: string | null;
    parentTitle: string | null;
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<TreeNode | null>(null);
  const [moveTarget, setMoveTarget] = useState<TreeNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openChapter(node: TreeNode) {
    setCurrentChapter(node.id);
    navigate(`/workspace/chapter/${node.id}`);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const siblingsOf = useCallback(
    (parentId: string | null): Chapter[] =>
      (chapters ?? [])
        .filter((c) => (c.parentId ?? null) === parentId)
        .sort((a, b) => a.sort - b.sort),
    [chapters],
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = chapters?.find((c) => c.id === active.id);
    const b = chapters?.find((c) => c.id === over.id);
    if (!a || !b) return;
    const aParent = a.parentId ?? null;
    const bParent = b.parentId ?? null;
    if (aParent !== bParent) return;

    const siblings = siblingsOf(aParent);
    const oldIdx = siblings.findIndex((c) => c.id === a.id);
    const newIdx = siblings.findIndex((c) => c.id === b.id);
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;

    const next = arrayMove(siblings, oldIdx, newIdx);
    reorder.mutate({
      items: next.map((c, idx) => ({ id: c.id, sort: idx })),
    });
  }

  const moveSibling = useCallback(
    (id: string, direction: "up" | "down") => {
      const target = chapters?.find((c) => c.id === id);
      if (!target) return;
      const siblings = siblingsOf(target.parentId ?? null);
      const idx = siblings.findIndex((c) => c.id === id);
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || newIdx < 0 || newIdx >= siblings.length) return;
      const next = arrayMove(siblings, idx, newIdx);
      reorder.mutate({
        items: next.map((c, i) => ({ id: c.id, sort: i })),
      });
    },
    [chapters, siblingsOf, reorder],
  );

  if (!projectId) {
    return (
      <div className="space-y-2 p-4 text-sm">
        <p className="text-muted-foreground">未选择作品</p>
        <Button variant="link" className="h-auto p-0" onClick={() => navigate("/")}>
          返回作品列表
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-2 py-1.5">
        <IconLabel
          icon={BookOpen}
          className="text-xs font-medium text-muted-foreground"
          iconClassName="h-3.5 w-3.5"
        >
          章节（{chapters?.length ?? 0}）
        </IconLabel>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="新建章节"
          onClick={() => setCreateTarget({ parentId: null, parentTitle: null })}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="px-3 py-2 text-xs text-destructive">
          加载失败：{error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">加载中...</p>}

      {!isLoading && !error && tree.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">还没有章节</p>
          <Button size="sm" onClick={() => setCreateTarget({ parentId: null, parentTitle: null })}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建第一章
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tree.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <ul className="select-none">
            {tree.map((node) => (
              <ChapterNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                currentChapterId={currentChapterId}
                onToggle={toggleExpand}
                onOpen={openChapter}
                onAddChild={(n) => setCreateTarget({ parentId: n.id, parentTitle: n.title })}
                onRename={setRenameTarget}
                onMove={setMoveTarget}
                onDelete={setDeleteTarget}
                onMoveSibling={moveSibling}
                onDuplicate={(node) =>
                  duplicate.mutate(
                    { id: node.id },
                    {
                      onSuccess: (chapter) => {
                        setCurrentChapter(chapter.id);
                        navigate(`/workspace/chapter/${chapter.id}`);
                      },
                    },
                  )
                }
                onExport={(node, format) => exportChapter.mutate({ chapterId: node.id, format })}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <NewChapterDialog
        open={!!createTarget}
        onOpenChange={(open) => !open && setCreateTarget(null)}
        projectId={projectId}
        parentId={createTarget?.parentId ?? null}
        parentTitle={createTarget?.parentTitle ?? null}
        onCreated={(id) => {
          if (createTarget?.parentId) {
            setExpanded((prev) => new Set(prev).add(createTarget.parentId!));
          }
          setCurrentChapter(id);
          navigate(`/workspace/chapter/${id}`);
        }}
      />
      <RenameChapterDialog
        chapter={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <DeleteChapterAlert
        chapter={deleteTarget}
        childCount={deleteTarget ? countDescendants(deleteTarget) : 0}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={(id) => {
          if (currentChapterId === id) {
            setCurrentChapter(null);
            navigate("/workspace");
          }
        }}
      />
      <MoveChapterDialog
        chapter={moveTarget}
        chapters={chapters ?? []}
        projectId={projectId}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      />
    </div>
  );
}

type NodeProps = {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  currentChapterId: string | null;
  onToggle: (id: string) => void;
  onOpen: (node: TreeNode) => void;
  onAddChild: (node: TreeNode) => void;
  onRename: (node: TreeNode) => void;
  onMove: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onDuplicate: (node: TreeNode) => void;
  onExport: (node: TreeNode, format: "markdown" | "plainText") => void;
  onMoveSibling: (id: string, direction: "up" | "down") => void;
};

function ChapterNode({
  node,
  depth,
  expanded,
  currentChapterId,
  onToggle,
  onOpen,
  onAddChild,
  onRename,
  onMove,
  onDelete,
  onDuplicate,
  onExport,
  onMoveSibling,
}: NodeProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isCurrent = currentChapterId === node.id;
  const statusMeta = STATUS_META[node.status];
  const ChapterIcon = hasChildren ? (isOpen ? FolderOpen : Folder) : FileText;
  const setStatus = useSetChapterStatus(node.projectId);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();
      onMoveSibling(node.id, e.key === "ArrowUp" ? "up" : "down");
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(node);
    }
  }

  return (
    <li ref={setNodeRef} style={style}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "group relative flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm outline-none transition-colors hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring/40",
              isCurrent && "bg-accent/80 text-accent-foreground shadow-sm",
              isDragging && "bg-accent/60",
            )}
            style={{ marginLeft: 4 + depth * 14, paddingLeft: 6 }}
            onClick={() => onOpen(node)}
            onKeyDown={handleKeyDown}
          >
            <button
              type="button"
              className={cn(
                "flex h-4 w-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/35 opacity-0 transition-opacity hover:bg-background/70 hover:text-foreground group-hover:opacity-100 active:cursor-grabbing",
                isCurrent && "opacity-60",
              )}
              aria-label="拖拽排序"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            {hasChildren ? (
              <button
                type="button"
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                aria-label={isOpen ? "折叠" : "展开"}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}

            <ChapterIcon
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground/80",
                hasChildren && "text-muted-foreground",
                isCurrent && "text-foreground",
              )}
            />

            <span className="min-w-0 flex-1 truncate" title={node.title}>
              {node.title}
            </span>

            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full ring-2 ring-background",
                statusMeta.dotClass,
              )}
              title={statusMeta.label}
              aria-label={`状态：${statusMeta.label}`}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={() => onAddChild(node)}>
            <Plus className="mr-2 h-4 w-4" />
            新建子章节
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onRename(node)}>
            <Pencil className="mr-2 h-4 w-4" />
            重命名
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onMove(node)}>
            <FolderOpen className="mr-2 h-4 w-4" />
            移动到...
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onDuplicate(node)}>
            <Copy className="mr-2 h-4 w-4" />
            复制章节
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Download className="mr-2 h-4 w-4" />
              导出章节
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onSelect={() => onExport(node, "markdown")}>
                Markdown
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onExport(node, "plainText")}>
                纯文本
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <CircleDot className="mr-2 h-4 w-4" />
              修改状态
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {(Object.keys(STATUS_META) as ChapterStatus[]).map((s) => (
                <ContextMenuItem
                  key={s}
                  onSelect={() => setStatus.mutate({ id: node.id, status: s })}
                  disabled={node.status === s}
                >
                  {node.status === s ? (
                    <CircleCheck className="mr-2 h-4 w-4 text-primary" />
                  ) : (
                    <span className="mr-2 inline-block h-4 w-4" />
                  )}
                  {STATUS_META[s].label}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => onMoveSibling(node.id, "up")} disabled={isDragging}>
            上移（Alt+↑）
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onMoveSibling(node.id, "down")} disabled={isDragging}>
            下移（Alt+↓）
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => onDelete(node)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && isOpen && (
        <SortableContext
          items={node.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul>
            {node.children.map((child) => (
              <ChapterNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                currentChapterId={currentChapterId}
                onToggle={onToggle}
                onOpen={onOpen}
                onAddChild={onAddChild}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onExport={onExport}
                onMoveSibling={onMoveSibling}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </li>
  );
}
