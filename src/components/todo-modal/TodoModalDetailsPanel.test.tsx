import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../types/todo';
import { TodoModalDetailsPanel } from './TodoModalDetailsPanel';

const todo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Card title',
  description: '<p>Saved description</p>',
  status: 'todo',
  boardId: 'board-1',
  columnId: 'in_progress',
  weight: 1000,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T12:00:00Z'),
};

const createProps = () => ({
  todo,
  isEditing: false,
  isEditingTitle: false,
  title: 'Card title',
  description: '<p>Saved description</p>',
  saving: false,
  error: '',
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onStartEditTitle: vi.fn(),
  onSaveTitle: vi.fn(),
  onCancelEditTitle: vi.fn(),
  onTitleChange: vi.fn(),
  onDescriptionChange: vi.fn(),
});

describe('TodoModalDetailsPanel', () => {
  it('renders readonly metadata and description actions', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} />);

    expect(screen.getByText('Card title')).toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toHaveTextContent('in progress');
    expect(screen.getByRole('button', { name: 'Edit title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit description' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete card' })).toBeInTheDocument();
  });

  it('hides description output when description is empty', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} description="" />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.queryByText('Saved description')).not.toBeInTheDocument();
  });

  it('renders editing footer and forwards save/cancel actions', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} isEditing error="Save failed" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(props.onCancelEdit).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('handles title editing keyboard and button actions', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} isEditingTitle title="Draft title" />);

    const input = screen.getByDisplayValue('Draft title');
    fireEvent.change(input, { target: { value: 'Updated title' } });
    expect(props.onTitleChange).toHaveBeenCalledWith('Updated title');

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Save title' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel title edit' }));

    expect(props.onSaveTitle).toHaveBeenCalledTimes(2);
    expect(props.onCancelEditTitle).toHaveBeenCalledTimes(2);
  });

  it('shows readonly error outside edit mode', () => {
    const props = createProps();

    render(<TodoModalDetailsPanel {...props} error="Delete failed" />);

    expect(screen.getByText('Delete failed')).toBeInTheDocument();
  });
});