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

export interface TodoChecklistItem {
  id: string;
  title: string;
  checked: boolean;
}

export interface TodoChecklist {
  title: string;
  items: TodoChecklistItem[];
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  archived?: boolean;
  dueDate?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  remindOneDayBefore?: boolean;
  reminderScheduledAt?: string | null;
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
  checklist?: TodoChecklist;
}

export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;
