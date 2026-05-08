import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { SearchDialog } from "@/components/shell/SearchDialog";
import { SettingsDialog } from "@/components/shell/SettingsDialog";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRoutes } from "@/router";

const queryClient = new QueryClient();

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
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
