import React from 'react';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { Todo } from '../types/todo';
import type { TodoFile } from '../types/todo';
import { storage } from '../firebase';
import { TodoModalCommentsPanel } from './todo-modal/TodoModalCommentsPanel';
import { TodoModalDetailsPanel } from './todo-modal/TodoModalDetailsPanel';
import { useTodoModalEditor } from './todo-modal/useTodoModalEditor';
import { useTodoModalController } from './todo-modal/useTodoModalController';
import { IconButton } from './ui/IconButton';

interface TodoModalProps {
  todo: Todo;
  userId: string;
  userEmail?: string;
  onClose: () => void;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  columns?: { id: string; name: string }[];
}

export const TodoModal: React.FC<TodoModalProps> = ({ todo, userId, userEmail, onClose, updateTodo, deleteTodo, columns }) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [filesUploading, setFilesUploading] = React.useState(false);
  const [deletingFileIds, setDeletingFileIds] = React.useState<string[]>([]);
  const [filesError, setFilesError] = React.useState('');

  const files = React.useMemo<TodoFile[]>(() => {
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

  const handleSaveShortcut = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;

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
  };

  const openFilePicker = () => {
    if (filesUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

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
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="todo-modal"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col gap-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl md:flex-row"
        onClick={(event) => event.stopPropagation()}
        onKeyDownCapture={handleSaveShortcut}
      >
        <IconButton
          variant="neutral"
          size="lg"
          className="absolute right-4 top-4 size-8 shrink-0 rounded-full"
          onClick={onClose}
          label="Close"
        >
          &times;
        </IconButton>
        <TodoModalDetailsPanel
          todo={todo}
          files={files}
          filesUploading={filesUploading}
          deletingFileIds={deletingFileIds}
          filesError={filesError}
          isEditing={isEditing}
          isEditingTitle={isEditingTitle}
          title={title}
          description={description}
          saving={saving}
          error={error}
          onStartEdit={() => {
            setIsEditing(true);
            setIsEditingTitle(false);
          }}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          onDelete={handleDelete}
          onStartEditTitle={() => {
            setIsEditingTitle(true);
            setIsEditing(false);
          }}
          onSaveTitle={handleSaveTitle}
          onCancelEditTitle={handleCancelEditTitle}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onOpenFilePicker={openFilePicker}
          onDeleteFile={handleDeleteFile}
          onDeleteLink={async (linkIndex) => {
            const currentLinks = Array.isArray(todo.links) ? todo.links : [];
            await updateTodo(todo.id, {
              links: currentLinks.filter((_, index) => index !== linkIndex),
            });
          }}
          onAddLink={async (link) => {
            const currentLinks = Array.isArray(todo.links) ? todo.links : [];
            const normalizedCurrentLinks = currentLinks.map((item) => {
              const trimmedName = item.name?.trim();
              return { url: item.url, name: trimmedName || item.url };
            });
            const trimmedName = link.name?.trim();
            const nextLink = { url: link.url, name: trimmedName || link.url };
            await updateTodo(todo.id, {
              links: [...normalizedCurrentLinks, nextLink],
            });
          }}
          columns={columns}
          onMoveToNextStatus={async (todoId, nextColumnId) => {
            await updateTodo(todoId, { columnId: nextColumnId, status: nextColumnId });
          }}
        />

        <TodoModalCommentsPanel
          comments={comments}
          commentsLoading={commentsLoading}
          commentsError={commentsError}
          commentText={commentText}
          commentSubmitting={commentSubmitting}
          commentError={commentError}
          onCommentTextChange={setCommentText}
          onSubmit={handleAddComment}
        />

        <input
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
