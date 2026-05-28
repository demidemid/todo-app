import { useState } from 'react';
import type { Todo } from '../../types/todo';

interface UseTodoModalEditorArgs {
  todo: Todo;
  onClose: () => void;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoModalEditor = ({ todo, onClose, updateTodo, deleteTodo }: UseTodoModalEditorArgs) => {
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

  return {
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
  };
};
