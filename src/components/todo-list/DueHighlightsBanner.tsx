import type { Todo } from '../../types/todo';

export interface DueHighlightEntry {
  todo: Todo;
  dashboardName: string;
  dueText: string;
  dueState: 'overdue' | 'due_today' | 'due_tomorrow';
}

interface DueHighlightsBannerProps {
  entries: DueHighlightEntry[];
  onOpenTodoByLink: (todoId: string, dashboardId: string) => void;
}

export const DueHighlightsBanner = ({ entries, onOpenTodoByLink }: DueHighlightsBannerProps) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100"
      data-testid="due-highlights-banner"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200/90">Due Alerts</p>
      <ul className="space-y-1.5">
        {entries.map(({ todo, dashboardName, dueText, dueState }) => (
          <li
            key={todo.id}
            className={dueState === 'overdue' ? 'rounded-md bg-rose-500/20 px-2 py-1 text-rose-100' : undefined}
            data-testid={`due-highlight-${todo.id}`}
          >
            <button
              type="button"
              className={dueState === 'overdue'
                ? 'mr-1 underline decoration-rose-200/70 underline-offset-2 hover:text-rose-50'
                : 'mr-1 underline decoration-amber-200/70 underline-offset-2 hover:text-amber-50'}
              onClick={() => onOpenTodoByLink(todo.id, todo.boardId)}
              data-testid={`due-highlight-link-${todo.id}`}
            >
              {todo.title}
            </button>
            <span>in dashboard </span>
            <span className={dueState === 'overdue' ? 'font-semibold text-rose-50' : 'font-semibold text-amber-50'}>{dashboardName}</span>
            <span> {dueText}.</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
