import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { TodoChecklistSection } from './TodoChecklistSection';

describe('TodoChecklistSection delete checklist behavior', () => {
  it('shows warning for unfinished checklist items before deleting', async () => {
    const onChecklistDelete = vi.fn().mockResolvedValue(undefined);
    const checklist: NonNullable<Todo['checklist']> = {
      title: 'check list',
      items: [
        { id: 'item-1', title: 'unfinished', checked: false },
      ],
    };

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistDelete={onChecklistDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-checklist-delete'));

    expect(screen.getByTestId('todo-checklist-delete-warning')).toBeInTheDocument();
    expect(onChecklistDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('todo-checklist-delete-confirm'));

    await waitFor(() => {
      expect(onChecklistDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('deletes checklist immediately when all items are completed', async () => {
    const onChecklistDelete = vi.fn().mockResolvedValue(undefined);
    const checklist: NonNullable<Todo['checklist']> = {
      title: 'check list',
      items: [
        { id: 'item-1', title: 'done', checked: true },
      ],
    };

    render(
      <TodoChecklistSection
        checklist={checklist}
        onChecklistDelete={onChecklistDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-checklist-delete'));

    await waitFor(() => {
      expect(onChecklistDelete).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('todo-checklist-delete-warning')).not.toBeInTheDocument();
  });
});
