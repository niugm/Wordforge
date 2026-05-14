import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateOutline,
  useDeleteOutline,
  useMoveOutline,
  useOutlines,
  useReorderOutlines,
  useUpdateOutline,
} from "@/hooks/useOutlines";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { OutlineInput, OutlineNode, OutlineStatus } from "@/types/db";

type TreeNode = OutlineNode & { children: TreeNode[] };

const STATUS_META: Record<OutlineStatus, { label: string; dotClass: string }> = {
  idea: { label: "构思", dotClass: "bg-muted-foreground/40" },
  drafting: { label: "撰写中", dotClass: "bg-amber-500" },
  done: { label: "已完成", dotClass: "bg-emerald-500" },
};

function buildTree(nodes: OutlineNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  nodes.forEach((node) => byId.set(node.id, { ...node, children: [] }));

  const roots: TreeNode[] = [];
  nodes.forEach((node) => {
    const treeNode = byId.get(node.id)!;
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  });

  const bySort = (a: TreeNode, b: TreeNode) => a.sort - b.sort || a.title.localeCompare(b.title);
  roots.sort(bySort);
  byId.forEach((node) => node.children.sort(bySort));
  return roots;
}

function collectDescendantIds(id: string, all: OutlineNode[]): Set<string> {
  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of all) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

function buildFlat(parentId: string | null, available: OutlineNode[], depth: number): Array<{ node: OutlineNode; depth: number }> {
  const children = available
    .filter((node) => (node.parentId ?? null) === parentId)
    .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  return children.flatMap((node) => [{ node, depth }, ...buildFlat(node.id, available, depth + 1)]);
}

export function OutlineTree() {
  const projectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: outlines, isLoading, error } = useOutlines(projectId);
  const reorder = useReorderOutlines(projectId ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<OutlineNode | null>(null);
  const [createTarget, setCreateTarget] = useState<{ parentId: string | null; parentTitle: string | null } | null>(null);
  const [moveTarget, setMoveTarget] = useState<OutlineNode | null>(null);

  const tree = useMemo(() => buildTree(outlines ?? []), [outlines]);
  const siblingsOf = useCallback(
    (parentId: string | null): OutlineNode[] =>
      (outlines ?? [])
        .filter((node) => (node.parentId ?? null) === parentId)
        .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title)),
    [outlines],
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveSibling(id: string, direction: "up" | "down") {
    const target = outlines?.find((node) => node.id === id);
    if (!target) return;
    const siblings = siblingsOf(target.parentId ?? null);
    const idx = siblings.findIndex((node) => node.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || newIdx < 0 || newIdx >= siblings.length) return;
    const next = [...siblings];
    const [item] = next.splice(idx, 1);
    next.splice(newIdx, 0, item);
    reorder.mutate({ items: next.map((node, sort) => ({ id: node.id, sort })) });
  }

  if (!projectId) {
    return <div className="p-4 text-sm text-muted-foreground">选择作品后可管理大纲。</div>;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground">
          大纲（{outlines?.length ?? 0}）
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="新建大纲节点"
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
          <p className="text-sm text-muted-foreground">还没有大纲节点</p>
          <Button size="sm" onClick={() => setCreateTarget({ parentId: null, parentTitle: null })}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建大纲
          </Button>
        </div>
      )}

      <ul className="select-none">
        {tree.map((node) => (
          <OutlineTreeNode
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggleExpand}
            onAddChild={(target) => setCreateTarget({ parentId: target.id, parentTitle: target.title })}
            onEdit={setEditTarget}
            onMove={setMoveTarget}
            onMoveSibling={moveSibling}
          />
        ))}
      </ul>

      <OutlineDialog
        projectId={projectId}
        parentId={createTarget?.parentId ?? null}
        parentTitle={createTarget?.parentTitle ?? null}
        node={editTarget}
        open={!!createTarget || !!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null);
            setEditTarget(null);
          }
        }}
        onCreated={(id) => {
          if (createTarget?.parentId) {
            setExpanded((prev) => new Set(prev).add(createTarget.parentId!));
          }
          setExpanded((prev) => new Set(prev).add(id));
        }}
      />

      <MoveOutlineDialog
        projectId={projectId}
        node={moveTarget}
        outlines={outlines ?? []}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      />
    </div>
  );
}

function OutlineTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onAddChild,
  onEdit,
  onMove,
  onMoveSibling,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (node: TreeNode) => void;
  onEdit: (node: TreeNode) => void;
  onMove: (node: TreeNode) => void;
  onMoveSibling: (id: string, direction: "up" | "down") => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const statusMeta = STATUS_META[node.status];
  const deleteOutline = useDeleteOutline(node.projectId);

  return (
    <li>
      <div
        className="group flex items-center gap-1 px-2 py-1 text-sm hover:bg-accent"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? "折叠" : "展开"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left"
          title={node.title}
          onClick={() => onEdit(node)}
        >
          {node.title}
        </button>
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", statusMeta.dotClass)}
          title={statusMeta.label}
          aria-label={`状态：${statusMeta.label}`}
        />
        <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-6 w-6" title="新建子节点" onClick={() => onAddChild(node)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" title="编辑" onClick={() => onEdit(node)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="ml-8 hidden gap-1 px-2 pb-1 group-hover:flex">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onMoveSibling(node.id, "up")}>
          上移
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onMoveSibling(node.id, "down")}>
          下移
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onMove(node)}>
          移动
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          onClick={() => deleteOutline.mutate({ id: node.id })}
        >
          删除
        </Button>
      </div>

      {hasChildren && isOpen && (
        <ul>
          {node.children.map((child) => (
            <OutlineTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onMove={onMove}
              onMoveSibling={onMoveSibling}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function OutlineDialog({
  projectId,
  parentId,
  parentTitle,
  node,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  parentId: string | null;
  parentTitle: string | null;
  node: OutlineNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const create = useCreateOutline(projectId);
  const update = useUpdateOutline(projectId);
  const [input, setInput] = useState<OutlineInput>(() =>
    node
      ? { title: node.title, contentMd: node.contentMd, status: node.status }
      : { title: "", contentMd: "", status: "idea" },
  );
  const isPending = create.isPending || update.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized: OutlineInput = {
      title: input.title.trim(),
      contentMd: input.contentMd.trim(),
      status: input.status,
    };
    try {
      if (node) {
        await update.mutateAsync({ id: node.id, input: normalized });
      } else {
        const created = await create.mutateAsync({ projectId, parentId, input: normalized });
        onCreated(created.id);
      }
      onOpenChange(false);
    } catch {
      // error shown via toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{node ? "编辑大纲节点" : parentTitle ? `新建「${parentTitle}」子节点` : "新建大纲节点"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="标题" htmlFor="outline-title">
              <Input
                id="outline-title"
                value={input.title}
                onChange={(e) => setInput((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="节点标题"
                maxLength={120}
                required
                autoFocus
              />
            </Field>
            <Field label="状态" htmlFor="outline-status">
              <select
                id="outline-status"
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={input.status}
                onChange={(e) => setInput((prev) => ({ ...prev, status: e.target.value as OutlineStatus }))}
              >
                {(Object.keys(STATUS_META) as OutlineStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="内容" htmlFor="outline-content">
              <Textarea
                id="outline-content"
                value={input.contentMd}
                onChange={(e) => setInput((prev) => ({ ...prev, contentMd: e.target.value }))}
                placeholder="情节、场景、冲突、伏笔..."
                className="min-h-32"
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoveOutlineDialog({
  projectId,
  node,
  outlines,
  onOpenChange,
}: {
  projectId: string;
  node: OutlineNode | null;
  outlines: OutlineNode[];
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedParentId, setSelectedParentId] = useState<string | null | undefined>(undefined);
  const move = useMoveOutline(projectId);
  const { available, flatList } = useMemo(() => {
    if (!node) return { available: [], flatList: [] };
    const excluded = collectDescendantIds(node.id, outlines);
    const availableNodes = outlines.filter((item) => !excluded.has(item.id));
    return { available: availableNodes, flatList: buildFlat(null, availableNodes, 0) };
  }, [node, outlines]);
  const currentParentId = node?.parentId ?? null;
  const effectiveSelected = selectedParentId === undefined ? currentParentId : selectedParentId;
  const unchanged = selectedParentId === undefined || selectedParentId === currentParentId;

  async function handleConfirm() {
    if (!node || selectedParentId === undefined) return;
    const siblings = outlines.filter(
      (item) => (item.parentId ?? null) === selectedParentId && item.id !== node.id,
    );
    const sort = siblings.length > 0 ? Math.max(...siblings.map((item) => item.sort)) + 1 : 0;
    try {
      await move.mutateAsync({ id: node.id, parentId: selectedParentId, sort });
      onOpenChange(false);
    } catch {
      // error shown via toast
    }
  }

  return (
    <Dialog open={!!node} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>移动「{node?.title}」到...</DialogTitle>
        </DialogHeader>

        <div className="max-h-72 overflow-auto rounded-md border p-1">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent",
              effectiveSelected === null && "bg-accent font-medium",
            )}
            onClick={() => setSelectedParentId(null)}
          >
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            顶层（无父节点）
          </button>
          {flatList.map(({ node: item, depth }) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-accent",
                effectiveSelected === item.id && "bg-accent font-medium",
              )}
              style={{ paddingLeft: 12 + depth * 14 }}
              onClick={() => setSelectedParentId(item.id)}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.title}</span>
            </button>
          ))}
          {available.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">没有可选的目标位置</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={move.isPending}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={unchanged || move.isPending}>
            {move.isPending ? "移动中..." : "移动"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
