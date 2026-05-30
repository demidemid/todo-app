import { useEffect, useState } from 'react';
import {
  addDoc,
  and,
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

export type AccessibleBoardInput = string | { id: string; userId?: string };
const logTodosSubscriptionError = (source: string, error: unknown) => {
  if (isFirestoreError(error)) {
    console.warn(`[useTodos:${source}] Firestore error ${error.code}: ${error.message}`);
    return;
  }

  if (error instanceof Error) {
    console.warn(`[useTodos:${source}] ${error.message}`);
    return;
  }

  console.warn(`[useTodos:${source}] Unknown subscription error`, error);
};

type NormalizedBoardAccess = { id: string; ownerUserId: string | null };

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

const isPermissionDeniedError = (error: unknown): boolean => {
  if (!isFirestoreError(error)) return false;
  return error.code === 'permission-denied';
};

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

const chunkArray = <T,>(values: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
};

const parseSnapshotTodos = (docs: Array<{ id: string; data: () => Record<string, unknown> }>): Todo[] => {
  return docs
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

      return [
        {
          ...(data as Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>),
          id: item.id,
          status,
          boardId,
          columnId,
          weight,
          createdAt,
          updatedAt: parseTimestamp(data.updatedAt),
        },
      ];
    });
};

export const useTodos = (userId: string | null, accessibleBoards?: AccessibleBoardInput[]) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSubscriptionKey, setResolvedSubscriptionKey] = useState<string>('');

  const normalizedBoardAccessKey =
    accessibleBoards === undefined
      ? '__all__'
      : unique(
          accessibleBoards
            .map((item) => {
              if (typeof item === 'string') {
                if (!item) return null;
                return `${item}@@${userId ?? ''}`;
              }

              if (!item.id) return null;
              return `${item.id}@@${item.userId ?? ''}`;
            })
            .filter((item): item is string => item !== null)
        )
          .sort()
          .join('|');

  const parseNormalizedBoardAccess = (key: string): NormalizedBoardAccess[] => {
    if (key === '__all__' || key.length === 0) return [];

    return key
      .split('|')
      .map((token) => {
        const [id, ownerUserId = ''] = token.split('@@');
        return {
          id,
          ownerUserId: ownerUserId.length > 0 ? ownerUserId : null,
        };
      })
      .filter((item) => item.id.length > 0);
  };

  const shouldSkipBoardLoading = normalizedBoardAccessKey !== '__all__' && normalizedBoardAccessKey.length === 0;
  const subscriptionKey = `${userId ?? '__anon__'}|${normalizedBoardAccessKey}`;

  useEffect(() => {
    if (!userId || shouldSkipBoardLoading) return;

    const useBoardFiltering = normalizedBoardAccessKey !== '__all__';
    const boardAccess = parseNormalizedBoardAccess(normalizedBoardAccessKey);

    const unsubs: Array<() => void> = [];
    let hasSnapshotResponse = false;
    const snapshotTimeout = window.setTimeout(() => {
      if (!hasSnapshotResponse) {
        setError('Timed out while loading todos. Firestore may be unavailable or blocked by project configuration.');
        setResolvedSubscriptionKey(subscriptionKey);
      }
    }, 10000);

    const onSuccess = (nextTodos: Todo[]) => {
      hasSnapshotResponse = true;
      window.clearTimeout(snapshotTimeout);
      setTodos(nextTodos);
      setError(null);
      setResolvedSubscriptionKey(subscriptionKey);
    };

    const onFailure = (snapshotError: unknown, source = 'unknown') => {
      hasSnapshotResponse = true;
      window.clearTimeout(snapshotTimeout);
      logTodosSubscriptionError(source, snapshotError);
      setError(getFirestoreErrorMessage(snapshotError));
      setResolvedSubscriptionKey(subscriptionKey);
    };

    try {
      if (!useBoardFiltering) {
        const q = query(collection(db, 'todos'), where('userId', '==', userId));
        const unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            try {
              onSuccess(parseSnapshotTodos(snapshot.docs));
            } catch (parseError) {
              onFailure(parseError, 'main-parse');
            }
          },
          (snapshotError) => onFailure(snapshotError, 'main-snapshot')
        );
        unsubs.push(unsubscribeSnapshot);
      } else {
        const ownerBoardIds = boardAccess
          .filter((board) => board.ownerUserId === userId || board.ownerUserId == null)
          .map((board) => board.id);
        const sharedBoardIds = boardAccess
          .filter((board) => board.ownerUserId !== userId && board.ownerUserId != null)
          .map((board) => board.id);

        const trackedSnapshots = new Map<string, Todo[]>();

        const syncCombinedTodos = () => {
          const merged = Array.from(trackedSnapshots.values()).flat();
          const deduped = merged.filter((item, index, all) => all.findIndex((next) => next.id === item.id) === index);
          onSuccess(deduped);
        };

        const subscribeChunkedBoards = (boardIds: string[], mode: 'owner' | 'shared') => {
          const chunkedBoardIds = chunkArray(boardIds, 10);

          chunkedBoardIds.forEach((ids, index) => {
            const boardQuery =
              mode === 'owner'
                ? query(
                    collection(db, 'todos'),
                    and(
                      where('entityType', '==', 'todo'),
                      where('userId', '==', userId),
                      where('boardId', 'in', ids)
                    )
                  )
                : query(collection(db, 'todos'), and(where('entityType', '==', 'todo'), where('boardId', 'in', ids)));

            const key = `${mode}:${index}:${ids.join(',')}`;
            const unsubscribeSnapshot = onSnapshot(
              boardQuery,
              (snapshot) => {
                try {
                  trackedSnapshots.set(key, parseSnapshotTodos(snapshot.docs));
                  syncCombinedTodos();
                } catch (parseError) {
                  onFailure(parseError, `${mode}-chunk-parse:${key}`);
                }
              },
              (snapshotError) => {
                if (isPermissionDeniedError(snapshotError)) {
                  logTodosSubscriptionError(`${mode}-chunk-permission-denied:${key}`, snapshotError);
                  trackedSnapshots.set(key, []);
                  syncCombinedTodos();
                  return;
                }

                onFailure(snapshotError, `${mode}-chunk-snapshot:${key}`);
              }
            );

            unsubs.push(unsubscribeSnapshot);
          });
        };

        if (ownerBoardIds.length > 0) {
          subscribeChunkedBoards(unique(ownerBoardIds), 'owner');
        }

        if (sharedBoardIds.length > 0) {
          subscribeChunkedBoards(unique(sharedBoardIds), 'shared');
        }

        if (ownerBoardIds.length === 0 && sharedBoardIds.length === 0) {
          onSuccess([]);
        }
      }
    } catch (subscribeError) {
      onFailure(subscribeError, 'subscription-setup');
    }

    return () => {
      window.clearTimeout(snapshotTimeout);
      unsubs.forEach((unsubscribeSnapshot) => unsubscribeSnapshot());
    };
  }, [normalizedBoardAccessKey, shouldSkipBoardLoading, subscriptionKey, userId]);

  const addTodo = async (
    todo: Pick<TodoInput, 'title' | 'description'>,
    options: { boardId: string; columnId?: string }
  ) => {
    if (!userId) throw new Error('User must be authenticated');

    const columnId = options.columnId ?? 'todo';
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

  if (!userId || shouldSkipBoardLoading) {
    return { todos: [], loading: false, error: null, addTodo, updateTodo, deleteTodo };
  }

  const isCurrentSubscriptionResolved = resolvedSubscriptionKey === subscriptionKey;

  return {
    todos: isCurrentSubscriptionResolved ? todos : [],
    loading: !isCurrentSubscriptionResolved,
    error: isCurrentSubscriptionResolved ? error : null,
    addTodo,
    updateTodo,
    deleteTodo,
  };
};
