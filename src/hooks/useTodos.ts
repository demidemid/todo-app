import { useEffect, useState } from 'react';
import {
  addDoc,
  and,
  collection,
  disableNetwork,
  deleteDoc,
  doc,
  enableNetwork,
  onSnapshot,
  query,
  Timestamp,
  type FirestoreError,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Todo, TodoFile, TodoInput } from '../types/todo';

export type AccessibleBoardInput = string | { id: string; userId?: string; readAllTodos?: boolean };
const logTodosSubscriptionError = (source: string, error: unknown) => {
  if (shouldSuppressFirestoreWarning(error)) {
    return;
  }

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

type NormalizedBoardAccess = { id: string; ownerUserId: string | null; readAllTodos: boolean };

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

const parseLocalDateString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const parsed = new Date(year, monthIndex, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return trimmed;
};

const parseIsoString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
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

const shouldSuppressFirestoreWarning = (error: unknown): boolean => {
  if (!isFirestoreError(error)) return false;

  return (
    error.code === 'permission-denied' ||
    (error.code === 'unavailable' && error.message.includes('ERR_BLOCKED_BY_CLIENT'))
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

const mergeTodosByLatestUpdate = (todos: Todo[]): Todo[] => {
  const byId = new Map<string, Todo>();

  todos.forEach((todo) => {
    const existing = byId.get(todo.id);
    if (!existing || todo.updatedAt.getTime() >= existing.updatedAt.getTime()) {
      byId.set(todo.id, todo);
    }
  });

  return Array.from(byId.values());
};

type SnapshotTodoDoc = {
  id: string;
  data: () => Record<string, unknown>;
  metadata?: { hasPendingWrites?: boolean; fromCache?: boolean };
};

const getDebugCardIdFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  const cardId = new URLSearchParams(window.location.search).get('card');
  return typeof cardId === 'string' && cardId.length > 0 ? cardId : null;
};

const logDebugCardSnapshot = (docs: SnapshotTodoDoc[], source: string) => {
  const debugCardId = getDebugCardIdFromLocation();
  if (!debugCardId) return;

  const targetDoc = docs.find((doc) => doc.id === debugCardId);
  if (!targetDoc) return;

  const data = targetDoc.data();

  console.log('[todo-debug]', {
    source,
    id: targetDoc.id,
    boardId: data.boardId,
    status: data.status,
    columnId: data.columnId,
    updatedAt: data.updatedAt,
    hasPendingWrites: targetDoc.metadata?.hasPendingWrites ?? false,
    fromCache: targetDoc.metadata?.fromCache ?? false,
    loggedAt: new Date().toISOString(),
  });
};

const parseSnapshotTodos = (docs: SnapshotTodoDoc[]): Todo[] => {
  return docs
    .filter((item) => item.data().entityType !== 'dashboard')
    .flatMap((item) => {
      const data = item.data();
      const createdAt = parseTimestamp(data.createdAt);
      const parsedStatus = parseStatus(data.status, data.completed);
      const weight = parseWeight(data.weight);
      const boardId = typeof data.boardId === 'string' && data.boardId.length > 0 ? data.boardId : null;
      const columnId =
        typeof data.columnId === 'string' && data.columnId.length > 0
          ? data.columnId
          : typeof data.status === 'string' && data.status.length > 0
            ? data.status
            : parsedStatus;

      if (
        typeof data.columnId === 'string' &&
        data.columnId.length > 0 &&
        typeof data.status === 'string' &&
        data.status.length > 0 &&
        data.columnId !== data.status
      ) {
        console.warn('Todo has mismatched status and columnId; using columnId as source of truth.', {
          id: item.id,
          status: data.status,
          columnId: data.columnId,
        });
      }

      const status = columnId;
      const isCompleted = typeof data.isCompleted === 'boolean' ? data.isCompleted : status === 'done';
      const completedAt = parseIsoString(data.completedAt);
      const blockedReason = typeof data.blockedReason === 'string'
        ? data.blockedReason.trim() || null
        : null;
      const dueDate = parseLocalDateString(data.dueDate);
      const remindOneDayBefore = typeof data.remindOneDayBefore === 'boolean' ? data.remindOneDayBefore : false;
      const reminderScheduledAt = parseIsoString(data.reminderScheduledAt);

      if (!boardId) {
        console.warn('Skipping todo without boardId; waiting for legacy migration.', { id: item.id });
        return [];
      }

      const files: TodoFile[] = Array.isArray(data.files)
        ? data.files
            .map((entry, index) => {
              const file = entry as Record<string, unknown>;
              const id = typeof file.id === 'string' ? file.id : `${item.id}-file-${index}`;
              const name = typeof file.name === 'string' ? file.name : `file-${index + 1}`;
              const path = typeof file.path === 'string' ? file.path : '';
              const url = typeof file.url === 'string' ? file.url : '';

              if (!url) return null;

              return {
                id,
                name,
                path,
                url,
                size: typeof file.size === 'number' && Number.isFinite(file.size) ? file.size : 0,
                contentType:
                  typeof file.contentType === 'string' && file.contentType.length > 0
                    ? file.contentType
                    : 'application/octet-stream',
                uploadedBy: typeof file.uploadedBy === 'string' ? file.uploadedBy : 'unknown',
                uploadedAt: parseTimestamp(file.uploadedAt),
              } as TodoFile;
            })
            .filter((file): file is TodoFile => file !== null)
        : [];

      return [
        {
          ...(data as Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>),
          id: item.id,
          archived: typeof data.archived === 'boolean' ? data.archived : false,
          blockedReason,
          dueDate,
          isCompleted,
          completedAt,
          remindOneDayBefore,
          reminderScheduledAt,
          status,
          boardId,
          columnId,
          weight,
          files,
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
                return `${item}@@${userId ?? ''}@@0`;
              }

              if (!item.id) return null;
              return `${item.id}@@${item.userId ?? ''}@@${item.readAllTodos ? '1' : '0'}`;
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
        const [id, ownerUserId = '', readAllTodos = '0'] = token.split('@@');
        return {
          id,
          ownerUserId: ownerUserId.length > 0 ? ownerUserId : null,
          readAllTodos: readAllTodos === '1',
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
    let pendingWritesSinceMs: number | null = null;
    let reconnectInFlight = false;
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

    const tryRecoverStuckPendingWrites = (docs: SnapshotTodoDoc[], source: string) => {
      const hasPendingWrites = docs.some((item) => item.metadata?.hasPendingWrites);

      if (!hasPendingWrites) {
        pendingWritesSinceMs = null;
        return;
      }

      if (pendingWritesSinceMs == null) {
        pendingWritesSinceMs = Date.now();
        return;
      }

      const elapsedMs = Date.now() - pendingWritesSinceMs;
      if (elapsedMs < 15000 || reconnectInFlight) {
        return;
      }

      reconnectInFlight = true;
      console.warn(`[useTodos:${source}] Pending writes are stuck. Forcing Firestore reconnect.`);

      void disableNetwork(db)
        .catch(() => undefined)
        .then(() => enableNetwork(db))
        .catch(() => undefined)
        .finally(() => {
          reconnectInFlight = false;
          pendingWritesSinceMs = Date.now();
        });
    };

    try {
      if (!useBoardFiltering) {
        const q = query(collection(db, 'todos'), where('userId', '==', userId));
        const unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            try {
              logDebugCardSnapshot(snapshot.docs, 'main');
              tryRecoverStuckPendingWrites(snapshot.docs, 'main');
              onSuccess(parseSnapshotTodos(snapshot.docs));
            } catch (parseError) {
              onFailure(parseError, 'main-parse');
            }
          },
          (snapshotError) => onFailure(snapshotError, 'main-snapshot')
        );
        unsubs.push(unsubscribeSnapshot);
      } else {
        const personalBoardIds = boardAccess
          .filter((board) => (board.ownerUserId === userId || board.ownerUserId == null) && !board.readAllTodos)
          .map((board) => board.id);
        const collaborativeBoardIds = boardAccess
          .filter((board) => board.readAllTodos || (board.ownerUserId !== userId && board.ownerUserId != null))
          .map((board) => board.id);

        const trackedSnapshots = new Map<string, Todo[]>();

        const syncCombinedTodos = () => {
          const merged = Array.from(trackedSnapshots.values()).flat();
          onSuccess(mergeTodosByLatestUpdate(merged));
        };

        const subscribeChunkedBoards = (boardIds: string[], mode: 'owner' | 'shared') => {
          const chunkedBoardIds = chunkArray(boardIds, 10);

          chunkedBoardIds.forEach((ids, index) => {
            const boardQuery =
              mode === 'owner'
                ? query(
                    collection(db, 'todos'),
                    and(
                      where('userId', '==', userId),
                      where('boardId', 'in', ids)
                    )
                  )
                : query(collection(db, 'todos'), where('boardId', 'in', ids));

            const key = `${mode}:${index}:${ids.join(',')}`;
            const unsubscribeSnapshot = onSnapshot(
              boardQuery,
              (snapshot) => {
                try {
                  logDebugCardSnapshot(snapshot.docs, `${mode}-chunk:${key}`);
                  tryRecoverStuckPendingWrites(snapshot.docs, `${mode}-chunk:${key}`);
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

        if (personalBoardIds.length > 0) {
          subscribeChunkedBoards(unique(personalBoardIds), 'owner');
        }

        if (collaborativeBoardIds.length > 0) {
          subscribeChunkedBoards(unique(collaborativeBoardIds), 'shared');
        }

        if (personalBoardIds.length === 0 && collaborativeBoardIds.length === 0) {
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
      dueDate: null,
      isCompleted: false,
      completedAt: null,
      remindOneDayBefore: false,
      reminderScheduledAt: null,
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
