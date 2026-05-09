import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiAssistant } from "@/components/workspace/panels/AiAssistant";
import { AnnotationList } from "@/components/workspace/panels/AnnotationList";
import { RevisionList } from "@/components/workspace/panels/RevisionList";

export function RightSidebar() {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <Tabs defaultValue="ai" className="flex-1 overflow-hidden">
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="notes">批注</TabsTrigger>
          <TabsTrigger value="history">修订</TabsTrigger>
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
