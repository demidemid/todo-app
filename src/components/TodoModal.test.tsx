import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../types/todo';
import { TodoModal } from './TodoModal';

const mockUseTodoModalController = vi.fn();
const mockUseTodoModalEditor = vi.fn();

vi.mock('./todo-modal/useTodoModalController', () => ({
  useTodoModalController: (args: unknown) => mockUseTodoModalController(args),
}));

vi.mock('./todo-modal/useTodoModalEditor', () => ({
  useTodoModalEditor: (args: unknown) => mockUseTodoModalEditor(args),
}));

const todo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Title',
  description: '<p>Description</p>',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'todo',
  weight: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const onClose = vi.fn();
const updateTodo = vi.fn<(...args: unknown[]) => Promise<void>>();
const deleteTodo = vi.fn<(...args: unknown[]) => Promise<void>>();

type ControllerState = {
  comments: unknown[];
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  setCommentText: ReturnType<typeof vi.fn>;
  commentSubmitting: boolean;
  commentError: string;
  handleAddComment: ReturnType<typeof vi.fn>;
};

const createControllerState = (): ControllerState => ({
  comments: [],
  commentsLoading: false,
  commentsError: null,
  commentText: '',
  setCommentText: vi.fn(),
  commentSubmitting: false,
  commentError: '',
  handleAddComment: vi.fn((event: React.FormEvent) => event.preventDefault()),
});

const createEditorState = (overrides?: Partial<ReturnType<typeof createEditorStateBase>>) => ({
  ...createEditorStateBase(),
  ...(overrides ?? {}),
});

const createEditorStateBase = () => ({
  isEditing: false,
  setIsEditing: vi.fn(),
  isEditingTitle: false,
  setIsEditingTitle: vi.fn(),
  title: 'Title',
  setTitle: vi.fn(),
  description: '<p>Description</p>',
  setDescription: vi.fn(),
  saving: false,
  error: '',
  handleSaveTitle: vi.fn(),
  handleCancelEditTitle: vi.fn(),
  handleSave: vi.fn(),
  handleCancelEdit: vi.fn(),
  handleDelete: vi.fn(),
});

describe('TodoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTodoModalController.mockReturnValue(createControllerState());
    mockUseTodoModalEditor.mockReturnValue(createEditorState());
  });

  it('closes when clicking the backdrop but not when clicking inside modal content', () => {
    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    const backdrop = screen.getByTestId('todo-modal');
    const closeButton = screen.getByLabelText('Close');

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(closeButton.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('triggers title save on Cmd/Ctrl+S while editing title', () => {
    const editorState = createEditorState({
      isEditingTitle: true,
      isEditing: false,
      handleSaveTitle: vi.fn(),
      handleSave: vi.fn(),
    });
    mockUseTodoModalEditor.mockReturnValue(editorState);

    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Close'), { key: 's', ctrlKey: true });

    expect(editorState.handleSaveTitle).toHaveBeenCalledTimes(1);
    expect(editorState.handleSave).not.toHaveBeenCalled();
  });

  it('triggers description save on Cmd/Ctrl+S while editing description', () => {
    const editorState = createEditorState({
      isEditingTitle: false,
      isEditing: true,
      handleSaveTitle: vi.fn(),
      handleSave: vi.fn(),
    });
    mockUseTodoModalEditor.mockReturnValue(editorState);

    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Close'), { key: 'S', metaKey: true });

    expect(editorState.handleSave).toHaveBeenCalledTimes(1);
    expect(editorState.handleSaveTitle).not.toHaveBeenCalled();
  });

  it('does not save on unrelated key combinations', () => {
    const editorState = createEditorState({
      isEditing: true,
      handleSave: vi.fn(),
      handleSaveTitle: vi.fn(),
    });
    mockUseTodoModalEditor.mockReturnValue(editorState);

    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Close'), { key: 's' });
    fireEvent.keyDown(screen.getByLabelText('Close'), { key: 'x', metaKey: true });

    expect(editorState.handleSave).not.toHaveBeenCalled();
    expect(editorState.handleSaveTitle).not.toHaveBeenCalled();
  });

  it('forwards comment textarea changes and submit handler to comments panel', () => {
    const controllerState = createControllerState();
    controllerState.commentText = 'Hi';
    mockUseTodoModalController.mockReturnValue(controllerState);

    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Add a comment...'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controllerState.setCommentText).toHaveBeenCalledWith('Hello there');
    expect(controllerState.handleAddComment).toHaveBeenCalledTimes(1);
  });

  it('renders comments panel error states from controller', () => {
    const controllerState = createControllerState();
    controllerState.commentsLoading = false;
    controllerState.commentsError = 'Comments unavailable';
    controllerState.commentError = 'Failed to add comment';
    mockUseTodoModalController.mockReturnValue(controllerState);

    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    expect(screen.getByText('Comments unavailable')).toBeInTheDocument();
    expect(screen.getByText('Failed to add comment')).toBeInTheDocument();
  });
});
