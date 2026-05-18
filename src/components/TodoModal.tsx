import React, { useState } from 'react';
import type { Todo } from '../types/todo';

interface TodoModalProps {
  todo: Todo;
  onClose: () => void;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const TodoModal: React.FC<TodoModalProps> = ({ todo, onClose, updateTodo, deleteTodo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateTodo(todo.id, { title: normalizedTitle, description: normalizedDescription });
      setIsEditing(false);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this card?')) return;
    setSaving(true);
    try {
      await deleteTodo(todo.id);
      onClose();
    } catch {
      setError('Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="todo-modal"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        {isEditing ? (
          <>
            <h2 className="mb-4 text-xl font-bold text-white">Edit card</h2>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              autoFocus
              disabled={saving}
            />
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="mb-5 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              disabled={saving}
            />
            {error && <div className="mb-3 text-sm text-rose-300">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:opacity-60"
                disabled={saving}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-xl font-bold text-white">{todo.title}</h2>
            {todo.description && (
              <p className="mb-4 text-slate-200 whitespace-pre-line">{todo.description}</p>
            )}
            <div className="flex flex-col gap-2 text-xs text-slate-400 mb-4">
              <span>Status: <b className="text-slate-200">{todo.status.replace('_', ' ')}</b></span>
              <span>Created: {todo.createdAt instanceof Date ? todo.createdAt.toLocaleString() : String(todo.createdAt)}</span>
              <span>Updated: {todo.updatedAt instanceof Date ? todo.updatedAt.toLocaleString() : String(todo.updatedAt)}</span>
            </div>
            {error && <div className="mb-3 text-sm text-rose-300">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20"
                disabled={saving}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
