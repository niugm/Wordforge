import { useNavigate } from "react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useUIStore } from "@/store/useUIStore";

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setCommand = useUIStore((s) => s.setCommand);
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const navigate = useNavigate();

  const run = (fn: () => void) => {
    setCommand(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setCommand} title="命令面板" description="搜索命令、章节、角色">
      <CommandInput placeholder="输入命令或搜索..." />
      <CommandList>
        <CommandEmpty>无匹配结果</CommandEmpty>
        <CommandGroup heading="导航">
          <CommandItem onSelect={() => run(() => navigate("/"))}>
            打开欢迎页
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/workspace"))}>
            进入写作区
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/dashboard"))}>
            打开看板
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="操作">
          <CommandItem onSelect={() => run(toggleSettings)}>
            打开设置
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(toggleSearch)}>
            全文搜索
            <CommandShortcut>⌘⇧F</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
