import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CreateCardModal,
  CreateDashboardModal,
  EditDashboardModal,
  ShareDashboardModal,
} from './TodoListModals';

describe('TodoListModals', () => {
  it('does not render any modal when open is false', () => {
    const noop = vi.fn();

    const { container } = render(
      <>
        <CreateDashboardModal
          open={false}
          dashboardName=""
          columnDraft=""
          dashboardColumns={[]}
          formError=""
          onClose={noop}
          onDashboardNameChange={noop}
          onColumnDraftChange={noop}
          onAddColumn={noop}
          onSubmit={noop}
        />
        <CreateCardModal
          open={false}
          title=""
          description=""
          onClose={noop}
          onTitleChange={noop}
          onDescriptionChange={noop}
          onSubmit={noop}
        />
        <EditDashboardModal
          open={false}
          dashboardName=""
          columns={[]}
          columnDraft=""
          actionError=""
          onClose={noop}
          onDashboardNameChange={noop}
          onColumnDraftChange={noop}
          onAddColumn={noop}
          onRemoveColumn={noop}
          onColumnNameChange={noop}
          onSubmit={noop}
        />
      </>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('handles create dashboard interactions and backdrop close', () => {
    const onClose = vi.fn();
    const onDashboardNameChange = vi.fn();
    const onColumnDraftChange = vi.fn();
    const onAddColumn = vi.fn();
    const onRemoveColumn = vi.fn();
    const onColumnNameChange = vi.fn();
    const onReorderColumn = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <CreateDashboardModal
        open
        dashboardName="Roadmap"
        columnDraft="Backlog"
        dashboardColumns={['Backlog', 'Done']}
        formError="Name already exists"
        onClose={onClose}
        onDashboardNameChange={onDashboardNameChange}
        onColumnDraftChange={onColumnDraftChange}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        onColumnNameChange={onColumnNameChange}
        onReorderColumn={onReorderColumn}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByTestId('create-dashboard-modal')).toBeInTheDocument();
    expect(screen.getByTestId('create-dashboard-column-0')).toBeInTheDocument();
    expect(screen.getByText('Name already exists')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Roadmap'), { target: { value: 'Platform' } });
    expect(onDashboardNameChange).toHaveBeenCalledWith('Platform');

    fireEvent.change(screen.getByTestId('create-dashboard-column-0'), { target: { value: 'Todo' } });
    expect(onColumnNameChange).toHaveBeenCalledWith(0, 'Todo');

    fireEvent.change(screen.getByTestId('create-dashboard-column-draft'), { target: { value: 'Todo draft' } });
    expect(onColumnDraftChange).toHaveBeenCalledWith('Todo draft');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddColumn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(onRemoveColumn).toHaveBeenCalledWith(0);

    fireEvent.dragStart(screen.getByTestId('create-dashboard-column-row-0'));
    fireEvent.dragOver(screen.getByTestId('create-dashboard-column-row-1'));
    fireEvent.drop(screen.getByTestId('create-dashboard-column-row-1'));
    expect(onReorderColumn).toHaveBeenCalledWith(0, 1);

    fireEvent.submit(screen.getByTestId('create-dashboard-modal'));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('create-dashboard-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('create-dashboard-modal'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('create-dashboard-modal').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('handles create card interactions and actions', () => {
    const onClose = vi.fn();
    const onTitleChange = vi.fn();
    const onDescriptionChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <CreateCardModal
        open
        title="Fix auth"
        description="Investigate"
        onClose={onClose}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByTestId('create-card-title'), { target: { value: 'Fix login' } });
    expect(onTitleChange).toHaveBeenCalledWith('Fix login');

    fireEvent.change(screen.getByTestId('create-card-description'), {
      target: { value: 'Investigate token refresh' },
    });
    expect(onDescriptionChange).toHaveBeenCalledWith('Investigate token refresh');

    fireEvent.click(screen.getByTestId('create-card-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('create-card-modal').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.submit(screen.getByTestId('create-card-modal'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('handles edit dashboard interactions including column changes', () => {
    const onClose = vi.fn();
    const onDashboardNameChange = vi.fn();
    const onColumnDraftChange = vi.fn();
    const onAddColumn = vi.fn();
    const onRemoveColumn = vi.fn();
    const onColumnNameChange = vi.fn();
    const onReorderColumn = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <EditDashboardModal
        open
        dashboardName="Main board"
        columns={[
          { id: 'todo', name: 'To do', order: 0, isDone: false },
          { id: 'done', name: 'Done', order: 1, isDone: true },
        ]}
        columnDraft="Blocked"
        actionError="Cannot save"
        onClose={onClose}
        onDashboardNameChange={onDashboardNameChange}
        onColumnDraftChange={onColumnDraftChange}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        onColumnNameChange={onColumnNameChange}
        onReorderColumn={onReorderColumn}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Cannot save')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Main board'), { target: { value: 'Work board' } });
    expect(onDashboardNameChange).toHaveBeenCalledWith('Work board');

    fireEvent.change(screen.getByTestId('edit-dashboard-column-0'), { target: { value: 'Inbox' } });
    expect(onColumnNameChange).toHaveBeenCalledWith('todo', 'Inbox');

    fireEvent.dragStart(screen.getByTestId('edit-dashboard-column-row-0'));
    fireEvent.dragOver(screen.getByTestId('edit-dashboard-column-row-1'));
    fireEvent.drop(screen.getByTestId('edit-dashboard-column-row-1'));
    expect(onReorderColumn).toHaveBeenCalledWith(0, 1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(onRemoveColumn).toHaveBeenCalledWith('todo');

    fireEvent.change(screen.getByDisplayValue('Blocked'), { target: { value: 'Review' } });
    expect(onColumnDraftChange).toHaveBeenCalledWith('Review');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddColumn).toHaveBeenCalledTimes(1);

    fireEvent.submit(screen.getByTestId('edit-dashboard-modal'));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('edit-dashboard-modal').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports object state/actions API for create card modal', () => {
    const onClose = vi.fn();
    const onTitleChange = vi.fn();
    const onDescriptionChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <CreateCardModal
        state={{ open: true, title: 'Card A', description: 'Desc A' }}
        actions={{
          onClose,
          onTitleChange,
          onDescriptionChange,
          onSubmit,
        }}
      />,
    );

    fireEvent.change(screen.getByTestId('create-card-title'), { target: { value: 'Card B' } });
    fireEvent.change(screen.getByTestId('create-card-description'), { target: { value: 'Desc B' } });
    fireEvent.submit(screen.getByTestId('create-card-modal'));

    expect(onTitleChange).toHaveBeenCalledWith('Card B');
    expect(onDescriptionChange).toHaveBeenCalledWith('Desc B');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders share modal loading state and disables save', () => {
    const onClose = vi.fn();

    render(
      <ShareDashboardModal
        state={{
          open: true,
          dashboardName: 'Board',
          users: [],
          selectedUserIds: [],
          recipientEmails: '',
          loadingUsers: true,
          usersError: null,
          actionError: '',
        }}
        actions={{
          onClose,
          onToggleUser: vi.fn(),
          onRecipientEmailsChange: vi.fn(),
          onSubmit: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save access' })).toBeDisabled();

    fireEvent.click(screen.getByTestId('share-dashboard-modal').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders share modal users error and action error states', () => {
    render(
      <ShareDashboardModal
        state={{
          open: true,
          dashboardName: 'Board',
          users: [],
          selectedUserIds: [],
          recipientEmails: '',
          loadingUsers: false,
          usersError: 'permission-denied',
          actionError: 'Save failed',
        }}
        actions={{
          onClose: vi.fn(),
          onToggleUser: vi.fn(),
          onRecipientEmailsChange: vi.fn(),
          onSubmit: vi.fn(),
        }}
      />,
    );

    expect(screen.getByTestId('share-users-error')).toHaveTextContent('permission-denied');
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save access' })).toBeDisabled();
  });

  it('renders share modal empty users state', () => {
    render(
      <ShareDashboardModal
        open
        dashboardName="Board"
        users={[]}
        selectedUserIds={[]}
        recipientEmails=""
        loadingUsers={false}
        usersError={null}
        actionError=""
        onClose={vi.fn()}
        onToggleUser={vi.fn()}
        onRecipientEmailsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('No other users found yet.')).toBeInTheDocument();
    expect(screen.getByTestId('share-selected-count')).toHaveTextContent('Selected: 0');
    expect(screen.getByRole('button', { name: 'Save access' })).not.toBeDisabled();
  });

  it('handles share modal user selection and email input', () => {
    const onToggleUser = vi.fn();
    const onRecipientEmailsChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <ShareDashboardModal
        open
        dashboardName="Board"
        users={[
          { id: 'u-1', email: 'u1@example.com' },
          { id: 'u-2', email: 'u2@example.com' },
        ]}
        selectedUserIds={['u-1']}
        recipientEmails="first@example.com"
        loadingUsers={false}
        usersError={null}
        actionError=""
        onClose={vi.fn()}
        onToggleUser={onToggleUser}
        onRecipientEmailsChange={onRecipientEmailsChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('hardcorovec@ya.ru, other@example.com'), {
      target: { value: 'a@example.com, b@example.com' },
    });
    expect(onRecipientEmailsChange).toHaveBeenCalledWith('a@example.com, b@example.com');

    fireEvent.click(screen.getByTestId('share-user-checkbox-u-2'));
    expect(onToggleUser).toHaveBeenCalledWith('u-2');

    expect(screen.getByTestId('share-selected-count')).toHaveTextContent('Selected: 1');

    fireEvent.submit(screen.getByTestId('share-dashboard-modal'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
