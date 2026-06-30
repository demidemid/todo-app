import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComments } from './useComments';

const mockDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn();
const mockArrayUnion = vi.fn((value) => value);
const mockRunTransaction = vi.fn();

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
      return new TimestampMock(new Date('2026-01-03T12:00:00Z'));
    }
  },
  arrayUnion: (value: unknown) => mockArrayUnion(value),
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({ path: 'todos/todo-1' });
    mockOnSnapshot.mockImplementation((_, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          comments: [
            {
              id: 'c-old',
              todoId: 'todo-1',
              userId: 'u-1',
              userEmail: 'old@example.com',
              text: 'older',
              createdAt: new Date('2026-01-01T10:00:00Z'),
            },
            {
              id: 'c-new',
              todoId: 'todo-1',
              userId: 'u-2',
              userEmail: 'new@example.com',
              text: 'newer',
              createdAt: new Date('2026-01-02T10:00:00Z'),
            },
          ],
        }),
      });
      return vi.fn();
    });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockRunTransaction.mockImplementation(async (_dbArg, callback) => {
      const transaction = {
        get: vi.fn(async () => ({
          exists: () => true,
          data: () => ({
            comments: [
              {
                id: 'c-1',
                todoId: 'todo-1',
                userId: 'u-1',
                userEmail: 'old@example.com',
                text: 'older',
                createdAt: new Date('2026-01-01T10:00:00Z'),
              },
            ],
          }),
        })),
        update: vi.fn(),
      };
      await callback(transaction);
      return transaction;
    });
  });

  it('sorts comments newest first', async () => {
    const { result } = renderHook(() => useComments('todo-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments.map((item) => item.id)).toEqual(['c-new', 'c-old']);
  });

  it('passes user profile metadata when adding a comment', async () => {
    const { result } = renderHook(() => useComments('todo-1'));

    await result.current.addComment('u-42', 'hello', {
      email: 'author@example.com',
      name: 'Author',
      avatarId: 'fox',
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'todos/todo-1' },
      {
        comments: expect.objectContaining({
          id: expect.any(String),
          todoId: 'todo-1',
          userId: 'u-42',
          userEmail: 'author@example.com',
          userName: 'Author',
          userAvatarId: 'fox',
          text: 'hello',
        }),
        updatedAt: expect.any(Object),
      }
    );
  });

  it('returns an idle state when todoId is null and addComment rejects', async () => {
    const { result } = renderHook(() => useComments(null));

    expect(result.current.comments).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await expect(result.current.addComment('u-1', 'hello')).rejects.toThrow('No todoId');
    await expect(result.current.updateComment('c-1', 'u-1', 'updated')).rejects.toThrow('No todoId');
    await expect(result.current.deleteComment('c-1', 'u-1')).rejects.toThrow('No todoId');
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('updates own comment text via transaction', async () => {
    const { result } = renderHook(() => useComments('todo-1'));

    await result.current.updateComment('c-1', 'u-1', 'updated text');

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    const transaction = await mockRunTransaction.mock.results[0].value;
    expect(transaction.update).toHaveBeenCalledWith(
      { path: 'todos/todo-1' },
      expect.objectContaining({
        comments: [
          expect.objectContaining({
            id: 'c-1',
            text: 'updated text',
          }),
        ],
        updatedAt: expect.any(Object),
      })
    );
  });

  it('deletes own comment via transaction', async () => {
    const { result } = renderHook(() => useComments('todo-1'));

    await result.current.deleteComment('c-1', 'u-1');

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    const transaction = await mockRunTransaction.mock.results[0].value;
    expect(transaction.update).toHaveBeenCalledWith(
      { path: 'todos/todo-1' },
      expect.objectContaining({ comments: [], updatedAt: expect.any(Object) })
    );
  });

  it('handles a missing todo document by exposing an empty loaded state', async () => {
    mockOnSnapshot.mockImplementationOnce((_, onNext) => {
      onNext({
        exists: () => false,
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useComments('todo-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('surfaces snapshot errors for the active todo', async () => {
    mockOnSnapshot.mockImplementationOnce((_, __, onError) => {
      onError({ message: 'Permission denied' });
      return vi.fn();
    });

    const { result } = renderHook(() => useComments('todo-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toEqual([]);
    expect(result.current.error).toBe('Permission denied');
  });

  it('normalizes malformed comments and falls back to epoch for unsupported timestamps', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockOnSnapshot.mockImplementationOnce((_, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          comments: [
            {
              createdAt: 'not-a-date',
            },
            {
              id: 'c-good',
              todoId: 'todo-1',
              userId: 'user-2',
              text: 'ready',
              createdAt: new Date('2026-01-03T10:00:00Z'),
            },
          ],
        }),
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useComments('todo-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments[0]).toMatchObject({ id: 'c-good', text: 'ready' });
    expect(result.current.comments[1]).toMatchObject({
      id: 'todo-1-0',
      todoId: 'todo-1',
      userId: 'unknown',
      text: '',
    });
    expect(result.current.comments[1].createdAt.getTime()).toBe(0);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('uses fallback error text when snapshot error has no message', async () => {
    mockOnSnapshot.mockImplementationOnce((_, __, onError) => {
      onError({});
      return vi.fn();
    });

    const { result } = renderHook(() => useComments('todo-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load comments');
  });
});