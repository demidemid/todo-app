export type TodoStatus = string;

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
}

export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;
