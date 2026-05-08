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

export interface AppErrorPayload {
  code: string;
  message: string;
}
