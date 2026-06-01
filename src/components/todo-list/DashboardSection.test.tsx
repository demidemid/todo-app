import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { DashboardSection } from './DashboardSection';

vi.mock('../todo-modal/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea data-testid="mock-rich-text-editor" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const dashboard: Dashboard = {
  id: 'board-1',
  userId: 'user-1',
  name: 'Board 1',
  order: 0,
  columns: [
    { id: 'todo', name: 'To do', order: 0, isDone: false },
    { id: 'done', name: 'Done', order: 1, isDone: true },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

const todo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Task title',
  description: '<p>Task description</p>',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'todo',
  weight: 1000,
  comments: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

const createProps = (): ComponentProps<typeof DashboardSection> => ({
  dashboard,
  isExpanded: true,
  isDragging: false,
  isDropTarget: false,
  dashboardsLength: 2,
  columns: dashboard.columns,
  groupedTodos: { todo: [todo], done: [] },
  editingTodoId: null,
  editingTitle: 'Task title',
  editingDescription: '<p>Task description</p>',
  dragState: null,
  dropTarget: null,
  sectionRef: vi.fn(),
  onToggle: vi.fn(),
  onDashboardDragStart: vi.fn(),
  onDashboardDragEnd: vi.fn(),
  onDashboardDragOver: vi.fn(),
  onDashboardDrop: vi.fn(),
  onOpenEditDashboard: vi.fn(),
  onDeleteDashboard: vi.fn(),
  onOpenCreateCard: vi.fn(),
  onMoveTodo: vi.fn(),
  onSetDragState: vi.fn(),
  onSetDropTarget: vi.fn(),
  onOpenTodoModal: vi.fn(),
  onCancelEdit: vi.fn(),
  onSaveEdit: vi.fn(),
  onEditTitleChange: vi.fn(),
  onEditDescriptionChange: vi.fn(),
  onEditKeyDown: vi.fn(),
  onMenuEdit: vi.fn(),
  onMenuArchive: vi.fn(),
  onMenuDelete: vi.fn(),
});

describe('DashboardSection', () => {
  it('toggles from header click and keyboard, while dashboard actions are handled via ellipsis menu', () => {
    const props = createProps();
    props.onOpenShareDashboard = vi.fn();
    render(<DashboardSection {...props} />);

    fireEvent.click(screen.getByText('Board 1'));
    fireEvent.keyDown(screen.getByRole('button', { expanded: true }), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button', { expanded: true }), { key: ' ' });

    fireEvent.click(screen.getByTestId('dashboard-actions-trigger-board-1'));
    fireEvent.click(screen.getByTestId('share-dashboard-button-board-1'));

    fireEvent.click(screen.getByTestId('dashboard-actions-trigger-board-1'));
    fireEvent.click(screen.getByTestId('edit-dashboard-button-board-1'));

    fireEvent.click(screen.getByTestId('dashboard-actions-trigger-board-1'));
    fireEvent.click(screen.getByTestId('delete-dashboard-button-board-1'));

    expect(props.onToggle).toHaveBeenCalledTimes(3);
    expect(props.onOpenShareDashboard).toHaveBeenCalledWith('board-1');
    expect(props.onOpenEditDashboard).toHaveBeenCalledWith('board-1');
    expect(props.onDeleteDashboard).toHaveBeenCalledWith('board-1', 'Board 1');
  });

  it('handles dashboard drag start and drag end callbacks', () => {
    const props = createProps();
    render(<DashboardSection {...props} />);

    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
    };

    fireEvent.dragStart(screen.getByTestId('dashboard-drag-handle-board-1'), { dataTransfer });
    fireEvent.dragEnd(screen.getByTestId('dashboard-drag-handle-board-1'));

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'board-1');
    expect(props.onDashboardDragStart).toHaveBeenCalledTimes(1);
    expect(props.onDashboardDragEnd).toHaveBeenCalledTimes(1);
  });

  it('opens create card flow and handles guarded column drop interactions', () => {
    const props = createProps();
    render(<DashboardSection {...props} />);

    fireEvent.click(screen.getByTestId('new-card-button-board-1-todo'));
    fireEvent.drop(screen.getByTestId('column-todo'));
    fireEvent.dragOver(screen.getByTestId('drop-todo-0'));

    expect(props.onOpenCreateCard).toHaveBeenCalledWith('board-1', 'todo');
    expect(props.onMoveTodo).not.toHaveBeenCalled();
    expect(props.onSetDropTarget).toHaveBeenCalledWith({ columnId: 'todo', index: 0 });
  });

  it('moves todo through drop slots and end-drop zone when drag state exists', () => {
    const props = createProps();
    props.dragState = { todoId: 'todo-1' };
    render(<DashboardSection {...props} />);

    fireEvent.drop(screen.getByTestId('column-done'));
    fireEvent.drop(screen.getByTestId('drop-todo-0'));
    fireEvent.drop(screen.getByTestId('drop-done-end'));

    expect(props.onMoveTodo).toHaveBeenCalledWith('todo-1', 'done', 0);
    expect(props.onMoveTodo).toHaveBeenCalledWith('todo-1', 'todo', 0);
    expect(props.onMoveTodo).toHaveBeenCalledWith('todo-1', 'done', 0);
    expect(props.onSetDragState).toHaveBeenCalledWith(null);
    expect(props.onSetDropTarget).toHaveBeenCalledWith(null);
  });

  it('opens todo modal when card is clicked and not editing, and opens card menu trigger', () => {
    const props = createProps();
    render(<DashboardSection {...props} />);

    fireEvent.dragStart(screen.getByTestId('card-todo-1'));
    fireEvent.dragEnd(screen.getByTestId('card-todo-1'));
    fireEvent.click(screen.getByTestId('card-todo-1'));
    fireEvent.click(screen.getByTestId('card-menu-trigger-todo-1'));

    expect(props.onSetDragState).toHaveBeenCalledWith({ todoId: 'todo-1' });
    expect(props.onSetDragState).toHaveBeenCalledWith(null);
    expect(props.onOpenTodoModal).toHaveBeenCalledWith(todo);
    expect(screen.getByTestId('card-menu-trigger-todo-1')).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders edit mode and forwards edit field, save, and cancel actions', () => {
    const props = createProps();
    props.editingTodoId = 'todo-1';
    render(<DashboardSection {...props} />);

    fireEvent.change(screen.getByTestId('edit-title-todo-1'), { target: { value: 'Updated' } });
    fireEvent.keyDown(screen.getByTestId('edit-title-todo-1'), { key: 'Enter' });
    fireEvent.change(screen.getByTestId('mock-rich-text-editor'), { target: { value: '<p>Updated</p>' } });
    fireEvent.click(screen.getByTestId('edit-cancel-todo-1'));
    fireEvent.click(screen.getByTestId('edit-save-todo-1'));
    fireEvent.click(screen.getByTestId('card-todo-1'));

    expect(props.onEditTitleChange).toHaveBeenCalledWith('Updated');
    expect(props.onEditKeyDown).toHaveBeenCalled();
    expect(props.onEditDescriptionChange).toHaveBeenCalledWith('<p>Updated</p>');
    expect(props.onCancelEdit).toHaveBeenCalledTimes(1);
    expect(props.onSaveEdit).toHaveBeenCalledWith('todo-1');
    expect(props.onOpenTodoModal).not.toHaveBeenCalled();
  });

  it('forwards card menu edit/archive/delete actions', () => {
    const props = createProps();
    render(<DashboardSection {...props} />);

    fireEvent.click(screen.getByTestId('card-menu-trigger-todo-1'));

    fireEvent.click(screen.getByTestId('card-menu-edit'));
    fireEvent.click(screen.getByTestId('card-menu-trigger-todo-1'));
    fireEvent.click(screen.getByTestId('card-menu-archive'));
    fireEvent.click(screen.getByTestId('card-menu-trigger-todo-1'));
    fireEvent.click(screen.getByTestId('card-menu-delete'));

    expect(props.onMenuEdit).toHaveBeenCalledWith(todo);
    expect(props.onMenuArchive).toHaveBeenCalledWith('todo-1');
    expect(props.onMenuDelete).toHaveBeenCalledWith('todo-1');
  });

  it('renders empty columns state when dashboard has no columns', () => {
    const props = createProps();
    props.columns = [];
    render(<DashboardSection {...props} />);

    expect(screen.getByText('This dashboard has no columns yet.')).toBeInTheDocument();
  });

  it('renders downloadable file links on card and does not open modal when file link is clicked', () => {
    const props = createProps();
    props.groupedTodos = {
      todo: [
        {
          ...todo,
          files: [
            {
              id: 'file-1',
              name: 'spec.pdf',
              path: 'todos/todo-1/spec.pdf',
              url: 'https://example.com/spec.pdf',
              size: 123,
              contentType: 'application/pdf',
              uploadedBy: 'user-1',
              uploadedAt: new Date('2026-01-02T00:00:00Z'),
            },
          ],
        },
      ],
      done: [],
    };

    render(<DashboardSection {...props} />);

    const fileLink = screen.getByRole('link', { name: 'spec.pdf' });
    expect(fileLink).toHaveAttribute('href', 'https://example.com/spec.pdf');
    fireEvent.click(fileLink);

    expect(props.onOpenTodoModal).not.toHaveBeenCalled();
  });

  it('renders links block on card and does not open modal when link is clicked', () => {
    const props = createProps();
    props.groupedTodos = {
      todo: [
        {
          ...todo,
          links: [
            {
              name: 'https://example.com/link',
              url: 'https://example.com/link',
            },
          ],
        },
      ],
      done: [],
    };

    render(<DashboardSection {...props} />);

    const link = screen.getByRole('link', { name: 'https://example.com/link' });
    expect(link).toHaveAttribute('href', 'https://example.com/link');
    fireEvent.click(link);

    expect(props.onOpenTodoModal).not.toHaveBeenCalled();
  });

  it('skips rendering unsafe links from persisted data', () => {
    const props = createProps();
    props.groupedTodos = {
      todo: [
        {
          ...todo,
          links: [
            {
              name: 'Safe Link',
              url: 'https://example.com/safe',
            },
            {
              name: 'Bad Link',
              url: 'javascript:alert(1)',
            },
          ],
        },
      ],
      done: [],
    };

    render(<DashboardSection {...props} />);

    expect(screen.getByRole('link', { name: 'Safe Link' })).toHaveAttribute('href', 'https://example.com/safe');
    expect(screen.queryByRole('link', { name: 'Bad Link' })).not.toBeInTheDocument();
  });
});