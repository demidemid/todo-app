export interface Comment {
  id: string;
  todoId: string;
  userId: string;
  userEmail?: string;
  text: string;
  createdAt: Date;
}
