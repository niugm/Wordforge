import { useState } from "react";
import { ArrowLeft, CalendarDays, Flame, Target, TrendingUp } from "lucide-react";
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
import { useChapters } from "@/hooks/useChapters";
import { useProjects } from "@/hooks/useProjects";
import { useDailyWords, useWritingStats } from "@/hooks/useSessions";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const TODAY = new Date().toISOString().slice(0, 10);
const HEAT_RANGES = [30, 90, 365] as const;
type HeatRange = (typeof HEAT_RANGES)[number];

export function Dashboard() {
  const [heatRange, setHeatRange] = useState<HeatRange>(30);
  const navigate = useNavigate();
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: projects } = useProjects();
  const { data: chapters } = useChapters(currentProjectId);
  const { data: stats } = useWritingStats(currentProjectId);
  const { data: daily } = useDailyWords(currentProjectId, heatRange);
  const currentProject = projects?.find((p) => p.id === currentProjectId);
  const totalWords = chapters?.reduce((sum, chapter) => sum + chapter.wordCount, 0) ?? 0;
  const targetWords = currentProject?.targetWordCount ?? 0;
  const targetProgress = targetWords > 0 ? Math.min(100, Math.round((totalWords / targetWords) * 100)) : 0;

  const dailyMap = new Map(daily?.map((d) => [d.day, d.words]) ?? []);
  const heatData = Array.from({ length: heatRange }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (heatRange - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: key, words: dailyMap.get(key) ?? 0 };
  });

  const maxWords = Math.max(...heatData.map((d) => d.words), 1);
  const chartInterval = heatRange === 30 ? 4 : heatRange === 90 ? 14 : 45;
  const heatCellSize = heatRange === 30 ? "h-7 w-7" : heatRange === 90 ? "h-4 w-4" : "h-3 w-3";

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

        <div className="grid gap-4 md:grid-cols-4">
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
                <CalendarDays className="h-4 w-4" />
                本周字数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.weekWords.toLocaleString() ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground">周一至今</p>
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
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              作品目标
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold">{totalWords.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {targetWords > 0 ? `目标 ${targetWords.toLocaleString()} 字` : "未设置目标字数"}
                  </p>
                </div>
                <div className="text-right text-sm font-medium">
                  {targetWords > 0 ? `${targetProgress}%` : "—"}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: targetWords > 0 ? `${targetProgress}%` : "0%" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{heatRange} 天热力图</CardTitle>
            <div className="flex rounded-md border bg-background p-0.5">
              {HEAT_RANGES.map((range) => (
                <Button
                  key={range}
                  type="button"
                  size="sm"
                  variant={heatRange === range ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setHeatRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
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
                    className={`${heatCellSize} rounded-sm ${bg} ${day === TODAY ? "ring-1 ring-primary" : ""}`}
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
                  interval={chartInterval}
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
