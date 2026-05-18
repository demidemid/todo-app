import React from 'react';
import type { Todo } from '../types/todo';

interface TodoModalProps {
  todo: Todo;
  onClose: () => void;
}

export const TodoModal: React.FC<TodoModalProps> = ({ todo, onClose }) => {
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
        <h2 className="mb-2 text-xl font-bold text-white">{todo.title}</h2>
        {todo.description && (
          <p className="mb-4 text-slate-200 whitespace-pre-line">{todo.description}</p>
        )}
        <div className="flex flex-col gap-2 text-xs text-slate-400">
          <span>Status: <b className="text-slate-200">{todo.status.replace('_', ' ')}</b></span>
          <span>Created: {todo.createdAt instanceof Date ? todo.createdAt.toLocaleString() : String(todo.createdAt)}</span>
          <span>Updated: {todo.updatedAt instanceof Date ? todo.updatedAt.toLocaleString() : String(todo.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
