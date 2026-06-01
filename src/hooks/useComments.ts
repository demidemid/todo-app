import { useEffect, useState } from 'react';
import {
  arrayUnion,
  doc,
  onSnapshot,
  runTransaction,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Comment } from '../types/comment';

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  console.warn('useComments: unsupported comment timestamp value, falling back to epoch', value);
  return new Date(0);
};

export const useComments = (todoId: string | null) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedTodoId, setLoadedTodoId] = useState<string | null>(null);

  useEffect(() => {
    if (!todoId) return;
    const todoRef = doc(db, 'todos', todoId);
    const unsub = onSnapshot(
      todoRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setComments([]);
          setError(null);
          setLoadedTodoId(todoId);
          return;
        }

        const data = snapshot.data();
        const rawComments = Array.isArray(data.comments) ? data.comments : [];

        const normalizedComments = rawComments.map((item, index) => {
            const record = item as Partial<Comment> & { createdAt?: unknown };
            return {
              id: typeof record.id === 'string' ? record.id : `${todoId}-${index}`,
              todoId: typeof record.todoId === 'string' ? record.todoId : todoId,
              userId: typeof record.userId === 'string' ? record.userId : 'unknown',
              userEmail: typeof record.userEmail === 'string' ? record.userEmail : undefined,
              text: typeof record.text === 'string' ? record.text : '',
              createdAt: parseTimestamp(record.createdAt),
              updatedAt: 'updatedAt' in record ? parseTimestamp((record as { updatedAt?: unknown }).updatedAt) : undefined,
            };
          });

        normalizedComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setComments(normalizedComments);
        setError(null);
        setLoadedTodoId(todoId);
      },
      (err) => {
        setError(err.message || 'Failed to load comments');
        setComments([]);
        setLoadedTodoId(todoId);
      }
    );
    return () => unsub();
  }, [todoId]);

  const addComment = async (userId: string, text: string, userEmail?: string) => {
    if (!todoId) throw new Error('No todoId');
    const todoRef = doc(db, 'todos', todoId);
    const commentId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await updateDoc(todoRef, {
      comments: arrayUnion({
        id: commentId,
        todoId,
        userId,
        userEmail,
        text,
        createdAt: Timestamp.now(),
      }),
    });
  };

  const updateComment = async (commentId: string, userId: string, text: string) => {
    if (!todoId) throw new Error('No todoId');
    const todoRef = doc(db, 'todos', todoId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(todoRef);
      if (!snapshot.exists()) throw new Error('Todo not found');

      const data = snapshot.data();
      const rawComments = Array.isArray(data.comments) ? data.comments : [];
      const targetIndex = rawComments.findIndex((item) => {
        const record = item as { id?: unknown };
        return typeof record.id === 'string' && record.id === commentId;
      });

      if (targetIndex < 0) throw new Error('Comment not found');

      const targetRecord = rawComments[targetIndex] as { userId?: unknown };
      if (typeof targetRecord.userId !== 'string' || targetRecord.userId !== userId) {
        throw new Error('Permission denied');
      }

      const nextComments = [...rawComments];
      nextComments[targetIndex] = {
        ...(rawComments[targetIndex] as Record<string, unknown>),
        text,
        updatedAt: Timestamp.now(),
      };

      transaction.update(todoRef, {
        comments: nextComments,
      });
    });
  };

  const deleteComment = async (commentId: string, userId: string) => {
    if (!todoId) throw new Error('No todoId');
    const todoRef = doc(db, 'todos', todoId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(todoRef);
      if (!snapshot.exists()) throw new Error('Todo not found');

      const data = snapshot.data();
      const rawComments = Array.isArray(data.comments) ? data.comments : [];
      const targetIndex = rawComments.findIndex((item) => {
        const record = item as { id?: unknown };
        return typeof record.id === 'string' && record.id === commentId;
      });

      if (targetIndex < 0) throw new Error('Comment not found');

      const targetRecord = rawComments[targetIndex] as { userId?: unknown };
      if (typeof targetRecord.userId !== 'string' || targetRecord.userId !== userId) {
        throw new Error('Permission denied');
      }

      const nextComments = rawComments.filter((_, index) => index !== targetIndex);

      transaction.update(todoRef, {
        comments: nextComments,
      });
    });
  };

  if (!todoId) {
    return { comments: [], loading: false, error: null, addComment, updateComment, deleteComment };
  }

  const loading = loadedTodoId !== todoId;
  const visibleComments = loadedTodoId === todoId ? comments : [];
  const visibleError = loadedTodoId === todoId ? error : null;

  return { comments: visibleComments, loading, error: visibleError, addComment, updateComment, deleteComment };
};