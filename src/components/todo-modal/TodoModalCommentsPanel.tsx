import type { FormEvent } from 'react';
import type { Comment } from '../../types/comment';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface TodoModalCommentsPanelProps {
  comments: Comment[];
  commentsLoading: boolean;
  commentsError: string | null;
  commentText: string;
  commentSubmitting: boolean;
  commentError: string;
  onCommentTextChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export const TodoModalCommentsPanel = ({
  comments,
  commentsLoading,
  commentsError,
  commentText,
  commentSubmitting,
  commentError,
  onCommentTextChange,
  onSubmit,
}: TodoModalCommentsPanelProps) => {
  return (
    <div className="w-full shrink-0 border-l border-white/10 pl-0 mt-8 md:mt-0 md:w-80 md:pl-6">
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
              <div className="mb-1 text-xs text-slate-300">{comment.userEmail ?? comment.userId}</div>
              <div className="text-sm whitespace-pre-line text-slate-100">{comment.text}</div>
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
