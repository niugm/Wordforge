import { invoke } from "@tauri-apps/api/core";
import type { Chapter, ChapterStatus, DailyWords, Project, WritingSession, WritingStats } from "@/types/db";

export const projectsRepo = {
  list: () => invoke<Project[]>("list_projects"),

  create: (input: { name: string; description?: string | null }) =>
    invoke<Project>("create_project", input),

  updateMeta: (input: { id: string; description: string | null; targetWordCount: number }) =>
    invoke<void>("update_project_meta", input),

  rename: (input: { id: string; name: string }) => invoke<void>("rename_project", input),

  archive: (input: { id: string; archived: boolean }) => invoke<void>("archive_project", input),

  remove: (input: { id: string }) => invoke<void>("delete_project", input),
};

export const chaptersRepo = {
  list: (input: { projectId: string }) => invoke<Chapter[]>("list_chapters", input),

  get: (input: { id: string }) => invoke<Chapter>("get_chapter", input),

  getContent: (input: { id: string }) => invoke<string>("get_chapter_content", input),

  updateContent: (input: { id: string; contentJson: string; wordCount: number }) =>
    invoke<void>("update_chapter_content", input),

  create: (input: { projectId: string; parentId?: string | null; title: string }) =>
    invoke<Chapter>("create_chapter", input),

  rename: (input: { id: string; title: string }) => invoke<void>("rename_chapter", input),

  setStatus: (input: { id: string; status: ChapterStatus }) =>
    invoke<void>("set_chapter_status", input),

  move: (input: { id: string; parentId: string | null; sort: number }) =>
    invoke<void>("move_chapter", input),

  reorder: (input: { items: Array<{ id: string; sort: number }> }) =>
    invoke<void>("reorder_chapters", input),

  remove: (input: { id: string }) => invoke<void>("delete_chapter", input),
};

export const sessionsRepo = {
  start: (input: { projectId: string }) =>
    invoke<WritingSession>("start_session", input),

  end: (input: { id: string; wordsWritten: number }) =>
    invoke<void>("end_session", input),

  getStats: (input: { projectId: string }) =>
    invoke<WritingStats>("get_writing_stats", input),

  getDailyWords: (input: { projectId: string; days: number }) =>
    invoke<DailyWords[]>("get_daily_words", input),
};
