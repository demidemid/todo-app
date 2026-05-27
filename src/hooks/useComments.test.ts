import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComments } from './useComments';

const mockDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn();
const mockArrayUnion = vi.fn((value) => value);

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
  });

  it('sorts comments newest first', async () => {
    const { result } = renderHook(() => useComments('todo-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments.map((item) => item.id)).toEqual(['c-new', 'c-old']);
  });

  it('passes userEmail when adding a comment', async () => {
    const { result } = renderHook(() => useComments('todo-1'));

    await result.current.addComment('u-42', 'hello', 'author@example.com');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'todos/todo-1' },
      {
        comments: expect.objectContaining({
          id: expect.any(String),
          todoId: 'todo-1',
          userId: 'u-42',
          userEmail: 'author@example.com',
          text: 'hello',
        }),
      }
    );
  });
});