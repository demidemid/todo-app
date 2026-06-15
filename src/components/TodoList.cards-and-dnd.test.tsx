import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTodo,
  mockDeleteTodo,
  mockUpdateTodo,
  renderTodoList,
  resetTodoListTestState,
  setTodosState,
} from './TodoList.testUtils';

describe('TodoList cards and dnd', () => {
  beforeEach(() => {
    resetTodoListTestState();
  });

  it('archives card from ellipsis menu', async () => {
    const user = userEvent.setup();

    setTodosState([createTodo({ id: 't-archive', title: 'Archive me', archived: false })]);

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-archive'));
    await user.click(screen.getByTestId('card-menu-archive'));

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-archive', { archived: true });
    });
  });

  it('does not show edit action in card menu', async () => {
    const user = userEvent.setup();

    setTodosState([createTodo()]);

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    expect(screen.queryByTestId('card-menu-edit')).not.toBeInTheDocument();
  });

  it('archives card from card menu action', async () => {
    const user = userEvent.setup();

    setTodosState([createTodo()]);

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-archive'));

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-1', { archived: true });
    });
  });

  it('deletes card from card menu action', async () => {
    const user = userEvent.setup();

    setTodosState([createTodo()]);

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-delete'));

    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith('t-1');
    });
  });

  it('shows comment counter in the bottom-left area of a card', () => {
    setTodosState([
      createTodo({
        comments: [
          {
            id: 'c-1',
            todoId: 't-1',
            userId: 'u-1',
            text: 'One',
            createdAt: new Date('2026-01-02T00:00:00Z'),
          },
          {
            id: 'c-2',
            todoId: 't-1',
            userId: 'u-2',
            text: 'Two',
            createdAt: new Date('2026-01-03T00:00:00Z'),
          },
        ],
      }),
    ]);

    renderTodoList();

    expect(screen.getByTestId('card-t-1')).toHaveTextContent('2');
  });

  const dueDateBadgeLabel = (value: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${value.getDate()} ${months[value.getMonth()]}`;
  };

  it('renders due date badges as day and month for today and tomorrow', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const toDateString = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setTodosState([
      createTodo({ id: 'due-today', title: 'Due today', dueDate: toDateString(today) }),
      createTodo({ id: 'due-tomorrow', title: 'Due tomorrow', dueDate: toDateString(tomorrow), weight: 2000 }),
    ]);

    renderTodoList();

    expect(screen.getByTestId('card-due-badge-due-today')).toHaveTextContent(dueDateBadgeLabel(today));
    expect(screen.getByTestId('card-due-badge-due-tomorrow')).toHaveTextContent(dueDateBadgeLabel(tomorrow));
  });

  it('highlights overdue cards in dashboard list', () => {
    setTodosState([
      createTodo({
        id: 'overdue-card',
        title: 'Overdue',
        dueDate: '2000-01-01',
        isCompleted: false,
      }),
    ]);

    renderTodoList();

    const card = screen.getByTestId('card-overdue-card');
    expect(card.className).toContain('border-rose-300/45');
    expect(screen.getByTestId('card-due-badge-overdue-card')).toHaveTextContent('1 Jan');
  });

  it('highlights target column on drag over', () => {
    setTodosState([
      createTodo({ id: 't-1', title: 'Card 1' }),
    ]);

    renderTodoList();

    const card = screen.getByTestId('card-t-1');
    const dropEnd = screen.getByTestId('drop-done-end');
    const doneColumn = screen.getByTestId('column-done');

    fireEvent.dragStart(card);
    fireEvent.dragOver(dropEnd);

    expect(doneColumn.className).toContain('border-cyan-200/70');
  });

  it('moves card across columns and updates status plus weights', async () => {
    setTodosState([
      createTodo({ id: 'todo-a', title: 'Todo A', status: 'todo', columnId: 'todo', weight: 1000 }),
      createTodo({ id: 'todo-b', title: 'Todo B', status: 'todo', columnId: 'todo', weight: 2000 }),
      createTodo({ id: 'done-c', title: 'Done C', status: 'done', columnId: 'done', weight: 1000 }),
    ]);

    renderTodoList();

    const draggedCard = screen.getByTestId('card-todo-a');
    const doneColumnEndDrop = screen.getByTestId('drop-done-end');

    fireEvent.dragStart(draggedCard);
    fireEvent.dragOver(doneColumnEndDrop);
    fireEvent.drop(doneColumnEndDrop);

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('todo-a', expect.objectContaining({
        status: 'done',
        columnId: 'done',
        boardId: 'board-1',
        weight: 2000,
      }));
    });

    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-b', { weight: 1000 });
    expect(mockUpdateTodo).toHaveBeenCalledTimes(2);
  });

  it('reorders cards within one column and updates weights', async () => {
    setTodosState([
      createTodo({ id: 'todo-a', title: 'Todo A', status: 'todo', columnId: 'todo', weight: 1000 }),
      createTodo({ id: 'todo-b', title: 'Todo B', status: 'todo', columnId: 'todo', weight: 2000 }),
      createTodo({ id: 'todo-c', title: 'Todo C', status: 'todo', columnId: 'todo', weight: 3000 }),
    ]);

    renderTodoList();

    const draggedCard = screen.getByTestId('card-todo-c');
    const targetDropSlot = screen.getByTestId('drop-todo-0');

    fireEvent.dragStart(draggedCard);
    fireEvent.dragOver(targetDropSlot);
    fireEvent.drop(targetDropSlot);

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('todo-c', expect.objectContaining({ weight: 1000 }));
    });

    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-a', expect.objectContaining({ weight: 2000 }));
    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-b', expect.objectContaining({ weight: 3000 }));
    expect(mockUpdateTodo).toHaveBeenCalledTimes(3);
  });
});
