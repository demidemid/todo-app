import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoList } from './TodoList';

const mockAddTodo = vi.fn();
const mockUpdateTodo = vi.fn();
const mockDeleteTodo = vi.fn();

const mockUseTodos = vi.fn();

vi.mock('../hooks/useTodos', () => ({
  useTodos: (userId: string) => mockUseTodos(userId),
}));

describe('TodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTodos.mockReturnValue({
      todos: [],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });
  });

  it('opens centered modal and adds a new card', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('new-card-button'));
    expect(screen.getByTestId('create-card-modal')).toBeInTheDocument();

    await user.type(screen.getByTestId('create-card-title'), 'Ship release');
    await user.type(screen.getByTestId('create-card-description'), 'Prepare changelog');
    await user.click(screen.getByTestId('create-card-submit'));

    await waitFor(() => {
      expect(mockAddTodo).toHaveBeenCalledWith({
        title: 'Ship release',
        description: 'Prepare changelog',
      });
    });
  });

  it('cancels inline edit by Escape', async () => {
    const user = userEvent.setup();

    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Initial title',
          description: 'Initial description',
          status: 'todo',
          weight: 1000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('edit-start-t-1'));
    const titleInput = screen.getByTestId('edit-title-t-1');
    expect(titleInput).toBeInTheDocument();

    fireEvent.keyDown(titleInput, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('edit-title-t-1')).not.toBeInTheDocument();
    });

    expect(mockUpdateTodo).not.toHaveBeenCalled();
  });

  it('saves inline edit by Ctrl+Enter / Cmd+Enter', async () => {
    const user = userEvent.setup();

    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Initial title',
          description: 'Initial description',
          status: 'todo',
          weight: 1000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('edit-start-t-1'));
    const titleInput = screen.getByTestId('edit-title-t-1');

    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');

    fireEvent.keyDown(titleInput, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-1', {
        title: 'Updated title',
        description: 'Initial description',
      });
    });
  });

  it('highlights drop target on drag over', () => {
    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Card 1',
          description: '',
          status: 'todo',
          weight: 1000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    render(<TodoList userId="user-1" />);

    const card = screen.getByTestId('card-t-1');
    const dropEnd = screen.getByTestId('drop-done-end');

    fireEvent.dragStart(card);
    fireEvent.dragOver(dropEnd);

    expect(dropEnd.className).toContain('animate-pulse');
  });

  it('moves card across columns and updates status plus weights', async () => {
    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 'todo-a',
          userId: 'user-1',
          title: 'Todo A',
          description: '',
          status: 'todo',
          weight: 1000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'todo-b',
          userId: 'user-1',
          title: 'Todo B',
          description: '',
          status: 'todo',
          weight: 2000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'done-c',
          userId: 'user-1',
          title: 'Done C',
          description: '',
          status: 'done',
          weight: 1000,
          completed: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    render(<TodoList userId="user-1" />);

    const draggedCard = screen.getByTestId('card-todo-a');
    const doneColumnEndDrop = screen.getByTestId('drop-done-end');

    fireEvent.dragStart(draggedCard);
    fireEvent.dragOver(doneColumnEndDrop);
    fireEvent.drop(doneColumnEndDrop);

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('todo-a', {
        status: 'done',
        completed: true,
        weight: 2000,
      });
    });

    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-b', {
      weight: 1000,
    });
    expect(mockUpdateTodo).toHaveBeenCalledTimes(2);
  });

  it('reorders cards within one column and updates weights', async () => {
    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 'todo-a',
          userId: 'user-1',
          title: 'Todo A',
          description: '',
          status: 'todo',
          weight: 1000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'todo-b',
          userId: 'user-1',
          title: 'Todo B',
          description: '',
          status: 'todo',
          weight: 2000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'todo-c',
          userId: 'user-1',
          title: 'Todo C',
          description: '',
          status: 'todo',
          weight: 3000,
          completed: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    render(<TodoList userId="user-1" />);

    const draggedCard = screen.getByTestId('card-todo-c');
    const targetDropSlot = screen.getByTestId('drop-todo-0');

    fireEvent.dragStart(draggedCard);
    fireEvent.dragOver(targetDropSlot);
    fireEvent.drop(targetDropSlot);

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('todo-c', {
        status: 'todo',
        completed: false,
        weight: 1000,
      });
    });

    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-a', {
      status: 'todo',
      completed: false,
      weight: 2000,
    });
    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-b', {
      status: 'todo',
      completed: false,
      weight: 3000,
    });
    expect(mockUpdateTodo).toHaveBeenCalledTimes(3);
  });
});
