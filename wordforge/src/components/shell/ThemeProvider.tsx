import { useEffect, type ReactNode } from "react";
import { useUIStore } from "@/store/useUIStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "eyecare");
    if (theme === "dark") root.classList.add("dark");
    if (theme === "eyecare") root.classList.add("eyecare");
  }, [theme]);

  return <>{children}</>;
}
