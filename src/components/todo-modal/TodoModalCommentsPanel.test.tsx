import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '../../types/comment';
import { TodoModalCommentsPanel } from './TodoModalCommentsPanel';

const baseProps = {
  currentUserId: 'user-1',
  comments: [] as Comment[],
  commentsLoading: false,
  commentsError: null as string | null,
  commentText: '',
  commentSubmitting: false,
  editingCommentId: null as string | null,
  editingCommentText: '',
  commentActionSubmittingId: null as string | null,
  commentError: '',
  onCommentTextChange: vi.fn(),
  onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
  onStartEditComment: vi.fn(),
  onCancelEditComment: vi.fn(),
  onEditCommentTextChange: vi.fn(),
  onSaveEditComment: vi.fn(),
  onDeleteComment: vi.fn(),
};

describe('TodoModalCommentsPanel', () => {
  it('renders empty, loading, and error states', () => {
    const { rerender } = render(<TodoModalCommentsPanel {...baseProps} commentsLoading />);
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();

    rerender(<TodoModalCommentsPanel {...baseProps} commentsLoading={false} commentsError="No access" />);
    expect(screen.getByText('No access')).toBeInTheDocument();

    rerender(<TodoModalCommentsPanel {...baseProps} commentsLoading={false} commentsError={null} />);
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('linkifies urls in rendered comments', () => {
    render(
      <TodoModalCommentsPanel
        {...baseProps}
        comments={[
          {
            id: 'c-1',
            todoId: 'todo-1',
            userId: 'user-1',
            userEmail: 'user@example.com',
            text: 'See https://example.com/docs for details',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('disables sending blank or submitting comments and forwards form changes', () => {
    const onCommentTextChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    const { rerender } = render(
      <TodoModalCommentsPanel
        {...baseProps}
        onCommentTextChange={onCommentTextChange}
        onSubmit={onSubmit}
      />,
    );

    const submitButton = screen.getByRole('button', { name: 'Send' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Add a comment...'), { target: { value: 'Hello' } });
    expect(onCommentTextChange).toHaveBeenCalledWith('Hello');

    rerender(
      <TodoModalCommentsPanel
        {...baseProps}
        commentText="Hello"
        commentSubmitting
        onCommentTextChange={onCommentTextChange}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('shows edit/delete for own comments and triggers handlers', () => {
    const onStartEditComment = vi.fn();
    const onDeleteComment = vi.fn();

    render(
      <TodoModalCommentsPanel
        {...baseProps}
        currentUserId="user-1"
        onStartEditComment={onStartEditComment}
        onDeleteComment={onDeleteComment}
        comments={[
          {
            id: 'c-1',
            todoId: 'todo-1',
            userId: 'user-1',
            userEmail: 'user@example.com',
            text: 'mine',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
          {
            id: 'c-2',
            todoId: 'todo-1',
            userId: 'user-2',
            userEmail: 'other@example.com',
            text: 'other',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]}
      />,
    );

    const editButton = screen.getByTestId('comment-edit-c-1');
    const deleteButton = screen.getByTestId('comment-delete-c-1');

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
    expect(screen.queryByTestId('comment-edit-c-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comment-delete-c-2')).not.toBeInTheDocument();

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(onStartEditComment).toHaveBeenCalledWith('c-1', 'mine');
    expect(onDeleteComment).toHaveBeenCalledWith('c-1');
  });

  it('renders inline comment edit mode and forwards save/cancel actions', () => {
    const onEditCommentTextChange = vi.fn();
    const onSaveEditComment = vi.fn();
    const onCancelEditComment = vi.fn();

    render(
      <TodoModalCommentsPanel
        {...baseProps}
        comments={[
          {
            id: 'c-1',
            todoId: 'todo-1',
            userId: 'user-1',
            userEmail: 'user@example.com',
            text: 'mine',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]}
        editingCommentId="c-1"
        editingCommentText="updated"
        onEditCommentTextChange={onEditCommentTextChange}
        onSaveEditComment={onSaveEditComment}
        onCancelEditComment={onCancelEditComment}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('updated'), { target: { value: 'updated again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onEditCommentTextChange).toHaveBeenCalledWith('updated again');
    expect(onSaveEditComment).toHaveBeenCalledTimes(1);
    expect(onCancelEditComment).toHaveBeenCalledTimes(1);
  });
});
