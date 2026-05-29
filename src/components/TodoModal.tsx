import React from 'react';
import type { Todo } from '../types/todo';
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
}

export const TodoModal: React.FC<TodoModalProps> = ({ todo, userId, userEmail, onClose, updateTodo, deleteTodo }) => {
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
      </div>
    </div>
  );
};
