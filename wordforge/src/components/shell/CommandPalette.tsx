import { useNavigate } from "react-router";
import {
  FileText,
  History,
  LayoutDashboard,
  LayoutList,
  Search,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useCharacters } from "@/hooks/useCharacters";
import { useChapters } from "@/hooks/useChapters";
import { useOutlines } from "@/hooks/useOutlines";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

type CommandKind = "nav" | "action" | "chapter" | "character" | "outline";

type PaletteCommand = {
  id: string;
  label: string;
  detail: string | null;
  kind: CommandKind;
  targetId: string | null;
  search: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
};

const kindLabel: Record<CommandKind, string> = {
  nav: "导航",
  action: "操作",
  chapter: "章节",
  character: "角色",
  outline: "大纲",
};

const kindTone: Record<CommandKind, string> = {
  nav: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  action: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  chapter: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  character: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  outline: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setCommand = useUIStore((s) => s.setCommand);
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const setCurrentChapter = useWorkspaceStore((s) => s.setCurrentChapter);
  const setLeftPanelTab = useWorkspaceStore((s) => s.setLeftPanelTab);
  const recentCommands = useWorkspaceStore((s) => s.recentCommands);
  const pushRecentCommand = useWorkspaceStore((s) => s.pushRecentCommand);
  const navigate = useNavigate();
  const { data: chapters } = useChapters(currentProjectId);
  const { data: characters } = useCharacters(currentProjectId);
  const { data: outlines } = useOutlines(currentProjectId);

  const run = (command: PaletteCommand) => {
    setCommand(false);
    pushRecentCommand({
      id: command.id,
      label: command.label,
      detail: command.detail,
      kind: command.kind,
      targetId: command.targetId,
    });
    command.run();
  };

  const commands: PaletteCommand[] = [
    {
      id: "nav:welcome",
      label: "打开欢迎页",
      detail: null,
      kind: "nav",
      targetId: null,
      search: "打开欢迎页 welcome",
      icon: LayoutDashboard,
      run: () => navigate("/"),
    },
    {
      id: "nav:workspace",
      label: "进入写作区",
      detail: null,
      kind: "nav",
      targetId: null,
      search: "进入写作区 workspace",
      icon: FileText,
      run: () => navigate("/workspace"),
    },
    {
      id: "nav:dashboard",
      label: "打开看板",
      detail: null,
      kind: "nav",
      targetId: null,
      search: "打开看板 dashboard",
      icon: LayoutDashboard,
      shortcut: "⌘D",
      run: () => navigate("/dashboard"),
    },
    {
      id: "action:settings",
      label: "打开设置",
      detail: null,
      kind: "action",
      targetId: null,
      search: "打开设置 settings",
      icon: Settings,
      shortcut: "⌘,",
      run: toggleSettings,
    },
    {
      id: "action:search",
      label: "全文搜索",
      detail: null,
      kind: "action",
      targetId: null,
      search: "全文搜索 search",
      icon: Search,
      shortcut: "⌘⇧F",
      run: toggleSearch,
    },
    ...(chapters ?? []).slice(0, 20).map<PaletteCommand>((chapter) => ({
      id: `chapter:${chapter.id}`,
      label: chapter.title,
      detail: `${chapter.wordCount.toLocaleString()} 字`,
      kind: "chapter",
      targetId: chapter.id,
      search: `章节 ${chapter.title}`,
      icon: FileText,
      run: () => {
        setLeftPanelTab("chapters");
        setCurrentChapter(chapter.id);
        navigate(`/workspace/chapter/${chapter.id}`);
      },
    })),
    ...(characters ?? []).slice(0, 20).map<PaletteCommand>((character) => ({
      id: `character:${character.id}`,
      label: character.name,
      detail: character.roleType,
      kind: "character",
      targetId: character.id,
      search: `角色 ${character.name} ${character.alias ?? ""} ${character.roleType ?? ""}`,
      icon: UserRound,
      run: () => {
        setLeftPanelTab("characters");
        navigate("/workspace");
      },
    })),
    ...(outlines ?? []).slice(0, 20).map<PaletteCommand>((outline) => ({
      id: `outline:${outline.id}`,
      label: outline.title,
      detail: outline.status,
      kind: "outline",
      targetId: outline.id,
      search: `大纲 ${outline.title} ${outline.contentMd}`,
      icon: LayoutList,
      run: () => {
        setLeftPanelTab("outline");
        navigate("/workspace");
      },
    })),
  ];

  const commandMap = new Map(commands.map((command) => [command.id, command]));
  const visibleRecentCommands = recentCommands
    .map((item) => commandMap.get(item.id))
    .filter((item): item is PaletteCommand => item != null)
    .slice(0, 5);

  const renderCommand = (command: PaletteCommand) => {
    const Icon = command.icon;
    return (
      <CommandItem
        key={command.id}
        value={command.search}
        className="gap-3 px-2 py-2"
        onSelect={() => run(command)}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            kindTone[command.kind],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{command.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {command.detail || kindLabel[command.kind]}
          </span>
        </span>
        {command.shortcut ? (
          <CommandShortcut>{command.shortcut}</CommandShortcut>
        ) : null}
      </CommandItem>
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setCommand}
      title="命令面板"
      description="搜索命令、章节、角色和大纲"
    >
      <CommandInput placeholder="输入命令或搜索..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 px-6 py-2 text-muted-foreground">
            <Search className="h-5 w-5" />
            <span>无匹配结果</span>
          </div>
        </CommandEmpty>
        {visibleRecentCommands.length > 0 && (
          <CommandGroup heading="最近使用">
            {visibleRecentCommands.map((command) => {
              const Icon = command.icon;
              return (
                <CommandItem
                  key={`recent-${command.id}`}
                  value={`最近 ${command.search}`}
                  className="gap-3 px-2 py-2"
                  onSelect={() => run(command)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <History className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{command.label}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {command.detail || kindLabel[command.kind]}
                    </span>
                  </span>
                  <CommandShortcut className="tracking-normal">{kindLabel[command.kind]}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        <CommandGroup heading="导航">
          {commands.filter((command) => command.kind === "nav").map(renderCommand)}
        </CommandGroup>
        <CommandGroup heading="操作">
          {commands.filter((command) => command.kind === "action").map(renderCommand)}
        </CommandGroup>
        {chapters && chapters.length > 0 && (
          <CommandGroup heading="章节">
            {commands.filter((command) => command.kind === "chapter").map(renderCommand)}
          </CommandGroup>
        )}
        {characters && characters.length > 0 && (
          <CommandGroup heading="角色">
            {commands.filter((command) => command.kind === "character").map(renderCommand)}
          </CommandGroup>
        )}
        {outlines && outlines.length > 0 && (
          <CommandGroup heading="大纲">
            {commands.filter((command) => command.kind === "outline").map(renderCommand)}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
