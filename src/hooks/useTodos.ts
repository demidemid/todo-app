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
import { db } from '../firebase';
import type { Todo, TodoInput } from '../types/todo';

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (value == null) {
    console.warn('parseTimestamp received a missing timestamp value; falling back to Unix epoch.');
  } else {
    console.warn('parseTimestamp received an unsupported timestamp value; falling back to Unix epoch.', value);
  }

  return new Date(0);
};

const parseStatus = (status: unknown, completed?: unknown): string => {
  if (typeof status === 'string' && status.length > 0) {
    return status;
  }

  if (typeof completed === 'boolean') {
    console.warn('parseStatus received a missing or unsupported status value; using legacy completed fallback.', {
      status,
      completed,
    });
    return completed ? 'done' : 'todo';
  }

  if (status == null) {
    console.warn('parseStatus received a missing status value; falling back to "todo".');
  } else {
    console.warn('parseStatus received an unsupported status value; falling back to "todo".', status);
  }

  return 'todo';
};

const parseWeight = (weight: unknown, createdAt?: unknown): number => {
  if (typeof weight === 'number' && Number.isFinite(weight)) {
    return weight;
  }

  if (createdAt != null) {
    const fallbackWeight = parseTimestamp(createdAt).getTime();
    console.warn('parseWeight received a missing or unsupported weight value; using createdAt fallback.', {
      weight,
      createdAt,
      fallbackWeight,
    });
    return fallbackWeight;
  }

  if (weight == null) {
    console.warn('parseWeight received a missing weight value; falling back to 0.');
  } else {
    console.warn('parseWeight received an unsupported weight value; falling back to 0.', weight);
  }

  return 0;
};

const isFirestoreError = (error: unknown): error is FirestoreError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
};

const getFirestoreErrorMessage = (error: unknown): string => {
  const firestoreError = isFirestoreError(error) ? error : undefined;
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
            const nextTodos = snapshot.docs
              .filter((item) => item.data().entityType !== 'dashboard')
              .flatMap((item) => {
              const data = item.data();
              const createdAt = parseTimestamp(data.createdAt);
              const status = parseStatus(data.status, data.completed);
              const weight = parseWeight(data.weight);
              const boardId = typeof data.boardId === 'string' && data.boardId.length > 0 ? data.boardId : null;
              const columnId =
                typeof data.columnId === 'string' && data.columnId.length > 0
                  ? data.columnId
                  : typeof data.status === 'string' && data.status.length > 0
                    ? data.status
                    : status;

              if (!boardId) {
                console.warn('Skipping todo without boardId; waiting for legacy migration.', { id: item.id });
                return [];
              }

              return [{
                ...(data as Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>),
                id: item.id,
                status,
                boardId,
                columnId,
                weight,
                createdAt,
                updatedAt: parseTimestamp(data.updatedAt),
              }];
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

  const addTodo = async (
    todo: Pick<TodoInput, 'title' | 'description'>,
    options: { boardId: string; columnId: string }
  ) => {
    if (!userId) throw new Error('User must be authenticated');

    const columnId = options.columnId;
    const boardId = options.boardId;

    const docRef = await addDoc(collection(db, 'todos'), {
      entityType: 'todo',
      ...todo,
      userId,
      status: columnId,
      boardId,
      columnId,
      weight: Date.now(),
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
