import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Todo, TodoInput } from '../types/todo';

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(0);
};

export const useTodos = (userId: string | null) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribeSnapshot: (() => void) | null = null;

    try {
      const q = query(collection(db, 'todos'), where('userId', '==', userId));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          try {
            const nextTodos = snapshot.docs.map((item) => {
              const data = item.data();

              return {
                ...(data as Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>),
                id: item.id,
                createdAt: parseTimestamp(data.createdAt),
                updatedAt: parseTimestamp(data.updatedAt),
              };
            });

            setTodos(nextTodos);
          } catch (parseError) {
            setError(parseError instanceof Error ? parseError.message : 'Failed to parse todos');
          } finally {
            setLoading(false);
          }
        },
        (snapshotError) => {
          setError(snapshotError.message);
          setLoading(false);
        }
      );
    } catch (subscribeError) {
      setError(subscribeError instanceof Error ? subscribeError.message : 'Failed to subscribe todos');
      setLoading(false);
    }

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [userId]);

  const addTodo = async (todo: Omit<TodoInput, 'userId'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    const docRef = await addDoc(collection(db, 'todos'), {
      ...todo,
      userId: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    const todoRef = doc(db, 'todos', id);

    await updateDoc(todoRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  };

  const deleteTodo = async (id: string) => {
    await deleteDoc(doc(db, 'todos', id));
  };

  return { todos, loading, error, addTodo, updateTodo, deleteTodo };
};
