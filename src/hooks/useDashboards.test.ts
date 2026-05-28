import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboards } from './useDashboards';
import type { DashboardColumn } from '../types/dashboard';

const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockQuery = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockWriteBatch = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();
const mockAnd = vi.fn();
const mockWhere = vi.fn();

vi.mock('firebase/firestore', () => ({
  Timestamp: class TimestampMock {
    private date: Date;

    constructor(date: Date) {
      this.date = date;
    }

    toDate() {
      return this.date;
    }

    static now() {
      return new TimestampMock(new Date('2026-01-10T12:00:00Z'));
    }
  },
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  and: (...args: unknown[]) => mockAnd(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

const makeSnapshotDoc = (id: string, data: Record<string, unknown>): SnapshotDoc => ({
  id,
  data: () => data,
});

const makeDashboardDoc = (
  id: string,
  name: string,
  createdAt: Date,
  columns: Array<{ id: string; name: string; order: number }>
): SnapshotDoc =>
  makeSnapshotDoc(id, {
    entityType: 'dashboard',
    userId: 'user-1',
    name,
    columns,
    createdAt,
    updatedAt: createdAt,
  });

const makeTodoDoc = (
  id: string,
  data: Partial<{
    boardId: string;
    columnId: string;
    status: string;
    entityType: string;
  }> = {}
): SnapshotDoc =>
  makeSnapshotDoc(id, {
    entityType: data.entityType ?? 'todo',
    userId: 'user-1',
    boardId: data.boardId,
    columnId: data.columnId,
    status: data.status,
  });

describe('useDashboards', () => {
  let snapshotNext: ((snapshot: { docs: SnapshotDoc[] }) => void) | null;
  let snapshotError: ((error: { message?: string }) => void) | null;
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    snapshotNext = null;
    snapshotError = null;

    mockCollection.mockReturnValue({ path: 'todos' });
    mockQuery.mockReturnValue({ query: true });
    mockAnd.mockReturnValue({ and: true });
    mockWhere.mockReturnValue({ where: true });
    mockDoc.mockImplementation((_, collectionName: string, id: string) => ({ path: `${collectionName}/${id}` }));
    mockOnSnapshot.mockImplementation((_, onNext, onErr) => {
      snapshotNext = onNext;
      snapshotError = onErr;
      return unsubscribeMock;
    });
    mockAddDoc.mockResolvedValue({ id: 'new-board-id' });
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockBatchUpdate.mockReset();
    mockBatchCommit.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);
    mockWriteBatch.mockReturnValue({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    });
  });

  it('returns empty state for unauthenticated user', () => {
    const { result } = renderHook(() => useDashboards(null));

    expect(result.current.dashboards).toEqual([]);
    expect(result.current.activeDashboard).toBeNull();
    expect(result.current.activeDashboardId).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('loads dashboards and auto-selects first by createdAt', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    expect(result.current.loading).toBe(true);

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-newer', 'Newer', new Date('2026-01-03T00:00:00Z'), [
            { id: 'todo', name: 'To do', order: 0, isDone: false },
          ]),
          makeDashboardDoc('board-older', 'Older', new Date('2026-01-01T00:00:00Z'), [
            { id: 'todo', name: 'To do', order: 0, isDone: false },
          ]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.dashboards.map((item) => item.id)).toEqual(['board-older', 'board-newer']);
    expect(result.current.activeDashboardId).toBe('board-older');
    expect(result.current.activeDashboard?.id).toBe('board-older');
  });

  it('keeps explicit collapsed state after subsequent snapshots', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    const docs = [
      makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
      makeDashboardDoc('board-2', 'Board 2', new Date('2026-01-02T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
    ];

    act(() => {
      snapshotNext?.({ docs });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-1');
    });

    act(() => {
      result.current.setActiveDashboardId(null);
    });

    expect(result.current.activeDashboardId).toBeNull();

    act(() => {
      snapshotNext?.({ docs });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBeNull();
      expect(result.current.activeDashboard).toBeNull();
    });
  });

  it('preserves existing active dashboard when it is still present', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
          makeDashboardDoc('board-2', 'Board 2', new Date('2026-01-02T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-1');
    });

    act(() => {
      result.current.setActiveDashboardId('board-2');
    });

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1 edited', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
          makeDashboardDoc('board-2', 'Board 2 edited', new Date('2026-01-02T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-2');
    });
  });

  it('falls back to first dashboard when active one disappears', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
          makeDashboardDoc('board-2', 'Board 2', new Date('2026-01-02T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-1');
    });

    act(() => {
      result.current.setActiveDashboardId('board-2');
    });

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-1');
    });
  });

  it('auto-selects again when user changes', async () => {
    const { result, rerender } = renderHook(({ userId }: { userId: string | null }) => useDashboards(userId), {
      initialProps: { userId: 'user-1' },
    });

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-1');
    });

    act(() => {
      result.current.setActiveDashboardId(null);
    });

    rerender({ userId: 'user-2' });

    act(() => {
      snapshotNext?.({
        docs: [
          makeSnapshotDoc('board-x', {
            entityType: 'dashboard',
            userId: 'user-2',
            name: 'User 2 board',
            columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
            createdAt: new Date('2026-01-05T00:00:00Z'),
            updatedAt: new Date('2026-01-05T00:00:00Z'),
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.activeDashboardId).toBe('board-x');
    });
  });

  it('creates default dashboard when snapshot is empty', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    await act(async () => {
      snapshotNext?.({ docs: [] });
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'todos/default-dashboard-user-1' },
      expect.objectContaining({
        entityType: 'dashboard',
        userId: 'user-1',
        name: 'My Dashboard',
      })
    );
    expect(mockAddDoc).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('surfaces error when default dashboard bootstrap fails', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('permission denied'));
    const { result } = renderHook(() => useDashboards('user-1'));

    await act(async () => {
      snapshotNext?.({ docs: [] });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('permission denied');
      expect(result.current.dashboards).toEqual([]);
    });
  });

  it('surfaces snapshot error and clears dashboards', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    act(() => {
      snapshotError?.({ message: 'boom' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('boom');
    });

    expect(result.current.dashboards).toEqual([]);
  });

  it('addDashboard validates and writes normalized dashboard', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    await expect(result.current.addDashboard(' ', ['todo'])).rejects.toThrow('Dashboard name is required');
    await expect(result.current.addDashboard('Board', [' ', ''])).rejects.toThrow('At least one column is required');
    await expect(result.current.addDashboard('Board', ['Todo', ' todo '])).rejects.toThrow(
      'Column names must be unique within a dashboard'
    );

    await act(async () => {
      await result.current.addDashboard('  Product  ', [' Backlog ', 'Doing']);
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'todos' },
      expect.objectContaining({
        entityType: 'dashboard',
        userId: 'user-1',
        name: 'Product',
        columns: [
          expect.objectContaining({ name: 'Backlog', order: 0 }),
          expect.objectContaining({ name: 'Doing', order: 1 }),
        ],
      })
    );
  });

  it('updateDashboard validates input and repairs out-of-range todo columns', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    const columns: DashboardColumn[] = [
      { id: 'todo', name: 'To do', order: 0, isDone: false },
      { id: 'doing', name: 'Doing', order: 1, isDone: false },
    ];

    await expect(result.current.updateDashboard('board-1', ' ', columns)).rejects.toThrow('Dashboard name is required');
    await expect(result.current.updateDashboard('board-1', 'Board', [])).rejects.toThrow('At least one column is required');
    await expect(
      result.current.updateDashboard('board-1', 'Board', [
        { id: 'todo', name: 'Same', order: 0 },
        { id: 'doing', name: ' same ', order: 1 },
      ])
    ).rejects.toThrow('Column names must be unique within a dashboard');

    mockGetDocs.mockResolvedValueOnce({
      docs: [
        makeTodoDoc('todo-ok', { boardId: 'board-1', columnId: 'todo', status: 'todo' }),
        makeTodoDoc('todo-bad', { boardId: 'board-1', columnId: 'missing', status: 'missing' }),
        makeTodoDoc('todo-other', { boardId: 'other', columnId: 'missing', status: 'missing' }),
      ],
    });

    await result.current.updateDashboard('board-1', 'Board Updated', columns);

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { path: 'todos/board-1' },
      expect.objectContaining({
        name: 'Board Updated',
        columns: [
          { id: 'todo', name: 'To do', order: 0, isDone: false },
          { id: 'doing', name: 'Doing', order: 1, isDone: false },
        ],
      })
    );
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { path: 'todos/todo-bad' },
      expect.objectContaining({
        columnId: 'todo',
        status: 'todo',
      })
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('deleteDashboard validates and reassigns todos before deleting dashboard', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
          makeDashboardDoc('board-2', 'Board 2', new Date('2026-01-02T00:00:00Z'), [{ id: 'qa', name: 'QA', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.dashboards).toHaveLength(2);
    });

    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0 }]),
          makeDashboardDoc('board-2', 'Board 2', new Date('2026-01-02T00:00:00Z'), [{ id: 'qa', name: 'QA', order: 0 }]),
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          makeTodoDoc('todo-1', { boardId: 'board-1', columnId: 'todo', status: 'todo' }),
          makeTodoDoc('todo-2', { boardId: 'board-2', columnId: 'qa', status: 'qa' }),
        ],
      });

    await act(async () => {
      await result.current.deleteDashboard('board-1');
    });

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { path: 'todos/todo-1' },
      expect.objectContaining({
        boardId: 'board-2',
        columnId: 'qa',
        status: 'qa',
      })
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: 'todos/board-1' });
  });

  it('deleteDashboard throws when only one dashboard remains', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.dashboards).toHaveLength(1);
    });

    mockGetDocs.mockResolvedValueOnce({
      docs: [makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0 }])],
    });

    await expect(result.current.deleteDashboard('board-1')).rejects.toThrow('At least one dashboard is required');
  });

  it('deleteDashboard uses firestore dashboards when local state is stale', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0 }]),
          makeDashboardDoc('board-2', 'Board 2', new Date('2026-01-02T00:00:00Z'), [{ id: 'qa', name: 'QA', order: 0 }]),
        ],
      })
      .mockResolvedValueOnce({ docs: [] });

    await act(async () => {
      await result.current.deleteDashboard('board-1');
    });

    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: 'todos/board-1' });
  });

  it('retries legacy migration after failure and clears error on success', async () => {
    const { result } = renderHook(() => useDashboards('user-1'));

    mockGetDocs.mockResolvedValue({
      docs: [makeTodoDoc('legacy-1', { status: 'todo' })],
    });
    mockUpdateDoc
      .mockRejectedValueOnce(new Error('migration failed'))
      .mockResolvedValueOnce(undefined);

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('migration failed');
    });

    act(() => {
      snapshotNext?.({
        docs: [
          makeDashboardDoc('board-1', 'Board 1', new Date('2026-01-01T00:00:00Z'), [{ id: 'todo', name: 'To do', order: 0, isDone: false }]),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  });
});
