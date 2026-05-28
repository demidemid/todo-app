import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodos } from './useTodos';

const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockQuery = vi.fn();
const mockUpdateDoc = vi.fn();
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
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

const makeDoc = (id: string, data: Record<string, unknown>): SnapshotDoc => ({
  id,
  data: () => data,
});

describe('useTodos', () => {
  let snapshotNext: ((snapshot: { docs: SnapshotDoc[] }) => void) | null;
  let snapshotError: ((error: unknown) => void) | null;
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    snapshotNext = null;
    snapshotError = null;

    mockCollection.mockReturnValue({ path: 'todos' });
    mockWhere.mockReturnValue({ where: true });
    mockQuery.mockReturnValue({ query: true });
    mockDoc.mockImplementation((_, collectionName: string, id: string) => ({ path: `${collectionName}/${id}` }));
    mockOnSnapshot.mockImplementation((_, onNext, onErr) => {
      snapshotNext = onNext;
      snapshotError = onErr;
      return unsubscribeMock;
    });

    mockAddDoc.mockResolvedValue({ id: 'todo-created' });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('returns empty state and does not subscribe for unauthenticated user', () => {
    const { result } = renderHook(() => useTodos(null));

    expect(result.current.todos).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('loads todos, filters dashboard entities, and applies parsing fallbacks', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTodos('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDoc('dashboard-1', {
            entityType: 'dashboard',
            userId: 'user-1',
            name: 'Dashboard',
          }),
          makeDoc('todo-1', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Valid item',
            description: 'desc',
            status: 'in_progress',
            boardId: 'board-1',
            columnId: 'in_progress',
            weight: 1200,
            completed: false,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T01:00:00Z'),
          }),
          makeDoc('todo-2', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Legacy item',
            completed: true,
            createdAt: new Date('2026-01-02T00:00:00Z'),
            updatedAt: new Date('2026-01-02T01:00:00Z'),
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0]).toMatchObject({
      id: 'todo-1',
      status: 'in_progress',
      columnId: 'in_progress',
      boardId: 'board-1',
      weight: 1200,
      completed: false,
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('maps permission-denied snapshot errors to user-friendly message', async () => {
    const { result } = renderHook(() => useTodos('user-1'));

    act(() => {
      snapshotError?.({ code: 'permission-denied', message: 'rules reject' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Access denied by Firestore rules. Verify your Firestore Security Rules for authenticated users.'
      );
    });
  });

  it('maps Cloud Firestore API disabled errors with project id', async () => {
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-project');
    const { result } = renderHook(() => useTodos('user-1'));

    act(() => {
      snapshotError?.({
        code: 'permission-denied',
        message: 'Cloud Firestore API firestore.googleapis.com SERVICE_DISABLED',
      });
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Cloud Firestore API is disabled for project demo-project');
    });
  });

  it('sets timeout error when snapshot does not respond', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTodos('user-1'));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(
      'Timed out while loading todos. Firestore may be unavailable or blocked by project configuration.'
    );
  });

  it('surfaces synchronous subscribe errors', async () => {
    mockOnSnapshot.mockImplementationOnce(() => {
      throw new Error('subscribe failed');
    });

    const { result } = renderHook(() => useTodos('user-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('subscribe failed');
      expect(result.current.loading).toBe(false);
    });
  });

  it('addTodo writes required boardId and defaults columnId to todo', async () => {
    const { result } = renderHook(() => useTodos('user-1'));

    await act(async () => {
      const id = await result.current.addTodo(
        {
          title: 'Card',
          description: 'Desc',
        },
        { boardId: 'board-1' }
      );

      expect(id).toBe('todo-created');
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'todos' },
      expect.objectContaining({
        entityType: 'todo',
        userId: 'user-1',
        title: 'Card',
        description: 'Desc',
        boardId: 'board-1',
        columnId: 'todo',
        status: 'todo',
        completed: false,
      })
    );
  });

  it('addTodo marks completed when column is done', async () => {
    const { result } = renderHook(() => useTodos('user-1'));

    await act(async () => {
      await result.current.addTodo(
        {
          title: 'Ship',
          description: '',
        },
        { boardId: 'board-1', columnId: 'done' }
      );
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'todos' },
      expect.objectContaining({
        boardId: 'board-1',
        columnId: 'done',
        status: 'done',
        completed: true,
      })
    );
  });

  it('addTodo throws when user is not authenticated', async () => {
    const { result } = renderHook(() => useTodos(null));

    await expect(
      result.current.addTodo(
        {
          title: 'x',
          description: 'y',
        },
        { boardId: 'board-1' }
      )
    ).rejects.toThrow('User must be authenticated');
  });

  it('updateTodo writes updates with updatedAt', async () => {
    const { result } = renderHook(() => useTodos('user-1'));

    await act(async () => {
      await result.current.updateTodo('todo-1', {
        title: 'Updated',
      });
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'todos/todo-1' },
      expect.objectContaining({
        title: 'Updated',
        updatedAt: expect.any(Object),
      })
    );
  });

  it('deleteTodo removes document by id', async () => {
    const { result } = renderHook(() => useTodos('user-1'));

    await act(async () => {
      await result.current.deleteTodo('todo-5');
    });

    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: 'todos/todo-5' });
  });
});
