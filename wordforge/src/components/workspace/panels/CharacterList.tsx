import { useMemo, useState, type FormEvent } from "react";
import { LayoutGrid, List, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useCharacters,
  useCreateCharacter,
  useDeleteCharacter,
  useUpdateCharacter,
} from "@/hooks/useCharacters";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Character, CharacterInput } from "@/types/db";

type ViewMode = "cards" | "list";

const EMPTY_INPUT: CharacterInput = {
  name: "",
  alias: null,
  avatarPath: null,
  roleType: null,
  profileMd: "",
  attributesJson: "{}",
};

export function CharacterList() {
  const projectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: characters, isLoading, error } = useCharacters(projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [editing, setEditing] = useState<Character | null>(null);
  const [creating, setCreating] = useState(false);

  if (!projectId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        选择作品后可管理角色卡。
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">角色</p>
          <p className="text-xs text-muted-foreground">{characters?.length ?? 0} 个角色卡</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            title="卡片视图"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            title="列表视图"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-8 w-8"
            title="新建角色"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          加载失败：{error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">加载中...</p>}

      {!isLoading && !error && (characters?.length ?? 0) === 0 && (
        <div className="rounded-md border border-dashed px-3 py-8 text-center">
          <UserRound className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm">还没有角色</p>
          <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建角色
          </Button>
        </div>
      )}

      {characters && characters.length > 0 && (
        <div className={cn(viewMode === "cards" ? "space-y-2" : "divide-y rounded-md border")}>
          {characters.map((character) =>
            viewMode === "cards" ? (
              <CharacterCard
                key={character.id}
                character={character}
                onEdit={setEditing}
              />
            ) : (
              <CharacterRow
                key={character.id}
                character={character}
                onEdit={setEditing}
              />
            ),
          )}
        </div>
      )}

      <CharacterDialog
        projectId={projectId}
        character={creating ? null : editing}
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </div>
  );
}

function CharacterCard({
  character,
  onEdit,
}: {
  character: Character;
  onEdit: (character: Character) => void;
}) {
  return (
    <Card className="rounded-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start gap-2 text-sm">
          <Avatar character={character} />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{character.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {[character.alias, character.roleType].filter(Boolean).join(" · ") || "未设置身份"}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="编辑角色"
            onClick={() => onEdit(character)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      {character.profileMd && (
        <CardContent className="pt-0">
          <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
            {character.profileMd}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function CharacterRow({
  character,
  onEdit,
}: {
  character: Character;
  onEdit: (character: Character) => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
      onClick={() => onEdit(character)}
    >
      <Avatar character={character} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{character.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[character.alias, character.roleType].filter(Boolean).join(" · ") || "未设置身份"}
        </span>
      </span>
    </button>
  );
}

function Avatar({ character }: { character: Character }) {
  const initial = character.name.trim().slice(0, 1) || "?";
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary">
      {initial}
    </span>
  );
}

function CharacterDialog({
  projectId,
  character,
  open,
  onOpenChange,
}: {
  projectId: string;
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <CharacterForm
            key={character?.id ?? "new"}
            projectId={projectId}
            character={character}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CharacterForm({
  projectId,
  character,
  onDone,
}: {
  projectId: string;
  character: Character | null;
  onDone: () => void;
}) {
  const create = useCreateCharacter(projectId);
  const update = useUpdateCharacter(projectId);
  const remove = useDeleteCharacter(projectId);
  const initial = useMemo(() => toInput(character), [character]);
  const [input, setInput] = useState<CharacterInput>(initial);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const isPending = create.isPending || update.isPending || remove.isPending;

  function setField<K extends keyof CharacterInput>(key: K, value: CharacterInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    if (key === "attributesJson") setJsonError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeInput(input);
    try {
      JSON.parse(normalized.attributesJson);
    } catch {
      setJsonError("自定义属性必须是合法 JSON 对象，例如 {\"阵营\":\"北境\"}");
      return;
    }
    try {
      if (character) {
        await update.mutateAsync({ id: character.id, input: normalized });
      } else {
        await create.mutateAsync({ projectId, input: normalized });
      }
      onDone();
    } catch {
      // error shown via toast
    }
  }

  async function handleDelete() {
    if (!character) return;
    try {
      await remove.mutateAsync({ id: character.id });
      onDone();
    } catch {
      // error shown via toast
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{character ? "编辑角色" : "新建角色"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="姓名" htmlFor="character-name">
          <Input
            id="character-name"
            value={input.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="角色姓名"
            maxLength={80}
            autoFocus
            required
          />
        </Field>
        <Field label="别名" htmlFor="character-alias">
          <Input
            id="character-alias"
            value={input.alias ?? ""}
            onChange={(e) => setField("alias", e.target.value || null)}
            placeholder="可选"
            maxLength={120}
          />
        </Field>
        <Field label="身份" htmlFor="character-role">
          <Input
            id="character-role"
            value={input.roleType ?? ""}
            onChange={(e) => setField("roleType", e.target.value || null)}
            placeholder="主角 / 配角 / 反派..."
            maxLength={80}
          />
        </Field>
        <Field label="头像路径" htmlFor="character-avatar">
          <Input
            id="character-avatar"
            value={input.avatarPath ?? ""}
            onChange={(e) => setField("avatarPath", e.target.value || null)}
            placeholder="本地图片路径（可选）"
          />
        </Field>
      </div>

      <Field label="画像" htmlFor="character-profile">
        <Textarea
          id="character-profile"
          value={input.profileMd}
          onChange={(e) => setField("profileMd", e.target.value)}
          placeholder="外貌、性格、口吻、背景..."
          className="min-h-28"
        />
      </Field>

      <Field label="自定义属性 JSON" htmlFor="character-attrs">
        <Textarea
          id="character-attrs"
          value={input.attributesJson}
          onChange={(e) => setField("attributesJson", e.target.value)}
          className="min-h-20 font-mono text-xs"
        />
        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      </Field>

      <DialogFooter className="items-center">
        {character && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            删除
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onDone} disabled={isPending}>
          取消
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
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

function toInput(character: Character | null): CharacterInput {
  if (!character) return EMPTY_INPUT;
  return {
    name: character.name,
    alias: character.alias,
    avatarPath: character.avatarPath,
    roleType: character.roleType,
    profileMd: character.profileMd,
    attributesJson: character.attributesJson || "{}",
  };
}

function normalizeInput(input: CharacterInput): CharacterInput {
  const attrs = input.attributesJson.trim() || "{}";
  return {
    name: input.name.trim(),
    alias: input.alias?.trim() || null,
    avatarPath: input.avatarPath?.trim() || null,
    roleType: input.roleType?.trim() || null,
    profileMd: input.profileMd.trim(),
    attributesJson: attrs,
  };
}
