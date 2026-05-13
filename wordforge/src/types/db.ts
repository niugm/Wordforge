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

export interface WritingSession {
  id: string;
  projectId: string;
  startedAt: number;
  endedAt: number | null;
  wordsWritten: number;
}

export interface WritingStats {
  todayWords: number;
  monthWords: number;
  streak: number;
}

export interface DailyWords {
  day: string;
  words: number;
}

export interface AppErrorPayload {
  code: string;
  message: string;
}

