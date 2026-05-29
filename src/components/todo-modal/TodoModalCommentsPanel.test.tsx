import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '../../types/comment';
import { TodoModalCommentsPanel } from './TodoModalCommentsPanel';

const baseProps = {
  comments: [] as Comment[],
  commentsLoading: false,
  commentsError: null as string | null,
  commentText: '',
  commentSubmitting: false,
  commentError: '',
  onCommentTextChange: vi.fn(),
  onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
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
});
