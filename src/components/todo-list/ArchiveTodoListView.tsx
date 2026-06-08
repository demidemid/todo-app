import { RotateCcw, Trash2 } from 'lucide-react';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { isHotkeyPressed } from '../../hooks/useHotkey';
import { EllipsisMenu } from '../ui/EllipsisMenu';
import { getEllipsisMenuItemClassName } from '../ui/ellipsisMenuStyles';

interface ArchiveTodoListViewProps {
  archivedTodos: Todo[];
  dashboardsById: Map<string, Dashboard>;
  onOpenTodoByLink: (todoId: string, dashboardId: string) => void;
  onUnarchiveTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
}

export const ArchiveTodoListView = ({
  archivedTodos,
  dashboardsById,
  onOpenTodoByLink,
  onUnarchiveTodo,
  onDeleteTodo,
}: ArchiveTodoListViewProps) => {
  return (
    <section className="space-y-4" data-testid="archive-view">
      {archivedTodos.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
          Archive is empty.
        </div>
      ) : (
        <div className="space-y-2">
          {archivedTodos.map((todo) => (
            <article
              key={todo.id}
              onClick={() => onOpenTodoByLink(todo.id, todo.boardId)}
              onKeyDown={(event) => {
                if (isHotkeyPressed('enter', event) || isHotkeyPressed('space', event)) {
                  event.preventDefault();
                  onOpenTodoByLink(todo.id, todo.boardId);
                }
              }}
              role="button"
              tabIndex={0}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-cyan-300/40 hover:bg-slate-900"
              data-testid={`archive-card-${todo.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-100">{todo.title}</p>
                <EllipsisMenu
                  trigger={{
                    label: 'Open archive card actions',
                    testId: `archive-menu-trigger-${todo.id}`,
                  }}
                  menu={{
                    testId: `archive-menu-${todo.id}`,
                    className: 'w-40',
                  }}
                  stopPropagation
                  menuContent={({ closeMenu }) => (
                    <>
                      <button
                        type="button"
                        className={getEllipsisMenuItemClassName({ tone: 'default', isFirst: true })}
                        data-testid={`archive-menu-unarchive-${todo.id}`}
                        role="menuitem"
                        onClick={() => {
                          closeMenu();
                          onUnarchiveTodo(todo.id);
                        }}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        Return to board
                      </button>
                      <button
                        type="button"
                        className={getEllipsisMenuItemClassName({ tone: 'danger', isLast: true })}
                        data-testid={`archive-menu-delete-${todo.id}`}
                        role="menuitem"
                        onClick={() => {
                          closeMenu();
                          onDeleteTodo(todo.id);
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Delete
                      </button>
                    </>
                  )}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <p className="text-slate-400">Updated {todo.updatedAt.toLocaleString()}</p>
                <p className="truncate font-semibold uppercase tracking-wide text-cyan-200">
                  {dashboardsById.get(todo.boardId)?.name ?? 'Unknown dashboard'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
