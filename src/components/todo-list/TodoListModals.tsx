import { useState } from 'react';
import type React from 'react';
import type { DashboardColumn } from '../../types/dashboard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface CreateDashboardModalProps {
  state?: {
    open: boolean;
    dashboardName: string;
    columnDraft: string;
    dashboardColumns: string[];
    formError: string;
  };
  actions?: {
    onClose: () => void;
    onDashboardNameChange: (value: string) => void;
    onColumnDraftChange: (value: string) => void;
    onAddColumn: () => void;
    onRemoveColumn: (index: number) => void;
    onColumnNameChange: (index: number, value: string) => void;
    onReorderColumn: (sourceIndex: number, targetIndex: number) => void;
    onSubmit: (event: React.FormEvent) => void;
  };
  open?: boolean;
  dashboardName?: string;
  columnDraft?: string;
  dashboardColumns?: string[];
  formError?: string;
  onClose?: () => void;
  onDashboardNameChange?: (value: string) => void;
  onColumnDraftChange?: (value: string) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (index: number) => void;
  onColumnNameChange?: (index: number, value: string) => void;
  onReorderColumn?: (sourceIndex: number, targetIndex: number) => void;
  onSubmit?: (event: React.FormEvent) => void;
}

interface CreateCardModalProps {
  state?: {
    open: boolean;
    title: string;
    description: string;
  };
  actions?: {
    onClose: () => void;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
  };
  open?: boolean;
  title?: string;
  description?: string;
  onClose?: () => void;
  onTitleChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
  onSubmit?: (event: React.FormEvent) => void;
}

interface EditDashboardModalProps {
  state?: {
    open: boolean;
    dashboardName: string;
    columns: DashboardColumn[];
    columnDraft: string;
    actionError: string;
  };
  actions?: {
    onClose: () => void;
    onDashboardNameChange: (value: string) => void;
    onColumnDraftChange: (value: string) => void;
    onAddColumn: () => void;
    onRemoveColumn: (columnId: string) => void;
    onColumnNameChange: (columnId: string, value: string) => void;
    onReorderColumn: (sourceIndex: number, targetIndex: number) => void;
    onSubmit: (event: React.FormEvent) => void;
  };
  open?: boolean;
  dashboardName?: string;
  columns?: DashboardColumn[];
  columnDraft?: string;
  actionError?: string;
  onClose?: () => void;
  onDashboardNameChange?: (value: string) => void;
  onColumnDraftChange?: (value: string) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (columnId: string) => void;
  onColumnNameChange?: (columnId: string, value: string) => void;
  onReorderColumn?: (sourceIndex: number, targetIndex: number) => void;
  onSubmit?: (event: React.FormEvent) => void;
}

interface DashboardColumnsEditorProps {
  columns: string[];
  testIdPrefix: string;
  onColumnNameChange: (index: number, value: string) => void;
  onRemoveColumn: (index: number) => void;
  onReorderColumn: (sourceIndex: number, targetIndex: number) => void;
}

const DashboardColumnsEditor = ({
  columns,
  testIdPrefix,
  onColumnNameChange,
  onRemoveColumn,
  onReorderColumn,
}: DashboardColumnsEditorProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <ul className="space-y-2">
      {columns.map((columnName, index) => (
        <li
          key={`${testIdPrefix}-row-${index}`}
          className={`flex gap-2 ${dragIndex === index ? 'opacity-60' : ''}`}
          draggable
          onDragStart={(event) => {
            setDragIndex(index);
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', String(index));
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (dragIndex == null || dragIndex === index) return;
            onReorderColumn(dragIndex, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          data-testid={`${testIdPrefix}-row-${index}`}
        >
          <Input
            type="text"
            value={columnName}
            onChange={(event) => onColumnNameChange(index, event.target.value)}
            data-testid={`${testIdPrefix}-${index}`}
          />
          <Button type="button" variant="danger" size="sm" onClick={() => onRemoveColumn(index)}>
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
};

interface ShareTargetUser {
  id: string;
  email: string;
}

interface ShareDashboardModalProps {
  state?: {
    open: boolean;
    dashboardName: string;
    users: ShareTargetUser[];
    selectedUserIds: string[];
    recipientEmails: string;
    loadingUsers: boolean;
    usersError: string | null;
    actionError: string;
  };
  actions?: {
    onClose: () => void;
    onToggleUser: (userId: string) => void;
    onRecipientEmailsChange: (value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
  };
  open?: boolean;
  dashboardName?: string;
  users?: ShareTargetUser[];
  selectedUserIds?: string[];
  recipientEmails?: string;
  loadingUsers?: boolean;
  usersError?: string | null;
  actionError?: string;
  onClose?: () => void;
  onToggleUser?: (userId: string) => void;
  onRecipientEmailsChange?: (value: string) => void;
  onSubmit?: (event: React.FormEvent) => void;
}

export const CreateDashboardModal = ({
  state,
  actions,
  open: legacyOpen,
  dashboardName: legacyDashboardName,
  columnDraft: legacyColumnDraft,
  dashboardColumns: legacyDashboardColumns,
  formError: legacyFormError,
  onClose: legacyOnClose,
  onDashboardNameChange: legacyOnDashboardNameChange,
  onColumnDraftChange: legacyOnColumnDraftChange,
  onAddColumn: legacyOnAddColumn,
  onRemoveColumn: legacyOnRemoveColumn,
  onColumnNameChange: legacyOnColumnNameChange,
  onReorderColumn: legacyOnReorderColumn,
  onSubmit: legacyOnSubmit,
}: CreateDashboardModalProps) => {
  const resolvedState = state ?? {
    open: legacyOpen ?? false,
    dashboardName: legacyDashboardName ?? '',
    columnDraft: legacyColumnDraft ?? '',
    dashboardColumns: legacyDashboardColumns ?? [],
    formError: legacyFormError ?? '',
  };

  const resolvedActions = actions ?? {
    onClose: legacyOnClose ?? (() => {}),
    onDashboardNameChange: legacyOnDashboardNameChange ?? (() => {}),
    onColumnDraftChange: legacyOnColumnDraftChange ?? (() => {}),
    onAddColumn: legacyOnAddColumn ?? (() => {}),
    onRemoveColumn: legacyOnRemoveColumn ?? (() => {}),
    onColumnNameChange: legacyOnColumnNameChange ?? (() => {}),
    onReorderColumn: legacyOnReorderColumn ?? (() => {}),
    onSubmit: legacyOnSubmit ?? (() => {}),
  };

  const { open, dashboardName, columnDraft, dashboardColumns, formError } = resolvedState;
  const { onClose, onDashboardNameChange, onColumnDraftChange, onAddColumn, onRemoveColumn, onColumnNameChange, onReorderColumn, onSubmit } = resolvedActions;

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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Create new dashboard</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close create dashboard modal"
            data-testid="create-dashboard-close"
          >
            x
          </button>
        </div>

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
            data-testid="create-dashboard-column-draft"
          />
          <Button type="button" variant="ghost" size="sm" onClick={onAddColumn}>
            Add
          </Button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
          {dashboardColumns.length === 0 ? (
            <p className="text-xs text-slate-400">No columns yet. Add at least one column.</p>
          ) : (
            <DashboardColumnsEditor
              columns={dashboardColumns}
              testIdPrefix="create-dashboard-column"
              onColumnNameChange={onColumnNameChange}
              onRemoveColumn={onRemoveColumn}
              onReorderColumn={onReorderColumn}
            />
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
  state,
  actions,
  open: legacyOpen,
  title: legacyTitle,
  description: legacyDescription,
  onClose: legacyOnClose,
  onTitleChange: legacyOnTitleChange,
  onDescriptionChange: legacyOnDescriptionChange,
  onSubmit: legacyOnSubmit,
}: CreateCardModalProps) => {
  const resolvedState = state ?? {
    open: legacyOpen ?? false,
    title: legacyTitle ?? '',
    description: legacyDescription ?? '',
  };

  const resolvedActions = actions ?? {
    onClose: legacyOnClose ?? (() => {}),
    onTitleChange: legacyOnTitleChange ?? (() => {}),
    onDescriptionChange: legacyOnDescriptionChange ?? (() => {}),
    onSubmit: legacyOnSubmit ?? (() => {}),
  };

  const { open, title, description } = resolvedState;
  const { onClose, onTitleChange, onDescriptionChange, onSubmit } = resolvedActions;

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
  state,
  actions,
  open: legacyOpen,
  dashboardName: legacyDashboardName,
  columns: legacyColumns,
  columnDraft: legacyColumnDraft,
  actionError: legacyActionError,
  onClose: legacyOnClose,
  onDashboardNameChange: legacyOnDashboardNameChange,
  onColumnDraftChange: legacyOnColumnDraftChange,
  onAddColumn: legacyOnAddColumn,
  onRemoveColumn: legacyOnRemoveColumn,
  onColumnNameChange: legacyOnColumnNameChange,
  onReorderColumn: legacyOnReorderColumn,
  onSubmit: legacyOnSubmit,
}: EditDashboardModalProps) => {
  const resolvedState = state ?? {
    open: legacyOpen ?? false,
    dashboardName: legacyDashboardName ?? '',
    columns: legacyColumns ?? [],
    columnDraft: legacyColumnDraft ?? '',
    actionError: legacyActionError ?? '',
  };

  const resolvedActions = actions ?? {
    onClose: legacyOnClose ?? (() => {}),
    onDashboardNameChange: legacyOnDashboardNameChange ?? (() => {}),
    onColumnDraftChange: legacyOnColumnDraftChange ?? (() => {}),
    onAddColumn: legacyOnAddColumn ?? (() => {}),
    onRemoveColumn: legacyOnRemoveColumn ?? (() => {}),
    onColumnNameChange: legacyOnColumnNameChange ?? (() => {}),
    onReorderColumn: legacyOnReorderColumn ?? (() => {}),
    onSubmit: legacyOnSubmit ?? (() => {}),
  };

  const { open, dashboardName, columns, columnDraft, actionError } = resolvedState;
  const { onClose, onDashboardNameChange, onColumnDraftChange, onAddColumn, onRemoveColumn, onColumnNameChange, onReorderColumn, onSubmit } = resolvedActions;

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
          <DashboardColumnsEditor
            columns={columns.map((column) => column.name)}
            testIdPrefix="edit-dashboard-column"
            onColumnNameChange={(index, value) => {
              const column = columns[index];
              if (!column) return;
              onColumnNameChange(column.id, value);
            }}
            onRemoveColumn={(index) => {
              const column = columns[index];
              if (!column) return;
              onRemoveColumn(column.id);
            }}
            onReorderColumn={onReorderColumn}
          />
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
  state,
  actions,
  open: legacyOpen,
  dashboardName: legacyDashboardName,
  users: legacyUsers,
  selectedUserIds: legacySelectedUserIds,
  recipientEmails: legacyRecipientEmails,
  loadingUsers: legacyLoadingUsers,
  usersError: legacyUsersError,
  actionError: legacyActionError,
  onClose: legacyOnClose,
  onToggleUser: legacyOnToggleUser,
  onRecipientEmailsChange: legacyOnRecipientEmailsChange,
  onSubmit: legacyOnSubmit,
}: ShareDashboardModalProps) => {
  const resolvedState = state ?? {
    open: legacyOpen ?? false,
    dashboardName: legacyDashboardName ?? '',
    users: legacyUsers ?? [],
    selectedUserIds: legacySelectedUserIds ?? [],
    recipientEmails: legacyRecipientEmails ?? '',
    loadingUsers: legacyLoadingUsers ?? false,
    usersError: legacyUsersError ?? null,
    actionError: legacyActionError ?? '',
  };

  const resolvedActions = actions ?? {
    onClose: legacyOnClose ?? (() => {}),
    onToggleUser: legacyOnToggleUser ?? (() => {}),
    onRecipientEmailsChange: legacyOnRecipientEmailsChange ?? (() => {}),
    onSubmit: legacyOnSubmit ?? (() => {}),
  };

  const {
    open,
    dashboardName,
    users,
    selectedUserIds,
    recipientEmails,
    loadingUsers,
    usersError,
    actionError,
  } = resolvedState;
  const { onClose, onToggleUser, onRecipientEmailsChange, onSubmit } = resolvedActions;

  if (!open) return null;

  const selectedCount = selectedUserIds.length;
  const isSaveDisabled = loadingUsers || Boolean(usersError);

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
          <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">
            Share by email
          </label>
          <Textarea
            value={recipientEmails}
            onChange={(event) => onRecipientEmailsChange(event.target.value)}
            placeholder="hardcorovec@ya.ru, other@example.com"
            rows={3}
            className="mb-4"
          />
          <p className="mb-3 text-xs text-slate-400">
            Use this if the person is not listed below. Separate multiple emails with commas or new lines.
          </p>

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
          <Button type="submit" disabled={isSaveDisabled}>
            Save access
          </Button>
        </div>
      </form>
    </div>
  );
};
