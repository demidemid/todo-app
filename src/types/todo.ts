import type { Comment } from './comment';

export type TodoStatus = string;

export interface TodoFile {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number;
  contentType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface TodoLink {
  url: string;
  name?: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  boardId: string;
  columnId: string;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  comments?: Comment[];
  files?: TodoFile[];
  links?: TodoLink[];
}

export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;
