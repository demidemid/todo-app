import type React from 'react';
import { CardMenu } from '../CardMenu';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface DashboardSectionProps {
  dashboard: Dashboard;
  isExpanded: boolean;
  dashboardsLength: number;
  columns: DashboardColumn[];
  groupedTodos: Record<string, Todo[]>;
  editingTodoId: string | null;
  editingTitle: string;
  editingDescription: string;
  menuOpenId: string | null;
  menuButtonRefs: React.RefObject<Record<string, HTMLButtonElement | null>>;
  dragState: DragState | null;
  dropTarget: DropTarget | null;
  onToggle: (dashboardId: string) => void;
  onOpenEditDashboard: (dashboardId: string) => void;
  onDeleteDashboard: (dashboardId: string, dashboardName: string) => void;
  onOpenCreateCard: (dashboardId: string, columnId: string) => void;
  onMoveTodo: (todoId: string, targetColumnId: string, targetIndex: number) => void;
  onSetDragState: (state: DragState | null) => void;
  onSetDropTarget: (state: DropTarget | null) => void;
  onOpenTodoModal: (todo: Todo) => void;
  onCancelEdit: () => void;
  onSaveEdit: (todoId: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, todoId: string) => void;
  onToggleMenu: (todoId: string) => void;
  onCloseMenu: () => void;
  onMenuEdit: (todo: Todo) => void;
  onMenuDelete: (todoId: string) => void;
}

export const DashboardSection = ({
  dashboard,
  isExpanded,
  dashboardsLength,
  columns,
  groupedTodos,
  editingTodoId,
  editingTitle,
  editingDescription,
  menuOpenId,
  menuButtonRefs,
  dragState,
  dropTarget,
  onToggle,
  onOpenEditDashboard,
  onDeleteDashboard,
  onOpenCreateCard,
  onMoveTodo,
  onSetDragState,
  onSetDropTarget,
  onOpenTodoModal,
  onCancelEdit,
  onSaveEdit,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditKeyDown,
  onToggleMenu,
  onCloseMenu,
  onMenuEdit,
  onMenuDelete,
}: DashboardSectionProps) => {
  return (
    <section
      key={dashboard.id}
      className="rounded-xl border border-white/10 bg-slate-900/50"
      data-testid={`dashboard-${dashboard.id}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-100">{dashboard.name}</span>

          <IconButton
            variant="neutral"
            onClick={() => onOpenEditDashboard(dashboard.id)}
            data-testid={`edit-dashboard-button-${dashboard.id}`}
            label={`Edit dashboard ${dashboard.name}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </IconButton>

          <IconButton
            variant="danger"
            onClick={() => onDeleteDashboard(dashboard.id, dashboard.name)}
            data-testid={`delete-dashboard-button-${dashboard.id}`}
            label={`Delete dashboard ${dashboard.name}`}
            disabled={dashboardsLength <= 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 3h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </IconButton>
        </div>

        <IconButton
          variant="neutral"
          onClick={() => onToggle(dashboard.id)}
          data-testid={`dashboard-toggle-${dashboard.id}`}
          label={isExpanded ? 'Collapse dashboard' : 'Expand dashboard'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            {!isExpanded && <path d="M12 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
          </svg>
        </IconButton>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 p-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
          >
            {columns.map((column) => {
              const columnTodos = groupedTodos[column.id] ?? [];

              return (
                <section
                  key={column.id}
                  data-testid={`column-${column.id}`}
                  className="rounded-xl border border-white/10 bg-slate-800/50 p-3"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (!dragState) return;

                    void onMoveTodo(dragState.todoId, column.id, columnTodos.length);
                    onSetDragState(null);
                    onSetDropTarget(null);
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{column.name}</h3>
                      <IconButton
                        variant="primary"
                        onClick={() => onOpenCreateCard(dashboard.id, column.id)}
                        data-testid={`new-card-button-${dashboard.id}-${column.id}`}
                        label={`Add card to ${column.name}`}
                        size="sm"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          <path d="M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </IconButton>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                      {columnTodos.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {columnTodos.map((todo, index) => (
                      <div key={todo.id}>
                        <div
                          data-testid={`drop-${column.id}-${index}`}
                          className={`h-2 rounded border border-dashed transition-all duration-150 ${
                            dropTarget?.columnId === column.id && dropTarget.index === index
                              ? 'animate-pulse border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                              : 'border-cyan-200/20 bg-cyan-300/10'
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            onSetDropTarget({ columnId: column.id, index });
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!dragState) return;

                            void onMoveTodo(dragState.todoId, column.id, index);
                            onSetDragState(null);
                            onSetDropTarget(null);
                          }}
                        />

                        <article
                          data-testid={`card-${todo.id}`}
                          draggable={editingTodoId !== todo.id}
                          onDragStart={() => onSetDragState({ todoId: todo.id })}
                          onDragEnd={() => {
                            onSetDragState(null);
                            onSetDropTarget(null);
                          }}
                          onClick={() => {
                            if (editingTodoId !== todo.id) onOpenTodoModal(todo);
                          }}
                          className={`rounded-lg border border-white/10 bg-slate-900/70 p-3 select-none transition-shadow duration-150 hover:shadow-lg ${
                            editingTodoId === todo.id ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {editingTodoId === todo.id ? (
                            <div>
                              <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Title</label>
                              <Input
                                type="text"
                                value={editingTitle}
                                onChange={(event) => onEditTitleChange(event.target.value)}
                                onKeyDown={(event) => onEditKeyDown(event, todo.id)}
                                data-testid={`edit-title-${todo.id}`}
                                className="mb-3 rounded-md px-2 py-1.5 text-sm"
                                autoFocus
                              />

                              <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Description</label>
                              <textarea
                                value={editingDescription}
                                onChange={(event) => onEditDescriptionChange(event.target.value)}
                                onKeyDown={(event) => onEditKeyDown(event, todo.id)}
                                data-testid={`edit-description-${todo.id}`}
                                rows={3}
                                className="mb-3 w-full resize-none rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
                              />

                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  onClick={onCancelEdit}
                                  data-testid={`edit-cancel-${todo.id}`}
                                  variant="ghost"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => onSaveEdit(todo.id)}
                                  data-testid={`edit-save-${todo.id}`}
                                  size="sm"
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{todo.title}</p>
                                {todo.description && <p className="mt-1 text-xs text-slate-300">{todo.description}</p>}
                              </div>
                              <div className="relative flex items-center gap-2">
                                <IconButton
                                  variant="neutral"
                                  size="sm"
                                  label="Open menu"
                                  data-testid={`card-menu-trigger-${todo.id}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleMenu(todo.id);
                                  }}
                                  ref={(element) => {
                                    menuButtonRefs.current[todo.id] = element;
                                    if (element && menuOpenId === todo.id) element.focus();
                                  }}
                                >
                                  <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
                                    <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                                  </svg>
                                </IconButton>
                                {menuOpenId === todo.id && (
                                  <CardMenu
                                    anchorRef={menuButtonRefs}
                                    anchorId={todo.id}
                                    onEdit={() => {
                                      onCloseMenu();
                                      onMenuEdit(todo);
                                    }}
                                    onDelete={() => {
                                      onCloseMenu();
                                      onMenuDelete(todo.id);
                                    }}
                                    onClose={onCloseMenu}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      </div>
                    ))}

                    <div
                      data-testid={`drop-${column.id}-end`}
                      className={`h-3 rounded border border-dashed transition-all duration-150 ${
                        dropTarget?.columnId === column.id && dropTarget.index === columnTodos.length
                          ? 'animate-pulse border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                          : 'border-white/20 bg-white/5'
                      }`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        onSetDropTarget({ columnId: column.id, index: columnTodos.length });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!dragState) return;

                        void onMoveTodo(dragState.todoId, column.id, columnTodos.length);
                        onSetDragState(null);
                        onSetDropTarget(null);
                      }}
                    />
                  </div>
                </section>
              );
            })}

            {columns.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-slate-900/30 p-4 text-sm text-slate-300">
                This dashboard has no columns yet.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
