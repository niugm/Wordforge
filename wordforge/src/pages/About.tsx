import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Wordforge — 桌面端词汇学习工具。Phase 1 脚手架就绪。
      </p>
      <Button asChild variant="outline">
        <Link to="/">Back home</Link>
      </Button>
    </main>
  );
}
