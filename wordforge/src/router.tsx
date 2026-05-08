import { Route, Routes } from "react-router";
import { Dashboard } from "@/pages/Dashboard";
import { Welcome } from "@/pages/Welcome";
import { Workspace } from "@/pages/Workspace";
import { EditorPanel } from "@/components/workspace/EditorPanel";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/workspace" element={<Workspace />}>
        <Route path="chapter/:id" element={<EditorPanel />} />
      </Route>
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
