import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { TodoModalDetailsPanel } from './TodoModalDetailsPanel';

type TodoModalDetailsPanelProps = React.ComponentProps<typeof TodoModalDetailsPanel>;

const todo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Card title',
  description: '<p>Saved description</p>',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'in_progress',
  weight: 1000,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T12:00:00Z'),
};

const createProps = (): TodoModalDetailsPanelProps => ({
  todo,
  files: [],
  filesUploading: false,
  deletingFileIds: [],
  filesError: '',
  isEditing: false,
  isEditingTitle: false,
  title: 'Card title',
  description: '<p>Saved description</p>',
  saving: false,
  error: '',
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onStartEditTitle: vi.fn(),
  onSaveTitle: vi.fn(),
  onCancelEditTitle: vi.fn(),
  onTitleChange: vi.fn(),
  onDescriptionChange: vi.fn(),
  onOpenFilePicker: vi.fn(),
  onDeleteFile: vi.fn(),
  onDeleteLink: vi.fn(),
  onDueDateChange: vi.fn(),
  onRemindOneDayBeforeChange: vi.fn(),
  onBlock: vi.fn(),
});

describe('TodoModalDetailsPanel', () => {
  it('renders readonly metadata and description actions', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getAllByText((_, node) => node?.textContent === 'Card title').length).toBeGreaterThan(0);
    expect(screen.getByTestId('todo-actions-panel')).toBeInTheDocument();
    expect(screen.queryByText('Files')).not.toBeInTheDocument();
    expect(screen.queryByText('No files yet.')).not.toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toHaveTextContent('IN PROGRESS');
    expect(screen.getByRole('button', { name: 'Edit title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit description' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open card menu' })).toBeInTheDocument();
  });

  it('renders human-readable status name from columns for opaque column ids', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      status: '75E3E2D7-0348-4057-B305-84FFCE842227',
      columnId: '75E3E2D7-0348-4057-B305-84FFCE842227',
    };
    props.columns = [
      { id: '75E3E2D7-0348-4057-B305-84FFCE842227', name: 'In Review' },
    ];

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByText(/Status:/)).toHaveTextContent('IN REVIEW');
  });

  it('renders exact due date text when due-state label is not applicable', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: '2099-01-01',
      isCompleted: false,
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByTestId('todo-due-date-metadata')).toHaveTextContent('Due date: 2099-01-01');
  });

  it('opens actions menu with add file item from the plus button', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.queryByTestId('todo-actions-menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('todo-actions-trigger'));

    expect(screen.getByTestId('todo-actions-menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add files' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Links' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Add files' }));
    expect(props.onOpenFilePicker).toHaveBeenCalledTimes(1);
  });

  it('shows card ellipsis menu with archive, block and delete actions', async () => {
    const props = createProps();
    props.onArchive = vi.fn();
    props.onBlock = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-card-menu-trigger'));
    expect(screen.getByTestId('todo-card-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('todo-card-menu-archive'));
    expect(props.onArchive).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('todo-card-menu-trigger'));
    fireEvent.click(screen.getByTestId('todo-card-menu-block'));
    expect(screen.getByTestId('todo-block-reason-form')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('todo-block-reason-input'), {
      target: { value: 'Blocked by API limits' },
    });
    fireEvent.click(screen.getByTestId('todo-block-reason-save'));

    await waitFor(() => {
      expect(props.onBlock).toHaveBeenCalledWith('Blocked by API limits');
    });

    fireEvent.click(screen.getByTestId('todo-card-menu-trigger'));
    fireEvent.click(screen.getByTestId('todo-card-menu-delete'));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows an existing block reason and lets you edit it', async () => {
    const props = createProps();
    props.todo = {
      ...todo,
      blockedReason: 'Waiting for review',
    };
    props.onBlock = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByTestId('todo-block-reason-metadata')).toHaveTextContent('Waiting for review');

    fireEvent.click(screen.getByTestId('todo-block-reason-edit'));
    expect(screen.getByTestId('todo-block-reason-form')).toBeInTheDocument();
    expect(screen.queryByTestId('todo-block-reason-metadata')).not.toBeInTheDocument();
    expect(screen.getByTestId('todo-block-reason-input')).toHaveValue('Waiting for review');

    fireEvent.change(screen.getByTestId('todo-block-reason-input'), {
      target: { value: 'Waiting for updated design' },
    });
    fireEvent.click(screen.getByTestId('todo-block-reason-save'));

    await waitFor(() => {
      expect(props.onBlock).toHaveBeenCalledWith('Waiting for updated design');
    });
  });

  it('removes an existing block reason', async () => {
    const props = createProps();
    props.todo = {
      ...todo,
      blockedReason: 'Waiting for review',
    };
    props.onBlock = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-block-reason-remove'));

    await waitFor(() => {
      expect(props.onBlock).toHaveBeenCalledWith(null);
    });
  });

  it('requires a non-empty block reason before saving', async () => {
    const props = createProps();
    props.onBlock = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-card-menu-trigger'));
    fireEvent.click(screen.getByTestId('todo-card-menu-block'));
    fireEvent.change(screen.getByTestId('todo-block-reason-input'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByTestId('todo-block-reason-save'));

    await waitFor(() => {
      expect(screen.getByText('Enter block reason')).toBeInTheDocument();
    });

    expect(props.onBlock).not.toHaveBeenCalled();
  });

  it('shows checklist action in plus menu and triggers create checklist handler', () => {
    const props = createProps();
    props.onCreateChecklist = vi.fn();

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-checklist'));

    expect(props.onCreateChecklist).toHaveBeenCalledTimes(1);
  });

  it('forwards checklist title/item actions from details panel controls', async () => {
    const props = createProps();
    props.todo = {
      ...todo,
      checklist: {
        title: 'check list',
        items: [{ id: 'item-1', title: 'first item', checked: false }],
      },
    };
    props.onChecklistTitleChange = vi.fn().mockResolvedValue(undefined);
    props.onChecklistAddItem = vi.fn().mockResolvedValue(undefined);
    props.onChecklistItemChange = vi.fn().mockResolvedValue(undefined);
    props.onChecklistDeleteItem = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-checklist-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-checklist-title-edit'));
    fireEvent.change(screen.getByTestId('todo-checklist-title-input'), { target: { value: 'Sprint checklist' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-title-input'), { key: 'Enter' });

    fireEvent.click(screen.getByTestId('todo-checklist-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-checklist-add-item'));
    fireEvent.click(screen.getByTestId('todo-checklist-toggle-item-1'));

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    fireEvent.change(screen.getByTestId('todo-checklist-item-input-item-1'), { target: { value: 'edited item' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-item-input-item-1'), { key: 'Enter' });

    fireEvent.click(screen.getByTestId('todo-checklist-delete-item-1'));

    await waitFor(() => {
      expect(props.onChecklistTitleChange).toHaveBeenCalledWith('Sprint checklist');
      expect(props.onChecklistAddItem).toHaveBeenCalledTimes(1);
      expect(props.onChecklistItemChange).toHaveBeenCalledWith('item-1', { checked: true });
      expect(props.onChecklistItemChange).toHaveBeenCalledWith('item-1', { title: 'edited item' });
      expect(props.onChecklistDeleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  it('cancels checklist item inline edit with escape', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      checklist: {
        title: 'check list',
        items: [{ id: 'item-1', title: 'first item', checked: false }],
      },
    };
    props.onChecklistItemChange = vi.fn();

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-checklist-item-title-item-1'));
    fireEvent.change(screen.getByTestId('todo-checklist-item-input-item-1'), { target: { value: 'draft item' } });
    fireEvent.keyDown(screen.getByTestId('todo-checklist-item-input-item-1'), { key: 'Escape' });

    expect(screen.queryByTestId('todo-checklist-item-input-item-1')).not.toBeInTheDocument();
    expect(props.onChecklistItemChange).not.toHaveBeenCalled();
  });

  it('opens link form from plus menu and submits link payload', async () => {
    const props = createProps();
    props.onAddLink = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-add-link'));

    fireEvent.change(screen.getByPlaceholderText('Name (optional)'), {
      target: { value: 'Ref' },
    });
    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'https://example.com/ref' },
    });
    fireEvent.click(screen.getByTestId('todo-actions-add-link-submit'));

    await waitFor(() => {
      expect(props.onAddLink).toHaveBeenCalledWith({
        name: 'Ref',
        url: 'https://example.com/ref',
      });
    });
  });

  it('opens due date controls from plus menu and supports set/clear date plus reminder toggle', async () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: '2026-06-05',
      remindOneDayBefore: true,
    };

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-due-date'));

    const dueInput = screen.getByTestId('todo-due-date-input');
    fireEvent.change(dueInput, { target: { value: '2026-06-06' } });
    expect(props.onDueDateChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('todo-due-date-apply'));

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-due-date'));

    const remindCheckbox = screen.getByTestId('todo-remind-checkbox');
    fireEvent.click(remindCheckbox);
    fireEvent.click(screen.getByTestId('todo-due-date-clear'));

    await waitFor(() => {
      expect(props.onDueDateChange).toHaveBeenCalledWith('2026-06-06');
      expect(props.onRemindOneDayBeforeChange).toHaveBeenCalledWith(false);
      expect(props.onDueDateChange).toHaveBeenCalledWith(null);
    });
  });

  it('closes due date form without saving when value is unchanged', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: '2026-06-05',
    };

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-due-date'));
    fireEvent.click(screen.getByTestId('todo-due-date-apply'));

    expect(props.onDueDateChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('todo-actions-menu')).not.toBeInTheDocument();
  });

  it('hides reminder toggle when due date is not set', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: null,
      remindOneDayBefore: false,
    };

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-due-date'));

    expect(screen.queryByTestId('todo-remind-checkbox-row')).not.toBeInTheDocument();
  });

  it('renders overdue due-state badge in metadata', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: '2000-01-01',
      isCompleted: false,
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByTestId('todo-due-date-metadata')).toHaveTextContent('Due date: Overdue');
    expect(screen.getByTestId('todo-due-date-metadata')).toHaveAttribute('title', 'Due date: 2000-01-01');
  });

  it('hides exact due date text when a due-state badge is shown and exposes it as a hint', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: tomorrowDate,
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByTestId('todo-due-date-metadata')).toHaveTextContent('Due date: Tomorrow');
    expect(screen.getByTestId('todo-due-date-metadata')).toHaveAttribute('title', `Due date: ${tomorrowDate}`);
    expect(screen.queryByText(tomorrowDate)).not.toBeInTheDocument();
  });

  it('removes due date from the metadata row', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: '2026-06-03',
    };

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-due-date-remove'));

    expect(props.onDueDateChange).toHaveBeenCalledWith(null);
  });

  it('hides the due date row entirely when due date is not set', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      dueDate: null,
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.queryByTestId('todo-due-date-metadata')).not.toBeInTheDocument();
    expect(screen.queryByTestId('todo-due-date-remove')).not.toBeInTheDocument();
  });

  it('rejects unsafe URL schemes when adding link', async () => {
    const props = createProps();
    props.onAddLink = vi.fn().mockResolvedValue(undefined);

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-add-link'));

    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByTestId('todo-actions-add-link-submit'));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid http/https URL')).toBeInTheDocument();
    });
    expect(props.onAddLink).not.toHaveBeenCalled();
  });

  it('shows link handler unavailable error when onAddLink is missing', async () => {
    const props = createProps();
    props.onAddLink = undefined;

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-actions-trigger'));
    fireEvent.click(screen.getByTestId('todo-actions-add-link'));
    fireEvent.change(screen.getByPlaceholderText('URL'), {
      target: { value: 'https://example.com/without-handler' },
    });
    fireEvent.click(screen.getByTestId('todo-actions-add-link-submit'));

    await waitFor(() => {
      expect(screen.getByText('Link handler is not available')).toBeInTheDocument();
    });
  });

  it('renders next-status button and forwards transition callback', () => {
    const props = createProps();
    props.columns = [
      { id: 'in_progress', name: 'In Progress' },
      { id: 'done', name: 'Done' },
    ];
    props.onMoveToNextStatus = vi.fn();

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('todo-next-status-btn'));

    expect(props.onMoveToNextStatus).toHaveBeenCalledWith('todo-1', 'done');
  });

  it('hides next-status button when current column has no next column', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      columnId: 'done',
    };
    props.columns = [
      { id: 'in_progress', name: 'In Progress' },
      { id: 'done', name: 'Done' },
    ];

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.queryByTestId('todo-next-status-btn')).not.toBeInTheDocument();
  });

  it('renders links block inside card details when todo has links', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      links: [
        {
          name: 'https://example.com/a',
          url: 'https://example.com/a',
        },
      ],
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.com/a' })).toHaveAttribute(
      'href',
      'https://example.com/a',
    );
  });

  it('skips rendering unsafe persisted links', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      links: [
        {
          name: 'Safe',
          url: 'https://example.com/safe',
        },
        {
          name: 'Bad',
          url: 'javascript:alert(1)',
        },
      ],
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByRole('link', { name: 'Safe' })).toHaveAttribute('href', 'https://example.com/safe');
    expect(screen.queryByRole('link', { name: 'Bad' })).not.toBeInTheDocument();
  });

  it('hides description output when description is empty', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} description="" />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.queryByText('Saved description')).not.toBeInTheDocument();
  });

  it('renders editing footer and forwards save/cancel actions', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} isEditing error="Save failed" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(props.onCancelEdit).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('handles title editing keyboard and button actions', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} isEditingTitle title="Draft title" />);

    const input = screen.getByDisplayValue('Draft title');
    fireEvent.change(input, { target: { value: 'Updated title' } });
    expect(props.onTitleChange).toHaveBeenCalledWith('Updated title');

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Save title' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel title edit' }));

    expect(props.onSaveTitle).toHaveBeenCalledTimes(2);
    expect(props.onCancelEditTitle).toHaveBeenCalledTimes(2);
  });

  it('shows readonly error outside edit mode', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} error="Delete failed" />);

    expect(screen.getByText('Delete failed')).toBeInTheDocument();
  });

  it('calls delete handler from red file action button', () => {
    const props = createProps();
    props.files = [
      {
        id: 'file-1',
        name: 'report.pdf',
        path: 'todos/todo-1/report.pdf',
        url: 'https://example.com/report.pdf',
        size: 123,
        contentType: 'application/pdf',
        uploadedBy: 'user-1',
        uploadedAt: new Date('2026-01-01T10:00:00Z'),
      },
    ];

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('delete-file-file-1'));

    expect(props.onDeleteFile).toHaveBeenCalledWith('file-1');
  });

  it('renders editable files and links sections in edit mode', () => {
    const props = createProps();
    props.isEditing = true;
    props.filesUploading = true;
    props.deletingFileIds = ['file-1'];
    props.filesError = 'Upload failed';
    props.files = [
      {
        id: 'file-1',
        name: 'song.mp3',
        path: 'todos/todo-1/song.mp3',
        url: 'https://example.com/song.mp3',
        size: 123,
        contentType: 'audio/mpeg',
        uploadedBy: 'user-1',
        uploadedAt: new Date('2026-01-01T10:00:00Z'),
      },
    ];
    props.todo = {
      ...todo,
      links: [
        { name: 'safe', url: 'https://example.com/safe' },
        { name: 'unsafe', url: 'javascript:alert(1)' },
      ],
    };

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByText('Uploading files...')).toBeInTheDocument();
    expect(screen.getByText('Removing file...')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'song.mp3' })).toHaveAttribute('href', 'https://example.com/song.mp3');
    expect(screen.getByRole('link', { name: 'safe' })).toHaveAttribute('href', 'https://example.com/safe');
    expect(screen.queryByRole('link', { name: 'unsafe' })).not.toBeInTheDocument();
  });

  it('calls delete handler from red link action button', () => {
    const props = createProps();
    props.todo = {
      ...todo,
      links: [
        {
          name: 'https://example.com/delete-me',
          url: 'https://example.com/delete-me',
        },
      ],
    };

    render(<TodoModalDetailsPanel {...props} />);

    fireEvent.click(screen.getByTestId('delete-link-0'));

    expect(props.onDeleteLink).toHaveBeenCalledWith(0);
  });
});