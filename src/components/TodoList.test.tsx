import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoList } from './TodoList';

const mockAddTodo = vi.fn();
const mockUpdateTodo = vi.fn();
const mockDeleteTodo = vi.fn();
const mockAddComment = vi.fn();
const mockAddDashboard = vi.fn();
const mockUpdateDashboard = vi.fn();
const mockDeleteDashboard = vi.fn();
const mockReorderDashboards = vi.fn();
const mockSetActiveDashboardId = vi.fn();

const mockUseTodos = vi.fn();
const mockUseComments = vi.fn();
const mockUseDashboards = vi.fn();

vi.mock('../hooks/useTodos', () => ({
  useTodos: (userId: string) => mockUseTodos(userId),
}));

vi.mock('../hooks/useComments', () => ({
  useComments: (todoId: string | null) => mockUseComments(todoId),
}));

vi.mock('../hooks/useDashboards', () => ({
  useDashboards: (userId: string | null) => mockUseDashboards(userId),
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
    mockUseComments.mockReturnValue({
      comments: [],
      loading: false,
      error: null,
      addComment: mockAddComment,
    });
    mockUseDashboards.mockReturnValue({
      dashboards: [
        {
          id: 'board-1',
          userId: 'user-1',
          name: 'My Dashboard',
          order: 0,
          columns: [
            { id: 'todo', name: 'To do', order: 0, isDone: false },
            { id: 'in_progress', name: 'In progress', order: 1, isDone: false },
            { id: 'done', name: 'Done', order: 2, isDone: true },
          ],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      activeDashboard: {
        id: 'board-1',
        userId: 'user-1',
        name: 'My Dashboard',
        order: 0,
        columns: [
          { id: 'todo', name: 'To do', order: 0, isDone: false },
          { id: 'in_progress', name: 'In progress', order: 1, isDone: false },
          { id: 'done', name: 'Done', order: 2, isDone: true },
        ],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      activeDashboardId: 'board-1',
      setActiveDashboardId: mockSetActiveDashboardId,
      loading: false,
      error: null,
      addDashboard: mockAddDashboard,
      updateDashboard: mockUpdateDashboard,
      deleteDashboard: mockDeleteDashboard,
      reorderDashboards: mockReorderDashboards,
    });
  });

  it('opens card modal and shows comments list', async () => {
    const user = userEvent.setup();

    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Initial title',
          description: 'Initial description',
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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

    mockUseComments.mockReturnValue({
      comments: [
        {
          id: 'c-1',
          todoId: 't-1',
          userId: 'user-2',
          userEmail: 'user2@example.com',
          text: 'Looks good',
          createdAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      loading: false,
      error: null,
      addComment: mockAddComment,
    });

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('card-t-1'));

    expect(screen.getByTestId('todo-modal')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
    expect(mockUseComments).toHaveBeenCalledWith('t-1');
  });

  it('adds a comment from card modal', async () => {
    const user = userEvent.setup();

    mockAddComment.mockResolvedValue(undefined);
    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Initial title',
          description: 'Initial description',
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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

    await user.click(screen.getByTestId('card-t-1'));
    await user.type(screen.getByPlaceholderText('Add a comment...'), 'Need API key');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith('user-1', 'Need API key');
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toHaveValue('');
    });
  });

  it('opens centered modal and adds a new card', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('new-card-button-board-1-todo'));
    expect(screen.getByTestId('create-card-modal')).toBeInTheDocument();

    await user.type(screen.getByTestId('create-card-title'), 'Ship release');
    await user.type(screen.getByTestId('create-card-description'), 'Prepare changelog');
    await user.click(screen.getByTestId('create-card-submit'));

    await waitFor(() => {
      expect(mockAddTodo).toHaveBeenCalledWith({
        title: 'Ship release',
        description: 'Prepare changelog',
      }, {
        boardId: 'board-1',
        columnId: 'todo',
      });
    });
  });

  it('creates card in the column where plus button was clicked', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('new-card-button-board-1-in_progress'));
    expect(screen.getByTestId('create-card-modal')).toBeInTheDocument();

    await user.type(screen.getByTestId('create-card-title'), 'Move in progress');
    await user.click(screen.getByTestId('create-card-submit'));

    await waitFor(() => {
      expect(mockAddTodo).toHaveBeenCalledWith({
        title: 'Move in progress',
        description: '',
      }, {
        boardId: 'board-1',
        columnId: 'in_progress',
      });
    });
  });

  it('opens edit dashboard modal and saves dashboard changes', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('edit-dashboard-button-board-1'));
    expect(screen.getByTestId('edit-dashboard-modal')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('My Dashboard');
    await user.clear(nameInput);
    await user.type(nameInput, 'Product Board');
    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));

    await waitFor(() => {
      expect(mockUpdateDashboard).toHaveBeenCalledWith('board-1', 'Product Board', [
        { id: 'todo', name: 'To do', order: 0, isDone: false },
        { id: 'in_progress', name: 'In progress', order: 1, isDone: false },
        { id: 'done', name: 'Done', order: 2, isDone: true },
      ]);
    });
  });

  it('shows validation error and blocks save for duplicate dashboard column names', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('edit-dashboard-button-board-1'));

    const firstColumn = screen.getByTestId('edit-dashboard-column-todo');
    const secondColumn = screen.getByTestId('edit-dashboard-column-in_progress');
    await user.clear(firstColumn);
    await user.type(firstColumn, 'Same');
    await user.clear(secondColumn);
    await user.type(secondColumn, 'Same');

    await user.click(screen.getByRole('button', { name: 'Save dashboard' }));

    expect(screen.getAllByText('Column names must be unique within a dashboard').length).toBeGreaterThan(0);
    expect(mockUpdateDashboard).not.toHaveBeenCalled();
  });

  it('deletes dashboard after confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockUseDashboards.mockReturnValue({
      dashboards: [
        {
          id: 'board-1',
          userId: 'user-1',
          name: 'My Dashboard',
          order: 0,
          columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'board-2',
          userId: 'user-1',
          name: 'QA Dashboard',
          order: 1,
          columns: [{ id: 'qa_todo', name: 'To do', order: 0 }],
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      activeDashboard: {
        id: 'board-1',
        userId: 'user-1',
        name: 'My Dashboard',
        order: 0,
        columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      activeDashboardId: 'board-1',
      setActiveDashboardId: mockSetActiveDashboardId,
      loading: false,
      error: null,
      addDashboard: mockAddDashboard,
      updateDashboard: mockUpdateDashboard,
      deleteDashboard: mockDeleteDashboard,
      reorderDashboards: mockReorderDashboards,
    });

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('delete-dashboard-button-board-1'));

    await waitFor(() => {
      expect(mockDeleteDashboard).toHaveBeenCalledWith('board-1');
    });

    confirmSpy.mockRestore();
  });

  it('toggles accordion by calling setActiveDashboardId updater', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('dashboard-toggle-board-1'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledTimes(1);
    const updater = mockSetActiveDashboardId.mock.calls[0][0] as (prev: string | null) => string | null;
    expect(typeof updater).toBe('function');

    expect(updater('board-1')).toBeNull();
    expect(updater(null)).toBe('board-1');
  });

  it('toggles accordion when clicking dashboard header text', async () => {
    const user = userEvent.setup();

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledTimes(1);
    const updater = mockSetActiveDashboardId.mock.calls[0][0] as (prev: string | null) => string | null;
    expect(updater('board-1')).toBeNull();
  });

  it('does not toggle accordion when clicking dashboard edit/delete icon buttons', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    mockUseDashboards.mockReturnValue({
      dashboards: [
        {
          id: 'board-1',
          userId: 'user-1',
          name: 'My Dashboard',
          order: 0,
          columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'board-2',
          userId: 'user-1',
          name: 'Second Dashboard',
          order: 1,
          columns: [{ id: 'todo2', name: 'To do', order: 0, isDone: false }],
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      activeDashboard: {
        id: 'board-1',
        userId: 'user-1',
        name: 'My Dashboard',
        order: 0,
        columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      activeDashboardId: 'board-1',
      setActiveDashboardId: mockSetActiveDashboardId,
      loading: false,
      error: null,
      addDashboard: mockAddDashboard,
      updateDashboard: mockUpdateDashboard,
      deleteDashboard: mockDeleteDashboard,
      reorderDashboards: mockReorderDashboards,
    });

    render(<TodoList userId="user-1" />);

    await user.click(screen.getByTestId('edit-dashboard-button-board-1'));
    expect(screen.getByTestId('edit-dashboard-modal')).toBeInTheDocument();
    expect(mockSetActiveDashboardId).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('delete-dashboard-button-board-1'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockSetActiveDashboardId).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('adds tooltip title to icon buttons', () => {
    render(<TodoList userId="user-1" />);

    const toggleButton = screen.getByTestId('dashboard-toggle-board-1');
    expect(toggleButton).toHaveAttribute('title', 'Collapse dashboard');
  });

  it('reorders dashboards via drag-and-drop', () => {
    mockUseDashboards.mockReturnValue({
      dashboards: [
        {
          id: 'board-1',
          userId: 'user-1',
          name: 'Board 1',
          order: 0,
          columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'board-2',
          userId: 'user-1',
          name: 'Board 2',
          order: 1,
          columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      activeDashboard: {
        id: 'board-1',
        userId: 'user-1',
        name: 'Board 1',
        order: 0,
        columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      activeDashboardId: 'board-1',
      setActiveDashboardId: mockSetActiveDashboardId,
      loading: false,
      error: null,
      addDashboard: mockAddDashboard,
      updateDashboard: mockUpdateDashboard,
      deleteDashboard: mockDeleteDashboard,
      reorderDashboards: mockReorderDashboards,
    });

    render(<TodoList userId="user-1" />);

    const dragHandle = screen.getByTestId('dashboard-drag-handle-board-1');

    fireEvent.dragStart(dragHandle);

    const targetDashboard = screen.getByTestId('dashboard-board-2');
    fireEvent.dragOver(targetDashboard);
    fireEvent.drop(targetDashboard);

    expect(mockReorderDashboards).toHaveBeenCalledWith(['board-2', 'board-1']);
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
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-edit'));
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
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-edit'));
    const titleInput = screen.getByTestId('edit-title-t-1');

    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');

    fireEvent.keyDown(titleInput, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-1', {
        title: 'Updated title',
        description: '<p>Initial description</p>',
      });
    });
  });

  it('saves card description with Cmd/Ctrl+S in the modal', async () => {
    const user = userEvent.setup();

    mockUpdateTodo.mockResolvedValue(undefined);
    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Initial title',
          description: 'Initial description',
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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

    await user.click(screen.getByTestId('card-t-1'));
    await user.click(screen.getByRole('button', { name: 'Edit description' }));

    const editor = screen.getByTestId('rich-text-editor');
    await user.click(editor);

    fireEvent.keyDown(editor, { key: 's', metaKey: true });

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-1', {
        title: 'Initial title',
        description: '<p>Initial description</p>',
      });
    });
  });

  it('shows comment counter in the bottom-left area of a card', () => {
    mockUseTodos.mockReturnValue({
      todos: [
        {
          id: 't-1',
          userId: 'user-1',
          title: 'Initial title',
          description: 'Initial description',
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
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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
    expect(card).toHaveTextContent('2');
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
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
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
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'todo-b',
          userId: 'user-1',
          title: 'Todo B',
          description: '',
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 2000,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'done-c',
          userId: 'user-1',
          title: 'Done C',
          description: '',
          status: 'done',
          boardId: 'board-1',
          columnId: 'done',
          weight: 1000,
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
      expect(mockUpdateTodo).toHaveBeenCalledWith('todo-a', expect.objectContaining({
        status: 'done',
        columnId: 'done',
        boardId: 'board-1',
        weight: 2000,
      }));
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
          boardId: 'board-1',
          columnId: 'todo',
          weight: 1000,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'todo-b',
          userId: 'user-1',
          title: 'Todo B',
          description: '',
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 2000,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'todo-c',
          userId: 'user-1',
          title: 'Todo C',
          description: '',
          status: 'todo',
          boardId: 'board-1',
          columnId: 'todo',
          weight: 3000,
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
      expect(mockUpdateTodo).toHaveBeenCalledWith('todo-c', expect.objectContaining({
        status: 'todo',
        columnId: 'todo',
        boardId: 'board-1',
        weight: 1000,
      }));
    });

    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-a', expect.objectContaining({
      status: 'todo',
      columnId: 'todo',
      boardId: 'board-1',
      weight: 2000,
    }));
    expect(mockUpdateTodo).toHaveBeenCalledWith('todo-b', expect.objectContaining({
      status: 'todo',
      columnId: 'todo',
      boardId: 'board-1',
      weight: 3000,
    }));
    expect(mockUpdateTodo).toHaveBeenCalledTimes(3);
  });
});
