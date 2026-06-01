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
  const {
    comments,
    loading: commentsLoading,
    error: commentsError,
    addComment,
    updateComment,
    deleteComment,
  } = useComments(todo.id);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentActionSubmittingId, setCommentActionSubmittingId] = useState<string | null>(null);

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

  const handleStartEditComment = (commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
    setCommentError('');
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
    setCommentError('');
  };

  const handleSaveEditComment = async () => {
    if (!editingCommentId) return;

    const text = editingCommentText.trim();
    if (!text) {
      setCommentError('Comment cannot be empty');
      return;
    }

    setCommentActionSubmittingId(editingCommentId);
    setCommentError('');

    try {
      await updateComment(editingCommentId, userId, text);
      handleCancelEditComment();
    } catch {
      setCommentError('Failed to update comment');
    } finally {
      setCommentActionSubmittingId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setCommentActionSubmittingId(commentId);
    setCommentError('');

    try {
      await deleteComment(commentId, userId);
      if (editingCommentId === commentId) {
        handleCancelEditComment();
      }
    } catch {
      setCommentError('Failed to delete comment');
    } finally {
      setCommentActionSubmittingId(null);
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
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    commentActionSubmittingId,
    handleStartEditComment,
    handleCancelEditComment,
    handleSaveEditComment,
    handleDeleteComment,
  };
};
