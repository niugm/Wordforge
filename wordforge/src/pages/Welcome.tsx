import { FilePlus, FolderOpen, Feather } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mockRecentProjects = [
  { id: "p1", name: "雾起小说", lastOpenedAt: "2026-05-08", wordCount: 32100 },
  { id: "p2", name: "短篇集 · 春", lastOpenedAt: "2026-04-29", wordCount: 12480 },
  { id: "p3", name: "剧本：夜行者", lastOpenedAt: "2026-04-15", wordCount: 8650 },
];

export function Welcome() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <div className="flex flex-col items-center gap-3">
        <Feather className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-heading font-bold tracking-tight">Wordforge</h1>
        <p className="text-muted-foreground text-sm">本地优先的桌面写作工坊</p>
      </div>

      <div className="flex gap-3">
        <Button size="lg" onClick={() => navigate("/workspace")}>
          <FilePlus className="mr-2 h-4 w-4" />
          新建作品
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/workspace")}>
          <FolderOpen className="mr-2 h-4 w-4" />
          打开作品
        </Button>
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">最近作品</h2>
        <div className="grid gap-2">
          {mockRecentProjects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer p-4 transition-colors hover:bg-accent"
              onClick={() => navigate("/workspace")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">最近打开 {p.lastOpenedAt}</div>
                </div>
                <div className="text-sm text-muted-foreground">{p.wordCount.toLocaleString()} 字</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        TODO: F1 项目管理（doc/07） · 当前为占位 mock 数据
      </p>
    </main>
  );
}
