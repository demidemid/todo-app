import { useState } from 'react';
import { useComments } from '../../hooks/useComments';
import type { Todo } from '../../types/todo';

interface UseTodoModalControllerArgs {
  todo: Todo;
  userId: string;
  userEmail?: string;
}

export const useTodoModalController = ({
  todo,
  userId,
  userEmail,
}: UseTodoModalControllerArgs) => {
  const { comments, loading: commentsLoading, error: commentsError, addComment } = useComments(todo.id);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();

    const text = commentText.trim();
    if (!text) return;

    setCommentSubmitting(true);
    setCommentError('');

    try {
      if (userEmail) {
        await addComment(userId, text, userEmail);
      } else {
        await addComment(userId, text);
      }
      setCommentText('');
    } catch {
      setCommentError('Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return {
    comments,
    commentsLoading,
    commentsError,
    commentText,
    setCommentText,
    commentSubmitting,
    commentError,
    handleAddComment,
  };
};
