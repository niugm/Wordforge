export interface Project {
  id: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  targetWordCount: number;
  createdAt: number;
  updatedAt: number;
  archived: number;
}

export type ChapterStatus = "draft" | "revising" | "done";

export interface Chapter {
  id: string;
  projectId: string;
  parentId: string | null;
  sort: number;
  title: string;
  summary: string | null;
  wordCount: number;
  status: ChapterStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  alias: string | null;
  avatarPath: string | null;
  roleType: string | null;
  profileMd: string;
  attributesJson: string;
  createdAt: number;
  updatedAt: number;
}

export type CharacterInput = {
  name: string;
  alias: string | null;
  avatarPath: string | null;
  roleType: string | null;
  profileMd: string;
  attributesJson: string;
};

export type OutlineStatus = "idea" | "drafting" | "done";

export interface OutlineNode {
  id: string;
  projectId: string;
  parentId: string | null;
  sort: number;
  title: string;
  contentMd: string;
  status: OutlineStatus;
}

export type OutlineInput = {
  title: string;
  contentMd: string;
  status: OutlineStatus;
};

export interface WritingSession {
  id: string;
  projectId: string;
  startedAt: number;
  endedAt: number | null;
  wordsWritten: number;
}

export interface WritingStats {
  todayWords: number;
  weekWords: number;
  monthWords: number;
  streak: number;
}

export interface DailyWords {
  day: string;
  words: number;
}

export interface BackupSettings {
  backupDir: string | null;
  autoBackupEnabled: boolean;
}

export interface BackupResult {
  path: string;
}

export type AiProvider = "openai" | "anthropic" | "gemini";

export interface AiCredentialSettings {
  provider: AiProvider;
  baseUrl: string | null;
  model: string | null;
  hasApiKey: boolean;
}

export type AiPolishKind = "condense" | "expand" | "describe" | "tone" | "free";

export interface AiPolishResult {
  provider: AiProvider;
  model: string;
  kind: AiPolishKind;
  originalText: string;
  resultText: string;
}

export interface AiPolishStreamDelta {
  requestId: string;
  delta: string;
}

export type AiReviewCategory = "logic" | "continuity" | "voice" | "foreshadowing";
export type AiReviewSeverity = "high" | "medium" | "low";

export interface AiChapterReviewIssue {
  category: AiReviewCategory;
  severity: AiReviewSeverity;
  location: string;
  quote: string;
  problem: string;
  suggestion: string;
}

export interface AiChapterReviewResult {
  provider: AiProvider;
  model: string;
  chapterTitle: string;
  issues: AiChapterReviewIssue[];
}

export type ExportFormat = "markdown" | "plainText";
export type ExportMode = "merged" | "chapterFiles";

export interface ExportResult {
  path: string;
  fileCount: number;
}

export interface ChapterSearchResult {
  chapterId: string;
  title: string;
  snippet: string;
  rank: number;
}

export interface AppErrorPayload {
  code: string;
  message: string;
}
