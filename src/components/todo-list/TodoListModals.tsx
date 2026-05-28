import type React from 'react';
import type { DashboardColumn } from '../../types/dashboard';

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
        <input
          type="text"
          value={dashboardName}
          onChange={(event) => onDashboardNameChange(event.target.value)}
          placeholder="Product roadmap"
          className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          autoFocus
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Columns</label>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={columnDraft}
            onChange={(event) => onColumnDraftChange(event.target.value)}
            placeholder="Backlog"
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          />
          <button
            type="button"
            onClick={onAddColumn}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Add
          </button>
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
          >
            Create dashboard
          </button>
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
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          data-testid="create-card-title"
          placeholder="Task title"
          className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          autoFocus
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Description</label>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          data-testid="create-card-description"
          placeholder="Optional details"
          rows={4}
          className="mb-5 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            data-testid="create-card-cancel"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="create-card-submit"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
          >
            Add card
          </button>
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
        <input
          type="text"
          value={dashboardName}
          onChange={(event) => onDashboardNameChange(event.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          autoFocus
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Columns</label>
        <div className="mb-3 space-y-2">
          {columns.map((column) => (
            <div key={column.id} className="flex gap-2">
              <input
                type="text"
                value={column.name}
                onChange={(event) => onColumnNameChange(column.id, event.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
                data-testid={`edit-dashboard-column-${column.id}`}
              />
              <button
                type="button"
                onClick={() => onRemoveColumn(column.id)}
                className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={columnDraft}
            onChange={(event) => onColumnDraftChange(event.target.value)}
            placeholder="Add column"
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          />
          <button
            type="button"
            onClick={onAddColumn}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Add
          </button>
        </div>

        {actionError && <p className="mb-3 text-sm text-rose-300">{actionError}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
          >
            Save dashboard
          </button>
        </div>
      </form>
    </div>
  );
};
