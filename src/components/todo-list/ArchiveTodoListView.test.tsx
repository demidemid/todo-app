import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { ArchiveTodoListView } from './ArchiveTodoListView';

const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  userId: 'user-1',
  title: 'Todo',
  description: '',
  status: 'done',
  boardId: 'board-1',
  columnId: 'done',
  archived: true,
  weight: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const dashboardsById = new Map<string, Dashboard>([
  ['board-1', {
    id: 'board-1',
    userId: 'user-1',
    name: 'Main Board',
    order: 0,
    columns: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }],
]);

describe('ArchiveTodoListView', () => {
  it('renders empty state', () => {
    render(
      <ArchiveTodoListView
        archivedTodos={[]}
        dashboardsById={dashboardsById}
        onOpenTodoByLink={vi.fn()}
        onUnarchiveTodo={vi.fn()}
        onDeleteTodo={vi.fn()}
      />,
    );

    expect(screen.getByTestId('archive-view')).toBeInTheDocument();
    expect(screen.getByText('Archive is empty.')).toBeInTheDocument();
  });

  it('renders archived cards and opens card from click and Enter key', () => {
    const onOpenTodoByLink = vi.fn();

    render(
      <ArchiveTodoListView
        archivedTodos={[createTodo({ id: 'todo-a', title: 'Archived A' })]}
        dashboardsById={dashboardsById}
        onOpenTodoByLink={onOpenTodoByLink}
        onUnarchiveTodo={vi.fn()}
        onDeleteTodo={vi.fn()}
      />,
    );

    const card = screen.getByTestId('archive-card-todo-a');
    expect(screen.getByText('Main Board')).toBeInTheDocument();

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onOpenTodoByLink).toHaveBeenCalledWith('todo-a', 'board-1');
    expect(onOpenTodoByLink).toHaveBeenCalledTimes(2);
  });

  it('handles unarchive and delete actions from menu', async () => {
    const user = userEvent.setup();
    const onUnarchiveTodo = vi.fn();
    const onDeleteTodo = vi.fn();

    render(
      <ArchiveTodoListView
        archivedTodos={[createTodo({ id: 'todo-a', title: 'Archived A' })]}
        dashboardsById={dashboardsById}
        onOpenTodoByLink={vi.fn()}
        onUnarchiveTodo={onUnarchiveTodo}
        onDeleteTodo={onDeleteTodo}
      />,
    );

    await user.click(screen.getByTestId('archive-menu-trigger-todo-a'));
    await user.click(screen.getByTestId('archive-menu-unarchive-todo-a'));
    expect(onUnarchiveTodo).toHaveBeenCalledWith('todo-a');

    await user.click(screen.getByTestId('archive-menu-trigger-todo-a'));
    await user.click(screen.getByTestId('archive-menu-delete-todo-a'));
    expect(onDeleteTodo).toHaveBeenCalledWith('todo-a');
  });
});
