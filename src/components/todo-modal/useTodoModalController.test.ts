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
  const updateComment = vi.fn<(...args: unknown[]) => Promise<void>>();
  const deleteComment = vi.fn<(...args: unknown[]) => Promise<void>>();

  beforeEach(() => {
    vi.clearAllMocks();
    addComment.mockResolvedValue(undefined);
    updateComment.mockResolvedValue(undefined);
    deleteComment.mockResolvedValue(undefined);
    mockUseComments.mockReturnValue({
      comments: [],
      loading: false,
      error: null,
      addComment,
      updateComment,
      deleteComment,
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

  it('submits trimmed comments with user profile meta and clears the draft', async () => {
    const { result } = renderHook(() =>
      useTodoModalController({
        todo,
        userId: 'user-1',
        userEmail: 'user@example.com',
        userName: 'Alice',
        userAvatarId: 'fox',
      })
    );

    act(() => {
      result.current.setCommentText('  Need follow-up  ');
    });

    await act(async () => {
      await result.current.handleAddComment({ preventDefault() {} } as React.FormEvent);
    });

    expect(addComment).toHaveBeenCalledWith('user-1', 'Need follow-up', {
      email: 'user@example.com',
      name: 'Alice',
      avatarId: 'fox',
    });
    expect(result.current.commentText).toBe('');
    expect(result.current.commentError).toBe('');
  });

  it('submits without user profile and reports failures', async () => {
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
    expect(addComment).toHaveBeenCalledWith('user-1', 'Hello', {
      email: undefined,
      name: undefined,
      avatarId: undefined,
    });
    expect(result.current.commentSubmitting).toBe(false);
  });

  it('edits own comment through updateComment and clears editing state', async () => {
    const { result } = renderHook(() =>
      useTodoModalController({ todo, userId: 'user-1', userEmail: 'user@example.com' })
    );

    act(() => {
      result.current.handleStartEditComment('c-1', 'old text');
      result.current.setEditingCommentText('  new text  ');
    });

    await act(async () => {
      await result.current.handleSaveEditComment();
    });

    expect(updateComment).toHaveBeenCalledWith('c-1', 'user-1', 'new text');
    expect(result.current.editingCommentId).toBeNull();
    expect(result.current.editingCommentText).toBe('');
  });

  it('deletes own comment through deleteComment', async () => {
    const { result } = renderHook(() =>
      useTodoModalController({ todo, userId: 'user-1', userEmail: 'user@example.com' })
    );

    await act(async () => {
      await result.current.handleDeleteComment('c-2');
    });

    expect(deleteComment).toHaveBeenCalledWith('c-2', 'user-1');
  });
});
