import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Check, X, Plus, ArrowRight, Link2, ListChecks, CalendarDays, Bell, Archive, Trash2, Hand } from 'lucide-react';
import type { Todo, TodoFile } from '../../types/todo';
import { FaFile, FaFileArchive, FaFileAudio, FaFileCode, FaFileExcel, FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileVideo, FaFileWord } from 'react-icons/fa';
import { Button } from '../ui/Button';
import { EllipsisMenu } from '../ui/EllipsisMenu';
import { getEllipsisMenuItemClassName } from '../ui/ellipsisMenuStyles';
import { IconButton } from '../ui/IconButton';
import { InlineEditableHeading } from '../ui/InlineEditableHeading';
import { Input } from '../ui/Input';
import { getDueDateState } from '../../utils/dueDate';
import { normalizeTodoChecklists } from '../../utils/todoChecklist';
import { TodoChecklistSection } from './TodoChecklistSection';
import { sanitizeRichTextHtml } from './richText';
import { useHotkeyHandler } from '../../hooks/useHotkey';
import { useClickOutside } from '../../hooks/useClickOutside';

const RichTextEditor = lazy(async () => {
  const module = await import('./RichTextEditor');
  return { default: module.RichTextEditor };
});

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

const normalizeTags = (tags: string[]): string[] => {
  const normalized = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
};

const getTagToneClassName = (tag: string): string => {
  const palette = [
    'border-cyan-300/35 bg-cyan-400/15 text-cyan-100',
    'border-emerald-300/35 bg-emerald-400/15 text-emerald-100',
    'border-amber-300/35 bg-amber-400/15 text-amber-100',
    'border-rose-300/35 bg-rose-400/15 text-rose-100',
    'border-indigo-300/35 bg-indigo-400/15 text-indigo-100',
    'border-fuchsia-300/35 bg-fuchsia-400/15 text-fuchsia-100',
    'border-lime-300/35 bg-lime-400/15 text-lime-100',
  ];

  const hash = Array.from(tag).reduce((acc, char) => (acc + char.charCodeAt(0)) % palette.length, 0);
  return palette[hash];
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
    onChecklistTitleChange?: (title: string, checklistIndex?: number) => Promise<void> | void;
    onChecklistAddItem?: (checklistIndex?: number) => Promise<void> | void;
    onChecklistItemChange?: (itemId: string, updates: { title?: string; checked?: boolean }, checklistIndex?: number) => Promise<void> | void;
    onChecklistItemSaveAndAddNext?: (itemId: string, title: string, checklistIndex?: number) => Promise<void> | void;
    onChecklistPasteItems?: (itemId: string, itemTitles: string[], checklistIndex?: number) => Promise<void> | void;
    onChecklistDeleteItem?: (itemId: string, checklistIndex?: number) => Promise<void> | void;
    onChecklistConvertToMap?: (itemId: string, checklistIndex?: number) => Promise<void> | void;
    onChecklistDelete?: (checklistIndex?: number) => Promise<void> | void;
    onDueDateChange?: (dueDate: string | null) => Promise<void> | void;
    onRemindOneDayBeforeChange?: (enabled: boolean) => Promise<void> | void;
    onMoveToNextStatus?: (todoId: string, nextColumnId: string) => void;
    onArchive?: () => void;
    onBlock?: (reason: string | null) => Promise<void> | void;
    onUpdateTags?: (tags: string[]) => Promise<void> | void;
  };
  availableTags?: string[];
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
  onChecklistTitleChange?: (title: string, checklistIndex?: number) => Promise<void> | void;
  onChecklistAddItem?: (checklistIndex?: number) => Promise<void> | void;
  onChecklistItemChange?: (itemId: string, updates: { title?: string; checked?: boolean }, checklistIndex?: number) => Promise<void> | void;
  onChecklistItemSaveAndAddNext?: (itemId: string, title: string, checklistIndex?: number) => Promise<void> | void;
  onChecklistPasteItems?: (itemId: string, itemTitles: string[], checklistIndex?: number) => Promise<void> | void;
  onChecklistDeleteItem?: (itemId: string, checklistIndex?: number) => Promise<void> | void;
  onChecklistConvertToMap?: (itemId: string, checklistIndex?: number) => Promise<void> | void;
  onChecklistDelete?: (checklistIndex?: number) => Promise<void> | void;
  onDueDateChange?: (dueDate: string | null) => Promise<void> | void;
  onRemindOneDayBeforeChange?: (enabled: boolean) => Promise<void> | void;
  columns?: { id: string; name: string; isDone?: boolean }[];
  onMoveToNextStatus?: (todoId: string, nextColumnId: string) => void;
  onArchive?: () => void;
  onBlock?: (reason: string | null) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  focusChecklistIndex?: number | null;
  onChecklistAutoFocusHandled?: () => void;
}

export const TodoModalDetailsPanel = ({
  todo,
  state,
  actions,
  availableTags = [],
  columns = [],
  onMoveToNextStatus: legacyOnMoveToNextStatus,
  onArchive: legacyOnArchive,
  onBlock: legacyOnBlock,
  onUpdateTags: legacyOnUpdateTags,
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
  onChecklistItemSaveAndAddNext: legacyOnChecklistItemSaveAndAddNext,
  onChecklistPasteItems: legacyOnChecklistPasteItems,
  onChecklistDeleteItem: legacyOnChecklistDeleteItem,
  onChecklistConvertToMap: legacyOnChecklistConvertToMap,
  onChecklistDelete: legacyOnChecklistDelete,
  onDueDateChange: legacyOnDueDateChange,
  onRemindOneDayBeforeChange: legacyOnRemindOneDayBeforeChange,
  focusChecklistIndex = null,
  onChecklistAutoFocusHandled,
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
    onChecklistItemSaveAndAddNext: legacyOnChecklistItemSaveAndAddNext,
    onChecklistPasteItems: legacyOnChecklistPasteItems,
    onChecklistDeleteItem: legacyOnChecklistDeleteItem,
    onChecklistConvertToMap: legacyOnChecklistConvertToMap,
    onChecklistDelete: legacyOnChecklistDelete,
    onDueDateChange: legacyOnDueDateChange,
    onRemindOneDayBeforeChange: legacyOnRemindOneDayBeforeChange,
    onMoveToNextStatus: legacyOnMoveToNextStatus,
    onArchive: legacyOnArchive ?? (() => {}),
    onBlock: legacyOnBlock ?? ((reason: string | null) => {
      void reason;
    }),
    onUpdateTags: legacyOnUpdateTags,
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
    onChecklistItemSaveAndAddNext,
    onChecklistPasteItems,
    onChecklistDeleteItem,
    onChecklistConvertToMap,
    onChecklistDelete,
    onDueDateChange,
    onRemindOneDayBeforeChange,
    onMoveToNextStatus,
    onArchive,
    onBlock,
    onUpdateTags,
  } = resolvedActions;

  const [isLinksFormOpen, setIsLinksFormOpen] = useState(false);
  const [isDueDateFormOpen, setIsDueDateFormOpen] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState(todo.dueDate ?? '');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const [isBlockFormOpen, setIsBlockFormOpen] = useState(false);
  const [blockReasonDraft, setBlockReasonDraft] = useState(todo.blockedReason ?? '');
  const [blockError, setBlockError] = useState('');
  const [blockSaving, setBlockSaving] = useState(false);
  const [isTagsSelectorOpen, setIsTagsSelectorOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [tagsSaving, setTagsSaving] = useState(false);
  const [tagsError, setTagsError] = useState('');
  const prevTodoIdRef = useRef(todo.id);

  const tagsSelectorRef = useRef<HTMLDivElement | null>(null);
  const blockedReason = todo.blockedReason?.trim() ?? '';
  const selectedTags = normalizeTags(todo.tags ?? []);
  const normalizedAvailableTags = normalizeTags(availableTags);

  // Sync draft state when switching to a different todo
  useEffect(() => {
    if (prevTodoIdRef.current !== todo.id) {
      setDueDateDraft(todo.dueDate ?? '');
      setBlockReasonDraft(todo.blockedReason ?? '');
      setTagQuery('');
      setTagsError('');
      setLinkError('');
      setBlockError('');
      setIsLinksFormOpen(false);
      setIsDueDateFormOpen(false);
      setIsBlockFormOpen(false);
      setIsTagsSelectorOpen(false);
      prevTodoIdRef.current = todo.id;
    }
  }, [todo]);

  useClickOutside(tagsSelectorRef, () => setIsTagsSelectorOpen(false), { enabled: isTagsSelectorOpen });

  const dueDateState = getDueDateState(todo, new Date());
  const checklists = normalizeTodoChecklists(todo.checklists, todo.checklist);
  const primaryChecklist = Array.isArray(todo.checklists) ? todo.checklists[0] : todo.checklist;
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
  const tagQueryTrimmed = tagQuery.trim();
  const tagQueryLower = tagQueryTrimmed.toLowerCase();
  const availableTagSuggestions = normalizedAvailableTags.filter((tag) => {
    if (selectedTags.includes(tag)) {
      return false;
    }

    if (!tagQueryLower) {
      return true;
    }

    return tag.toLowerCase().includes(tagQueryLower);
  });
  const hasExactSuggestion = availableTagSuggestions.some((tag) => tag.toLowerCase() === tagQueryLower);
  const canCreateTag = tagQueryTrimmed.length > 0 && !hasExactSuggestion && !selectedTags.some(
    (tag) => tag.toLowerCase() === tagQueryLower,
  );

  const persistTags = async (nextTags: string[]) => {
    if (!onUpdateTags) {
      setTagsError('Tag update handler is not available');
      return;
    }

    if (tagsSaving) {
      return;
    }

    setTagsSaving(true);
    setTagsError('');
    try {
      await onUpdateTags(normalizeTags(nextTags));
    } catch (updateTagsError) {
      const message = updateTagsError instanceof Error ? updateTagsError.message : 'Failed to update tags';
      setTagsError(message);
    } finally {
      setTagsSaving(false);
    }
  };

  const handleAddTag = async (tag: string) => {
    const normalizedTag = tag.trim();
    if (!normalizedTag || selectedTags.includes(normalizedTag)) {
      return;
    }

    await persistTags([...selectedTags, normalizedTag]);
    setTagQuery('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    await persistTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

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

  const handleAddLink = async (closeMenu?: () => void) => {
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
      closeMenu?.();
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
    void onDueDateChange?.(null);
  };

  const handleSaveBlockReason = async () => {
    const normalizedReason = blockReasonDraft.trim();

    if (!normalizedReason) {
      setBlockError('Enter block reason');
      return;
    }

    if (!onBlock) {
      setBlockError('Block handler is not available');
      return;
    }

    setBlockSaving(true);
    setBlockError('');

    try {
      await onBlock(normalizedReason);
      setIsBlockFormOpen(false);
    } catch (blockReasonError) {
      const message = blockReasonError instanceof Error ? blockReasonError.message : 'Failed to block card';
      setBlockError(message);
    } finally {
      setBlockSaving(false);
    }
  };

  const handleRemoveBlockReason = async () => {
    if (!onBlock) {
      setBlockError('Block handler is not available');
      return;
    }

    setBlockSaving(true);
    setBlockError('');

    try {
      await onBlock(null);
      setBlockReasonDraft('');
      setIsBlockFormOpen(false);
    } catch (blockReasonError) {
      const message = blockReasonError instanceof Error ? blockReasonError.message : 'Failed to clear block reason';
      setBlockError(message);
    } finally {
      setBlockSaving(false);
    }
  };

  const openBlockReasonForm = (reason: string) => {
    setBlockReasonDraft(reason);
    setBlockError('');
    setIsBlockFormOpen(true);
  };

  const handleActionMenuOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setIsLinksFormOpen(false);
      setIsDueDateFormOpen(false);
      setLinkError('');
      setBlockError('');
    }
  }, []);

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
    <div className="min-w-0 flex flex-col md:min-h-0 md:flex-1">
      <div className="overflow-visible pl-1 pr-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
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
          <div className="mb-4 flex items-start justify-between gap-3 pr-10">
             <h2 className="text-xl font-bold leading-tight text-white">
               <InlineEditableHeading text={title} onStartEdit={onStartEditTitle} editLabel="Edit title" />
             </h2>
          </div>
        )}

        {!isEditing && (
          <div
            className="relative mb-4 flex items-center justify-between before:pointer-events-none before:absolute before:left-0 before:right-0 before:top-1/2 before:z-0 before:-translate-y-1/2 before:border-t before:border-cyan-300/40"
            data-testid="todo-actions-panel"
          >
            <div className="relative z-10 flex items-center gap-2 rounded-full bg-slate-900/95 px-1">
              <EllipsisMenu
                trigger={{
                  label: 'Open actions menu',
                  testId: 'todo-actions-trigger',
                  variant: 'rounded',
                  icon: <Plus size={18} aria-hidden="true" />,
                }}
                menu={{
                  testId: 'todo-actions-menu',
                  align: 'left',
                  offsetClassName: 'top-12',
                }}
                onOpenChange={handleActionMenuOpenChange}
                menuContent={({ closeMenu }) => (
                  <>
                    <button
                      type="button"
                      className={getEllipsisMenuItemClassName({ tone: 'default', isFirst: true })}
                      role="menuitem"
                      onClick={() => {
                        closeMenu();
                        onOpenFilePicker();
                      }}
                    >
                      <Plus size={16} />
                      Add files
                    </button>
                    <button
                      type="button"
                      className={getEllipsisMenuItemClassName({ tone: 'default' })}
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
                      className={getEllipsisMenuItemClassName({ tone: 'default' })}
                      role="menuitem"
                      data-testid="todo-actions-checklist"
                      onClick={() => {
                        void onCreateChecklist?.();
                        closeMenu();
                      }}
                    >
                      <ListChecks size={16} />
                      Checklist
                    </button>
                    <button
                      type="button"
                      className={getEllipsisMenuItemClassName({ tone: 'default', isLast: true })}
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
                          size="sm"
                          className="mb-2 w-full"
                          onClick={() => {
                            const nextValue = dueDateDraft.trim() || null;
                            if (nextValue === (todo.dueDate ?? null)) {
                              setIsDueDateFormOpen(false);
                              closeMenu();
                              return;
                            }

                            void onDueDateChange?.(nextValue);
                            setIsDueDateFormOpen(false);
                            closeMenu();
                          }}
                          data-testid="todo-due-date-apply"
                        >
                          OK
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mb-2 w-full"
                          onClick={() => {
                            handleClearDueDate();
                            closeMenu();
                          }}
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
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            void handleAddLink(closeMenu);
                          }}
                          disabled={linkSaving}
                          data-testid="todo-actions-add-link-submit"
                        >
                          {linkSaving ? 'Adding...' : 'Add link'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              />
            </div>
              {/* Кнопка перевода на следующий статус по центру */}
              {columns.length > 1 && (() => {
                const idx = columns.findIndex((c) => c.id === todo.columnId);
                const next = idx >= 0 && idx < columns.length - 1 ? columns[idx + 1] : null;
                if (!next) return null;
                const isBlockedFromNextStatus = Boolean(todo.blockedReason?.trim()) && Boolean(next.isDone);
                return (
                  <div className="relative z-10 mx-4 rounded-full bg-slate-900/95 px-1">
                    <Button
                      variant="secondary"
                      size="md"
                      className="px-3"
                      style={{ minWidth: 0 }}
                      disabled={saving || isBlockedFromNextStatus}
                      onClick={() => onMoveToNextStatus && onMoveToNextStatus(todo.id, next.id)}
                      data-testid="todo-next-status-btn"
                      startIcon={<ArrowRight size={18} className="mr-2" />}
                    >
                      <span className="text-xs font-bold tracking-wide uppercase whitespace-nowrap">{next.name}</span>
                    </Button>
                  </div>
                );
              })()}
            <div className="relative z-10 rounded-full bg-slate-900/95 px-1">
            <EllipsisMenu
              trigger={{
                label: 'Open card menu',
                testId: 'todo-card-menu-trigger',
                variant: 'rounded',
              }}
              menu={{ testId: 'todo-card-menu' }}
              items={[
                {
                  id: 'archive',
                  label: 'Archive',
                  icon: <Archive size={14} aria-hidden="true" />,
                  onSelect: () => {
                    onArchive?.();
                  },
                  testId: 'todo-card-menu-archive',
                  disabled: saving,
                },
                {
                  id: 'block',
                  label: 'Block',
                  icon: <Hand size={14} aria-hidden="true" />,
                  onSelect: () => {
                    setBlockReasonDraft(todo.blockedReason ?? '');
                    setBlockError('');
                    setIsBlockFormOpen(true);
                  },
                  testId: 'todo-card-menu-block',
                  disabled: saving,
                },
                  {
                    id: 'delete',
                    label: 'Delete',
                    icon: <Trash2 size={14} aria-hidden="true" />,
                    onSelect: onDelete,
                    testId: 'todo-card-menu-delete',
                    variant: 'danger',
                    disabled: saving,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {blockedReason && !isBlockFormOpen && (
          <div className="mb-4 rounded-md border border-rose-400/30 bg-rose-400/10 p-3" data-testid="todo-block-reason-metadata">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-100">
                <Hand size={14} aria-hidden="true" />
                Block reason
              </div>
              <div className="flex items-center gap-1">
                <IconButton
                  variant="neutral"
                  size="sm"
                  label="Edit block reason"
                  className="h-7! w-7! rounded-full! p-0! text-rose-100 hover:text-white"
                  onClick={() => openBlockReasonForm(blockedReason)}
                  data-testid="todo-block-reason-edit"
                >
                  <Pencil size={12} />
                </IconButton>
                <IconButton
                  variant="danger"
                  size="sm"
                  label="Remove block reason"
                  className="h-7! w-7! rounded-full! p-0!"
                  onClick={() => {
                    void handleRemoveBlockReason();
                  }}
                  disabled={blockSaving}
                  data-testid="todo-block-reason-remove"
                >
                  <Trash2 size={12} />
                </IconButton>
              </div>
            </div>
            <p className="text-sm leading-5 text-rose-50" data-testid="todo-block-reason-text">
              {blockedReason}
            </p>
          </div>
        )}

        {!isEditing && isBlockFormOpen && (
          <div className="mb-4 rounded-md border border-rose-400/30 bg-rose-400/10 p-3" data-testid="todo-block-reason-form">
            <label className="mb-2 block text-xs uppercase tracking-wide text-rose-100">
              {blockedReason ? 'Edit block reason' : 'Block reason'}
            </label>
            <Input
              type="text"
              value={blockReasonDraft}
              onChange={(event) => setBlockReasonDraft(event.target.value)}
              placeholder="Describe why this card is blocked"
              className="mb-2"
              data-testid="todo-block-reason-input"
            />
            {blockError && <p className="mb-2 text-xs text-rose-200">{blockError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsBlockFormOpen(false);
                  setBlockError('');
                }}
                data-testid="todo-block-reason-cancel"
              >
                Cancel
              </Button>
              {blockedReason && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void handleRemoveBlockReason();
                  }}
                  disabled={blockSaving}
                  data-testid="todo-block-reason-clear"
                >
                  Remove
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  void handleSaveBlockReason();
                }}
                disabled={blockSaving}
                data-testid="todo-block-reason-save"
              >
                {blockSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Metadata */}
        {!isEditing && (
          <div className="mb-4 flex flex-col gap-2 text-xs text-slate-400">
            <span>
              Status: <b className="text-slate-200 uppercase">{resolvedStatusLabel}</b>
            </span>
            <div className="flex flex-col gap-2" data-testid="todo-tags-field">
              <div className="flex items-center gap-2">
                <span>
                  Tags:
                </span>
                <div ref={tagsSelectorRef} className="relative">
                  <IconButton
                    variant="neutral"
                    size="sm"
                    label="Add tag"
                    className="h-6! w-6! rounded-full! p-0! text-slate-300 hover:text-white"
                    onClick={() => setIsTagsSelectorOpen((prev) => !prev)}
                    data-testid="todo-tags-toggle"
                  >
                    <Plus size={12} />
                  </IconButton>
                  {isTagsSelectorOpen && (
                    <div className="absolute left-0 top-full z-20 mt-2 w-[min(26rem,calc(100vw-4rem))] rounded-xl border border-white/15 bg-slate-900/95 p-3 shadow-xl shadow-slate-950/40 backdrop-blur" data-testid="todo-tags-selector">
                      <Input
                        type="text"
                        placeholder="Search or create tag"
                        value={tagQuery}
                        onChange={(event) => setTagQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') {
                            return;
                          }

                          event.preventDefault();
                          const existing = availableTagSuggestions.find(
                            (tag) => tag.toLowerCase() === tagQueryLower,
                          );

                          if (existing) {
                            void handleAddTag(existing);
                            return;
                          }

                          if (canCreateTag) {
                            void handleAddTag(tagQueryTrimmed);
                          }
                        }}
                        className="mb-2"
                        data-testid="todo-tags-search-input"
                      />
                      <div className="max-h-32 overflow-y-auto">
                        {availableTagSuggestions.slice(0, 8).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="mb-1 inline-flex w-full items-center rounded-md border border-transparent px-2 py-1 text-left text-xs text-slate-200 hover:border-slate-600 hover:bg-slate-800/70"
                            onClick={() => {
                              void handleAddTag(tag);
                            }}
                            data-testid={`todo-tag-option-${tag}`}
                          >
                            {tag}
                          </button>
                        ))}
                        {canCreateTag && (
                          <button
                            type="button"
                            className="inline-flex w-full items-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-left text-xs text-cyan-100 hover:bg-cyan-500/15"
                            onClick={() => {
                              void handleAddTag(tagQueryTrimmed);
                            }}
                            data-testid="todo-tag-create-option"
                          >
                            Create "{tagQueryTrimmed}"
                          </button>
                        )}
                        {!canCreateTag && availableTagSuggestions.length === 0 && (
                          <p className="px-2 py-1 text-xs text-slate-500" data-testid="todo-tags-no-results">
                            No matching tags
                          </p>
                        )}
                      </div>
                      {tagsError && (
                        <p className="mt-2 text-xs text-rose-300" data-testid="todo-tags-error">
                          {tagsError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5" data-testid="todo-tags-list">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getTagToneClassName(tag)}`}
                      data-testid={`todo-tag-pill-${tag}`}
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        className="text-current/90 hover:text-current"
                        onClick={() => {
                          void handleRemoveTag(tag);
                        }}
                        disabled={tagsSaving}
                        aria-label={`Remove tag ${tag}`}
                        data-testid={`todo-tag-remove-${tag}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-slate-500" data-testid="todo-tags-empty">No tags</span>
              )}
            </div>
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
          checklist={primaryChecklist}
          onChecklistTitleChange={(title) => onChecklistTitleChange?.(title)}
          onChecklistAddItem={() => onChecklistAddItem?.()}
          onChecklistItemChange={(itemId, updates) => onChecklistItemChange?.(itemId, updates)}
          onChecklistItemSaveAndAddNext={(itemId, title) => onChecklistItemSaveAndAddNext?.(itemId, title)}
          onChecklistPasteItems={(itemId, itemTitles) => onChecklistPasteItems?.(itemId, itemTitles)}
          onChecklistDeleteItem={(itemId) => onChecklistDeleteItem?.(itemId)}
          onChecklistConvertToMap={(itemId) => onChecklistConvertToMap?.(itemId)}
          onChecklistDelete={() => onChecklistDelete?.()}
          autoFocusOnMount={focusChecklistIndex === 0}
          onAutoFocusHandled={focusChecklistIndex === 0 ? onChecklistAutoFocusHandled : undefined}
        />

        {checklists.slice(1).map((checklist, relativeIndex) => {
          const checklistIndex = relativeIndex + 1;
          return (
            <TodoChecklistSection
              key={`checklist-${checklistIndex}-${checklist.title}`}
              checklist={checklist}
              onChecklistTitleChange={(title) => onChecklistTitleChange?.(title, checklistIndex)}
              onChecklistAddItem={() => onChecklistAddItem?.(checklistIndex)}
              onChecklistItemChange={(itemId, updates) => onChecklistItemChange?.(itemId, updates, checklistIndex)}
              onChecklistItemSaveAndAddNext={(itemId, title) => onChecklistItemSaveAndAddNext?.(itemId, title, checklistIndex)}
              onChecklistPasteItems={(itemId, itemTitles) => onChecklistPasteItems?.(itemId, itemTitles, checklistIndex)}
              onChecklistDeleteItem={(itemId) => onChecklistDeleteItem?.(itemId, checklistIndex)}
              onChecklistConvertToMap={(itemId) => onChecklistConvertToMap?.(itemId, checklistIndex)}
              onChecklistDelete={() => onChecklistDelete?.(checklistIndex)}
              autoFocusOnMount={focusChecklistIndex === checklistIndex}
              onAutoFocusHandled={focusChecklistIndex === checklistIndex ? onChecklistAutoFocusHandled : undefined}
            />
          );
        })}

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
            <Suspense fallback={<div className="mb-4 rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-400">Loading editor...</div>}>
              <RichTextEditor
                value={description}
                onChange={onDescriptionChange}
                disabled={saving}
                className="mb-4"
                placeholder="Write a description with formatting..."
              />
            </Suspense>
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
            <Button variant="ghost" onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {!isEditing && error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
    </div>
  );
};
