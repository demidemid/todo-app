import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  query,
  Timestamp,
  updateDoc,
  and,
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

export const useDashboards = (userId: string | null) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const hasResolvedInitialSelectionRef = useRef(false);
  const hasMigratedLegacyTodosRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    hasResolvedInitialSelectionRef.current = false;
    hasMigratedLegacyTodosRef.current = false;

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
            columns,
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          };
        });

        if (items.length === 0) {
          try {
            await setDoc(doc(db, 'todos', `default-dashboard-${userId}`), {
              entityType: 'dashboard',
              userId,
              name: 'My Dashboard',
              columns: defaultColumns(),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            // Stop showing loader while waiting for the next snapshot with created dashboard.
            setError(null);
            setLoadedUserId(userId);
          } catch (bootstrapError) {
            setError(bootstrapError instanceof Error ? bootstrapError.message : 'Failed to create default dashboard');
            setDashboards([]);
            setLoadedUserId(userId);
          }
          return;
        }

        items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        let migrationErrorMessage: string | null = null;

        if (!hasMigratedLegacyTodosRef.current) {
          hasMigratedLegacyTodosRef.current = true;

          try {
            const defaultBoard = items[0];
            const defaultColumnId = defaultBoard.columns[0]?.id;

            if (defaultColumnId) {
              const todosQuery = query(collection(db, 'todos'), where('userId', '==', userId));
              const todosSnapshot = await getDocs(todosQuery);

              const migrationPromises = todosSnapshot.docs
                .filter((item) => item.data().entityType !== 'dashboard')
                .map((item) => {
                  const data = item.data();
                  const hasBoardId = typeof data.boardId === 'string' && data.boardId.length > 0;
                  const hasColumnId = typeof data.columnId === 'string' && data.columnId.length > 0;

                  if (hasBoardId && hasColumnId) return null;

                  const nextBoardId = hasBoardId ? data.boardId : defaultBoard.id;
                  const nextColumnId =
                    hasColumnId
                      ? data.columnId
                      : typeof data.status === 'string' && data.status.length > 0
                        ? data.status
                        : defaultColumnId;

                  return updateDoc(doc(db, 'todos', item.id), {
                    boardId: nextBoardId,
                    columnId: nextColumnId,
                    status: nextColumnId,
                    updatedAt: Timestamp.now(),
                  });
                })
                .filter((value): value is Promise<void> => value !== null);

              await Promise.all(migrationPromises);
            }
          } catch (migrationError) {
            hasMigratedLegacyTodosRef.current = false;
            migrationErrorMessage =
              migrationError instanceof Error ? migrationError.message : 'Failed to migrate legacy todos';
          }
        }

        setDashboards(items);
        setError(migrationErrorMessage);
        setLoadedUserId(userId);

        setActiveDashboardId((prev) => {
          if (prev && items.some((board) => board.id === prev)) {
            hasResolvedInitialSelectionRef.current = true;
            return prev;
          }

          // Keep explicit collapsed state across realtime updates.
          if (prev === null && hasResolvedInitialSelectionRef.current) {
            return null;
          }

          hasResolvedInitialSelectionRef.current = true;
          return items[0].id;
        });
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Failed to load dashboards');
        setDashboards([]);
        setLoadedUserId(userId);
      }
    );

    return () => unsub();
  }, [userId]);

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
      columns,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    setActiveDashboardId(ref.id);
    return ref.id;
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

    const todosQuery = query(collection(db, 'todos'), where('userId', '==', userId));
    const todosSnapshot = await getDocs(todosQuery);

    const fixColumnPromises = todosSnapshot.docs
      .filter((item) => item.data().entityType !== 'dashboard' && item.data().boardId === dashboardId)
      .map((item) => {
        const data = item.data();
        const columnId = typeof data.columnId === 'string' ? data.columnId : typeof data.status === 'string' ? data.status : '';

        if (columnIds.has(columnId)) return null;

        return updateDoc(doc(db, 'todos', item.id), {
          columnId: fallbackColumnId,
          status: fallbackColumnId,
          updatedAt: Timestamp.now(),
        });
      })
      .filter((value): value is Promise<void> => value !== null);

    await Promise.all(fixColumnPromises);

    await updateDoc(doc(db, 'todos', dashboardId), {
      name: normalizedName,
      columns: normalizedColumns,
      updatedAt: Timestamp.now(),
    });
  };

  const deleteDashboard = async (dashboardId: string) => {
    if (!userId) throw new Error('User must be authenticated');

    const remainingDashboards = dashboards.filter((dashboard) => dashboard.id !== dashboardId);
    if (remainingDashboards.length === 0) {
      throw new Error('At least one dashboard is required');
    }

    const fallbackDashboard = remainingDashboards[0];
    const fallbackColumnId = fallbackDashboard.columns[0]?.id;

    if (!fallbackColumnId) {
      throw new Error('Fallback dashboard must have at least one column');
    }

    const todosQuery = query(collection(db, 'todos'), where('userId', '==', userId));
    const todosSnapshot = await getDocs(todosQuery);

    const reassignPromises = todosSnapshot.docs
      .filter((item) => item.data().entityType !== 'dashboard' && item.data().boardId === dashboardId)
      .map((item) =>
        updateDoc(doc(db, 'todos', item.id), {
          boardId: fallbackDashboard.id,
          columnId: fallbackColumnId,
          status: fallbackColumnId,
          updatedAt: Timestamp.now(),
        })
      );

    await Promise.all(reassignPromises);
    await deleteDoc(doc(db, 'todos', dashboardId));
    setActiveDashboardId(fallbackDashboard.id);
  };

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
    };
  }

  const loading = loadedUserId !== userId;
  const visibleDashboards = loadedUserId === userId ? dashboards : [];
  const visibleError = loadedUserId === userId ? error : null;
  const visibleActive = visibleDashboards.find((board) => board.id === activeDashboardId) ?? null;

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
  };
};
