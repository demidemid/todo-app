import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDashboard,
  createColumn,
  createTodo,
  mockAddComment,
  mockAddDashboard,
  mockDeleteDashboard,
  mockReorderDashboards,
  mockSetActiveDashboardId,
  mockUpdateDashboard,
  mockUpdateTodo,
  mockUseComments,
  mockUseDashboards,
  renderTodoList,
  renderTodoListWithSearch,
  resetTodoListTestState,
  setCommentsState,
  setTodosState,
} from './TodoList.testUtils';

describe('TodoList modal and routing', () => {
  beforeEach(() => {
    resetTodoListTestState();
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

    renderTodoListWithSearch();

    await user.click(screen.getByTestId('card-t-1'));

    await waitFor(() => {
      expect(screen.getByTestId('todo-modal')).toBeInTheDocument();
    });
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

  it('adds a comment from card modal', async () => {
    const user = userEvent.setup();

    mockAddComment.mockResolvedValue(undefined);
    setTodosState([createTodo()]);

    renderTodoListWithSearch();

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

  it('saves card description with Cmd/Ctrl+S in the modal', async () => {
    const user = userEvent.setup();

    mockUpdateTodo.mockResolvedValue(undefined);
    setTodosState([createTodo()]);

    renderTodoListWithSearch();

    await user.click(screen.getByTestId('card-t-1'));
    await user.click(screen.getByRole('button', { name: 'Edit description' }));

    await waitFor(
      () => {
        const editor = screen.getByTestId('rich-text-editor');
        expect(editor).toBeInTheDocument();
        expect(editor).not.toBeEmptyDOMElement();
      },
      { timeout: 3000 }
    );

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

  it('closes opened todo modal via close button', async () => {
    const user = userEvent.setup();

    setTodosState([createTodo()]);

    renderTodoListWithSearch();

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

    setTodosState([createTodo()]);

    renderTodoListWithSearch();

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
});
