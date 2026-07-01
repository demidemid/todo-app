import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clickDashboardAction,
  createColumn,
  createDashboard,
  mockAddTodo,
  mockDeleteDashboard,
  mockReorderDashboards,
  mockSetActiveDashboardId,
  mockShareDashboard,
  mockUpdateDashboard,
  mockUseDashboards,
  renderTodoList,
  renderTodoListWithSearch,
  resetTodoListTestState,
  setDashboardsState,
  setUsersState,
} from './TodoList.testUtils';

describe('TodoList dashboard actions', () => {
  beforeEach(() => {
    resetTodoListTestState();
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

    expect(screen.getByTestId('share-users-error')).toHaveTextContent(
      'Failed to load users: Missing or insufficient permissions.',
    );

    const saveButton = screen.getByRole('button', { name: 'Save access' });
    expect(saveButton).toBeDisabled();
  });

  it('disables share submit while users are loading', async () => {
    const user = userEvent.setup();

    setUsersState({ users: [], loading: true, error: null });

    renderTodoList();

    await clickDashboardAction(user, 'share');

    const saveButton = screen.getByRole('button', { name: 'Save access' });
    expect(saveButton).toBeDisabled();
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

    renderTodoListWithSearch(['/?dashboard=board-1']);
    mockSetActiveDashboardId.mockClear();

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('location-search').textContent).not.toContain('dashboard=board-1');
  });

  it('toggles accordion when clicking dashboard header text', async () => {
    const user = userEvent.setup();

    renderTodoList();

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledWith(null);
  });

  it('does not reopen dashboard after collapsing via header click', async () => {
    const user = userEvent.setup();

    renderTodoListWithSearch(['/?dashboard=board-1']);
    mockSetActiveDashboardId.mockClear();

    await user.click(screen.getByText('My Dashboard'));

    expect(mockSetActiveDashboardId).toHaveBeenCalledWith(null);
    expect(mockSetActiveDashboardId).not.toHaveBeenCalledWith('board-1');
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
        addDashboard: vi.fn(),
        updateDashboard: vi.fn(),
        deleteDashboard: vi.fn(),
        reorderDashboards: vi.fn(),
      };
    });

    renderTodoList(['/?dashboard=board-1']);

    expect(screen.getByTestId('column-todo')).toBeInTheDocument();

    await user.click(screen.getByText('My Dashboard'));

    await waitFor(() => {
      expect(screen.queryByTestId('column-todo')).not.toBeInTheDocument();
    });
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

  it('prevents dragging and reordering shared dashboards', () => {
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

  it('shows current user name and avatar on shared dashboard viewer chip', () => {
    setDashboardsState([
      createDashboard({ id: 'board-1', userId: 'user-1', order: 0 }),
      createDashboard({
        id: 'board-2',
        userId: 'user-2',
        name: 'Shared dashboard',
        order: 1,
        sharedWith: ['user-1'],
        sharedWithEmails: ['me@example.com'],
        createdAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);

    renderTodoList(['/?dashboard=board-1'], {
      userEmail: 'me@example.com',
      userName: 'Me',
      userAvatarId: 'fox',
    });

    const sharedAvatar = screen.getByTestId('dashboard-shared-avatar-board-2-0');
    expect(sharedAvatar).toHaveAttribute('src', '/avatars/fox.svg');
    expect(sharedAvatar).toHaveAttribute('title', 'Me (me@example.com)');
  });
});
