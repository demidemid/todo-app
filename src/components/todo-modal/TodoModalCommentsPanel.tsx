import type { FormEvent, ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Comment } from '../../types/comment';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Textarea } from '../ui/Textarea';

const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline hover:text-blue-300 break-all"
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

interface TodoModalCommentsPanelProps {
  state?: {
    currentUserId: string;
    comments: Comment[];
    commentsLoading: boolean;
    commentsError: string | null;
    commentText: string;
    commentSubmitting: boolean;
    editingCommentId: string | null;
    editingCommentText: string;
    commentActionSubmittingId: string | null;
    commentError: string;
  };
  actions?: {
    onCommentTextChange: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    onStartEditComment: (commentId: string, text: string) => void;
    onCancelEditComment: () => void;
    onEditCommentTextChange: (value: string) => void;
    onSaveEditComment: () => void;
    onDeleteComment: (commentId: string) => void;
  };
  currentUserId?: string;
  comments?: Comment[];
  commentsLoading?: boolean;
  commentsError?: string | null;
  commentText?: string;
  commentSubmitting?: boolean;
  editingCommentId?: string | null;
  editingCommentText?: string;
  commentActionSubmittingId?: string | null;
  commentError?: string;
  onCommentTextChange?: (value: string) => void;
  onSubmit?: (event: FormEvent) => void;
  onStartEditComment?: (commentId: string, text: string) => void;
  onCancelEditComment?: () => void;
  onEditCommentTextChange?: (value: string) => void;
  onSaveEditComment?: () => void;
  onDeleteComment?: (commentId: string) => void;
}

export const TodoModalCommentsPanel = ({
  state,
  actions,
  currentUserId: legacyCurrentUserId,
  comments: legacyComments,
  commentsLoading: legacyCommentsLoading,
  commentsError: legacyCommentsError,
  commentText: legacyCommentText,
  commentSubmitting: legacyCommentSubmitting,
  editingCommentId: legacyEditingCommentId,
  editingCommentText: legacyEditingCommentText,
  commentActionSubmittingId: legacyCommentActionSubmittingId,
  commentError: legacyCommentError,
  onCommentTextChange: legacyOnCommentTextChange,
  onSubmit: legacyOnSubmit,
  onStartEditComment: legacyOnStartEditComment,
  onCancelEditComment: legacyOnCancelEditComment,
  onEditCommentTextChange: legacyOnEditCommentTextChange,
  onSaveEditComment: legacyOnSaveEditComment,
  onDeleteComment: legacyOnDeleteComment,
}: TodoModalCommentsPanelProps) => {
  const resolvedState = state ?? {
    currentUserId: legacyCurrentUserId ?? '',
    comments: legacyComments ?? [],
    commentsLoading: legacyCommentsLoading ?? false,
    commentsError: legacyCommentsError ?? null,
    commentText: legacyCommentText ?? '',
    commentSubmitting: legacyCommentSubmitting ?? false,
    editingCommentId: legacyEditingCommentId ?? null,
    editingCommentText: legacyEditingCommentText ?? '',
    commentActionSubmittingId: legacyCommentActionSubmittingId ?? null,
    commentError: legacyCommentError ?? '',
  };

  const resolvedActions = actions ?? {
    onCommentTextChange: legacyOnCommentTextChange ?? (() => {}),
    onSubmit: legacyOnSubmit ?? (() => {}),
    onStartEditComment: legacyOnStartEditComment ?? (() => {}),
    onCancelEditComment: legacyOnCancelEditComment ?? (() => {}),
    onEditCommentTextChange: legacyOnEditCommentTextChange ?? (() => {}),
    onSaveEditComment: legacyOnSaveEditComment ?? (() => {}),
    onDeleteComment: legacyOnDeleteComment ?? (() => {}),
  };

  const {
    currentUserId,
    comments,
    commentsLoading,
    commentsError,
    commentText,
    commentSubmitting,
    editingCommentId,
    editingCommentText,
    commentActionSubmittingId,
    commentError,
  } = resolvedState;

  const {
    onCommentTextChange,
    onSubmit,
    onStartEditComment,
    onCancelEditComment,
    onEditCommentTextChange,
    onSaveEditComment,
    onDeleteComment,
  } = resolvedActions;

  return (
    <div className="mt-4 w-full shrink-0 overflow-visible border-t border-white/10 pt-4 pr-1 md:min-h-0 md:overflow-y-auto lg:mt-0 lg:w-80 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
      <h3 className="mb-3 text-base font-semibold text-slate-200">Comments</h3>
      <form onSubmit={onSubmit} className="mb-4 flex flex-col gap-2">
        <Textarea
          value={commentText}
          onChange={(event) => onCommentTextChange(event.target.value)}
          placeholder="Add a comment..."
          rows={4}
          className="flex-1 resize-none"
          disabled={commentSubmitting}
          maxLength={500}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={commentSubmitting || !commentText.trim()}>
            Send
          </Button>
        </div>
      </form>
      {commentError && <div className="mb-2 text-sm text-rose-300">{commentError}</div>}
      {commentsLoading ? (
        <div className="text-xs text-slate-400">Loading comments...</div>
      ) : commentsError ? (
        <div className="text-xs text-rose-300">{commentsError}</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-slate-400">No comments yet.</div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg bg-slate-800/60 px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-300">{comment.userEmail ?? comment.userId}</div>
                {comment.userId === currentUserId && editingCommentId !== comment.id && (
                  <div className="flex items-center gap-1">
                    <IconButton
                      variant="link"
                      size="sm"
                      label="Edit comment"
                      onClick={() => onStartEditComment(comment.id, comment.text)}
                      disabled={commentActionSubmittingId === comment.id}
                      data-testid={`comment-edit-${comment.id}`}
                      className="h-6 w-6 p-0"
                    >
                      <Pencil size={12} />
                    </IconButton>
                    <IconButton
                      variant="link"
                      size="sm"
                      label="Delete comment"
                      onClick={() => onDeleteComment(comment.id)}
                      disabled={commentActionSubmittingId === comment.id}
                      data-testid={`comment-delete-${comment.id}`}
                      className="h-6 w-6 p-0 text-rose-300 hover:text-rose-200"
                    >
                      <X size={12} />
                    </IconButton>
                  </div>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingCommentText}
                    onChange={(event) => onEditCommentTextChange(event.target.value)}
                    rows={3}
                    className="resize-none"
                    disabled={commentActionSubmittingId === comment.id}
                    maxLength={500}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={onCancelEditComment}
                      disabled={commentActionSubmittingId === comment.id}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={onSaveEditComment}
                      disabled={commentActionSubmittingId === comment.id || !editingCommentText.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap text-slate-100">{linkifyText(comment.text)}</div>
              )}
              <div className="mt-1 text-[11px] text-slate-400">
                {comment.createdAt instanceof Date ? comment.createdAt.toLocaleString() : String(comment.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
