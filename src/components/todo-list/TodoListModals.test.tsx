import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CreateCardModal,
  CreateDashboardModal,
  EditDashboardModal,
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
});
