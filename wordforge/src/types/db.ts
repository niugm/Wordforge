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

export interface AppErrorPayload {
  code: string;
  message: string;
}
