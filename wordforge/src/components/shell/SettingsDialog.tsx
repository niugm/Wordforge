import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIStore } from "@/store/useUIStore";

export function SettingsDialog() {
  const open = useUIStore((s) => s.settingsOpen);
  const setSettings = useUIStore((s) => s.setSettings);

  return (
    <Dialog open={open} onOpenChange={setSettings}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>外观 / AI / 备份 / 字数计数</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="appearance">
          <TabsList>
            <TabsTrigger value="appearance">外观</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="backup">备份</TabsTrigger>
            <TabsTrigger value="counting">字数</TabsTrigger>
          </TabsList>
          <TabsContent value="appearance" className="py-4 text-sm text-muted-foreground">
            TODO: F12 设置 — 主题、字体族、字号、行高
          </TabsContent>
          <TabsContent value="ai" className="py-4 text-sm text-muted-foreground">
            TODO: F12 设置 — provider 配置（OpenAI / Anthropic / Gemini）、密钥、base_url、模型
          </TabsContent>
          <TabsContent value="backup" className="py-4 text-sm text-muted-foreground">
            TODO: F14 自动备份 — 备份目录、自动备份开关
          </TabsContent>
          <TabsContent value="counting" className="py-4 text-sm text-muted-foreground">
            TODO: F8 字数 — 中英文计数模式、是否计空格/标点
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
