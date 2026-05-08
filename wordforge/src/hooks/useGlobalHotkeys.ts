import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);

function modKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}

export function useGlobalHotkeys() {
  const navigate = useNavigate();
  const toggleCommand = useUIStore((s) => s.toggleCommand);
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const toggleFocus = useUIStore((s) => s.toggleFocus);
  const toggleLeft = useWorkspaceStore((s) => s.toggleLeft);
  const toggleRight = useWorkspaceStore((s) => s.toggleRight);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = modKey(e);

      if (mod && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        toggleCommand();
        return;
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        toggleSettings();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleSearch();
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && !e.shiftKey) {
        e.preventDefault();
        navigate("/dashboard");
        return;
      }
      if (e.key === "F11") {
        e.preventDefault();
        toggleFocus();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleLeft();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        toggleRight();
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, toggleCommand, toggleSettings, toggleSearch, toggleFocus, toggleLeft, toggleRight]);
}
