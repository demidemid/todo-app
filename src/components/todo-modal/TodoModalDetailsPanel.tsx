import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, Trash2, X, Plus, ArrowRight, Link2, ListChecks, CalendarDays, Bell } from 'lucide-react';
import type { Todo, TodoFile } from '../../types/todo';
import { FaFile, FaFileArchive, FaFileAudio, FaFileCode, FaFileExcel, FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileVideo, FaFileWord } from 'react-icons/fa';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { getDueDateState } from '../../utils/dueDate';
import { TodoChecklistSection } from './TodoChecklistSection';
import { RichTextEditor } from './RichTextEditor';
import { sanitizeRichTextHtml } from './richText';
import { useHotkey, useHotkeyHandler } from '../../hooks/useHotkey';

const extensionFromFileName = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === normalized.length - 1) return '';
  return normalized.slice(dotIndex + 1);
};

const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  const extension = extensionFromFileName(fileName);

  if (['pdf'].includes(extension)) return <FaFilePdf className="shrink-0 text-rose-300" aria-hidden="true" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(extension)) return <FaFileImage className="shrink-0 text-emerald-300" aria-hidden="true" />;
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(extension)) return <FaFileVideo className="shrink-0 text-cyan-300" aria-hidden="true" />;
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) return <FaFileAudio className="shrink-0 text-fuchsia-300" aria-hidden="true" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return <FaFileArchive className="shrink-0 text-amber-300" aria-hidden="true" />;
  if (['doc', 'docx', 'rtf', 'odt'].includes(extension)) return <FaFileWord className="shrink-0 text-sky-300" aria-hidden="true" />;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return <FaFileExcel className="shrink-0 text-green-300" aria-hidden="true" />;
  if (['ppt', 'pptx', 'odp'].includes(extension)) return <FaFilePowerpoint className="shrink-0 text-orange-300" aria-hidden="true" />;
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'md', 'xml', 'yml', 'yaml'].includes(extension)) return <FaFileCode className="shrink-0 text-violet-300" aria-hidden="true" />;

  return <FaFile className="shrink-0 text-slate-300" aria-hidden="true" />;
};

const normalizeSafeUrl = (rawUrl: string): string | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

interface TodoModalDetailsPanelProps {
  todo: Todo;
  state?: {
    files: TodoFile[];
    filesUploading: boolean;
    deletingFileIds: string[];
    filesError: string;
    isEditing: boolean;
    isEditingTitle: boolean;
    title: string;
    description: string;
    saving: boolean;
    error: string;
  };
  actions?: {
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSave: () => void;
    onDelete: () => void;
    onStartEditTitle: () => void;
    onSaveTitle: () => void;
    onCancelEditTitle: () => void;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onOpenFilePicker: () => void;
    onDeleteFile: (fileId: string) => void;
    onDeleteLink?: (linkIndex: number) => Promise<void> | void;
    onAddLink?: (link: { name?: string; url: string }) => Promise<void> | void;
    onCreateChecklist?: () => Promise<void> | void;
    onChecklistTitleChange?: (title: string) => Promise<void> | void;
    onChecklistAddItem?: () => Promise<void> | void;
    onChecklistItemChange?: (itemId: string, updates: { title?: string; checked?: boolean }) => Promise<void> | void;
    onChecklistPasteItems?: (itemId: string, itemTitles: string[]) => Promise<void> | void;
    onChecklistDeleteItem?: (itemId: string) => Promise<void> | void;
    onDueDateChange?: (dueDate: string | null) => Promise<void> | void;
    onRemindOneDayBeforeChange?: (enabled: boolean) => Promise<void> | void;
    onMoveToNextStatus?: (todoId: string, nextColumnId: string) => void;
  };
  files?: TodoFile[];
  filesUploading?: boolean;
  deletingFileIds?: string[];
  filesError?: string;
  isEditing?: boolean;
  isEditingTitle?: boolean;
  title?: string;
  description?: string;
  saving?: boolean;
  error?: string;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onStartEditTitle?: () => void;
  onSaveTitle?: () => void;
  onCancelEditTitle?: () => void;
  onTitleChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
  onOpenFilePicker?: () => void;
  onDeleteFile?: (fileId: string) => void;
  onDeleteLink?: (linkIndex: number) => Promise<void> | void;
  onAddLink?: (link: { name?: string; url: string }) => Promise<void> | void;
  onCreateChecklist?: () => Promise<void> | void;
  onChecklistTitleChange?: (title: string) => Promise<void> | void;
  onChecklistAddItem?: () => Promise<void> | void;
  onChecklistItemChange?: (itemId: string, updates: { title?: string; checked?: boolean }) => Promise<void> | void;
  onChecklistPasteItems?: (itemId: string, itemTitles: string[]) => Promise<void> | void;
  onChecklistDeleteItem?: (itemId: string) => Promise<void> | void;
  onDueDateChange?: (dueDate: string | null) => Promise<void> | void;
  onRemindOneDayBeforeChange?: (enabled: boolean) => Promise<void> | void;
  columns?: { id: string; name: string }[];
  onMoveToNextStatus?: (todoId: string, nextColumnId: string) => void;
}

export const TodoModalDetailsPanel = ({
  todo,
  state,
  actions,
  columns = [],
  onMoveToNextStatus: legacyOnMoveToNextStatus,
  files: legacyFiles,
  filesUploading: legacyFilesUploading,
  deletingFileIds: legacyDeletingFileIds,
  filesError: legacyFilesError,
  isEditing: legacyIsEditing,
  isEditingTitle: legacyIsEditingTitle,
  title: legacyTitle,
  description: legacyDescription,
  saving: legacySaving,
  error: legacyError,
  onStartEdit: legacyOnStartEdit,
  onCancelEdit: legacyOnCancelEdit,
  onSave: legacyOnSave,
  onDelete: legacyOnDelete,
  onStartEditTitle: legacyOnStartEditTitle,
  onSaveTitle: legacyOnSaveTitle,
  onCancelEditTitle: legacyOnCancelEditTitle,
  onTitleChange: legacyOnTitleChange,
  onDescriptionChange: legacyOnDescriptionChange,
  onOpenFilePicker: legacyOnOpenFilePicker,
  onDeleteFile: legacyOnDeleteFile,
  onDeleteLink: legacyOnDeleteLink,
  onAddLink: legacyOnAddLink,
  onCreateChecklist: legacyOnCreateChecklist,
  onChecklistTitleChange: legacyOnChecklistTitleChange,
  onChecklistAddItem: legacyOnChecklistAddItem,
  onChecklistItemChange: legacyOnChecklistItemChange,
  onChecklistPasteItems: legacyOnChecklistPasteItems,
  onChecklistDeleteItem: legacyOnChecklistDeleteItem,
  onDueDateChange: legacyOnDueDateChange,
  onRemindOneDayBeforeChange: legacyOnRemindOneDayBeforeChange,
}: TodoModalDetailsPanelProps) => {
  const resolvedState = state ?? {
    files: legacyFiles ?? [],
    filesUploading: legacyFilesUploading ?? false,
    deletingFileIds: legacyDeletingFileIds ?? [],
    filesError: legacyFilesError ?? '',
    isEditing: legacyIsEditing ?? false,
    isEditingTitle: legacyIsEditingTitle ?? false,
    title: legacyTitle ?? '',
    description: legacyDescription ?? '',
    saving: legacySaving ?? false,
    error: legacyError ?? '',
  };

  const resolvedActions = actions ?? {
    onStartEdit: legacyOnStartEdit ?? (() => {}),
    onCancelEdit: legacyOnCancelEdit ?? (() => {}),
    onSave: legacyOnSave ?? (() => {}),
    onDelete: legacyOnDelete ?? (() => {}),
    onStartEditTitle: legacyOnStartEditTitle ?? (() => {}),
    onSaveTitle: legacyOnSaveTitle ?? (() => {}),
    onCancelEditTitle: legacyOnCancelEditTitle ?? (() => {}),
    onTitleChange: legacyOnTitleChange ?? (() => {}),
    onDescriptionChange: legacyOnDescriptionChange ?? (() => {}),
    onOpenFilePicker: legacyOnOpenFilePicker ?? (() => {}),
    onDeleteFile: legacyOnDeleteFile ?? (() => {}),
    onDeleteLink: legacyOnDeleteLink,
    onAddLink: legacyOnAddLink,
    onCreateChecklist: legacyOnCreateChecklist,
    onChecklistTitleChange: legacyOnChecklistTitleChange,
    onChecklistAddItem: legacyOnChecklistAddItem,
    onChecklistItemChange: legacyOnChecklistItemChange,
    onChecklistPasteItems: legacyOnChecklistPasteItems,
    onChecklistDeleteItem: legacyOnChecklistDeleteItem,
    onDueDateChange: legacyOnDueDateChange,
    onRemindOneDayBeforeChange: legacyOnRemindOneDayBeforeChange,
    onMoveToNextStatus: legacyOnMoveToNextStatus,
  };

  const {
    files,
    filesUploading,
    deletingFileIds,
    filesError,
    isEditing,
    isEditingTitle,
    title,
    description,
    saving,
    error,
  } = resolvedState;

  const {
    onStartEdit,
    onCancelEdit,
    onSave,
    onDelete,
    onStartEditTitle,
    onSaveTitle,
    onCancelEditTitle,
    onTitleChange,
    onDescriptionChange,
    onOpenFilePicker,
    onDeleteFile,
    onDeleteLink,
    onAddLink,
    onCreateChecklist,
    onChecklistTitleChange,
    onChecklistAddItem,
    onChecklistItemChange,
    onChecklistPasteItems,
    onChecklistDeleteItem,
    onDueDateChange,
    onRemindOneDayBeforeChange,
    onMoveToNextStatus,
  } = resolvedActions;

  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isLinksFormOpen, setIsLinksFormOpen] = useState(false);
  const [isDueDateFormOpen, setIsDueDateFormOpen] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useHotkey('escape', () => {
    setIsActionMenuOpen(false);
  }, { enabled: isActionMenuOpen, capture: true, preventDefault: true });

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !actionMenuRef.current.contains(target)) {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isActionMenuOpen]);

  useEffect(() => {
    if (isActionMenuOpen) return;
    setIsLinksFormOpen(false);
    setIsDueDateFormOpen(false);
    setLinkError('');
  }, [isActionMenuOpen]);

  useEffect(() => {
    setDueDateDraft(todo.dueDate ?? '');
  }, [todo.dueDate]);

  const dueDateState = getDueDateState(todo, new Date());
  const dueDateHint = todo.dueDate ? `Due date: ${todo.dueDate}` : undefined;
  const dueStateLabel = dueDateState === 'due_today'
    ? 'Today'
    : dueDateState === 'due_tomorrow'
      ? 'Tomorrow'
      : dueDateState === 'overdue'
        ? 'Overdue'
        : null;
  const dueStateClassName = dueDateState === 'overdue'
    ? 'border-rose-300/35 bg-rose-400/15 text-rose-100'
    : 'border-amber-300/35 bg-amber-300/15 text-amber-100';

  const handleTitleEnter = useHotkeyHandler('enter', (event) => {
    event.preventDefault();
    onSaveTitle();
  }, { enabled: isEditingTitle });

  const handleTitleEscape = useHotkeyHandler('escape', () => {
    onCancelEditTitle();
  }, { enabled: isEditingTitle });

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    handleTitleEnter(event);
    handleTitleEscape(event);
  };

  const handleAddLink = async () => {
    const url = normalizeSafeUrl(linkUrl);
    const name = linkName.trim();

    if (!url) {
      setLinkError('Enter a valid http/https URL');
      return;
    }

    if (!onAddLink) {
      setLinkError('Link handler is not available');
      return;
    }

    setLinkSaving(true);
    setLinkError('');

    try {
      await onAddLink({
        url,
        name: name || undefined,
      });
      setLinkName('');
      setLinkUrl('');
      setIsLinksFormOpen(false);
      setIsActionMenuOpen(false);
    } catch (addLinkError) {
      const message = addLinkError instanceof Error ? addLinkError.message : 'Failed to add link';
      setLinkError(message);
    } finally {
      setLinkSaving(false);
    }
  };

  const handleClearDueDate = () => {
    setDueDateDraft('');
    setIsDueDateFormOpen(false);
    setIsActionMenuOpen(false);
    void onDueDateChange?.(null);
  };

  const shouldShowFilesSection = files.length > 0 || filesUploading || deletingFileIds.length > 0 || Boolean(filesError);
  const shouldShowLinksSection = Array.isArray(todo.links) && todo.links.length > 0;
  const resolvedStatusLabel = (() => {
    const fallback = (todo.columnId ?? todo.status).split('_').join(' ').toUpperCase();
    const currentColumnId = todo.columnId ?? todo.status;
    const matchedColumn = columns.find((column) => column.id === currentColumnId || column.id === todo.status);

    if (!matchedColumn) {
      return fallback;
    }

    return matchedColumn.name.toUpperCase();
  })();

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
              onKeyDown={handleTitleKeyDown}
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
             <h2 className="text-xl font-bold leading-tight text-white">
               {/* Render all but last word as normal, last word + pencil in nowrap span */}
               {(() => {
                 const words = title.trim().split(/\s+/);
                 if (words.length === 0) return null;
                 if (words.length === 1) {
                   return (
                     <span className="inline-flex items-center whitespace-nowrap">
                       {words[0]}
                       <IconButton variant="neutral" size="md" label="Edit title" onClick={onStartEditTitle} className="ml-2 align-middle">
                         <Pencil size={14} />
                       </IconButton>
                     </span>
                   );
                 }
                 return [
                   words.slice(0, -1).join(' ') + ' ',
                   <span key="nowrap" className="inline-flex items-center whitespace-nowrap">
                     {words[words.length - 1]}
                     <IconButton variant="neutral" size="md" label="Edit title" onClick={onStartEditTitle} className="ml-2 align-middle">
                       <Pencil size={14} />
                     </IconButton>
                   </span>,
                 ];
               })()}
             </h2>
          </div>
        )}

        {!isEditing && (
          <div className="mb-4 flex items-center justify-between" data-testid="todo-actions-panel">
            <div className="relative flex items-center gap-2" ref={actionMenuRef}>
              <IconButton
                variant="primary"
                size="md"
                label="Open actions menu"
                className="h-10! w-10! aspect-square shrink-0 rounded-full! border-cyan-300/35 bg-cyan-300/15 p-0! text-xl font-semibold leading-none text-cyan-100"
                data-testid="todo-actions-trigger"
                onClick={() => setIsActionMenuOpen((prev) => !prev)}
              >
                <Plus size={18} aria-hidden="true" />
              </IconButton>
              {isActionMenuOpen && (
                <div
                  className="absolute left-0 top-12 z-10 min-w-60 max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/95 py-2 shadow-xl"
                  data-testid="todo-actions-menu"
                  role="menu"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-100 hover:bg-cyan-900/40 focus:bg-cyan-900/40 focus:outline-none"
                    role="menuitem"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      onOpenFilePicker();
                    }}
                  >
                    <Plus size={16} />
                    Add files
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-100 hover:bg-cyan-900/40 focus:bg-cyan-900/40 focus:outline-none"
                    role="menuitem"
                    data-testid="todo-actions-add-link"
                    onClick={() => {
                      setIsLinksFormOpen((prev) => !prev);
                      setLinkError('');
                    }}
                  >
                    <Link2 size={16} />
                    Links
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-100 hover:bg-cyan-900/40 focus:bg-cyan-900/40 focus:outline-none"
                    role="menuitem"
                    data-testid="todo-actions-checklist"
                    onClick={() => {
                      void onCreateChecklist?.();
                      setIsActionMenuOpen(false);
                    }}
                  >
                    <ListChecks size={16} />
                    Checklist
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-100 hover:bg-cyan-900/40 focus:bg-cyan-900/40 focus:outline-none"
                    role="menuitem"
                    data-testid="todo-actions-due-date"
                    onClick={() => {
                      setIsDueDateFormOpen((prev) => !prev);
                      setDueDateDraft(todo.dueDate ?? '');
                    }}
                  >
                    <CalendarDays size={16} />
                    Due date
                  </button>
                  {isDueDateFormOpen && (
                    <div className="mx-3 mt-1 rounded-md border border-slate-700/80 bg-slate-950/50 p-2">
                      <label className="mb-1 block text-xs text-slate-300">Due date</label>
                      <Input
                        type="date"
                        value={dueDateDraft}
                        onChange={(event) => {
                          setDueDateDraft(event.target.value.trim());
                        }}
                        data-testid="todo-due-date-input"
                        className="mb-2 w-full"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="mb-2 w-full"
                        onClick={() => {
                          const nextValue = dueDateDraft.trim() || null;
                          if (nextValue === (todo.dueDate ?? null)) {
                            setIsDueDateFormOpen(false);
                            setIsActionMenuOpen(false);
                            return;
                          }

                          void onDueDateChange?.(nextValue);
                          setIsDueDateFormOpen(false);
                          setIsActionMenuOpen(false);
                        }}
                        data-testid="todo-due-date-apply"
                      >
                        OK
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mb-2 w-full"
                        onClick={handleClearDueDate}
                        data-testid="todo-due-date-clear"
                      >
                        Clear due date
                      </Button>
                      {todo.dueDate && (
                        <label className="flex items-center gap-2 text-xs text-slate-200" data-testid="todo-remind-checkbox-row">
                          <input
                            type="checkbox"
                            checked={todo.remindOneDayBefore ?? false}
                            onChange={(event) => {
                              void onRemindOneDayBeforeChange?.(event.target.checked);
                            }}
                            className="size-4 accent-cyan-400"
                            data-testid="todo-remind-checkbox"
                          />
                          <Bell size={14} />
                          Remind 1 day before
                        </label>
                      )}
                    </div>
                  )}
                  {isLinksFormOpen && (
                    <div className="mx-3 mt-1 rounded-md border border-slate-700/80 bg-slate-950/50 p-2">
                      <Input
                        type="text"
                        placeholder="Name (optional)"
                        value={linkName}
                        onChange={(event) => setLinkName(event.target.value)}
                        className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-400"
                      />
                      <Input
                        type="url"
                        placeholder="URL"
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        className="mb-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-400"
                      />
                      {linkError && <p className="mb-2 text-xs text-rose-300">{linkError}</p>}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          void handleAddLink();
                        }}
                        disabled={linkSaving}
                        data-testid="todo-actions-add-link-submit"
                      >
                        {linkSaving ? 'Adding...' : 'Add link'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
              {/* Кнопка перевода на следующий статус по центру */}
              {columns.length > 1 && (() => {
                const idx = columns.findIndex((c) => c.id === todo.columnId);
                const next = idx >= 0 && idx < columns.length - 1 ? columns[idx + 1] : null;
                if (!next) return null;
                return (
                  <button
                    type="button"
                    className="flex flex-row items-center justify-center mx-4 px-3 py-2 rounded-lg border border-cyan-400/60 bg-transparent text-cyan-100 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 hover:border-cyan-300 disabled:opacity-60"
                    style={{ minWidth: 0 }}
                    disabled={saving}
                    onClick={() => onMoveToNextStatus && onMoveToNextStatus(todo.id, next.id)}
                    data-testid="todo-next-status-btn"
                  >
                    <ArrowRight size={18} className="mr-2" />
                    <span className="text-xs font-bold tracking-wide uppercase whitespace-nowrap">{next.name}</span>
                  </button>
                );
              })()}
            <IconButton
              variant="danger"
              label="Delete card"
              onClick={onDelete}
              disabled={saving}
              className="h-10! w-10! aspect-square shrink-0 rounded-full! p-0! text-xl font-semibold leading-none text-rose-100"
              data-testid="todo-delete-card-btn"
            >
              <Trash2 size={18} />
            </IconButton>
          </div>
        )}

        {/* Metadata */}
        {!isEditing && (
          <div className="mb-4 flex flex-col gap-2 text-xs text-slate-400">
            <span>
              Status: <b className="text-slate-200 uppercase">{resolvedStatusLabel}</b>
            </span>
            {todo.dueDate && (
              <span className="inline-flex w-fit items-center gap-1" title={dueDateHint} data-testid="todo-due-date-metadata">
                <span>Due date:</span>{' '}
                {dueStateLabel ? (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${dueStateClassName}`}>
                    {dueStateLabel}
                  </span>
                ) : (
                  <b className="text-slate-200">{todo.dueDate}</b>
                )}
                <IconButton
                  variant="neutral"
                  size="sm"
                  label="Remove due date"
                  className="ml-1 h-6! w-6! rounded-full! p-0! text-slate-300 hover:text-white"
                  onClick={handleClearDueDate}
                  data-testid="todo-due-date-remove"
                >
                  <X size={12} />
                </IconButton>
              </span>
            )}
            <span>
              Created: {todo.createdAt instanceof Date ? todo.createdAt.toLocaleString() : String(todo.createdAt)}
            </span>
            <span>
              Updated: {todo.updatedAt instanceof Date ? todo.updatedAt.toLocaleString() : String(todo.updatedAt)}
            </span>
          </div>
        )}

        <TodoChecklistSection
          checklist={todo.checklist}
          onChecklistTitleChange={onChecklistTitleChange}
          onChecklistAddItem={onChecklistAddItem}
          onChecklistItemChange={onChecklistItemChange}
          onChecklistPasteItems={onChecklistPasteItems}
          onChecklistDeleteItem={onChecklistDeleteItem}
        />

        {isEditing ? (
          <>
            {shouldShowFilesSection && (
              <>
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Files</div>
                <div className="mb-4 space-y-2">
                  {files.length > 0 && (
                    <ul className="space-y-1">
                      {files.map((file) => (
                        <li key={file.id}>
                          <div className="flex items-center gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <FileTypeIcon fileName={file.name} />
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                              >
                                {file.name}
                              </a>
                            </div>
                            <IconButton
                              variant="danger"
                              size="sm"
                              label={`Delete file ${file.name}`}
                              className="ml-0.5 h-auto! w-auto! rounded-none! border-transparent! bg-transparent! p-0! text-rose-300 hover:bg-transparent! hover:text-rose-200"
                              onClick={() => onDeleteFile(file.id)}
                              disabled={deletingFileIds.includes(file.id)}
                              data-testid={`delete-file-${file.id}`}
                            >
                              <X size={12} />
                            </IconButton>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {filesUploading && <p className="text-xs text-slate-400">Uploading files...</p>}
                  {deletingFileIds.length > 0 && <p className="text-xs text-slate-400">Removing file...</p>}
                  {filesError && <p className="text-xs text-rose-300">{filesError}</p>}
                </div>
              </>
            )}

            {shouldShowLinksSection && (
              <>
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Links</div>
                <div className="mb-4 space-y-2">
                  <ul className="space-y-1">
                    {todo.links?.map((link, index) => (
                      (() => {
                        const safeUrl = normalizeSafeUrl(link.url);
                        if (!safeUrl) return null;

                        return (
                          <li key={`${safeUrl}-${index}`} className="flex items-center gap-2 text-sm text-slate-200">
                            <Link2 size={14} className="shrink-0 text-cyan-300" aria-hidden="true" />
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                            >
                              {link.name ? link.name : safeUrl}
                            </a>
                            <IconButton
                              variant="danger"
                              size="sm"
                              label={`Delete link ${link.name ? link.name : safeUrl}`}
                              className="ml-0.5 h-auto! w-auto! rounded-none! border-transparent! bg-transparent! p-0! text-rose-300 hover:bg-transparent! hover:text-rose-200"
                              onClick={() => onDeleteLink?.(index)}
                              data-testid={`delete-link-${index}`}
                            >
                              <X size={12} />
                            </IconButton>
                          </li>
                        );
                      })()
                    ))}
                  </ul>
                </div>
              </>
            )}

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
          <div className="mb-4">
            {shouldShowFilesSection && (
              <>
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Files</div>
                <div className="mb-4 space-y-2">
                  {files.length > 0 && (
                    <ul className="space-y-1">
                      {files.map((file) => (
                        <li key={file.id} className="flex items-center gap-2 text-sm text-slate-200">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileTypeIcon fileName={file.name} />
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                            >
                              {file.name}
                            </a>
                          </div>
                          <IconButton
                            variant="danger"
                            size="sm"
                            label={`Delete file ${file.name}`}
                            className="ml-0.5 h-auto! w-auto! rounded-none! border-transparent! bg-transparent! p-0! text-rose-300 hover:bg-transparent! hover:text-rose-200"
                            onClick={() => onDeleteFile(file.id)}
                            disabled={deletingFileIds.includes(file.id)}
                            data-testid={`delete-file-${file.id}`}
                          >
                            <X size={12} />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  )}
                  {filesUploading && <p className="text-xs text-slate-400">Uploading files...</p>}
                  {deletingFileIds.length > 0 && <p className="text-xs text-slate-400">Removing file...</p>}
                  {filesError && <p className="text-xs text-rose-300">{filesError}</p>}
                </div>
              </>
            )}

            {shouldShowLinksSection && (
              <>
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Links</div>
                <div className="mb-4 space-y-2">
                  <ul className="space-y-1">
                    {todo.links?.map((link, index) => (
                      (() => {
                        const safeUrl = normalizeSafeUrl(link.url);
                        if (!safeUrl) return null;

                        return (
                          <li key={`${safeUrl}-${index}`} className="flex items-center gap-2 text-sm text-slate-200">
                            <Link2 size={14} className="shrink-0 text-cyan-300" aria-hidden="true" />
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                            >
                              {link.name ? link.name : safeUrl}
                            </a>
                            <IconButton
                              variant="danger"
                              size="sm"
                              label={`Delete link ${link.name ? link.name : safeUrl}`}
                              className="ml-0.5 h-auto! w-auto! rounded-none! border-transparent! bg-transparent! p-0! text-rose-300 hover:bg-transparent! hover:text-rose-200"
                              onClick={() => onDeleteLink?.(index)}
                              data-testid={`delete-link-${index}`}
                            >
                              <X size={12} />
                            </IconButton>
                          </li>
                        );
                      })()
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wide text-slate-300">Description</div>
              <IconButton
                variant="neutral"
                size="md"
                label="Edit description"
                onClick={onStartEdit}
                className="shrink-0"
              >
                <Pencil size={14} />
              </IconButton>
            </div>
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
