export interface Comment {
  id: string;
  todoId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatarId?: string;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
}
