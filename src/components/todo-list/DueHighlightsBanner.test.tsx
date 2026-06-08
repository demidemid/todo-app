import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { DueHighlightsBanner, type DueHighlightEntry } from './DueHighlightsBanner';

const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  userId: 'user-1',
  title: 'Todo',
  description: '',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'todo',
  weight: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('DueHighlightsBanner', () => {
  it('renders nothing when entries are empty', () => {
    const onOpenTodoByLink = vi.fn();

    render(<DueHighlightsBanner entries={[]} onOpenTodoByLink={onOpenTodoByLink} />);

    expect(screen.queryByTestId('due-highlights-banner')).not.toBeInTheDocument();
  });

  it('renders entries and opens todo from link click', () => {
    const onOpenTodoByLink = vi.fn();
    const entries: DueHighlightEntry[] = [
      {
        todo: createTodo({ id: 'overdue', title: 'Overdue task', dueDate: '2000-01-01' }),
        dashboardName: 'Main Board',
        dueText: 'was due on 2000-01-01',
        dueState: 'overdue',
      },
      {
        todo: createTodo({ id: 'tomorrow', title: 'Tomorrow task', dueDate: '2026-01-02' }),
        dashboardName: 'Main Board',
        dueText: 'is due tomorrow',
        dueState: 'due_tomorrow',
      },
    ];

    render(<DueHighlightsBanner entries={entries} onOpenTodoByLink={onOpenTodoByLink} />);

    expect(screen.getByTestId('due-highlights-banner')).toBeInTheDocument();
    expect(screen.getByTestId('due-highlight-overdue')).toHaveTextContent('Overdue task');
    expect(screen.getByTestId('due-highlight-overdue').className).toContain('bg-rose-500/20');
    expect(screen.getByTestId('due-highlight-tomorrow')).toHaveTextContent('is due tomorrow');

    fireEvent.click(screen.getByTestId('due-highlight-link-tomorrow'));

    expect(onOpenTodoByLink).toHaveBeenCalledWith('tomorrow', 'board-1');
  });
});
