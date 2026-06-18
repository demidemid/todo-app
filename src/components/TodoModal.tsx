import { useEffect, useMemo, useRef, useState, type FC, type ChangeEvent } from 'react';
import { deleteField } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { Todo } from '../types/todo';
import type { TodoFile } from '../types/todo';
import { storage } from '../firebase';
import { DEFAULT_CHECKLIST_TITLE, hasIncompleteChecklistItems, normalizeTodoChecklists } from '../utils/todoChecklist';
import { resolveReminderScheduledAt } from '../utils/dueDate';
import { TodoModalCommentsPanel } from './todo-modal/TodoModalCommentsPanel';
import { TodoModalDetailsPanel } from './todo-modal/TodoModalDetailsPanel';
import { useTodoModalEditor } from './todo-modal/useTodoModalEditor';
import { useTodoModalController } from './todo-modal/useTodoModalController';
import { useHotkey } from '../hooks/useHotkey';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';

interface TodoModalProps {
  todo: Todo;
  userId: string;
  userEmail?: string;
  onClose: () => void;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  columns?: { id: string; name: string; isDone?: boolean }[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

const createChecklistItemId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `check-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
);

const sanitizeChecklistItemsForPersist = <T extends { title: string }>(items: T[]): T[] => items
  .map((item) => ({
    ...item,
    title: item.title.trim(),
  }))
  .filter((item) => item.title.length > 0);

const getIncompleteChecklistMoveErrorMessage = (todo: Todo, targetColumnName: string): string => (
  `Card "${todo.title}" can't be moved to ${targetColumnName} because it has unfinished checklist items.`
);

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target.closest('[contenteditable="true"]')) {
    return true;
  }

  const tagName = target.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  return target.getAttribute('role') === 'textbox' || target.closest('[role="textbox"]') !== null;
};

export const TodoModal: FC<TodoModalProps> = ({ todo, userId, userEmail, onClose, updateTodo, deleteTodo, columns }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [filesUploading, setFilesUploading] = useState(false);
  const [deletingFileIds, setDeletingFileIds] = useState<string[]>([]);
  const [filesError, setFilesError] = useState('');
  const [quickActionError, setQuickActionError] = useState('');
  const [focusChecklistIndex, setFocusChecklistIndex] = useState<number | null>(null);

  const getNormalizedChecklists = () => normalizeTodoChecklists(todo.checklists, todo.checklist, {
    createItemId: createChecklistItemId,
  });

  const buildChecklistUpdates = (nextChecklists: NonNullable<Todo['checklists']>): Partial<Todo> => {
    const nextPrimaryChecklist = nextChecklists[0];
    const shouldStoreArray = Array.isArray(todo.checklists) || nextChecklists.length !== 1;

    if (!shouldStoreArray && nextPrimaryChecklist) {
      return {
        checklist: nextPrimaryChecklist,
      };
    }

    if (!nextPrimaryChecklist) {
      return {
        checklists: nextChecklists,
      };
    }

    return {
      checklists: nextChecklists,
      checklist: nextPrimaryChecklist,
    };
  };

  const formatActionError = (actionName: string, actionError: unknown): string => {
    const errorCode =
      typeof actionError === 'object' && actionError !== null && 'code' in actionError
        ? String((actionError as { code?: unknown }).code)
        : null;
    const errorMessage =
      actionError instanceof Error
        ? actionError.message
        : typeof actionError === 'object' && actionError !== null && 'message' in actionError
          ? String((actionError as { message?: unknown }).message)
          : 'Unknown error';

    return errorCode
      ? `${actionName} failed (${errorCode}): ${errorMessage}`
      : `${actionName} failed: ${errorMessage}`;
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  useHotkey('escape', (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    event.preventDefault();
    onClose();
  }, { skipIfDefaultPrevented: true });

  const files = useMemo<TodoFile[]>(() => {
    if (!Array.isArray(todo.files)) return [];

    return todo.files
      .map((file) => ({
        ...file,
        uploadedAt: file.uploadedAt instanceof Date ? file.uploadedAt : new Date(file.uploadedAt),
      }))
      .filter((file) => typeof file.id === 'string' && typeof file.name === 'string' && typeof file.url === 'string');
  }, [todo.files]);

  const {
    comments,
    commentsLoading,
    commentsError,
    commentText,
    setCommentText,
    commentSubmitting,
    commentError,
    handleAddComment,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    commentActionSubmittingId,
    handleStartEditComment,
    handleCancelEditComment,
    handleSaveEditComment,
    handleDeleteComment,
  } = useTodoModalController({
    todo,
    userId,
    userEmail,
  });

  const {
    isEditing,
    setIsEditing,
    isEditingTitle,
    setIsEditingTitle,
    title,
    setTitle,
    description,
    setDescription,
    saving,
    error,
    handleSaveTitle,
    handleCancelEditTitle,
    handleSave,
    handleCancelEdit,
    handleDelete,
  } = useTodoModalEditor({
    todo,
    onClose,
    updateTodo,
    deleteTodo,
  });

  useHotkey('mod+s', (event) => {
    if (isEditingTitle) {
      event.preventDefault();
      event.stopPropagation();
      void handleSaveTitle();
      return;
    }

    if (isEditing) {
      event.preventDefault();
      event.stopPropagation();
      void handleSave();
    }
  }, { enabled: isEditingTitle || isEditing });

  const openFilePicker = () => {
    if (filesUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const oversizedNames = oversizedFiles.map((file) => file.name).join(', ');
      setFilesError(`Each file must be 5 MB or less. Too large: ${oversizedNames}`);
      event.target.value = '';
      return;
    }

    setFilesUploading(true);
    setFilesError('');

    try {
      const nextFiles: TodoFile[] = [];

      for (const file of selectedFiles) {
        const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const safeFileName = file.name.replace(/\s+/g, '_');
        const storagePath = `todos/${todo.id}/${randomPart}-${safeFileName}`;
        const fileRef = ref(storage, storagePath);

        await uploadBytes(fileRef, file, {
          contentType: file.type || undefined,
        });

        const url = await getDownloadURL(fileRef);

        nextFiles.push({
          id: randomPart,
          name: file.name,
          path: storagePath,
          url,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          uploadedBy: userId,
          uploadedAt: new Date(),
        });
      }

      try {
        await updateTodo(todo.id, {
          files: [...files, ...nextFiles],
        });
      } catch (metadataError) {
        const errorCode =
          typeof metadataError === 'object' && metadataError !== null && 'code' in metadataError
            ? String((metadataError as { code?: unknown }).code)
            : null;
        const errorMessage = metadataError instanceof Error ? metadataError.message : 'Unknown Firestore error';
        setFilesError(errorCode ? `Failed to save file metadata (${errorCode}): ${errorMessage}` : `Failed to save file metadata: ${errorMessage}`);
      }
    } catch (uploadError) {
      const errorCode =
        typeof uploadError === 'object' && uploadError !== null && 'code' in uploadError
          ? String((uploadError as { code?: unknown }).code)
          : null;
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown Storage error';
      setFilesError(errorCode ? `Failed to upload file (${errorCode}): ${errorMessage}` : `Failed to upload file: ${errorMessage}`);
    } finally {
      setFilesUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const targetFile = files.find((file) => file.id === fileId);
    if (!targetFile) return;

    setFilesError('');
    setDeletingFileIds((prev) => [...prev, fileId]);

    try {
      if (targetFile.path) {
        try {
          await deleteObject(ref(storage, targetFile.path));
        } catch (storageDeleteError) {
          const storageCode =
            typeof storageDeleteError === 'object' && storageDeleteError !== null && 'code' in storageDeleteError
              ? String((storageDeleteError as { code?: unknown }).code)
              : '';

          if (storageCode !== 'storage/object-not-found') {
            throw storageDeleteError;
          }
        }
      }

      await updateTodo(todo.id, {
        files: files.filter((file) => file.id !== fileId),
      });
    } catch (removeError) {
      const errorCode =
        typeof removeError === 'object' && removeError !== null && 'code' in removeError
          ? String((removeError as { code?: unknown }).code)
          : null;
      const errorMessage = removeError instanceof Error ? removeError.message : 'Unknown error';
      setFilesError(errorCode ? `Failed to delete file (${errorCode}): ${errorMessage}` : `Failed to delete file: ${errorMessage}`);
    } finally {
      setDeletingFileIds((prev) => prev.filter((id) => id !== fileId));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-slate-950/70 p-0 backdrop-blur-sm md:p-4"
      onClick={onClose}
      data-testid="todo-modal"
    >
      <div
        className="relative flex h-dvh w-full max-w-5xl flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl md:overflow-hidden lg:h-[80vh] lg:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        <IconButton
          variant="link"
          size="sm"
          className="absolute right-4 top-4 h-auto! w-auto! shrink-0 rounded-none! p-0! text-4xl"
          onClick={onClose}
          label="Close"
        >
          &times;
        </IconButton>
        <TodoModalDetailsPanel
          todo={todo}
          focusChecklistIndex={focusChecklistIndex}
          onChecklistAutoFocusHandled={() => setFocusChecklistIndex(null)}
          state={{
            files,
            filesUploading,
            deletingFileIds,
            filesError,
            isEditing,
            isEditingTitle,
            title,
            description,
            saving,
            error: error || quickActionError,
          }}
          actions={{
            onStartEdit: () => {
              setIsEditing(true);
              setIsEditingTitle(false);
            },
            onCancelEdit: handleCancelEdit,
            onSave: handleSave,
            onDelete: handleDelete,
            onArchive: async () => {
              await updateTodo(todo.id, { archived: true });
              onClose();
            },
            onBlock: async (reason) => {
              await updateTodo(todo.id, reason === null
                ? { blockedReason: deleteField() as unknown as Todo['blockedReason'] }
                : { blockedReason: reason });
            },
            onStartEditTitle: () => {
              setIsEditingTitle(true);
              setIsEditing(false);
            },
            onSaveTitle: handleSaveTitle,
            onCancelEditTitle: handleCancelEditTitle,
            onTitleChange: setTitle,
            onDescriptionChange: setDescription,
            onOpenFilePicker: openFilePicker,
            onDeleteFile: handleDeleteFile,
            onDeleteLink: async (linkIndex) => {
              const currentLinks = Array.isArray(todo.links) ? todo.links : [];
              await updateTodo(todo.id, {
                links: currentLinks.filter((_, index) => index !== linkIndex),
              });
            },
            onAddLink: async (link) => {
              const currentLinks = Array.isArray(todo.links) ? todo.links : [];
              const normalizedCurrentLinks = currentLinks
                .map((item) => {
                  const normalizedUrl = normalizeSafeUrl(item.url);
                  if (!normalizedUrl) return null;

                  const trimmedName = item.name?.trim();
                  return { url: normalizedUrl, name: trimmedName || normalizedUrl };
                })
                .filter((item): item is { url: string; name: string } => item !== null);

              const normalizedIncomingUrl = normalizeSafeUrl(link.url);
              if (!normalizedIncomingUrl) {
                throw new Error('Enter a valid http/https URL');
              }

              const trimmedName = link.name?.trim();
              const nextLink = { url: normalizedIncomingUrl, name: trimmedName || normalizedIncomingUrl };

              await updateTodo(todo.id, {
                links: [...normalizedCurrentLinks, nextLink],
              });
            },
            onCreateChecklist: async () => {
              const currentChecklists = getNormalizedChecklists();
              const newChecklistIndex = currentChecklists.length;
              const nextChecklists = [
                ...currentChecklists,
                {
                  title: DEFAULT_CHECKLIST_TITLE,
                  items: [
                    {
                      id: createChecklistItemId(),
                      title: '',
                      checked: false,
                    },
                  ],
                },
              ];

              setFocusChecklistIndex(newChecklistIndex);

              try {
                await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
              } catch (createChecklistError) {
                setFocusChecklistIndex(null);
                throw createChecklistError;
              }
            },
            onChecklistTitleChange: async (nextTitle, checklistIndex = 0) => {
              const currentChecklists = getNormalizedChecklists();
              const targetChecklist = currentChecklists[checklistIndex];
              if (!targetChecklist) return;

              const nextItems = sanitizeChecklistItemsForPersist(targetChecklist.items);

              const nextChecklists = currentChecklists.map((checklist, index) => (
                index === checklistIndex
                  ? {
                    ...targetChecklist,
                    title: nextTitle.trim() || DEFAULT_CHECKLIST_TITLE,
                    items: nextItems,
                  }
                  : checklist
              ));

              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onChecklistAddItem: async (checklistIndex = 0) => {
              const currentChecklists = getNormalizedChecklists();
              const targetChecklist = currentChecklists[checklistIndex];
              if (!targetChecklist) return;

              const nextChecklists = currentChecklists.map((checklist, index) => (
                index === checklistIndex
                  ? {
                    ...targetChecklist,
                    items: [
                      ...targetChecklist.items,
                      {
                        id: createChecklistItemId(),
                        title: '',
                        checked: false,
                      },
                    ],
                  }
                  : checklist
              ));

              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onChecklistItemChange: async (itemId, updates, checklistIndex = 0) => {
              const currentChecklists = getNormalizedChecklists();
              const targetChecklist = currentChecklists[checklistIndex];
              if (!targetChecklist) return;

              const nextChecklists = currentChecklists.map((checklist, index) => {
                if (index !== checklistIndex) return checklist;

                return {
                  ...targetChecklist,
                  items: targetChecklist.items.map((item) => {
                    if (item.id !== itemId) return item;

                    return {
                      ...item,
                      ...(updates.title != null ? { title: updates.title.trim() } : {}),
                      ...(updates.checked != null ? { checked: updates.checked } : {}),
                    };
                  }),
                };
              });

              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onChecklistItemSaveAndAddNext: async (itemId, title, checklistIndex = 0) => {
              const currentChecklists = getNormalizedChecklists();
              const targetChecklist = currentChecklists[checklistIndex];
              if (!targetChecklist) return;

              const nextChecklists = currentChecklists.map((checklist, index) => {
                if (index !== checklistIndex) return checklist;

                const nextItems = targetChecklist.items.flatMap((item) => {
                  if (item.id !== itemId) return [item];

                  return [
                    {
                      ...item,
                      title: title.trim(),
                    },
                    {
                      id: createChecklistItemId(),
                      title: '',
                      checked: false,
                    },
                  ];
                });

                return {
                  ...targetChecklist,
                  items: nextItems,
                };
              });

              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onChecklistPasteItems: async (itemId, itemTitles, checklistIndex = 0) => {
              const normalizedTitles = itemTitles
                .map((title) => title.trim())
                .filter((title) => title.length > 0);
              if (normalizedTitles.length === 0) return;

              const currentChecklists = getNormalizedChecklists();
              const targetChecklist = currentChecklists[checklistIndex];
              if (!targetChecklist) return;

              const targetIndex = targetChecklist.items.findIndex((item) => item.id === itemId);
              if (targetIndex < 0) return;

              const [firstTitle, ...restTitles] = normalizedTitles;
              const nextItems = targetChecklist.items.flatMap((item, index) => {
                if (index !== targetIndex) {
                  return [item];
                }

                const appendedItems = restTitles.map((title) => ({
                  id: createChecklistItemId(),
                  title,
                  checked: false,
                }));

                return [{ ...item, title: firstTitle }, ...appendedItems];
              });

              const nextChecklists = currentChecklists.map((checklist, index) => (
                index === checklistIndex
                  ? {
                    ...targetChecklist,
                    items: nextItems,
                  }
                  : checklist
              ));

              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onChecklistDeleteItem: async (itemId, checklistIndex = 0) => {
              const currentChecklists = getNormalizedChecklists();
              const targetChecklist = currentChecklists[checklistIndex];
              if (!targetChecklist) return;

              const nextChecklists = currentChecklists.map((checklist, index) => (
                index === checklistIndex
                  ? {
                    ...targetChecklist,
                    items: targetChecklist.items.filter((item) => item.id !== itemId),
                  }
                  : checklist
              ));

              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onChecklistDelete: async (checklistIndex = 0) => {
              const currentChecklists = getNormalizedChecklists();
              if (!currentChecklists[checklistIndex]) return;

              const nextChecklists = currentChecklists.filter((_, index) => index !== checklistIndex);
              await updateTodo(todo.id, buildChecklistUpdates(nextChecklists));
            },
            onDueDateChange: async (dueDate) => {
              const nextRemindOneDayBefore = dueDate ? (todo.remindOneDayBefore ?? false) : false;
              const isCompleted = todo.isCompleted ?? todo.status === 'done';
              const completedAt = todo.completedAt ?? null;
              const reminderScheduledAt = resolveReminderScheduledAt(
                {
                  ...todo,
                  dueDate,
                  remindOneDayBefore: nextRemindOneDayBefore,
                  isCompleted,
                  completedAt,
                },
                new Date()
              );

              await updateTodo(todo.id, {
                dueDate,
                remindOneDayBefore: nextRemindOneDayBefore,
                reminderScheduledAt,
              });
            },
            onRemindOneDayBeforeChange: async (enabled) => {
              if (!todo.dueDate) {
                await updateTodo(todo.id, {
                  remindOneDayBefore: false,
                  reminderScheduledAt: null,
                });
                return;
              }

              const isCompleted = todo.isCompleted ?? todo.status === 'done';
              const completedAt = todo.completedAt ?? null;
              const reminderScheduledAt = resolveReminderScheduledAt(
                {
                  ...todo,
                  remindOneDayBefore: enabled,
                  isCompleted,
                  completedAt,
                },
                new Date()
              );

              await updateTodo(todo.id, {
                remindOneDayBefore: enabled,
                reminderScheduledAt,
              });
            },
            onMoveToNextStatus: async (todoId, nextColumnId) => {
              try {
                setQuickActionError('');
                const nextColumn = (columns ?? []).find((column) => column.id === nextColumnId);
                if (nextColumn?.isDone && todo.blockedReason?.trim()) {
                  return;
                }
                if (nextColumn?.isDone && hasIncompleteChecklistItems(todo)) {
                  setQuickActionError(getIncompleteChecklistMoveErrorMessage(todo, nextColumn.name));
                  return;
                }
                const isCompleted = Boolean(nextColumn?.isDone);
                const completedAt = isCompleted ? new Date().toISOString() : null;
                const reminderScheduledAt = resolveReminderScheduledAt(
                  {
                    ...todo,
                    status: nextColumnId,
                    isCompleted,
                    completedAt,
                  },
                  new Date()
                );

                await updateTodo(todoId, {
                  columnId: nextColumnId,
                  status: nextColumnId,
                  isCompleted,
                  completedAt,
                  reminderScheduledAt,
                });
              } catch (moveError) {
                setQuickActionError(formatActionError('Failed to move card', moveError));
              }
            },
          }}
          columns={columns}
        />

        <TodoModalCommentsPanel
          state={{
            currentUserId: userId,
            comments,
            commentsLoading,
            commentsError,
            commentText,
            commentSubmitting,
            editingCommentId,
            editingCommentText,
            commentActionSubmittingId,
            commentError,
          }}
          actions={{
            onCommentTextChange: setCommentText,
            onSubmit: handleAddComment,
            onStartEditComment: handleStartEditComment,
            onCancelEditComment: handleCancelEditComment,
            onEditCommentTextChange: setEditingCommentText,
            onSaveEditComment: handleSaveEditComment,
            onDeleteComment: handleDeleteComment,
          }}
        />

        <Input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          data-testid="todo-file-input"
        />
      </div>
    </div>
  );
};
