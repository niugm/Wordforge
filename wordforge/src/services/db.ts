import { invoke } from "@tauri-apps/api/core";
import type {
  Chapter,
  ChapterSearchResult,
  ChapterStatus,
  Character,
  CharacterInput,
  AiCredentialSettings,
  AiProvider,
  BackupResult,
  BackupSettings,
  DailyWords,
  ExportFormat,
  ExportMode,
  ExportResult,
  OutlineInput,
  OutlineNode,
  Project,
  WritingSession,
  WritingStats,
} from "@/types/db";

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

  duplicate: (input: { id: string }) => invoke<Chapter>("duplicate_chapter", input),

  rename: (input: { id: string; title: string }) => invoke<void>("rename_chapter", input),

  setStatus: (input: { id: string; status: ChapterStatus }) =>
    invoke<void>("set_chapter_status", input),

  move: (input: { id: string; parentId: string | null; sort: number }) =>
    invoke<void>("move_chapter", input),

  reorder: (input: { items: Array<{ id: string; sort: number }> }) =>
    invoke<void>("reorder_chapters", input),

  remove: (input: { id: string }) => invoke<void>("delete_chapter", input),
};

export const charactersRepo = {
  list: (input: { projectId: string }) => invoke<Character[]>("list_characters", input),

  create: (input: { projectId: string; input: CharacterInput }) =>
    invoke<Character>("create_character", input),

  update: (input: { id: string; input: CharacterInput }) => invoke<void>("update_character", input),

  remove: (input: { id: string }) => invoke<void>("delete_character", input),
};

export const outlinesRepo = {
  list: (input: { projectId: string }) => invoke<OutlineNode[]>("list_outlines", input),

  create: (input: { projectId: string; parentId?: string | null; input: OutlineInput }) =>
    invoke<OutlineNode>("create_outline", input),

  update: (input: { id: string; input: OutlineInput }) => invoke<void>("update_outline", input),

  move: (input: { id: string; parentId: string | null; sort: number }) =>
    invoke<void>("move_outline", input),

  reorder: (input: { items: Array<{ id: string; sort: number }> }) =>
    invoke<void>("reorder_outlines", input),

  remove: (input: { id: string }) => invoke<void>("delete_outline", input),
};

export const sessionsRepo = {
  start: (input: { projectId: string }) => invoke<WritingSession>("start_session", input),

  end: (input: { id: string; wordsWritten: number }) => invoke<void>("end_session", input),

  getStats: (input: { projectId: string }) => invoke<WritingStats>("get_writing_stats", input),

  getDailyWords: (input: { projectId: string; days: number }) =>
    invoke<DailyWords[]>("get_daily_words", input),
};

export const settingsRepo = {
  getBackupSettings: () => invoke<BackupSettings>("get_backup_settings"),

  updateBackupSettings: (input: { backupDir: string | null; autoBackupEnabled: boolean }) =>
    invoke<BackupSettings>("update_backup_settings", input),

  backupNow: (input: { backupDir?: string | null }) => invoke<BackupResult>("backup_now", input),

  listAiCredentials: () => invoke<AiCredentialSettings[]>("list_ai_credentials"),

  saveAiCredential: (input: {
    provider: AiProvider;
    apiKey: string | null;
    baseUrl: string | null;
    model: string | null;
  }) => invoke<AiCredentialSettings>("save_ai_credential", input),

  deleteAiCredential: (input: { provider: AiProvider }) =>
    invoke<void>("delete_ai_credential", input),

  exportProject: (input: { projectId: string; format: ExportFormat; mode: ExportMode }) =>
    invoke<ExportResult>("export_project", input),

  exportChapter: (input: { chapterId: string; format: ExportFormat }) =>
    invoke<ExportResult>("export_chapter", input),
};

export const searchRepo = {
  chapterBody: (input: { projectId: string; query: string; limit?: number }) =>
    invoke<ChapterSearchResult[]>("search_chapter_body", input),
};
