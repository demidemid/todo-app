import type React from 'react';
import type { DashboardColumn } from '../../types/dashboard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface CreateDashboardModalProps {
  open: boolean;
  dashboardName: string;
  columnDraft: string;
  dashboardColumns: string[];
  formError: string;
  onClose: () => void;
  onDashboardNameChange: (value: string) => void;
  onColumnDraftChange: (value: string) => void;
  onAddColumn: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

interface CreateCardModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

interface EditDashboardModalProps {
  open: boolean;
  dashboardName: string;
  columns: DashboardColumn[];
  columnDraft: string;
  actionError: string;
  onClose: () => void;
  onDashboardNameChange: (value: string) => void;
  onColumnDraftChange: (value: string) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnId: string) => void;
  onColumnNameChange: (columnId: string, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

interface ShareTargetUser {
  id: string;
  email: string;
}

interface ShareDashboardModalProps {
  open: boolean;
  dashboardName: string;
  users: ShareTargetUser[];
  selectedUserIds: string[];
  loadingUsers: boolean;
  usersError: string | null;
  actionError: string;
  onClose: () => void;
  onToggleUser: (userId: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const CreateDashboardModal = ({
  open,
  dashboardName,
  columnDraft,
  dashboardColumns,
  formError,
  onClose,
  onDashboardNameChange,
  onColumnDraftChange,
  onAddColumn,
  onSubmit,
}: CreateDashboardModalProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="create-dashboard-modal"
      >
        <h3 className="mb-4 text-lg font-semibold text-white">Create new dashboard</h3>

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Dashboard name</label>
        <Input
          type="text"
          value={dashboardName}
          onChange={(event) => onDashboardNameChange(event.target.value)}
          placeholder="Product roadmap"
          className="mb-4"
          autoFocus
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Columns</label>
        <div className="mb-3 flex gap-2">
          <Input
            type="text"
            value={columnDraft}
            onChange={(event) => onColumnDraftChange(event.target.value)}
            placeholder="Backlog"
          />
          <Button type="button" variant="ghost" size="sm" onClick={onAddColumn}>
            Add
          </Button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
          {dashboardColumns.length === 0 ? (
            <p className="text-xs text-slate-400">No columns yet. Add at least one column.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-200">
              {dashboardColumns.map((columnName, index) => (
                <li key={`${columnName}-${index}`}>
                  {index + 1}. {columnName}
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError && <p className="mb-3 text-sm text-rose-300">{formError}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Create dashboard
          </Button>
        </div>
      </form>
    </div>
  );
};

export const CreateCardModal = ({
  open,
  title,
  description,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: CreateCardModalProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        data-testid="create-card-modal"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-white">Create new card</h3>

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Title</label>
        <Input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          data-testid="create-card-title"
          placeholder="Task title"
          className="mb-4"
          autoFocus
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Description</label>
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          data-testid="create-card-description"
          placeholder="Optional details"
          rows={4}
          className="mb-5 resize-none"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} data-testid="create-card-cancel">
            Cancel
          </Button>
          <Button type="submit" data-testid="create-card-submit">
            Add card
          </Button>
        </div>
      </form>
    </div>
  );
};

export const EditDashboardModal = ({
  open,
  dashboardName,
  columns,
  columnDraft,
  actionError,
  onClose,
  onDashboardNameChange,
  onColumnDraftChange,
  onAddColumn,
  onRemoveColumn,
  onColumnNameChange,
  onSubmit,
}: EditDashboardModalProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="edit-dashboard-modal"
      >
        <h3 className="mb-4 text-lg font-semibold text-white">Edit dashboard</h3>

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Dashboard name</label>
        <Input
          type="text"
          value={dashboardName}
          onChange={(event) => onDashboardNameChange(event.target.value)}
          className="mb-4"
          autoFocus
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Columns</label>
        <div className="mb-3 space-y-2">
          {columns.map((column) => (
            <div key={column.id} className="flex gap-2">
              <Input
                type="text"
                value={column.name}
                onChange={(event) => onColumnNameChange(column.id, event.target.value)}
                data-testid={`edit-dashboard-column-${column.id}`}
              />
              <Button type="button" variant="danger" size="sm" onClick={() => onRemoveColumn(column.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          <Input
            type="text"
            value={columnDraft}
            onChange={(event) => onColumnDraftChange(event.target.value)}
            placeholder="Add column"
          />
          <Button type="button" variant="ghost" onClick={onAddColumn}>
            Add
          </Button>
        </div>

        {actionError && <p className="mb-3 text-sm text-rose-300">{actionError}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Save dashboard
          </Button>
        </div>
      </form>
    </div>
  );
};

export const ShareDashboardModal = ({
  open,
  dashboardName,
  users,
  selectedUserIds,
  loadingUsers,
  usersError,
  actionError,
  onClose,
  onToggleUser,
  onSubmit,
}: ShareDashboardModalProps) => {
  if (!open) return null;

  const selectedCount = selectedUserIds.length;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="share-dashboard-modal"
      >
        <h3 className="mb-1 text-lg font-semibold text-white">Share dashboard</h3>
        <p className="mb-4 text-sm text-slate-300">
          Pick users who should access <span className="font-semibold text-slate-100">{dashboardName}</span>.
        </p>

        <div className="mb-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
          {loadingUsers ? (
            <p className="text-sm text-slate-300">Loading users...</p>
          ) : usersError ? (
            <p className="text-sm text-rose-300" data-testid="share-users-error">Failed to load users: {usersError}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400">No other users found yet.</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-auto">
              {users.map((user) => {
                const checked = selectedUserIds.includes(user.id);
                return (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleUser(user.id)}
                        className="size-4 accent-cyan-400"
                        data-testid={`share-user-checkbox-${user.id}`}
                      />
                      <span className="truncate text-sm text-slate-100">{user.email}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400" data-testid="share-selected-count">
          Selected: {selectedCount}
        </p>

        {actionError && <p className="mb-3 text-sm text-rose-300">{actionError}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Save access
          </Button>
        </div>
      </form>
    </div>
  );
};
