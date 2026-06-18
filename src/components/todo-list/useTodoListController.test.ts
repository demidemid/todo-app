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

  it('closes create dashboard modal and clears entered data', () => {
    const { args } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setIsCreateDashboardModalOpen(true);
      result.current.setDashboardName('Platform');
      result.current.setColumnDraft('Backlog');
      result.current.setDashboardColumns(['Backlog', 'Done']);
      result.current.setDashboardFormError('Name already exists');
    });

    act(() => {
      result.current.closeCreateDashboardModal();
    });

    expect(result.current.isCreateDashboardModalOpen).toBe(false);
    expect(result.current.dashboardName).toBe('');
    expect(result.current.columnDraft).toBe('');
    expect(result.current.dashboardColumns).toEqual([]);
    expect(result.current.dashboardFormError).toBe('');
  });

  it('renames and removes columns in create dashboard draft list', () => {
    const { args } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardColumns(['Backlog', 'Done']);
    });

    act(() => {
      result.current.updateCreateDashboardColumnName(0, 'To do');
    });

    expect(result.current.dashboardColumns).toEqual(['To do', 'Done']);

    act(() => {
      result.current.removeCreateDashboardColumn(1);
    });

    expect(result.current.dashboardColumns).toEqual(['To do']);
  });

  it('reorders create dashboard draft columns', () => {
    const { args } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setDashboardColumns(['Backlog', 'In progress', 'Done']);
    });

    act(() => {
      result.current.reorderCreateDashboardColumns(0, 2);
    });

    expect(result.current.dashboardColumns).toEqual(['In progress', 'Done', 'Backlog']);
  });

  it('reorders edit dashboard columns', () => {
    const { args } = createArgs();
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.openEditDashboard('board-a');
    });

    act(() => {
      result.current.reorderEditDashboardColumns(0, 1);
    });

    expect(result.current.editingDashboardColumns.map((column) => column.id)).toEqual(['done', 'todo']);
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

  it('does not move blocked todo into done column', async () => {
    const { args, mocks } = createArgs();
    args.todos = [
      {
        ...todos[0],
        blockedReason: 'Waiting for dependency',
      },
    ];
    args.groupedTodos = {
      todo: args.todos,
      done: [],
    };
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleMoveTodo('t-1', 'done', 0);
    });

    expect(mocks.updateTodo).not.toHaveBeenCalled();
    expect(result.current.dashboardActionError).toBe(
      'Card "Todo" can\'t be moved to Done because it is blocked: Waiting for dependency'
    );
  });

  it('archives all todos from the last dashboard status', async () => {
    const { args, mocks } = createArgs();
    args.todos = [
      ...todos,
      {
        ...todos[0],
        id: 't-done-1',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
      },
      {
        ...todos[0],
        id: 't-done-2',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
      },
      {
        ...todos[0],
        id: 't-done-archived',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
        archived: true,
      },
    ];
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleArchiveAllCompleted('board-a');
    });

    expect(mocks.updateTodo).toHaveBeenCalledWith('t-done-1', { archived: true });
    expect(mocks.updateTodo).toHaveBeenCalledWith('t-done-2', { archived: true });
    expect(mocks.updateTodo).not.toHaveBeenCalledWith('t-done-archived', { archived: true });
  });

  it('archives todos from isDone column even when it is not the max-order column', async () => {
    const { args, mocks } = createArgs();
    args.dashboards = [
      {
        ...dashboards[0],
        columns: [
          { id: 'done', name: 'Done', order: 0, isDone: true },
          { id: 'later', name: 'Later', order: 10, isDone: false },
        ],
      },
      ...dashboards.slice(1),
    ];
    args.columns = args.dashboards[0].columns;
    args.activeDashboard = args.dashboards[0];
    args.todos = [
      {
        ...todos[0],
        id: 't-done',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
      },
      {
        ...todos[0],
        id: 't-later',
        boardId: 'board-a',
        status: 'later',
        columnId: 'later',
      },
    ];

    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleArchiveAllCompleted('board-a');
    });

    expect(mocks.updateTodo).toHaveBeenCalledWith('t-done', { archived: true });
    expect(mocks.updateTodo).not.toHaveBeenCalledWith('t-later', { archived: true });
  });

  it('archives only todos from the selected dashboard', async () => {
    const { args, mocks } = createArgs();
    args.todos = [
      ...todos,
      {
        ...todos[0],
        id: 't-board-a-done',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
      },
      {
        ...todos[0],
        id: 't-board-b-done',
        boardId: 'board-b',
        status: 'done',
        columnId: 'done',
      },
    ];
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleArchiveAllCompleted('board-a');
    });

    expect(mocks.updateTodo).toHaveBeenCalledWith('t-board-a-done', { archived: true });
    expect(mocks.updateTodo).not.toHaveBeenCalledWith('t-board-b-done', { archived: true });
  });

  it('logs error when archive-all-completed update fails', async () => {
    const { args, mocks } = createArgs();
    args.todos = [
      {
        ...todos[0],
        id: 't-done-1',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
      },
      {
        ...todos[0],
        id: 't-done-2',
        boardId: 'board-a',
        status: 'done',
        columnId: 'done',
      },
    ];
    mocks.updateTodo
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('write failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTodoListController(args));

    await act(async () => {
      await result.current.handleArchiveAllCompleted('board-a');
    });

    expect(mocks.updateTodo).toHaveBeenCalledWith('t-done-1', { archived: true });
    expect(mocks.updateTodo).toHaveBeenCalledWith('t-done-2', { archived: true });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error archiving completed todos:', expect.any(Error));

    consoleErrorSpy.mockRestore();
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

  it('closes create card modal on transient addTodo error', async () => {
    const { args, mocks } = createArgs();
    mocks.addTodo.mockRejectedValueOnce({
      code: 'auth/network-request-failed',
      message: 'POST https://securetoken.googleapis.com/v1/token net::ERR_CONNECTION_CLOSED',
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setIsCreateModalOpen(true);
      result.current.setCreateCardDashboardId('board-a');
      result.current.setCreateCardColumnId('todo');
      result.current.setTitle('Network todo');
      result.current.setDescription('Body');
    });

    await act(async () => {
      await result.current.handleAddTodo({ preventDefault() {} } as React.FormEvent);
    });

    expect(mocks.addTodo).toHaveBeenCalled();
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.createCardDashboardId).toBeNull();
    expect(result.current.createCardColumnId).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it('keeps create card modal open on non-transient addTodo error', async () => {
    const { args, mocks } = createArgs();
    mocks.addTodo.mockRejectedValueOnce({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions.',
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setIsCreateModalOpen(true);
      result.current.setCreateCardDashboardId('board-a');
      result.current.setCreateCardColumnId('todo');
      result.current.setTitle('Denied todo');
      result.current.setDescription('Denied description');
    });

    await act(async () => {
      await result.current.handleAddTodo({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.isCreateModalOpen).toBe(true);
    expect(result.current.createCardDashboardId).toBe('board-a');
    expect(result.current.createCardColumnId).toBe('todo');
    expect(result.current.title).toBe('Denied todo');
    expect(result.current.description).toBe('Denied description');

    consoleErrorSpy.mockRestore();
  });

  it('closes create card modal immediately while addTodo is still pending', async () => {
    const { args, mocks } = createArgs();
    let resolveAddTodo: ((value: string) => void) | null = null;

    mocks.addTodo.mockImplementationOnce(() => new Promise<string>((resolve) => {
      resolveAddTodo = resolve;
    }));

    const { result } = renderHook(() => useTodoListController(args));

    act(() => {
      result.current.setIsCreateModalOpen(true);
      result.current.setCreateCardDashboardId('board-a');
      result.current.setCreateCardColumnId('todo');
      result.current.setTitle('Pending todo');
      result.current.setDescription('Pending description');
    });

    act(() => {
      void result.current.handleAddTodo({ preventDefault() {} } as React.FormEvent);
    });

    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.createCardDashboardId).toBeNull();
    expect(result.current.createCardColumnId).toBeNull();
    expect(result.current.title).toBe('');
    expect(result.current.description).toBe('');

    await act(async () => {
      resolveAddTodo?.('created-id');
      await Promise.resolve();
    });

    expect(mocks.addTodo).toHaveBeenCalledTimes(1);
  });
});
