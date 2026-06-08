import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { Dashboard, DashboardColumn } from '../types/dashboard';
import type { Todo } from '../types/todo';
import { TodoList } from './TodoList';

const hoisted = vi.hoisted(() => ({
  mockAddTodo: vi.fn(),
  mockUpdateTodo: vi.fn(),
  mockDeleteTodo: vi.fn(),
  mockAddComment: vi.fn(),
  mockAddDashboard: vi.fn(),
  mockUpdateDashboard: vi.fn(),
  mockDeleteDashboard: vi.fn(),
  mockReorderDashboards: vi.fn(),
  mockShareDashboard: vi.fn(),
  mockSetActiveDashboardId: vi.fn(),
  mockUseTodos: vi.fn(),
  mockUseComments: vi.fn(),
  mockUseDashboards: vi.fn(),
  mockUseUsers: vi.fn(),
  mockUseDueDateReminders: vi.fn(),
}));

export const mockAddTodo = hoisted.mockAddTodo;
export const mockUpdateTodo = hoisted.mockUpdateTodo;
export const mockDeleteTodo = hoisted.mockDeleteTodo;
export const mockAddComment = hoisted.mockAddComment;
export const mockAddDashboard = hoisted.mockAddDashboard;
export const mockUpdateDashboard = hoisted.mockUpdateDashboard;
export const mockDeleteDashboard = hoisted.mockDeleteDashboard;
export const mockReorderDashboards = hoisted.mockReorderDashboards;
export const mockShareDashboard = hoisted.mockShareDashboard;
export const mockSetActiveDashboardId = hoisted.mockSetActiveDashboardId;

export const mockUseTodos = hoisted.mockUseTodos;
export const mockUseComments = hoisted.mockUseComments;
export const mockUseDashboards = hoisted.mockUseDashboards;
export const mockUseUsers = hoisted.mockUseUsers;
export const mockUseDueDateReminders = hoisted.mockUseDueDateReminders;

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

export const createColumn = (overrides: Partial<DashboardColumn> = {}): DashboardColumn => ({
  id: 'todo',
  name: 'To do',
  order: 0,
  isDone: false,
  ...overrides,
});

export const createDashboard = (overrides: Partial<Dashboard> = {}): Dashboard => ({
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

export const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
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

export const createTodosState = (todos: Todo[] = []) => ({
  todos,
  loading: false,
  error: null,
  addTodo: mockAddTodo,
  updateTodo: mockUpdateTodo,
  deleteTodo: mockDeleteTodo,
});

export const createDashboardsState = (dashboards: Dashboard[] = [createDashboard()]) => ({
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

export const createUsersState = (overrides: Record<string, unknown> = {}) => ({
  users: [],
  loading: false,
  error: null,
  ...overrides,
});

export const createCommentsState = (overrides: Record<string, unknown> = {}) => ({
  comments: [],
  loading: false,
  error: null,
  addComment: mockAddComment,
  ...overrides,
});

export const setTodosState = (todos: Todo[] = []) => {
  mockUseTodos.mockReturnValue(createTodosState(todos));
};

export const setDashboardsState = (dashboards: Dashboard[] = [createDashboard()]) => {
  mockUseDashboards.mockReturnValue(createDashboardsState(dashboards));
};

export const setCommentsState = (overrides: Record<string, unknown> = {}) => {
  mockUseComments.mockReturnValue(createCommentsState(overrides));
};

export const setUsersState = (overrides: Record<string, unknown> = {}) => {
  mockUseUsers.mockReturnValue(createUsersState(overrides));
};

export const renderTodoList = (
  initialEntries: string[] = ['/'],
  props: Partial<ComponentProps<typeof TodoList>> = {}
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TodoList userId="user-1" {...props} />
    </MemoryRouter>,
  );
};

export const renderTodoListWithSearch = (
  initialEntries: string[] = ['/'],
  props: Partial<ComponentProps<typeof TodoList>> = {}
) => {
  const Probe = () => {
    const location = useLocation();
    return <div data-testid="location-search">{location.search}</div>;
  };

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TodoList userId="user-1" {...props} />
      <Probe />
    </MemoryRouter>,
  );
};

export const clickDashboardAction = async (
  user: ReturnType<typeof import('@testing-library/user-event').default.setup>,
  action: 'share' | 'edit' | 'delete',
  dashboardId = 'board-1'
) => {
  await user.click(screen.getByTestId(`dashboard-actions-trigger-${dashboardId}`));
  await user.click(screen.getByTestId(`${action}-dashboard-button-${dashboardId}`));
};

export const resetTodoListTestState = () => {
  vi.clearAllMocks();
  setTodosState();
  setCommentsState();
  setDashboardsState();
  setUsersState();
};
