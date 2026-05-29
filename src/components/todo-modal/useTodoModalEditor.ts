import { useState } from 'react';
import type { Todo } from '../../types/todo';
import { isRichTextEmpty, sanitizeRichTextHtml } from './richText';

interface UseTodoModalEditorArgs {
  todo: Todo;
  onClose: () => void;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoModalEditor = ({ todo, onClose, updateTodo, deleteTodo }: UseTodoModalEditorArgs) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSaveTitle = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateTodo(todo.id, { title: normalizedTitle });
      setIsEditingTitle(false);
    } catch {
      setError('Failed to save title');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEditTitle = () => {
    setTitle(todo.title);
    setIsEditingTitle(false);
    setError('');
  };

  const handleSave = async () => {
    const normalizedTitle = title.trim();
    const sanitizedDescription = sanitizeRichTextHtml(description);
    const normalizedDescription = isRichTextEmpty(sanitizedDescription) ? '' : sanitizedDescription;

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

  const handleCancelEdit = () => {
    setTitle(todo.title);
    setDescription(todo.description ?? '');
    setIsEditing(false);
    setError('');
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
  };
};
