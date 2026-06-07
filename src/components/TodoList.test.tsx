import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard, DashboardColumn } from '../types/dashboard';
import type { Todo } from '../types/todo';
import { TodoList } from './TodoList';

const mockAddTodo = vi.fn();
const mockUpdateTodo = vi.fn();
const mockDeleteTodo = vi.fn();
const mockAddComment = vi.fn();
const mockAddDashboard = vi.fn();
const mockUpdateDashboard = vi.fn();
const mockDeleteDashboard = vi.fn();
const mockReorderDashboards = vi.fn();
const mockShareDashboard = vi.fn();
const mockSetActiveDashboardId = vi.fn();

const mockUseTodos = vi.fn();
const mockUseComments = vi.fn();
const mockUseDashboards = vi.fn();
const mockUseUsers = vi.fn();
const mockUseDueDateReminders = vi.fn();

vi.mock('../hooks/useTodos', () => ({
  useTodos: (userId: string) => mockUseTodos(userId),
}));

vi.mock('../hooks/useComments', () => ({
  useComments: (todoId: string | null) => mockUseComments(todoId),
}));

vi.mock('../hooks/useDashboards', () => ({
  useDashboards: (userId: string | null) => mockUseDashboards(userId),
}));

vi.mock('../hooks/useUsers', () => ({
  useUsers: (userId: string | null) => mockUseUsers(userId),
}));

vi.mock('../hooks/useDueDateReminders', () => ({
  useDueDateReminders: (args: unknown) => mockUseDueDateReminders(args),
}));

const createColumn = (overrides: Partial<DashboardColumn> = {}): DashboardColumn => ({
  id: 'todo',
  name: 'To do',
  order: 0,
  isDone: false,
  ...overrides,
});

const createDashboard = (overrides: Partial<Dashboard> = {}): Dashboard => ({
  id: 'board-1',
  userId: 'user-1',
  name: 'My Dashboard',
  order: 0,
  columns: [
    createColumn(),
    createColumn({ id: 'in_progress', name: 'In progress', order: 1 }),
    createColumn({ id: 'done', name: 'Done', order: 2, isDone: true }),
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
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
  ...overrides,
});

const createTodosState = (todos: Todo[] = []) => ({
  todos,
  loading: false,
  error: null,
  addTodo: mockAddTodo,
  updateTodo: mockUpdateTodo,
  deleteTodo: mockDeleteTodo,
});

const createDashboardsState = (dashboards: Dashboard[] = [createDashboard()]) => ({
  dashboards,
  activeDashboard: dashboards[0] ?? null,
  activeDashboardId: dashboards[0]?.id ?? null,
  setActiveDashboardId: mockSetActiveDashboardId,
  loading: false,
  error: null,
  addDashboard: mockAddDashboard,
  updateDashboard: mockUpdateDashboard,
  deleteDashboard: mockDeleteDashboard,
  reorderDashboards: mockReorderDashboards,
  shareDashboard: mockShareDashboard,
});

const createUsersState = (overrides: Record<string, unknown> = {}) => ({
  users: [],
  loading: false,
  error: null,
  ...overrides,
});

const createCommentsState = (overrides: Record<string, unknown> = {}) => ({
  comments: [],
  loading: false,
  error: null,
  addComment: mockAddComment,
  ...overrides,
});

const setTodosState = (todos: Todo[] = []) => {
  mockUseTodos.mockReturnValue(createTodosState(todos));
};

const setDashboardsState = (dashboards: Dashboard[] = [createDashboard()]) => {
  mockUseDashboards.mockReturnValue(createDashboardsState(dashboards));
};

const setCommentsState = (overrides: Record<string, unknown> = {}) => {
  mockUseComments.mockReturnValue(createCommentsState(overrides));
};

const setUsersState = (overrides: Record<string, unknown> = {}) => {
  mockUseUsers.mockReturnValue(createUsersState(overrides));
};

const SearchParamsProbe = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

const renderTodoList = (
  initialEntries: string[] = ['/'],
  props: Partial<ComponentProps<typeof TodoList>> = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TodoList userId="user-1" {...props} />
      <SearchParamsProbe />
    </MemoryRouter>,
  );
};

const clickDashboardAction = async (
  user: ReturnType<typeof userEvent.setup>,
  action: 'share' | 'edit' | 'delete',
  dashboardId = 'board-1'
) => {
  await user.click(screen.getByTestId(`dashboard-actions-trigger-${dashboardId}`));
  await user.click(screen.getByTestId(`${action}-dashboard-button-${dashboardId}`));
};

describe('TodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTodosState();
    setCommentsState();
    setDashboardsState();
    setUsersState();
  });

  it('opens card modal and shows comments list', async () => {
    const user = userEvent.setup();

    setTodosState([createTodo()]);

    setCommentsState({
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
    });

    renderTodoList();

    await user.click(screen.getByTestId('card-t-1'));

    expect(screen.getByTestId('todo-modal')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
    expect(mockUseComments).toHaveBeenCalledWith('t-1');
  });

  it('opens card modal directly from card query parameter', async () => {
    setTodosState([createTodo()]);

    renderTodoList(['/?card=t-1']);

    await waitFor(() => {
      expect(screen.getByTestId('todo-modal')).toBeInTheDocument();
    });

    expect(mockUseComments).toHaveBeenCalledWith('t-1');
  });

  it('syncs active dashboard from dashboard query parameter', async () => {
    mockUseDashboards.mockReturnValue({
      dashboards: [
        createDashboard(),
        createDashboard({
          id: 'board-2',
          name: 'QA Dashboard',
          order: 1,
          columns: [createColumn({ id: 'qa_todo' })],
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        }),
      ],
      activeDashboard: null,
      activeDashboardId: null,
      setActiveDashboardId: mockSetActiveDashboardId,
      loading: false,
      error: null,
      addDashboard: mockAddDashboard,
      updateDashboard: mockUpdateDashboard,
      deleteDashboard: mockDeleteDashboard,
      reorderDashboards: mockReorderDashboards,
    });

    renderTodoList(['/?dashboard=board-2']);

    await waitFor(() => {
      expect(mockSetActiveDashboardId).toHaveBeenCalledTimes(1);
    });

    const setterArg = mockSetActiveDashboardId.mock.calls[0][0] as (prev: string | null) => string | null;
    expect(typeof setterArg).toBe('function');
    expect(setterArg(null)).toBe('board-2');
    expect(setterArg('board-2')).toBe('board-2');
  });

  it('archives card from ellipsis menu', async () => {
    const user = userEvent.setup();

    setTodosState([
      createTodo({ id: 't-archive', title: 'Archive me', archived: false }),
    ]);

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-archive'));
    await user.click(screen.getByTestId('card-menu-archive'));

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-archive', { archived: true });
    });
  });

  it('adds a comment from card modal', async () => {
    const user = userEvent.setup();

    mockAddComment.mockResolvedValue(undefined);
    setTodosState([createTodo()]);

    renderTodoList();

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

    renderTodoList();

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

    renderTodoList();

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

    renderTodoList();

    await clickDashboardAction(user, 'edit');
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

  it('shares dashboard via modal multi-select', async () => {
    const user = userEvent.setup();
    mockShareDashboard.mockResolvedValue(undefined);

    setUsersState({
      users: [
        { id: 'u-2', email: 'alice@example.com' },
        { id: 'u-3', email: 'bob@example.com' },
      ],
    });

    renderTodoList();

    await clickDashboardAction(user, 'share');
    expect(screen.getByTestId('share-dashboard-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('share-user-checkbox-u-2'));
    await user.click(screen.getByTestId('share-user-checkbox-u-3'));
    expect(screen.getByTestId('share-selected-count')).toHaveTextContent('Selected: 2');

    await user.click(screen.getByRole('button', { name: 'Save access' }));

    await waitFor(() => {
      expect(mockShareDashboard).toHaveBeenCalledWith(
        'board-1',
        ['u-2', 'u-3'],
        ['alice@example.com', 'bob@example.com'],
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('share-dashboard-modal')).not.toBeInTheDocument();
    });
  });

  it('shows users loading error in share modal', async () => {
    const user = userEvent.setup();

    setUsersState({
      users: [],
      loading: false,
      error: 'Missing or insufficient permissions.',
    });

    renderTodoList();

    await clickDashboardAction(user, 'share');

    expect(screen.getByTestId('share-dashboard-modal')).toBeInTheDocument();
    expect(screen.getByTestId('share-users-error')).toHaveTextContent(
      'Failed to load users: Missing or insufficient permissions.'
    );

    const saveButton = screen.getByRole('button', { name: 'Save access' });
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    expect(mockShareDashboard).not.toHaveBeenCalled();
  });

  it('disables share submit while users are loading', async () => {
    const user = userEvent.setup();

    setUsersState({
      users: [],
      loading: true,
      error: null,
    });

    renderTodoList();

    await clickDashboardAction(user, 'share');

    const saveButton = screen.getByRole('button', { name: 'Save access' });
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    expect(mockShareDashboard).not.toHaveBeenCalled();
  });

  it('shows validation error and blocks save for duplicate dashboard column names', async () => {
    const user = userEvent.setup();

    renderTodoList();

    await clickDashboardAction(user, 'edit');

    const firstColumn = screen.getByTestId('edit-dashboard-column-0');
    const secondColumn = screen.getByTestId('edit-dashboard-column-1');
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

    setDashboardsState([
      createDashboard({ columns: [createColumn()] }),
      createDashboard({
        id: 'board-2',
        name: 'QA Dashboard',
        order: 1,
        columns: [createColumn({ id: 'qa_todo' })],
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);

    renderTodoList();

    await clickDashboardAction(user, 'delete');

    await waitFor(() => {
      expect(mockDeleteDashboard).toHaveBeenCalledWith('board-1');
    });

    confirmSpy.mockRestore();
  });

  it('toggles accordion by calling setActiveDashboardId with null on active dashboard click', async () => {
    const user = userEvent.setup();

    renderTodoList(['/?dashboard=board-1']);

    // Ignore the initial sync call from query parameter.
    mockSetActiveDashboardId.mockClear();

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledTimes(1);
    expect(mockSetActiveDashboardId).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('location-search').textContent).not.toContain('dashboard=board-1');
  });

  it('toggles accordion when clicking dashboard header text', async () => {
    const user = userEvent.setup();

    renderTodoList();

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledTimes(1);
    expect(mockSetActiveDashboardId).toHaveBeenCalledWith(null);
  });

  it('does not reopen dashboard after collapsing via header click', async () => {
    const user = userEvent.setup();

    renderTodoList(['/?dashboard=board-1']);

    // Ignore the initial sync call from query parameter.
    mockSetActiveDashboardId.mockClear();

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledTimes(1);
    expect(mockSetActiveDashboardId).toHaveBeenCalledWith(null);
    expect(mockSetActiveDashboardId).not.toHaveBeenCalledWith('board-1');
    expect(screen.getByTestId('location-search').textContent).not.toContain('dashboard=board-1');
  });

  it('collapses accordion in DOM when clicking dashboard header with dashboard query param', async () => {
    const user = userEvent.setup();
    const stableDashboards = [createDashboard()];

    mockUseDashboards.mockImplementation(() => {
      const [activeDashboardId, setActiveDashboardId] = useState<string | null>('board-1');

      return {
        dashboards: stableDashboards,
        activeDashboard: stableDashboards.find((dashboard) => dashboard.id === activeDashboardId) ?? null,
        activeDashboardId,
        setActiveDashboardId,
        loading: false,
        error: null,
        addDashboard: mockAddDashboard,
        updateDashboard: mockUpdateDashboard,
        deleteDashboard: mockDeleteDashboard,
        reorderDashboards: mockReorderDashboards,
      };
    });

    renderTodoList(['/?dashboard=board-1']);

    expect(screen.getByTestId('column-todo')).toBeInTheDocument();

    await user.click(screen.getByText('My Dashboard'));

    await waitFor(() => {
      expect(screen.queryByTestId('column-todo')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('location-search').textContent).not.toContain('dashboard=board-1');
  });

  it('does not toggle accordion when clicking dashboard edit/delete icon buttons', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    setDashboardsState([
      createDashboard({ columns: [createColumn()] }),
      createDashboard({
        id: 'board-2',
        name: 'Second Dashboard',
        order: 1,
        columns: [createColumn({ id: 'todo2' })],
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);

    renderTodoList();

    await clickDashboardAction(user, 'edit');
    expect(screen.getByTestId('edit-dashboard-modal')).toBeInTheDocument();
    expect(mockSetActiveDashboardId).not.toHaveBeenCalled();

    await clickDashboardAction(user, 'delete');
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockSetActiveDashboardId).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('adds tooltip title to icon buttons', () => {
    renderTodoList();

    const triggerButton = screen.getByTestId('dashboard-actions-trigger-board-1');
    expect(triggerButton).toHaveAttribute('title', 'Open dashboard actions');
  });

  it('reorders dashboards via drag-and-drop', () => {
    setDashboardsState([
      createDashboard({ name: 'Board 1', columns: [createColumn()] }),
      createDashboard({
        id: 'board-2',
        name: 'Board 2',
        order: 1,
        columns: [createColumn()],
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);

    renderTodoList();

    const dragHandle = screen.getByTestId('dashboard-drag-handle-board-1');

    fireEvent.dragStart(dragHandle);

    const targetDashboard = screen.getByTestId('dashboard-board-2');
    fireEvent.dragOver(targetDashboard);
    fireEvent.drop(targetDashboard);

    expect(mockReorderDashboards).toHaveBeenCalledWith(['board-2', 'board-1']);
  });

  it('prevents dragging and reordering shared dashboards', async () => {
    setDashboardsState([
      createDashboard({ id: 'board-1', userId: 'user-1', order: 0 }),
      createDashboard({
        id: 'board-2',
        userId: 'user-2',
        name: 'Shared dashboard',
        order: 1,
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);

    renderTodoList();

    const sharedDragHandle = screen.getByTestId('dashboard-drag-handle-board-2');
    expect(sharedDragHandle).toBeDisabled();

    fireEvent.drop(screen.getByTestId('dashboard-board-2'), {
      dataTransfer: {
        getData: () => 'board-2',
      },
    });

    expect(mockReorderDashboards).not.toHaveBeenCalled();
  });

  it('does not show edit action in card menu', async () => {
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

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    expect(screen.queryByTestId('card-menu-edit')).not.toBeInTheDocument();

    expect(mockUpdateTodo).not.toHaveBeenCalled();
  });

  it('archives card from card menu action', async () => {
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

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-archive'));

    await waitFor(() => {
      expect(mockUpdateTodo).toHaveBeenCalledWith('t-1', {
        archived: true,
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

    renderTodoList();

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

    renderTodoList();

    const card = screen.getByTestId('card-t-1');
    expect(card).toHaveTextContent('2');
  });

  it('renders due date badges for today and tomorrow', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const toDateString = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    mockUseTodos.mockReturnValue({
      todos: [
        createTodo({ id: 'due-today', title: 'Due today', dueDate: toDateString(today) }),
        createTodo({ id: 'due-tomorrow', title: 'Due tomorrow', dueDate: toDateString(tomorrow), weight: 2000 }),
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    renderTodoList();

    expect(screen.getByTestId('card-due-badge-due-today')).toHaveTextContent('Today');
    expect(screen.getByTestId('card-due-badge-due-today')).toHaveAttribute('title', `Due date: ${toDateString(today)}`);
    expect(screen.getByTestId('card-due-badge-due-tomorrow')).toHaveTextContent('Tomorrow');
    expect(screen.getByTestId('card-due-badge-due-tomorrow')).toHaveAttribute('title', `Due date: ${toDateString(tomorrow)}`);
  });

  it('highlights overdue cards in dashboard list', () => {
    mockUseTodos.mockReturnValue({
      todos: [
        createTodo({
          id: 'overdue-card',
          title: 'Overdue',
          dueDate: '2000-01-01',
          isCompleted: false,
        }),
      ],
      loading: false,
      error: null,
      addTodo: mockAddTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
    });

    renderTodoList();

    const card = screen.getByTestId('card-overdue-card');
    expect(card.className).toContain('border-rose-300/45');
    expect(screen.getByTestId('card-due-badge-overdue-card')).toHaveTextContent('Overdue');
  });

  it('highlights target column on drag over', () => {
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

    renderTodoList();

    const card = screen.getByTestId('card-t-1');
    const dropEnd = screen.getByTestId('drop-done-end');
    const doneColumn = screen.getByTestId('column-done');

    fireEvent.dragStart(card);
    fireEvent.dragOver(dropEnd);

    expect(doneColumn.className).toContain('border-cyan-200/70');
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

    renderTodoList();

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

  it('deletes card from card menu action', async () => {
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

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-delete'));

    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith('t-1');
    });
  });

  it('deletes card from menu action', async () => {
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

    renderTodoList();

    await user.click(screen.getByTestId('card-menu-trigger-t-1'));
    await user.click(screen.getByTestId('card-menu-delete'));

    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith('t-1');
    });
  });

  it('closes opened todo modal via close button', async () => {
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

    renderTodoList();

    await user.click(screen.getByTestId('card-t-1'));
    expect(screen.getByTestId('todo-modal')).toBeInTheDocument();
    expect(screen.getByTestId('location-search').textContent).toContain('card=t-1');
    expect(screen.getByTestId('location-search').textContent).toContain('dashboard=board-1');

    await user.click(screen.getByLabelText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('todo-modal')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('location-search').textContent).toContain('dashboard=board-1');
    expect(screen.getByTestId('location-search').textContent).not.toContain('card=t-1');
  });

  it('closes opened todo modal via Escape key', async () => {
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

    renderTodoList();

    await user.click(screen.getByTestId('card-t-1'));
    expect(screen.getByTestId('todo-modal')).toBeInTheDocument();
    expect(screen.getByTestId('location-search').textContent).toContain('card=t-1');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('todo-modal')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('location-search').textContent).toContain('dashboard=board-1');
    expect(screen.getByTestId('location-search').textContent).not.toContain('card=t-1');
  });

  it('clears dashboard drop highlight on drag end capture timeout', () => {
    vi.useFakeTimers();

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
          columns: [{ id: 'todo2', name: 'To do', order: 0, isDone: false }],
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

    renderTodoList();

    const dragHandle = screen.getByTestId('dashboard-drag-handle-board-1');
    fireEvent.dragStart(dragHandle);

    const targetDashboard = screen.getByTestId('dashboard-board-2');
    fireEvent.dragOver(targetDashboard);
    expect(targetDashboard.className).toContain('ring-cyan-300/70');

    fireEvent.dragEnd(dragHandle);
    act(() => {
      vi.runAllTimers();
    });

    expect(targetDashboard.className).not.toContain('ring-cyan-300/70');
    vi.useRealTimers();
  });

  it('supports dropping a dragged dashboard on the list container', async () => {
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
          columns: [{ id: 'todo2', name: 'To do', order: 0, isDone: false }],
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

    renderTodoList();

    const board1 = screen.getByTestId('dashboard-board-1');
    const board2 = screen.getByTestId('dashboard-board-2');

    const dragHandle = screen.getByTestId('dashboard-drag-handle-board-1');
    fireEvent.dragStart(dragHandle);

    fireEvent.dragOver(board2);

    const listContainer = board1.parentElement as HTMLElement;
    fireEvent.drop(listContainer);

    await waitFor(() => {
      expect(mockReorderDashboards).toHaveBeenCalledWith(['board-2', 'board-1']);
    });
  });

  it('ignores container drop when no dashboard drag is active', () => {
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

    renderTodoList();

    const board1 = screen.getByTestId('dashboard-board-1');
    const listContainer = board1.parentElement as HTMLElement;
    fireEvent.drop(listContainer);

    expect(mockReorderDashboards).not.toHaveBeenCalled();
  });

});
