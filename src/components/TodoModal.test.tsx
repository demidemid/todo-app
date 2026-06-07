import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../types/todo';
import { TodoModal } from './TodoModal';

const mockUseTodoModalController = vi.fn();
const mockUseTodoModalEditor = vi.fn();
const mockStorageRef = vi.fn();
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockDeleteObject = vi.fn();

vi.mock('../firebase', () => ({
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: (...args: unknown[]) => mockStorageRef(...args),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
}));

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
    mockStorageRef.mockImplementation((_, path: string) => ({ fullPath: path }));
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue('https://example.com/uploaded.pdf');
    mockDeleteObject.mockResolvedValue(undefined);
    updateTodo.mockResolvedValue(undefined);
    deleteTodo.mockResolvedValue(undefined);
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

  it('closes on Escape from non-editable target and marks event as handled', () => {
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

    const closeButton = screen.getByLabelText('Close');
    const escapeEvent = createEvent.keyDown(closeButton, { key: 'Escape' });
    fireEvent(closeButton, escapeEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(escapeEvent.defaultPrevented).toBe(true);
  });

  it('does not close on Escape when focus is in editable controls', () => {
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

    fireEvent.keyDown(screen.getByPlaceholderText('Add a comment...'), { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes only actions menu on Escape and keeps modal open', () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    expect(screen.getByTestId('todo-actions-menu')).toBeInTheDocument();

    const trigger = screen.getByTestId('todo-actions-trigger');
    const escapeEvent = createEvent.keyDown(trigger, { key: 'Escape' });
    fireEvent(trigger, escapeEvent);

    expect(screen.queryByTestId('todo-actions-menu')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(escapeEvent.defaultPrevented).toBe(true);
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

  it('opens hidden file input when add file action is clicked', () => {
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);

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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add files' }));

    expect(inputClickSpy).toHaveBeenCalled();
    inputClickSpy.mockRestore();
  });

  it('shows checklist action in plus actions menu', () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));

    expect(screen.getByTestId('todo-actions-checklist')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Checklist' })).toBeInTheDocument();
  });

  it('shows add files, links and checklist actions together in plus menu', () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));

    expect(screen.getByRole('menuitem', { name: 'Add files' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Links' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Checklist' })).toBeInTheDocument();
  });

  it('shows a readable error when moving card to next status fails', async () => {
    updateTodo.mockRejectedValueOnce({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions.',
    });

    render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
        columns={[
          { id: 'todo', name: 'Todo' },
          { id: 'in_progress', name: 'In Progress' },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-next-status-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Missing or insufficient permissions\./i)).toBeInTheDocument();
    });
  });

  it('persists due date changes from the modal details panel', async () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-due-date'));

    fireEvent.change(screen.getByTestId('todo-due-date-input'), {
      target: { value: '2026-06-06' },
    });
    fireEvent.click(screen.getByTestId('todo-due-date-apply'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith(
        'todo-1',
        expect.objectContaining({
          dueDate: '2026-06-06',
          remindOneDayBefore: false,
          reminderScheduledAt: null,
        })
      );
    });
  });

  it('clears due date from the modal details panel', async () => {
    render(
      <TodoModal
        todo={{
          ...todo,
          dueDate: '2026-06-06',
          remindOneDayBefore: true,
          reminderScheduledAt: '2026-06-05T09:00:00.000Z',
        }}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-due-date-remove'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith(
        'todo-1',
        expect.objectContaining({
          dueDate: null,
          remindOneDayBefore: false,
          reminderScheduledAt: null,
        })
      );
    });
  });

  it('creates checklist with default title from plus actions menu', async () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-checklist'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [
            expect.objectContaining({
              title: '',
              checked: false,
            }),
          ],
        },
      });
    });
  });

  it('focuses first checklist item input when checklist is created from plus actions menu', async () => {
    const { rerender } = render(
      <TodoModal
        todo={todo}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-checklist'));

    const checklistUpdateCall = await waitFor(() => {
      const call = updateTodo.mock.calls.find(([, payload]) => {
        const updates = payload as Partial<Todo> | undefined;
        return Boolean(updates?.checklist?.items?.length);
      });

      expect(call).toBeDefined();
      return call as [string, Partial<Todo>];
    });

    const firstItemId = checklistUpdateCall[1].checklist?.items?.[0]?.id;
    expect(typeof firstItemId).toBe('string');

    rerender(
      <TodoModal
        todo={{
          ...todo,
          checklist: {
            title: 'check list',
            items: [{ id: String(firstItemId), title: '', checked: false }],
          },
        }}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    const firstItemInput = await screen.findByTestId(`todo-checklist-item-input-${String(firstItemId)}`);
    expect(firstItemInput).toHaveFocus();
    expect(firstItemInput).toHaveValue('');
  });

  it('renders checklist above files and links and allows title/item edit and checkbox toggle', async () => {
    const todoWithChecklist: Todo = {
      ...todo,
      files: [
        {
          id: 'file-1',
          name: 'doc.pdf',
          path: 'todos/todo-1/doc.pdf',
          url: 'https://example.com/doc.pdf',
          size: 111,
          contentType: 'application/pdf',
          uploadedBy: 'user-1',
          uploadedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      links: [{ name: 'Docs', url: 'https://example.com/docs' }],
      checklist: {
        title: 'check list',
        items: [{ id: 'item-1', title: 'first item', checked: false }],
      },
    };

    render(
      <TodoModal
        todo={todoWithChecklist}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    const checklistSection = screen.getByTestId('todo-checklist-section');
    const filesLabel = screen.getByText('Files');
    const linksLabel = screen.getByText('Links');

    expect(checklistSection.compareDocumentPosition(filesLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checklistSection.compareDocumentPosition(linksLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByTestId('todo-checklist-title'));
    fireEvent.change(screen.getByTestId('todo-checklist-title-input'), { target: { value: 'Sprint checklist' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-title-input'), { key: 'Enter' });

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'Sprint checklist',
          items: [{ id: 'item-1', title: 'first item', checked: false }],
        },
      });
    });

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    fireEvent.change(screen.getByTestId('todo-checklist-item-input-item-1'), { target: { value: 'edited item' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-item-input-item-1'), { key: 'Enter' });

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [{ id: 'item-1', title: 'edited item', checked: false }],
        },
      });
    });

    fireEvent.click(screen.getByTestId('todo-checklist-toggle-item-1'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [{ id: 'item-1', title: 'first item', checked: true }],
        },
      });
    });
  });

  it('adds and deletes checklist items from checklist section controls', async () => {
    const todoWithChecklist: Todo = {
      ...todo,
      checklist: {
        title: 'check list',
        items: [{ id: 'item-1', title: 'first item', checked: false }],
      },
    };

    render(
      <TodoModal
        todo={todoWithChecklist}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-add-item'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [
            { id: 'item-1', title: 'first item', checked: false },
            expect.objectContaining({ title: '', checked: false }),
          ],
        },
      });
    });
  });

  it('falls back to default checklist name and keeps checklist item title empty when saved empty', async () => {
    const todoWithChecklist: Todo = {
      ...todo,
      checklist: {
        title: 'My checklist',
        items: [{ id: 'item-1', title: 'first item', checked: false }],
      },
    };

    render(
      <TodoModal
        todo={todoWithChecklist}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-title'));
    fireEvent.change(screen.getByTestId('todo-checklist-title-input'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-title-input'), { key: 'Enter' });

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [{ id: 'item-1', title: 'first item', checked: false }],
        },
      });
    });

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    fireEvent.change(screen.getByTestId('todo-checklist-item-input-item-1'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-item-input-item-1'), { key: 'Enter' });

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'My checklist',
          items: [{ id: 'item-1', title: '', checked: false }],
        },
      });
    });
  });

  it('focuses new checklist item input and keeps it empty after adding item', async () => {
    const todoWithChecklist: Todo = {
      ...todo,
      checklist: {
        title: 'check list',
        items: [{ id: 'item-1', title: 'first item', checked: false }],
      },
    };

    const { rerender } = render(
      <TodoModal
        todo={todoWithChecklist}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-add-item'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [
            { id: 'item-1', title: 'first item', checked: false },
            expect.objectContaining({ title: '', checked: false }),
          ],
        },
      });
    });

    const updateCall = updateTodo.mock.calls.find(([, payload]) => {
      const updates = payload as Partial<Todo> | undefined;
      return Array.isArray(updates?.checklist?.items) && updates.checklist.items.length === 2;
    });
    const addedItemId = (updateCall?.[1] as Partial<Todo> | undefined)?.checklist?.items?.[1]?.id;

    expect(typeof addedItemId).toBe('string');

    rerender(
      <TodoModal
        todo={{
          ...todoWithChecklist,
          checklist: {
            title: 'check list',
            items: [
              { id: 'item-1', title: 'first item', checked: false },
              { id: String(addedItemId), title: '', checked: false },
            ],
          },
        }}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    const newItemInput = await screen.findByTestId(`todo-checklist-item-input-${String(addedItemId)}`);
    expect(newItemInput).toHaveFocus();
    expect(newItemInput).toHaveValue('');
  });

  it('creates multiple checklist items when list text is pasted into item input', async () => {
    const todoWithChecklist: Todo = {
      ...todo,
      checklist: {
        title: 'check list',
        items: [{ id: 'item-1', title: '', checked: false }],
      },
    };

    render(
      <TodoModal
        todo={todoWithChecklist}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    const input = screen.getByTestId('todo-checklist-item-input-item-1');

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => '- first\nsecond\n3. third',
      },
    });

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        checklist: {
          title: 'check list',
          items: [
            { id: 'item-1', title: 'first', checked: false },
            expect.objectContaining({ title: 'second', checked: false }),
            expect.objectContaining({ title: 'third', checked: false }),
          ],
        },
      });
    });
  });

  it('adds link with explicit name from plus actions menu', async () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-add-link'));

    fireEvent.change(screen.getByPlaceholderText('Name (optional)'), {
      target: { value: 'Docs' },
    });
    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'https://example.com/docs' },
    });
    fireEvent.click(screen.getByTestId('todo-actions-add-link-submit'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        links: [{ name: 'Docs', url: 'https://example.com/docs' }],
      });
    });
  });

  it('uses URL as fallback name when adding link without name', async () => {
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

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-add-link'));

    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'https://example.com/fallback' },
    });
    fireEvent.click(screen.getByTestId('todo-actions-add-link-submit'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        links: [{ name: 'https://example.com/fallback', url: 'https://example.com/fallback' }],
      });
    });
  });

  it('sanitizes links on the persistence boundary and drops unsafe existing protocols', async () => {
    const todoWithUnsafeLink: Todo = {
      ...todo,
      links: [{ name: 'bad', url: 'javascript:alert(1)' }],
    };

    render(
      <TodoModal
        todo={todoWithUnsafeLink}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-add-link'));

    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'example.com/safe' },
    });
    fireEvent.click(screen.getByTestId('todo-actions-add-link-submit'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        links: [{ name: 'https://example.com/safe', url: 'https://example.com/safe' }],
      });
    });
  });

  it('deletes selected link by red cross and keeps remaining links', async () => {
    const todoWithLinks: Todo = {
      ...todo,
      links: [
        { name: 'https://example.com/first', url: 'https://example.com/first' },
        { name: 'https://example.com/second', url: 'https://example.com/second' },
      ],
    };

    render(
      <TodoModal
        todo={todoWithLinks}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('delete-link-0'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        links: [{ name: 'https://example.com/second', url: 'https://example.com/second' }],
      });
    });
  });

  it('deletes last link and saves empty links array', async () => {
    const todoWithSingleLink: Todo = {
      ...todo,
      links: [{ name: 'https://example.com/only', url: 'https://example.com/only' }],
    };

    render(
      <TodoModal
        todo={todoWithSingleLink}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('delete-link-0'));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('todo-1', {
        links: [],
      });
    });
  });

  it('uploads selected files to storage and saves metadata to todo', async () => {
    const fixedUuid: `${string}-${string}-${string}-${string}-${string}` = '11111111-1111-1111-1111-111111111111';
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(fixedUuid);

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

    const file = new File(['hello'], 'spec.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('todo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadBytes).toHaveBeenCalledTimes(1);
      expect(updateTodo).toHaveBeenCalledTimes(1);
    });

    expect(mockStorageRef).toHaveBeenCalledWith(expect.anything(), 'todos/todo-1/11111111-1111-1111-1111-111111111111-spec.pdf');
    expect(updateTodo).toHaveBeenCalledWith(
      'todo-1',
      expect.objectContaining({
        files: [
          expect.objectContaining({
            id: '11111111-1111-1111-1111-111111111111',
            name: 'spec.pdf',
            path: 'todos/todo-1/11111111-1111-1111-1111-111111111111-spec.pdf',
            url: 'https://example.com/uploaded.pdf',
            uploadedBy: 'user-1',
          }),
        ],
      }),
    );

    randomUuidSpy.mockRestore();
  });

  it('shows error when metadata save fails after successful upload', async () => {
    const metadataError = Object.assign(new Error('Missing or insufficient permissions.'), {
      code: 'permission-denied',
    });
    updateTodo.mockRejectedValueOnce(metadataError);

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

    const file = new File(['hello'], 'spec.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('todo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Failed to save file metadata/)).toBeInTheDocument();
    });
  });

  it('shows error when storage upload fails', async () => {
    const uploadError = Object.assign(new Error('storage write denied'), {
      code: 'storage/unauthorized',
    });
    mockUploadBytes.mockRejectedValueOnce(uploadError);

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

    const file = new File(['hello'], 'spec.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('todo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Failed to upload file/)).toBeInTheDocument();
    });
  });

  it('rejects files larger than 5 MB before upload starts', async () => {
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

    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.bin', {
      type: 'application/octet-stream',
    });
    const input = screen.getByTestId('todo-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Each file must be 5 MB or less/)).toBeInTheDocument();
    });
    expect(mockUploadBytes).not.toHaveBeenCalled();
    expect(updateTodo).not.toHaveBeenCalled();
  });

  it('deletes file from storage and removes metadata entry', async () => {
    const todoWithFile: Todo = {
      ...todo,
      files: [
        {
          id: 'file-1',
          name: 'spec.pdf',
          path: 'todos/todo-1/file-1-spec.pdf',
          url: 'https://example.com/spec.pdf',
          size: 10,
          contentType: 'application/pdf',
          uploadedBy: 'user-1',
          uploadedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    };

    render(
      <TodoModal
        todo={todoWithFile}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('delete-file-file-1'));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledTimes(1);
      expect(updateTodo).toHaveBeenCalledWith('todo-1', { files: [] });
    });
  });

  it('shows error when deleting file metadata fails', async () => {
    const todoWithFile: Todo = {
      ...todo,
      files: [
        {
          id: 'file-1',
          name: 'spec.pdf',
          path: 'todos/todo-1/file-1-spec.pdf',
          url: 'https://example.com/spec.pdf',
          size: 10,
          contentType: 'application/pdf',
          uploadedBy: 'user-1',
          uploadedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    };
    const removeError = Object.assign(new Error('write failed'), { code: 'permission-denied' });
    updateTodo.mockRejectedValueOnce(removeError);

    render(
      <TodoModal
        todo={todoWithFile}
        userId="user-1"
        userEmail="user@example.com"
        onClose={onClose}
        updateTodo={updateTodo}
        deleteTodo={deleteTodo}
      />,
    );

    fireEvent.click(screen.getByTestId('delete-file-file-1'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to delete file/)).toBeInTheDocument();
    });
  });
});
