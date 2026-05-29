import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { useTodoModalEditor } from './useTodoModalEditor';

const baseTodo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Original title',
  description: '<p>Original description</p>',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'todo',
  weight: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('useTodoModalEditor', () => {
  const updateTodo = vi.fn<(...args: unknown[]) => Promise<void>>();
  const deleteTodo = vi.fn<(...args: unknown[]) => Promise<void>>();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    updateTodo.mockResolvedValue(undefined);
    deleteTodo.mockResolvedValue(undefined);
  });

  it('blocks saving when title is empty', async () => {
    const { result } = renderHook(() =>
      useTodoModalEditor({ todo: baseTodo, onClose, updateTodo, deleteTodo })
    );

    act(() => {
      result.current.setTitle('   ');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateTodo).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Title is required');
  });

  it('saves trimmed title and empty rich text description', async () => {
    const { result } = renderHook(() =>
      useTodoModalEditor({ todo: baseTodo, onClose, updateTodo, deleteTodo })
    );

    act(() => {
      result.current.setIsEditing(true);
      result.current.setTitle('  Updated title  ');
      result.current.setDescription('<p></p>');
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateTodo).toHaveBeenCalledWith('todo-1', {
      title: 'Updated title',
      description: '',
    });
    expect(result.current.isEditing).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('restores original fields when cancelling edit', () => {
    const { result } = renderHook(() =>
      useTodoModalEditor({ todo: baseTodo, onClose, updateTodo, deleteTodo })
    );

    act(() => {
      result.current.setIsEditing(true);
      result.current.setTitle('Draft title');
      result.current.setDescription('<p>Draft description</p>');
      result.current.handleCancelEdit();
    });

    expect(result.current.title).toBe('Original title');
    expect(result.current.description).toBe('<p>Original description</p>');
    expect(result.current.isEditing).toBe(false);
  });

  it('saves title-only edits and exits title mode', async () => {
    const { result } = renderHook(() =>
      useTodoModalEditor({ todo: baseTodo, onClose, updateTodo, deleteTodo })
    );

    act(() => {
      result.current.setIsEditingTitle(true);
      result.current.setTitle('  Renamed title  ');
    });

    await act(async () => {
      await result.current.handleSaveTitle();
    });

    expect(updateTodo).toHaveBeenCalledWith('todo-1', { title: 'Renamed title' });
    expect(result.current.isEditingTitle).toBe(false);
  });

  it('does not delete when confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() =>
      useTodoModalEditor({ todo: baseTodo, onClose, updateTodo, deleteTodo })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(deleteTodo).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('surfaces delete failure errors', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteTodo.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() =>
      useTodoModalEditor({ todo: baseTodo, onClose, updateTodo, deleteTodo })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to delete');
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});