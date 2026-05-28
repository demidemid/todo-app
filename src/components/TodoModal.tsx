import React from 'react';
import type { Todo } from '../types/todo';
import { TodoModalCommentsPanel } from './todo-modal/TodoModalCommentsPanel';
import { TodoModalDetailsPanel } from './todo-modal/TodoModalDetailsPanel';
import { useTodoModalEditor } from './todo-modal/useTodoModalEditor';
import { useTodoModalController } from './todo-modal/useTodoModalController';

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
    title,
    setTitle,
    description,
    setDescription,
    saving,
    error,
    handleSave,
    handleDelete,
  } = useTodoModalEditor({
    todo,
    onClose,
    updateTodo,
    deleteTodo,
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      data-testid="todo-modal"
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative flex flex-col md:flex-row gap-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <TodoModalDetailsPanel
          todo={todo}
          isEditing={isEditing}
          title={title}
          description={description}
          saving={saving}
          error={error}
          onStartEdit={() => setIsEditing(true)}
          onCancelEdit={() => setIsEditing(false)}
          onSave={handleSave}
          onDelete={handleDelete}
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
