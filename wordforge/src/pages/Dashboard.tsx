import { ArrowLeft, Flame, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyWords, useWritingStats } from "@/hooks/useSessions";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const TODAY = new Date().toISOString().slice(0, 10);

export function Dashboard() {
  const navigate = useNavigate();
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: stats } = useWritingStats(currentProjectId);
  const { data: daily } = useDailyWords(currentProjectId, 30);

  const dailyMap = new Map(daily?.map((d) => [d.day, d.words]) ?? []);
  const heatData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: key, words: dailyMap.get(key) ?? 0 };
  });

  const maxWords = Math.max(...heatData.map((d) => d.words), 1);

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
              <div className="text-2xl font-bold">
                {stats?.todayWords.toLocaleString() ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground">当日累计</p>
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
              <div className="text-2xl font-bold">
                {stats != null ? `${stats.streak} 天` : "— 天"}
              </div>
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
              <div className="text-2xl font-bold">
                {stats?.monthWords.toLocaleString() ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground">累计</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>30 天热力图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {heatData.map(({ day, words }) => {
                const intensity = words === 0 ? 0 : Math.ceil((words / maxWords) * 4);
                const bg = [
                  "bg-muted",
                  "bg-emerald-900",
                  "bg-emerald-700",
                  "bg-emerald-500",
                  "bg-emerald-400",
                ][intensity];
                return (
                  <div
                    key={day}
                    title={`${day}：${words} 字`}
                    className={`h-7 w-7 rounded-sm ${bg} ${day === TODAY ? "ring-1 ring-primary" : ""}`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>每日字数趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={heatData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 10 }}
                  interval={4}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" width={36} />
                <Tooltip
                  formatter={(v) => [`${v ?? 0} 字`, "字数"]}
                  labelFormatter={(l) => String(l)}
                />
                <Bar dataKey="words" radius={[2, 2, 0, 0]}>
                  {heatData.map(({ day, words }) => (
                    <Cell
                      key={day}
                      fill={words === 0 ? "var(--muted)" : day === TODAY ? "var(--primary)" : "var(--chart-1, #10b981)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
