import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, Trash2, X, Plus } from 'lucide-react';
import type { Todo } from '../../types/todo';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { RichTextEditor } from './RichTextEditor';
import { sanitizeRichTextHtml } from './richText';

interface TodoModalDetailsPanelProps {
  todo: Todo;
  isEditing: boolean;
  isEditingTitle: boolean;
  title: string;
  description: string;
  saving: boolean;
  error: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onStartEditTitle: () => void;
  onSaveTitle: () => void;
  onCancelEditTitle: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const TodoModalDetailsPanel = ({
  todo,
  isEditing,
  isEditingTitle,
  title,
  description,
  saving,
  error,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onTitleChange,
  onDescriptionChange,
}: TodoModalDetailsPanelProps) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !actionMenuRef.current.contains(target)) {
        setIsActionMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isActionMenuOpen]);

  return (
    <div className="min-h-0 min-w-0 flex flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pl-1 pr-2">
        {/* Title row */}
        {isEditingTitle ? (
          <div className="mb-4 flex items-center gap-2 pt-1">
            <Input
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="flex-1"
              autoFocus
              disabled={saving}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { event.preventDefault(); onSaveTitle(); }
                if (event.key === 'Escape') onCancelEditTitle();
              }}
            />
            <IconButton variant="primary" size="md" label="Save title" disabled={saving} onClick={onSaveTitle}>
              <Check size={16} />
            </IconButton>
            <IconButton variant="neutral" size="md" label="Cancel title edit" disabled={saving} onClick={onCancelEditTitle}>
              <X size={16} />
            </IconButton>
          </div>
        ) : !isEditing && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-white">
              {title}
              <IconButton variant="neutral" size="md" label="Edit title" onClick={onStartEditTitle} className="ml-2 inline-flex align-middle">
                <Pencil size={14} />
              </IconButton>
            </h2>
            <IconButton variant="danger" size="md" label="Delete card" onClick={onDelete} disabled={saving} className="shrink-0">
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}

        {!isEditing && (
          <div className="mb-4 flex items-center justify-start" data-testid="todo-actions-panel">
            <div className="relative" ref={actionMenuRef}>
              <IconButton
                variant="primary"
                size="md"
                label="Open actions menu"
                className="!h-10 !w-10 aspect-square shrink-0 !rounded-full border-cyan-300/35 bg-cyan-300/15 !p-0 text-xl font-semibold leading-none text-cyan-100"
                data-testid="todo-actions-trigger"
                onClick={() => setIsActionMenuOpen((prev) => !prev)}
              >
                <Plus size={18} aria-hidden="true" />
              </IconButton>

              {isActionMenuOpen && (
                <div
                  className="absolute left-0 top-12 z-20 min-w-44 rounded-lg border border-white/10 bg-slate-900/95 p-1 shadow-xl"
                  role="menu"
                  aria-label="Todo actions"
                  data-testid="todo-actions-menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                    onClick={() => setIsActionMenuOpen(false)}
                  >
                    Добавить файл
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        {!isEditing && (
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
        )}

        {isEditing ? (
          <>
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Description</div>
            <RichTextEditor
              value={description}
              onChange={onDescriptionChange}
              disabled={saving}
              className="mb-4"
              placeholder="Write a description with formatting..."
            />
          </>
        ) : (
          <div className="relative mb-4 pr-10">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Description</div>
            <IconButton
              variant="neutral"
              size="md"
              label="Edit description"
              onClick={onStartEdit}
              className="absolute right-0 top-0 shrink-0"
            >
              <Pencil size={14} />
            </IconButton>
            {description && (
              <div
                className="rich-text-output"
                dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(description) }}
              />
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="mt-4 border-t border-white/10 bg-slate-900/95 pt-4">
          {error && <div className="mb-3 text-sm text-rose-300">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {!isEditing && error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
    </div>
  );
};
