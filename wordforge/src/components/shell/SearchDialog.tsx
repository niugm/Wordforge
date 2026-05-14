import { useMemo, useState } from "react";
import { FileText, LayoutList, Search, UserRound } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore, type LeftPanelTab } from "@/store/useWorkspaceStore";

type SearchResult = {
  id: string;
  kind: "chapter" | "character" | "outline";
  title: string;
  subtitle: string;
  text: string;
  snippet: string;
  icon: React.ReactNode;
  tab: LeftPanelTab;
  chapterId?: string;
};

type SearchSource = Omit<SearchResult, "snippet">;

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  chapter: "章节",
  character: "角色",
  outline: "大纲",
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
    ];
    return haystack
      .filter((item) => item.text.toLowerCase().includes(q))
      .map((item) => ({ ...item, snippet: buildSnippet(item.text, q) }))
      .slice(0, 50);
  }, [chapters, characters, outlines, query]);

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
        <div className="min-h-32 overflow-hidden rounded-md border">
          {!currentProjectId && (
            <p className="p-4 text-sm text-muted-foreground">选择作品后可搜索。</p>
          )}
          {currentProjectId && !query.trim() && (
            <p className="p-4 text-sm text-muted-foreground">输入关键词开始搜索。</p>
          )}
          {currentProjectId && query.trim() && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">没有匹配结果。</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-96 divide-y overflow-auto">
              {results.map((result) => (
                <li key={`${result.kind}-${result.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                    onClick={() => openResult(result)}
                  >
                    <span className="text-muted-foreground">{result.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{result.title}</span>
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
                        "rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground",
                        result.kind === "chapter" && "border-blue-500/30",
                        result.kind === "character" && "border-emerald-500/30",
                        result.kind === "outline" && "border-amber-500/30",
                      )}
                    >
                      {KIND_LABEL[result.kind]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
