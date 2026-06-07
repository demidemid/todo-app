import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodos } from './useTodos';

const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
const mockDisableNetwork = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();
const mockEnableNetwork = vi.fn();
const mockOnSnapshot = vi.fn();
const mockQuery = vi.fn();
const mockAnd = vi.fn();
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
  disableNetwork: (...args: unknown[]) => mockDisableNetwork(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  enableNetwork: (...args: unknown[]) => mockEnableNetwork(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  and: (...args: unknown[]) => mockAnd(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
  metadata?: { hasPendingWrites?: boolean };
};

const makeDoc = (id: string, data: Record<string, unknown>, hasPendingWrites = false): SnapshotDoc => ({
  id,
  data: () => data,
  metadata: { hasPendingWrites },
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
    mockAnd.mockReturnValue({ and: true });
    mockQuery.mockReturnValue({ query: true });
    mockDoc.mockImplementation((_, collectionName: string, id: string) => ({ path: `${collectionName}/${id}` }));
    mockOnSnapshot.mockImplementation((_, onNext, onErr) => {
      snapshotNext = onNext;
      snapshotError = onErr;
      return unsubscribeMock;
    });

    mockAddDoc.mockResolvedValue({ id: 'todo-created' });
    mockDisableNetwork.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockEnableNetwork.mockResolvedValue(undefined);
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
            archived: true,
            dueDate: '2026-02-01',
            isCompleted: false,
            completedAt: null,
            remindOneDayBefore: true,
            reminderScheduledAt: '2026-01-31T09:00:00.000Z',
            status: 'in_progress',
            boardId: 'board-1',
            columnId: 'in_progress',
            weight: 1200,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T01:00:00Z'),
          }),
          makeDoc('todo-2', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Legacy item',
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
      archived: true,
      status: 'in_progress',
      columnId: 'in_progress',
      boardId: 'board-1',
      weight: 1200,
      dueDate: '2026-02-01',
      isCompleted: false,
      remindOneDayBefore: true,
      reminderScheduledAt: '2026-01-31T09:00:00.000Z',
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('normalizes mismatched status and columnId to columnId', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTodos('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDoc('todo-1', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Mismatch card',
            boardId: 'board-1',
            status: 'todo',
            columnId: 'in_progress',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:10:00Z'),
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
      isCompleted: false,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Todo has mismatched status and columnId; using columnId as source of truth.',
      expect.objectContaining({
        id: 'todo-1',
        status: 'todo',
        columnId: 'in_progress',
      })
    );

    warnSpy.mockRestore();
  });

  it('keeps todos with pending local writes in snapshot projection', async () => {
    const { result } = renderHook(() => useTodos('user-1'));

    act(() => {
      snapshotNext?.({
        docs: [
          makeDoc(
            'todo-pending',
            {
              entityType: 'todo',
              userId: 'user-1',
              title: 'Pending card',
              boardId: 'board-1',
              status: 'done',
              columnId: 'done',
              createdAt: new Date('2026-01-01T00:00:00Z'),
              updatedAt: new Date('2026-01-01T00:01:00Z'),
            },
            true
          ),
          makeDoc('todo-committed', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Committed card',
            boardId: 'board-1',
            status: 'todo',
            columnId: 'todo',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:02:00Z'),
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.todos).toHaveLength(2);
    expect(result.current.todos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'todo-pending', columnId: 'done', status: 'done' }),
        expect.objectContaining({ id: 'todo-committed', columnId: 'todo', status: 'todo' }),
      ])
    );
  });

  it('maps permission-denied snapshot errors to user-friendly message', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTodos('user-1'));

    act(() => {
      snapshotError?.({ code: 'permission-denied', message: 'rules reject' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Access denied by Firestore rules. Verify your Firestore Security Rules for authenticated users.'
      );
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
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

  it('treats permission-denied from shared board subscription as non-fatal', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTodos('user-1', [{ id: 'board-shared', userId: 'owner-2' }]));

    act(() => {
      snapshotError?.({ code: 'permission-denied', message: 'rules reject shared board' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.todos).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('treats permission-denied from owner board chunk subscription as non-fatal', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useTodos('user-1', [{ id: 'board-owned', userId: 'user-1' }]));

    act(() => {
      snapshotError?.({ code: 'permission-denied', message: 'rules reject owner chunk' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.todos).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('surfaces non-permission chunk subscription errors', async () => {
    const callbacks: Array<{ onNext: (snapshot: { docs: SnapshotDoc[] }) => void; onError: (error: unknown) => void }> = [];
    mockOnSnapshot.mockImplementation((_, onNext, onErr) => {
      callbacks.push({ onNext, onError: onErr });
      return unsubscribeMock;
    });

    const { result } = renderHook(() => useTodos('user-1', [{ id: 'board-owned', userId: 'user-1' }]));

    act(() => {
      callbacks[0]?.onError({ code: 'unavailable', message: 'network down' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Unexpected Firestore error');
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles parse failure in chunked snapshot callback', async () => {
    const callbacks: Array<{ onNext: (snapshot: { docs: SnapshotDoc[] }) => void; onError: (error: unknown) => void }> = [];
    mockOnSnapshot.mockImplementation((_, onNext, onErr) => {
      callbacks.push({ onNext, onError: onErr });
      return unsubscribeMock;
    });

    const { result } = renderHook(() => useTodos('user-1', [{ id: 'board-owned', userId: 'user-1' }]));

    const malformedDoc: SnapshotDoc = {
      id: 'todo-bad',
      data: () => {
        throw new Error('bad snapshot payload');
      },
    };

    act(() => {
      callbacks[0]?.onNext({ docs: [malformedDoc] });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('bad snapshot payload');
      expect(result.current.loading).toBe(false);
    });
  });

  it('merges duplicate todos from owner/shared subscriptions by latest updatedAt', async () => {
    const callbacks: Array<{ onNext: (snapshot: { docs: SnapshotDoc[] }) => void; onError: (error: unknown) => void }> = [];
    mockOnSnapshot.mockImplementation((_, onNext, onErr) => {
      callbacks.push({ onNext, onError: onErr });
      return unsubscribeMock;
    });

    const { result } = renderHook(() =>
      useTodos('user-1', [
        { id: 'board-1', userId: 'user-1' },
        { id: 'board-1', userId: 'owner-2', readAllTodos: true },
      ])
    );

    act(() => {
      callbacks[0]?.onNext({
        docs: [
          makeDoc('todo-1', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Card',
            boardId: 'board-1',
            columnId: 'todo',
            status: 'todo',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          }),
        ],
      });

      callbacks[1]?.onNext({
        docs: [
          makeDoc('todo-1', {
            entityType: 'todo',
            userId: 'user-1',
            title: 'Card',
            boardId: 'board-1',
            columnId: 'done',
            status: 'done',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:01:00Z'),
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
      columnId: 'done',
      status: 'done',
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

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        entityType: 'todo',
        userId: 'user-1',
        title: 'Card',
        description: 'Desc',
        boardId: 'board-1',
        dueDate: null,
        isCompleted: false,
        completedAt: null,
        remindOneDayBefore: false,
        reminderScheduledAt: null,
        columnId: 'todo',
        status: 'todo',
      })
    );
    expect(payload).not.toHaveProperty('archived');
  });

  it('addTodo keeps status and column aligned for done column', async () => {
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

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        boardId: 'board-1',
        columnId: 'done',
        status: 'done',
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

    it('updateTodo persists due date and reminder fields', async () => {
      const { result } = renderHook(() => useTodos('user-1'));

      await act(async () => {
        await result.current.updateTodo('todo-1', {
          dueDate: '2026-06-05',
          remindOneDayBefore: true,
          reminderScheduledAt: '2026-06-04T09:00:00.000Z',
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: 'todos/todo-1' },
        expect.objectContaining({
          dueDate: '2026-06-05',
          remindOneDayBefore: true,
          reminderScheduledAt: '2026-06-04T09:00:00.000Z',
          updatedAt: expect.any(Object),
        })
      );
    });

    it('updateTodo persists clearing due date', async () => {
      const { result } = renderHook(() => useTodos('user-1'));

      await act(async () => {
        await result.current.updateTodo('todo-1', {
          dueDate: null,
          remindOneDayBefore: false,
          reminderScheduledAt: null,
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: 'todos/todo-1' },
        expect.objectContaining({
          dueDate: null,
          remindOneDayBefore: false,
          reminderScheduledAt: null,
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
