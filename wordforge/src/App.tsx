import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { SearchDialog } from "@/components/shell/SearchDialog";
import { SettingsDialog } from "@/components/shell/SettingsDialog";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUIStore } from "@/store/useUIStore";
import { AppRoutes } from "@/router";

const queryClient = new QueryClient();

function ThemedToaster() {
  const theme = useUIStore((s) => s.theme);
  return <Toaster richColors position="bottom-right" theme={theme === "light" ? "light" : "dark"} />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AppRoutes />
            <CommandPalette />
            <SettingsDialog />
            <SearchDialog />
          </BrowserRouter>
          <ThemedToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
