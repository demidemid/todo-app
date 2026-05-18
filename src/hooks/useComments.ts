import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Comment } from '../types/comment';

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
};

export const useComments = (todoId: string | null) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedTodoId, setLoadedTodoId] = useState<string | null>(null);

  useEffect(() => {
    if (!todoId) return;
    const q = query(
      collection(db, 'comments'),
      where('todoId', '==', todoId),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setComments(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              todoId: data.todoId,
              userId: data.userId,
              text: data.text,
              createdAt: parseTimestamp(data.createdAt),
            };
          })
        );
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

  const addComment = async (userId: string, text: string) => {
    if (!todoId) throw new Error('No todoId');
    await addDoc(collection(db, 'comments'), {
      todoId,
      userId,
      text,
      createdAt: Timestamp.now(),
    });
  };

  if (!todoId) {
    return { comments: [], loading: false, error: null, addComment };
  }

  const loading = loadedTodoId !== todoId;
  const visibleComments = loadedTodoId === todoId ? comments : [];
  const visibleError = loadedTodoId === todoId ? error : null;

  return { comments: visibleComments, loading, error: visibleError, addComment };
};