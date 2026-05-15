import { History, MessageSquareText, Sparkles } from "lucide-react";
import { IconLabel } from "@/components/ui/icon-label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiAssistant } from "@/components/workspace/panels/AiAssistant";
import { AnnotationList } from "@/components/workspace/panels/AnnotationList";
import { RevisionList } from "@/components/workspace/panels/RevisionList";
import { useUIStore } from "@/store/useUIStore";

export function RightSidebar() {
  const aiPanelTab = useUIStore((s) => s.aiPanelTab);
  const setAiPanelTab = useUIStore((s) => s.setAiPanelTab);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <Tabs
        value={aiPanelTab}
        onValueChange={(value) => setAiPanelTab(value as typeof aiPanelTab)}
        className="flex-1 overflow-hidden"
      >
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="ai" className="min-w-0 px-2">
            <IconLabel icon={Sparkles}>AI</IconLabel>
          </TabsTrigger>
          <TabsTrigger value="notes" className="min-w-0 px-2">
            <IconLabel icon={MessageSquareText}>批注</IconLabel>
          </TabsTrigger>
          <TabsTrigger value="history" className="min-w-0 px-2">
            <IconLabel icon={History}>修订</IconLabel>
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <TabsContent value="ai" className="m-0">
            <AiAssistant />
          </TabsContent>
          <TabsContent value="notes" className="m-0">
            <AnnotationList />
          </TabsContent>
          <TabsContent value="history" className="m-0">
            <RevisionList />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
