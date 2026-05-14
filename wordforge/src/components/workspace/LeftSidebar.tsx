import { ArrowLeftRight, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterTree } from "@/components/workspace/panels/ChapterTree";
import { CharacterList } from "@/components/workspace/panels/CharacterList";
import { OutlineTree } from "@/components/workspace/panels/OutlineTree";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function LeftSidebar() {
  const navigate = useNavigate();
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const setCurrentProject = useWorkspaceStore((s) => s.setCurrentProject);
  const leftPanelTab = useWorkspaceStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useWorkspaceStore((s) => s.setLeftPanelTab);

  function switchProject() {
    setCurrentProject(null);
    navigate("/");
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <Tabs
        value={leftPanelTab}
        onValueChange={(value) => setLeftPanelTab(value as typeof leftPanelTab)}
        className="flex-1 overflow-hidden"
      >
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="chapters">章节</TabsTrigger>
          <TabsTrigger value="characters">角色</TabsTrigger>
          <TabsTrigger value="outline">大纲</TabsTrigger>
        </TabsList>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <TabsContent value="chapters" className="m-0">
            <ChapterTree />
          </TabsContent>
          <TabsContent value="characters" className="m-0">
            <CharacterList />
          </TabsContent>
          <TabsContent value="outline" className="m-0">
            <OutlineTree />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <Separator />
      <div className="flex items-center justify-between p-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={switchProject}>
          <ArrowLeftRight className="h-3.5 w-3.5" />
          切换作品
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
