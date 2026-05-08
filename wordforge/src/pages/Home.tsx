import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export function Home() {
  const [name, setName] = useState("");
  const { greetMsg, setGreetMsg } = useAppStore();

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Wordforge</h1>
      <p className="text-muted-foreground">Tauri + React + Tailwind + shadcn/ui</p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void greet();
        }}
      >
        <input
          className="rounded border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          value={name}
        />
        <Button type="submit">Greet</Button>
      </form>

      {greetMsg && <p className="text-lg">{greetMsg}</p>}

      <Link to="/about" className="text-sm underline">
        About
      </Link>
    </main>
  );
}
