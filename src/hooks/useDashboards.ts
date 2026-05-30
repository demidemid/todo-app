import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  and,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Dashboard, DashboardColumn } from '../types/dashboard';

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
};

const defaultColumns = (): DashboardColumn[] => [
  { id: 'todo', name: 'To do', order: 0, isDone: false },
  { id: 'in_progress', name: 'In progress', order: 1, isDone: false },
  { id: 'done', name: 'Done', order: 2, isDone: true },
];

const ensureUniqueColumnNames = (names: string[]) => {
  const seen = new Set<string>();

  for (const name of names) {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) {
      throw new Error('Column names must be unique within a dashboard');
    }
    seen.add(normalized);
  }
};

const commitInBatches = async (
  updates: Array<{ id: string; data: Record<string, unknown> }>
) => {
  const BATCH_LIMIT = 450;

  for (let index = 0; index < updates.length; index += BATCH_LIMIT) {
    const chunk = updates.slice(index, index + BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((entry) => {
      batch.update(doc(db, 'todos', entry.id), entry.data);
    });

    await batch.commit();
  }
};

const compareDashboardsByOrder = (a: Pick<Dashboard, 'order' | 'createdAt'>, b: Pick<Dashboard, 'order' | 'createdAt'>) => {
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.getTime() - b.createdAt.getTime();
};

const normalizeOrder = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
};

const isPermissionDeniedError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;

  const maybeCode = 'code' in error ? (error as { code?: unknown }).code : undefined;
  const maybeMessage = 'message' in error ? (error as { message?: unknown }).message : undefined;

  if (typeof maybeCode === 'string' && maybeCode === 'permission-denied') return true;
  if (typeof maybeMessage === 'string') {
    return maybeMessage.toLowerCase().includes('missing or insufficient permissions');
  }

  return false;
};

export const useDashboards = (userId: string | null, userEmail?: string | null, targetDashboardId?: string | null) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [sharedDashboards, setSharedDashboards] = useState<Dashboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const hasResolvedInitialSelectionRef = useRef(false);
  const hasMigratedLegacyTodosRef = useRef(false);
  const targetDashboardIdRef = useRef<string | null>(targetDashboardId ?? null);

  useEffect(() => {
    targetDashboardIdRef.current = targetDashboardId ?? null;
  }, [targetDashboardId]);

  useEffect(() => {
    if (!userId) return;
    let isEffectCancelled = false;
    const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
    hasResolvedInitialSelectionRef.current = false;
    hasMigratedLegacyTodosRef.current = false;

    const fetchSharedDashboards = async () => {
      try {
        const [byUidSnapshot, byEmailSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'todos'), where('sharedWith', 'array-contains', userId))).catch(() => {
            return { docs: [] } as { docs: Array<{ id: string; data: () => Record<string, unknown> }> };
          }),
          normalizedEmail.length > 0
            ? getDocs(query(collection(db, 'todos'), where('sharedWithEmails', 'array-contains', normalizedEmail))).catch(() => {
                return { docs: [] } as { docs: Array<{ id: string; data: () => Record<string, unknown> }> };
              })
            : Promise.resolve({ docs: [] } as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }),
        ]);
        if (isEffectCancelled) return;

        const docsById = new Map<string, { id: string; data: () => Record<string, unknown> }>();
        [byUidSnapshot, byEmailSnapshot].forEach((snapshot) => {
          snapshot.docs.forEach((item) => {
            docsById.set(item.id, item);
          });
        });

        if (targetDashboardIdRef.current && !docsById.has(targetDashboardIdRef.current)) {
          try {
            const dashboardSnapshot = await getDoc(doc(db, 'todos', targetDashboardIdRef.current));
            if (dashboardSnapshot.exists()) {
              docsById.set(dashboardSnapshot.id, {
                id: dashboardSnapshot.id,
                data: () => dashboardSnapshot.data() as Record<string, unknown>,
              });
            }
          } catch {
            // If direct read is denied or missing, keep shared list from query results only.
          }
        }

        const itemsFromAllQueries: Dashboard[] = Array.from(docsById.values()).map((item) => {
            const data = item.data();
            const columns = Array.isArray(data.columns)
              ? data.columns
                  .map((col, index) => ({
                    id: typeof col?.id === 'string' ? col.id : `col-${index}`,
                    name: typeof col?.name === 'string' ? col.name : `Column ${index + 1}`,
                    order: typeof col?.order === 'number' ? col.order : index,
                    isDone: typeof col?.isDone === 'boolean' ? col.isDone : col?.id === 'done',
                  }))
                  .sort((a, b) => a.order - b.order)
              : defaultColumns();

            return {
              id: item.id,
              userId: typeof data.userId === 'string' ? data.userId : '',
              name: typeof data.name === 'string' ? data.name : 'Dashboard',
              order: typeof data.order === 'number' ? data.order : Number.NaN,
              columns,
              sharedWith: Array.isArray(data.sharedWith)
                ? data.sharedWith.filter((value): value is string => typeof value === 'string')
                : [],
              sharedWithEmails: Array.isArray(data.sharedWithEmails)
                ? data.sharedWithEmails.filter((value): value is string => typeof value === 'string')
                : [],
              createdAt: parseTimestamp(data.createdAt),
              updatedAt: parseTimestamp(data.updatedAt),
            };
          });

        const normalizedItems = itemsFromAllQueries
          .map((dashboard, index) => ({
            ...dashboard,
            order: normalizeOrder(dashboard.order, index),
          }))
          .sort(compareDashboardsByOrder);

        if (isEffectCancelled) return;
        setSharedDashboards(normalizedItems);

        if (!hasResolvedInitialSelectionRef.current && normalizedItems.length > 0) {
          hasResolvedInitialSelectionRef.current = true;
          setActiveDashboardId((prev) => prev ?? normalizedItems[0].id);
        }
      } catch {
        if (isEffectCancelled) return;
        setSharedDashboards([]);
      }
    };

    void fetchSharedDashboards();

    const q = query(
      collection(db, 'todos'),
      and(where('userId', '==', userId), where('entityType', '==', 'dashboard'))
    );
    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const items: Dashboard[] = snapshot.docs.map((item) => {
          const data = item.data();
          const columns = Array.isArray(data.columns)
            ? data.columns
                .map((col, index) => ({
                  id: typeof col?.id === 'string' ? col.id : `col-${index}`,
                  name: typeof col?.name === 'string' ? col.name : `Column ${index + 1}`,
                  order: typeof col?.order === 'number' ? col.order : index,
                  isDone: typeof col?.isDone === 'boolean' ? col.isDone : col?.id === 'done',
                }))
                .sort((a, b) => a.order - b.order)
            : defaultColumns();

          return {
            id: item.id,
            userId: typeof data.userId === 'string' ? data.userId : userId,
            name: typeof data.name === 'string' ? data.name : 'Dashboard',
            order: typeof data.order === 'number' ? data.order : Number.NaN,
            columns,
            sharedWith: Array.isArray(data.sharedWith)
              ? data.sharedWith.filter((value): value is string => typeof value === 'string')
              : [],
            sharedWithEmails: Array.isArray(data.sharedWithEmails)
              ? data.sharedWithEmails.filter((value): value is string => typeof value === 'string')
              : [],
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          };
        });

        if (items.length === 0) {
          setDashboards([]);
          setError(null);
          setLoadedUserId(userId);
          setActiveDashboardId((prev) => prev ?? targetDashboardIdRef.current ?? null);
          return;
        }

        const sortedByCreatedAt = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const normalizedItems = sortedByCreatedAt.map((dashboard, index) => ({
          ...dashboard,
          order: normalizeOrder(dashboard.order, index),
        }));

        normalizedItems.sort(compareDashboardsByOrder);
        let migrationErrorMessage: string | null = null;

        if (!hasMigratedLegacyTodosRef.current) {
          hasMigratedLegacyTodosRef.current = true;

          try {
            const defaultBoard = normalizedItems[0];
            const defaultColumnId = defaultBoard.columns[0]?.id;
            const orderBackfillMap = new Map(normalizedItems.map((dashboard, index) => [dashboard.id, index]));

            const todosQuery = query(collection(db, 'todos'), where('userId', '==', userId));
            const todosSnapshot = await getDocs(todosQuery);

            const dashboardOrderBackfills = snapshot.docs
              .filter((item) => {
                const data = item.data();
                return data.entityType === 'dashboard' && typeof data.order !== 'number';
              })
              .map((item) => {
                const nextOrder = orderBackfillMap.get(item.id);
                if (nextOrder == null) return null;

                return updateDoc(doc(db, 'todos', item.id), {
                  order: nextOrder,
                  updatedAt: Timestamp.now(),
                });
              })
              .filter((value): value is Promise<void> => value !== null);

            const migrationPromises = todosSnapshot.docs
              .filter((item) => item.data().entityType !== 'dashboard')
              .map((item) => {
                const data = item.data();
                const hasBoardId = typeof data.boardId === 'string' && data.boardId.length > 0;
                const hasColumnId = typeof data.columnId === 'string' && data.columnId.length > 0;
                const hasWeight = typeof data.weight === 'number' && Number.isFinite(data.weight);
                const hasLegacyCompleted = 'completed' in data;

                if (hasBoardId && hasColumnId && hasWeight && !hasLegacyCompleted) return null;
                if (!defaultColumnId) return null;

                const nextBoardId = hasBoardId ? data.boardId : defaultBoard.id;
                const nextColumnId =
                  hasColumnId
                    ? data.columnId
                    : typeof data.status === 'string' && data.status.length > 0
                      ? data.status
                      : defaultColumnId;

                const updateData: Record<string, unknown> = {
                  boardId: nextBoardId,
                  columnId: nextColumnId,
                  status: nextColumnId,
                  updatedAt: Timestamp.now(),
                };

                if (!hasWeight) {
                  updateData.weight = parseTimestamp(data.createdAt).getTime();
                }

                if (hasLegacyCompleted) {
                  updateData.completed = deleteField();
                }

                return updateDoc(doc(db, 'todos', item.id), updateData);
              })
              .filter((value): value is Promise<void> => value !== null);

            await Promise.all([...dashboardOrderBackfills, ...migrationPromises]);
          } catch (migrationError) {
            if (isPermissionDeniedError(migrationError)) {
              // Under stricter rules, legacy docs may be unreadable; skip migration and keep dashboards usable.
              migrationErrorMessage = null;
            } else {
              hasMigratedLegacyTodosRef.current = false;
              migrationErrorMessage =
                migrationError instanceof Error ? migrationError.message : 'Failed to migrate legacy todos';
            }
          }
        }

        setDashboards(normalizedItems);
        setError(migrationErrorMessage);
        setLoadedUserId(userId);
        void fetchSharedDashboards();

        setActiveDashboardId((prev) => {
          if (prev && normalizedItems.some((board) => board.id === prev)) {
            hasResolvedInitialSelectionRef.current = true;
            return prev;
          }

          // Keep explicit collapsed state across realtime updates.
          if (prev === null && hasResolvedInitialSelectionRef.current) {
            return null;
          }

          hasResolvedInitialSelectionRef.current = true;
          return normalizedItems[0].id;
        });
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Failed to load dashboards');
        setDashboards([]);
        setSharedDashboards([]);
        setLoadedUserId(userId);
      }
    );

    return () => {
      isEffectCancelled = true;
      unsub();
      setSharedDashboards([]);
    };
  }, [userEmail, userId]);

  const addDashboard = async (name: string, columnNames: string[]) => {
    if (!userId) throw new Error('User must be authenticated');

    const normalizedName = name.trim();
    const normalizedColumns = columnNames
      .map((columnName) => columnName.trim())
      .filter((columnName) => columnName.length > 0);

    if (!normalizedName) throw new Error('Dashboard name is required');
    if (normalizedColumns.length === 0) throw new Error('At least one column is required');
    ensureUniqueColumnNames(normalizedColumns);

    const columns: DashboardColumn[] = normalizedColumns.map((columnName, index) => ({
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `col-${Date.now()}-${index}`,
      name: columnName,
      order: index,
      isDone: index === normalizedColumns.length - 1,
    }));

    const ref = await addDoc(collection(db, 'todos'), {
      entityType: 'dashboard',
      userId,
      name: normalizedName,
      order:
        dashboards.reduce((maxOrder, dashboard) => Math.max(maxOrder, normalizeOrder(dashboard.order, 0)), -1) + 1,
      columns,
      sharedWith: [],
      sharedWithEmails: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    setActiveDashboardId(ref.id);
    return ref.id;
  };

  const reorderDashboards = async (orderedDashboardIds: string[]) => {
    if (!userId) throw new Error('User must be authenticated');
    if (orderedDashboardIds.length === 0) return;

    const nextOrderById = new Map(orderedDashboardIds.map((dashboardId, index) => [dashboardId, index]));
    const previousDashboards = dashboards;
    const nextDashboards = dashboards
      .map((dashboard) => {
        const nextOrder = nextOrderById.get(dashboard.id);
        if (nextOrder == null) return dashboard;
        return {
          ...dashboard,
          order: nextOrder,
        };
      })
      .sort(compareDashboardsByOrder);

    const changes = nextDashboards
      .map((dashboard) => ({
        id: dashboard.id,
        nextOrder: dashboard.order,
      }))
      .filter((entry) => previousDashboards.find((dashboard) => dashboard.id === entry.id)?.order !== entry.nextOrder);

    if (changes.length === 0) return;

    setDashboards(nextDashboards);

    const batch = writeBatch(db);
    const timestamp = Timestamp.now();

    changes.forEach((entry) => {
      batch.update(doc(db, 'todos', entry.id), {
        order: entry.nextOrder,
        updatedAt: timestamp,
      });
    });

    try {
      await batch.commit();
    } catch (error) {
      setDashboards(previousDashboards);
      throw error;
    }
  };

  const updateDashboard = async (dashboardId: string, name: string, columns: DashboardColumn[]) => {
    if (!userId) throw new Error('User must be authenticated');

    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Dashboard name is required');

    const normalizedColumns = columns
      .map((column, index) => ({
        id:
          typeof column.id === 'string' && column.id.trim().length > 0
            ? column.id
            : typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `col-${Date.now()}-${index}`,
        name: column.name.trim(),
        order: index,
        isDone: Boolean(column.isDone),
      }))
      .filter((column) => column.name.length > 0);

    if (normalizedColumns.length === 0) {
      throw new Error('At least one column is required');
    }

    ensureUniqueColumnNames(normalizedColumns.map((column) => column.name));

    const columnIds = new Set(normalizedColumns.map((column) => column.id));
    const fallbackColumnId = normalizedColumns[0].id;
    const currentDashboardOrder = normalizeOrder(
      dashboards.find((dashboard) => dashboard.id === dashboardId)?.order,
      0
    );
    const dashboardUpdateData = {
      name: normalizedName,
      order: currentDashboardOrder,
      columns: normalizedColumns,
      updatedAt: Timestamp.now(),
    };

    const todosQuery = query(
      collection(db, 'todos'),
      and(
        where('userId', '==', userId),
        where('entityType', '==', 'todo'),
        where('boardId', '==', dashboardId)
      )
    );
    const todosSnapshot = await getDocs(todosQuery);

    type TodoColumnRepair = {
      id: string;
      data: {
        columnId: string;
        status: string;
        updatedAt: Timestamp;
      };
    };

    const todoUpdates = todosSnapshot.docs
      .map((item) => {
        const data = item.data();
        const columnId = typeof data.columnId === 'string' ? data.columnId : typeof data.status === 'string' ? data.status : '';

        if (columnIds.has(columnId)) return null;

        return {
          id: item.id,
          data: {
            columnId: fallbackColumnId,
            status: fallbackColumnId,
            updatedAt: Timestamp.now(),
          },
        };
      })
      .filter((value): value is TodoColumnRepair => value !== null);

    if (todoUpdates.length <= 499) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'todos', dashboardId), dashboardUpdateData);

      todoUpdates.forEach((entry) => {
        batch.update(doc(db, 'todos', entry.id), entry.data);
      });

      await batch.commit();
      return;
    }

    // If updates exceed one batch, prefer schema-first to avoid todos pointing to a non-existent column schema.
    await updateDoc(doc(db, 'todos', dashboardId), dashboardUpdateData);
    await commitInBatches(todoUpdates);
  };

  const deleteDashboard = async (dashboardId: string) => {
    if (!userId) throw new Error('User must be authenticated');

    const dashboardsQuery = query(
      collection(db, 'todos'),
      and(where('userId', '==', userId), where('entityType', '==', 'dashboard'))
    );
    const dashboardsSnapshot = await getDocs(dashboardsQuery);

    const remainingDashboards = dashboardsSnapshot.docs
      .map((item) => {
        const data = item.data();
        const columns = Array.isArray(data.columns)
          ? data.columns
              .map((col, index) => ({
                id: typeof col?.id === 'string' ? col.id : `col-${index}`,
                name: typeof col?.name === 'string' ? col.name : `Column ${index + 1}`,
                order: typeof col?.order === 'number' ? col.order : index,
                isDone: typeof col?.isDone === 'boolean' ? col.isDone : col?.id === 'done',
              }))
              .sort((a, b) => a.order - b.order)
          : defaultColumns();

        return {
          id: item.id,
          order: typeof data.order === 'number' ? data.order : Number.NaN,
          createdAt: parseTimestamp(data.createdAt),
          columns,
        };
      })
      .filter((dashboard) => dashboard.id !== dashboardId)
      .map((dashboard, index) => ({
        ...dashboard,
        order: normalizeOrder(dashboard.order, index),
      }))
      .sort(compareDashboardsByOrder);

    if (remainingDashboards.length === 0) {
      throw new Error('At least one dashboard is required');
    }

    const fallbackDashboard = remainingDashboards[0];
    const fallbackColumnId = fallbackDashboard.columns[0]?.id;

    if (!fallbackColumnId) {
      throw new Error('Fallback dashboard must have at least one column');
    }

    const todosQuery = query(
      collection(db, 'todos'),
      and(
        where('userId', '==', userId),
        where('entityType', '==', 'todo'),
        where('boardId', '==', dashboardId)
      )
    );
    const todosSnapshot = await getDocs(todosQuery);

    const todoReassignments = todosSnapshot.docs
      .map((item) => ({
        id: item.id,
        data: {
          boardId: fallbackDashboard.id,
          columnId: fallbackColumnId,
          status: fallbackColumnId,
          updatedAt: Timestamp.now(),
        },
      }));

    await commitInBatches(todoReassignments);
    await deleteDoc(doc(db, 'todos', dashboardId));
    setActiveDashboardId(fallbackDashboard.id);
  };

  const shareDashboard = async (dashboardId: string, sharedWithUserIds: string[], sharedWithEmails: string[]) => {
    if (!userId) throw new Error('User must be authenticated');

    const dashboard = dashboards.find((item) => item.id === dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    if (dashboard.userId !== userId) throw new Error('Only dashboard owner can share access');

    const nextUserIds = Array.from(new Set(sharedWithUserIds.filter((id) => id && id !== userId)));
    const nextEmails = Array.from(new Set(sharedWithEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)));

    await updateDoc(doc(db, 'todos', dashboardId), {
      sharedWith: nextUserIds,
      sharedWithEmails: nextEmails,
      updatedAt: Timestamp.now(),
    });
  };

  const loading = loadedUserId !== userId;
  const visibleDashboards = useMemo(() => {
    if (loadedUserId !== userId) return [];

    return [...dashboards, ...sharedDashboards.filter((shared) => !dashboards.some((owned) => owned.id === shared.id))]
      .sort(compareDashboardsByOrder);
  }, [dashboards, loadedUserId, sharedDashboards, userId]);
  const visibleError = loadedUserId === userId ? error : null;
  const visibleActive = visibleDashboards.find((board) => board.id === activeDashboardId) ?? null;

  if (!userId) {
    return {
      dashboards: [],
      activeDashboard: null,
      activeDashboardId: null,
      setActiveDashboardId,
      loading: false,
      error: null,
      addDashboard,
      updateDashboard,
      deleteDashboard,
      reorderDashboards,
      shareDashboard,
    };
  }

  return {
    dashboards: visibleDashboards,
    activeDashboard: visibleActive,
    activeDashboardId,
    setActiveDashboardId,
    loading,
    error: visibleError,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    reorderDashboards,
    shareDashboard,
  };
};
