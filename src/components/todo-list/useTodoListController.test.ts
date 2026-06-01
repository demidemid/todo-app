import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { useTodoListController } from './useTodoListController';

const dashboards: Dashboard[] = [
  {
    id: 'board-a',
    userId: 'user-1',
    name: 'Board A',
    order: 0,
    columns: [
      { id: 'todo', name: 'To do', order: 0, isDone: false },
      { id: 'done', name: 'Done', order: 1, isDone: true },
    ],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'board-b',
    userId: 'user-1',
    name: 'Board B',
    order: 1,
    columns: [{ id: 'todo-b', name: 'To do', order: 0, isDone: false }],
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  },
  {
    id: 'board-c',
    userId: 'user-1',
    name: 'Board C',
    order: 2,
    columns: [{ id: 'todo-c', name: 'To do', order: 0, isDone: false }],
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  },
];

const todos: Todo[] = [
  {
    id: 't-1',
    userId: 'user-1',
    title: 'Todo',
    description: '',
    status: 'todo',
    boardId: 'board-a',
    columnId: 'todo',
    weight: 1000,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

const createArgs = () => {
  const addTodo = vi.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue('new-id');
  const updateTodo = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  const deleteTodo = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  const addDashboard = vi.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue('board-x');
  const updateDashboard = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  const deleteDashboard = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  const reorderDashboards = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);

  return {
    args: {
      todos,
      dashboards,
      activeDashboard: dashboards[0],
      columns: dashboards[0].columns,
      groupedTodos: {
        todo: todos,
        done: [],
      },
      addTodo,
      updateTodo,
      deleteTodo,
      addDashboard,
      updateDashboard,
      deleteDashboard,
      reorderDashboards,
    },
    mocks: {
      addTodo,
      updateTodo,
      deleteTodo,
      addDashboard,
      updateDashboard,
      deleteDashboard,
      reorderDashboards,
    },
  };
};

describe('useTodoListController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks creating dashboard with duplicate column names', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardName('Product');
      result.current.setColumnDraft('Backlog');
    });

    act(() => {
      result.current.addColumnToDraft();
    });

    act(() => {
      result.current.setColumnDraft(' backlog ');
    });

    await act(async () => {
      await result.current.handleCreateDashboard({ preventDefault() {} } as React.FormEvent);
    });

    expect(mocks.addDashboard).not.toHaveBeenCalled();
    expect(result.current.dashboardFormError).toBe('Column names must be unique within a dashboard');
  });

  it('creates dashboard and resets create form state', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setIsCreateDashboardModalOpen(true);
      result.current.setDashboardName('Platform');
      result.current.setColumnDraft('Backlog');
    });

    act(() => {
      result.current.addColumnToDraft();
    });

    act(() => {
      result.current.setColumnDraft('In progress');
    });

    await act(async () => {
      await result.current.handleCreateDashboard({ preventDefault() {} } as React.FormEvent);
    });

    expect(mocks.addDashboard).toHaveBeenCalledWith('Platform', ['Backlog', 'In progress']);
    expect(result.current.dashboardName).toBe('');
    expect(result.current.columnDraft).toBe('');
    expect(result.current.dashboardColumns).toEqual([]);
    expect(result.current.isCreateDashboardModalOpen).toBe(false);
  });

  it('does not delete dashboard when confirmation is cancelled', async () => {
    const { args, mocks } = createArgs();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleDeleteDashboard('board-a', 'Board A');
    });

    expect(mocks.deleteDashboard).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('reorders dashboards on valid drop and clears drag state', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardDragId('board-a');
      result.current.setDashboardDropIndex(3);
    });

    await act(async () => {
      await result.current.handleDashboardDrop(3);
    });

    expect(mocks.reorderDashboards).toHaveBeenCalledWith(['board-b', 'board-c', 'board-a']);
    expect(result.current.dashboardDragId).toBeNull();
    expect(result.current.dashboardDropIndex).toBeNull();
  });

  it('skips reorder and clears drag state when dragged dashboard is missing', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardDragId('missing-board');
      result.current.setDashboardDropIndex(1);
    });

    await act(async () => {
      await result.current.handleDashboardDrop(1);
    });

    expect(mocks.reorderDashboards).not.toHaveBeenCalled();
    expect(result.current.dashboardDragId).toBeNull();
    expect(result.current.dashboardDropIndex).toBeNull();
  });

  it('blocks save dashboard edit when normalized column names are duplicates', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.openEditDashboard('board-a');
      result.current.setEditingDashboardName('Board A');
      result.current.setEditingDashboardColumns([
        { id: 'c-1', name: 'Backlog', order: 0, isDone: false },
        { id: 'c-2', name: ' backlog ', order: 1, isDone: false },
      ]);
    });

    await act(async () => {
      await result.current.handleSaveDashboardEdit({ preventDefault() {} } as React.FormEvent);
    });

    expect(mocks.updateDashboard).not.toHaveBeenCalled();
    expect(result.current.dashboardActionError).toBe('Column names must be unique within a dashboard');
  });

  it('opens edit dashboard modal only for existing dashboard id', () => {
    const { args } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.openEditDashboard('unknown-id');
    });

    expect(result.current.isEditDashboardModalOpen).toBe(false);

    act(() => {
      result.current.openEditDashboard('board-a');
    });

    expect(result.current.isEditDashboardModalOpen).toBe(true);
    expect(result.current.editingDashboardId).toBe('board-a');
  });

  it('adds a trimmed column in edit mode and clears draft', () => {
    const { args } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.openEditDashboard('board-a');
    });

    act(() => {
      result.current.setEditingColumnDraft('  QA  ');
    });

    act(() => {
      result.current.addColumnToEditDraft();
    });

    const addedColumn = result.current.editingDashboardColumns.find((column) => column.name === 'QA');
    expect(addedColumn).toBeTruthy();
    expect(result.current.editingColumnDraft).toBe('');
  });

  it('sets fallback action error when dashboard update throws non-Error', async () => {
    const { args, mocks } = createArgs();
    mocks.updateDashboard.mockRejectedValue('boom');
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.openEditDashboard('board-a');
      result.current.setEditingDashboardColumns([{ id: 'only', name: 'Done', order: 0, isDone: true }]);
    });

    await act(async () => {
      await result.current.handleSaveDashboardEdit({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.dashboardActionError).toBe('Failed to update dashboard');
  });

  it('sets fallback action error when deleting dashboard fails with non-Error', async () => {
    const { args, mocks } = createArgs();
    mocks.deleteDashboard.mockRejectedValue('nope');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleDeleteDashboard('board-a', 'Board A');
    });

    expect(result.current.dashboardActionError).toBe('Failed to delete dashboard');
    confirmSpy.mockRestore();
  });

  it('returns early on dashboard drop when there is no active drag id', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleDashboardDrop(1);
    });

    expect(mocks.reorderDashboards).not.toHaveBeenCalled();
  });

  it('archives todo by setting archived flag', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleArchiveTodo('t-1');
    });

    expect(mocks.updateTodo).toHaveBeenCalledWith('t-1', { archived: true });
  });

  it('unarchives todo by clearing archived flag', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleUnarchiveTodo('t-1');
    });

    expect(mocks.updateTodo).toHaveBeenCalledWith('t-1', { archived: false });
  });

  it('skips reorder when dashboard is dropped to the same effective index', async () => {
    const { args, mocks } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardDragId('board-a');
      result.current.setDashboardDropIndex(1);
    });

    await act(async () => {
      await result.current.handleDashboardDrop(1);
    });

    expect(mocks.reorderDashboards).not.toHaveBeenCalled();
    expect(result.current.dashboardDragId).toBeNull();
    expect(result.current.dashboardDropIndex).toBeNull();
  });

  it('sets fallback action error when dashboard reorder fails with non-Error', async () => {
    const { args, mocks } = createArgs();
    mocks.reorderDashboards.mockRejectedValue('order-failed');
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardDragId('board-a');
    });

    await act(async () => {
      await result.current.handleDashboardDrop(3);
    });

    expect(result.current.dashboardActionError).toBe('Failed to reorder dashboards');
  });
});
