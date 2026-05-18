export type TodoStatus = 'todo' | 'in_progress' | 'done';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  weight: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;
