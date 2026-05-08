import { invoke } from "@tauri-apps/api/core";
import type { Project } from "@/types/db";

export const projectsRepo = {
  list: () => invoke<Project[]>("list_projects"),

  create: (input: { name: string; description?: string | null }) =>
    invoke<Project>("create_project", input),

  rename: (input: { id: string; name: string }) =>
    invoke<void>("rename_project", input),

  archive: (input: { id: string; archived: boolean }) =>
    invoke<void>("archive_project", input),

  remove: (input: { id: string }) => invoke<void>("delete_project", input),
};
