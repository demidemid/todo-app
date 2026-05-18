import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  type FirestoreError,
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

const getFirestoreErrorMessage = (error: unknown): string => {
  const firestoreError = error as FirestoreError;
  const message = firestoreError?.message ?? '';

  if (
    firestoreError?.code === 'permission-denied' &&
    (message.includes('Cloud Firestore API') ||
      message.includes('firestore.googleapis.com') ||
      message.includes('SERVICE_DISABLED'))
  ) {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'your-project-id';
    return `Cloud Firestore API is disabled for project ${projectId}. Enable Firestore API in Google Cloud Console, then retry in a few minutes.`;
  }

  if (firestoreError?.code === 'permission-denied') {
    return 'Access denied by Firestore rules. Verify your Firestore Security Rules for authenticated users.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected Firestore error';
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
    let hasSnapshotResponse = false;
    const snapshotTimeout = window.setTimeout(() => {
      if (!hasSnapshotResponse) {
        setLoading(false);
        setError('Timed out while loading todos. Firestore may be unavailable or blocked by project configuration.');
      }
    }, 10000);

    try {
      const q = query(collection(db, 'todos'), where('userId', '==', userId));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          hasSnapshotResponse = true;
          window.clearTimeout(snapshotTimeout);

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
          hasSnapshotResponse = true;
          window.clearTimeout(snapshotTimeout);
          setError(getFirestoreErrorMessage(snapshotError));
          setLoading(false);
        }
      );
    } catch (subscribeError) {
      window.clearTimeout(snapshotTimeout);
      setError(getFirestoreErrorMessage(subscribeError));
      setLoading(false);
    }

    return () => {
      window.clearTimeout(snapshotTimeout);
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
