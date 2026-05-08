import { ArrowLeft, Flame, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-heading font-bold">写作看板</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/workspace")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回写作
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                今日字数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">— / 2,000</div>
              <p className="text-xs text-muted-foreground">目标进度</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Flame className="h-4 w-4" />
                连续写作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">— 天</div>
              <p className="text-xs text-muted-foreground">streak</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                本月字数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">累计</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>30 天热力图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              TODO: F8 字数统计 + Recharts 热力图（doc/07）
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>每日字数趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              TODO: Recharts 折线图
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
