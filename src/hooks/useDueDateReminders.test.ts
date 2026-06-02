import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../types/todo';
import { useDueDateReminders } from './useDueDateReminders';

const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  userId: 'user-1',
  title: 'Task',
  description: '',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'todo',
  weight: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  dueDate: '2026-06-05',
  isCompleted: false,
  completedAt: null,
  remindOneDayBefore: true,
  reminderScheduledAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  ...overrides,
});

describe('useDueDateReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears reminderScheduledAt after reminder fires', async () => {
    const updateTodo = vi.fn().mockResolvedValue(undefined);
    const notificationSpy = vi.fn();

    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: vi.fn().mockImplementation(notificationSpy),
    });
    (window.Notification as unknown as { permission: string }).permission = 'granted';

    renderHook(() => useDueDateReminders({ todos: [createTodo()], updateTodo }));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', { reminderScheduledAt: null });
    });
  });

  it('does not fire reminders for completed tasks', async () => {
    const updateTodo = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useDueDateReminders({
        todos: [createTodo({ isCompleted: true })],
        updateTodo,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateTodo).not.toHaveBeenCalled();
  });
});
