import type { Todo } from '../../types/todo';
import { Button } from '../ui/Button';

interface TodoModalDetailsPanelProps {
  todo: Todo;
  isEditing: boolean;
  title: string;
  description: string;
  saving: boolean;
  error: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const TodoModalDetailsPanel = ({
  todo,
  isEditing,
  title,
  description,
  saving,
  error,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTitleChange,
  onDescriptionChange,
}: TodoModalDetailsPanelProps) => {
  return (
    <div className="flex-1 min-w-0">
      {isEditing ? (
        <>
          <h2 className="mb-4 text-xl font-bold text-white">Edit card</h2>
          <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Title</label>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
            autoFocus
            disabled={saving}
          />
          <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
            className="mb-5 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
            disabled={saving}
          />
          {error && <div className="mb-3 text-sm text-rose-300">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              Save
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="mb-2 text-xl font-bold text-white">{todo.title}</h2>
          {todo.description && <p className="mb-4 whitespace-pre-line text-slate-200">{todo.description}</p>}
          <div className="mb-4 flex flex-col gap-2 text-xs text-slate-400">
            <span>
              Status: <b className="text-slate-200">{(todo.columnId ?? todo.status).split('_').join(' ')}</b>
            </span>
            <span>
              Created: {todo.createdAt instanceof Date ? todo.createdAt.toLocaleString() : String(todo.createdAt)}
            </span>
            <span>
              Updated: {todo.updatedAt instanceof Date ? todo.updatedAt.toLocaleString() : String(todo.updatedAt)}
            </span>
          </div>
          {error && <div className="mb-3 text-sm text-rose-300">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onStartEdit}>
              Edit
            </Button>
            <Button type="button" variant="danger" onClick={onDelete} disabled={saving}>
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
