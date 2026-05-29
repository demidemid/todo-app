import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { useTodoModalController } from './useTodoModalController';

const mockUseComments = vi.fn();

vi.mock('../../hooks/useComments', () => ({
  useComments: (todoId: string | null) => mockUseComments(todoId),
}));

const todo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Card',
  description: '<p>Description</p>',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'todo',
  weight: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('useTodoModalController', () => {
  const addComment = vi.fn<(...args: unknown[]) => Promise<void>>();

  beforeEach(() => {
    vi.clearAllMocks();
    addComment.mockResolvedValue(undefined);
    mockUseComments.mockReturnValue({
      comments: [],
      loading: false,
      error: null,
      addComment,
    });
  });

  it('ignores blank comment submissions', async () => {
    const { result } = renderHook(() =>
      useTodoModalController({ todo, userId: 'user-1', userEmail: 'user@example.com' })
    );

    act(() => {
      result.current.setCommentText('   ');
    });

    await act(async () => {
      await result.current.handleAddComment({ preventDefault() {} } as React.FormEvent);
    });

    expect(addComment).not.toHaveBeenCalled();
    expect(result.current.commentSubmitting).toBe(false);
  });

  it('submits trimmed comments with userEmail and clears the draft', async () => {
    const { result } = renderHook(() =>
      useTodoModalController({ todo, userId: 'user-1', userEmail: 'user@example.com' })
    );

    act(() => {
      result.current.setCommentText('  Need follow-up  ');
    });

    await act(async () => {
      await result.current.handleAddComment({ preventDefault() {} } as React.FormEvent);
    });

    expect(addComment).toHaveBeenCalledWith('user-1', 'Need follow-up', 'user@example.com');
    expect(result.current.commentText).toBe('');
    expect(result.current.commentError).toBe('');
  });

  it('submits without userEmail and reports failures', async () => {
    addComment.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() =>
      useTodoModalController({ todo, userId: 'user-1' })
    );

    act(() => {
      result.current.setCommentText('Hello');
    });

    await act(async () => {
      await result.current.handleAddComment({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.commentError).toBe('Failed to add comment');
    });
    expect(addComment).toHaveBeenCalledWith('user-1', 'Hello');
    expect(result.current.commentSubmitting).toBe(false);
  });
});
