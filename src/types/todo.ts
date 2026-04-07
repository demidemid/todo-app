export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export type TodoInput = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;
