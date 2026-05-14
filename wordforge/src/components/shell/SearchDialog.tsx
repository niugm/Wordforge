import { useMemo, useState } from "react";
import {
  FileSearch,
  FileText,
  LayoutList,
  Loader2,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCharacters } from "@/hooks/useCharacters";
import { useChapters } from "@/hooks/useChapters";
import { useOutlines } from "@/hooks/useOutlines";
import { useChapterBodySearch } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore, type LeftPanelTab } from "@/store/useWorkspaceStore";

type SearchResult = {
  id: string;
  kind: "chapter" | "chapterBody" | "character" | "outline";
  title: string;
  subtitle: string;
  text: string;
  snippet: string;
  icon: React.ReactNode;
  tab: LeftPanelTab;
  chapterId?: string;
};

type SearchSource = Omit<SearchResult, "snippet"> & { snippet?: string };

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  chapter: "章节",
  chapterBody: "正文",
  character: "角色",
  outline: "大纲",
};

const RESULT_GROUPS: Array<{ kind: SearchResult["kind"]; label: string; icon: LucideIcon }> = [
  { kind: "chapter", label: "章节", icon: FileText },
  { kind: "chapterBody", label: "正文", icon: FileSearch },
  { kind: "character", label: "角色", icon: UserRound },
  { kind: "outline", label: "大纲", icon: LayoutList },
];

const KIND_TONE: Record<SearchResult["kind"], string> = {
  chapter: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  chapterBody: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  character: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  outline: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export function SearchDialog() {
  const open = useUIStore((s) => s.searchOpen);
  const setSearch = useUIStore((s) => s.setSearch);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const setCurrentChapter = useWorkspaceStore((s) => s.setCurrentChapter);
  const setLeftPanelTab = useWorkspaceStore((s) => s.setLeftPanelTab);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: chapters } = useChapters(currentProjectId);
  const { data: characters } = useCharacters(currentProjectId);
  const { data: outlines } = useOutlines(currentProjectId);
  const { data: bodyResults, isFetching: bodySearching } = useChapterBodySearch(
    currentProjectId,
    query,
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const haystack: SearchSource[] = [
      ...(chapters ?? []).map((chapter) => ({
        id: chapter.id,
        kind: "chapter" as const,
        title: chapter.title,
        subtitle: `${chapter.wordCount.toLocaleString()} 字`,
        text: `${chapter.title} ${chapter.summary ?? ""} ${chapter.status}`,
        icon: <FileText className="h-4 w-4" />,
        tab: "chapters" as const,
        chapterId: chapter.id,
      })),
      ...(characters ?? []).map((character) => ({
        id: character.id,
        kind: "character" as const,
        title: character.name,
        subtitle: [character.alias, character.roleType].filter(Boolean).join(" · ") || "角色卡",
        text: `${character.name} ${character.alias ?? ""} ${character.roleType ?? ""} ${character.profileMd} ${character.attributesJson}`,
        icon: <UserRound className="h-4 w-4" />,
        tab: "characters" as const,
      })),
      ...(outlines ?? []).map((outline) => ({
        id: outline.id,
        kind: "outline" as const,
        title: outline.title,
        subtitle: KIND_LABEL.outline,
        text: `${outline.title} ${outline.contentMd} ${outline.status}`,
        icon: <LayoutList className="h-4 w-4" />,
        tab: "outline" as const,
      })),
      ...(bodyResults ?? []).map((result) => ({
        id: `body-${result.chapterId}`,
        kind: "chapterBody" as const,
        title: result.title,
        subtitle: "正文命中",
        text: stripMarkup(result.snippet),
        snippet: stripMarkup(result.snippet),
        icon: <FileSearch className="h-4 w-4" />,
        tab: "chapters" as const,
        chapterId: result.chapterId,
      })),
    ];
    return haystack
      .filter((item) => item.text.toLowerCase().includes(q))
      .map((item) => ({ ...item, snippet: item.snippet || buildSnippet(item.text, q) }))
      .slice(0, 50);
  }, [bodyResults, chapters, characters, outlines, query]);

  function openResult(result: SearchResult) {
    setSearch(false);
    setLeftPanelTab(result.tab);
    if (result.chapterId) {
      setCurrentChapter(result.chapterId);
      navigate(`/workspace/chapter/${result.chapterId}`);
    } else {
      navigate("/workspace");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setSearch}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>全文搜索</DialogTitle>
          <DialogDescription>搜索当前作品的章节标题、角色卡和大纲节点</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词..."
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="min-h-40 overflow-hidden rounded-md border bg-background">
          {!currentProjectId && (
            <SearchEmpty icon={FileText} title="选择作品后可搜索" />
          )}
          {currentProjectId && !query.trim() && (
            <SearchEmpty icon={Search} title="输入关键词开始搜索" />
          )}
          {currentProjectId && query.trim() && results.length === 0 && (
            <SearchEmpty
              icon={bodySearching ? Loader2 : Search}
              title={bodySearching ? "搜索中..." : "没有匹配结果"}
              spinning={bodySearching}
            />
          )}
          {results.length > 0 && (
            <SearchResultGroups results={results} query={query} onOpen={openResult} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchResultGroups({
  results,
  query,
  onOpen,
}: {
  results: SearchResult[];
  query: string;
  onOpen: (result: SearchResult) => void;
}) {
  return (
    <ul className="max-h-96 divide-y overflow-auto">
      {RESULT_GROUPS.map((group) => {
        const groupResults = results.filter((result) => result.kind === group.kind);
        if (groupResults.length === 0) return null;
        const GroupIcon = group.icon;
        return (
          <li key={group.kind} className="py-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <GroupIcon className="h-3.5 w-3.5" />
              <span>{group.label}</span>
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                {groupResults.length}
              </span>
            </div>
            <ul>
              {groupResults.map((result) => (
                <SearchResultItem
                  key={`${result.kind}-${result.id}`}
                  result={result}
                  query={query}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function SearchResultItem({
  result,
  query,
  onOpen,
}: {
  result: SearchResult;
  query: string;
  onOpen: (result: SearchResult) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/70 focus-visible:bg-accent focus-visible:outline-none"
        onClick={() => onOpen(result)}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
            KIND_TONE[result.kind],
          )}
        >
          {result.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{result.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {KIND_LABEL[result.kind]} · {result.subtitle}
          </span>
          {result.snippet && (
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              <HighlightedText text={result.snippet} query={query} />
            </span>
          )}
        </span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 text-[10px]",
            KIND_TONE[result.kind],
          )}
        >
          {KIND_LABEL[result.kind]}
        </span>
      </button>
    </li>
  );
}

function SearchEmpty({
  icon: Icon,
  title,
  spinning = false,
}: {
  icon: LucideIcon;
  title: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
        <Icon className={cn("h-4 w-4", spinning && "animate-spin")} />
      </span>
      <span>{title}</span>
    </div>
  );
}

function buildSnippet(text: string, query: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const index = normalized.toLowerCase().indexOf(query);
  if (index < 0) return normalized.slice(0, 60);
  const start = Math.max(0, index - 30);
  const end = Math.min(normalized.length, index + query.length + 30);
  return `${start > 0 ? "..." : ""}${normalized.slice(start, end)}${end < normalized.length ? "..." : ""}`;
}

function stripMarkup(text: string) {
  return text.replace(/<\/?mark>/g, "");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match = lowerText.indexOf(lowerQuery);

  while (match >= 0) {
    if (match > cursor) {
      parts.push(text.slice(cursor, match));
    }
    parts.push(
      <mark key={`${match}-${q}`} className="rounded bg-primary/20 px-0.5 text-foreground">
        {text.slice(match, match + q.length)}
      </mark>,
    );
    cursor = match + q.length;
    match = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}
