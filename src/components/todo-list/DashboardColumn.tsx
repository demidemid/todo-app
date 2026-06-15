import type { ReactNode } from 'react';
import type { Todo } from '../../types/todo';
import type { DashboardColumn as DashboardColumnType } from '../../types/dashboard';
import { IconButton } from '../ui/IconButton';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface DashboardColumnProps {
  dashboardId: string;
  column: DashboardColumnType;
  columnTodos: Todo[];
  dropTarget: DropTarget | null;
  dragState: DragState | null;
  onOpenCreateCard: (dashboardId: string, columnId: string) => void;
  onSetDropTarget: (state: DropTarget | null) => void;
  onMoveTodo: (todoId: string, targetColumnId: string, targetIndex: number) => void;
  onSetDragState: (state: DragState | null) => void;
  children: ReactNode;
}

export const DashboardColumn = ({
  dashboardId,
  column,
  columnTodos,
  dropTarget,
  dragState,
  onOpenCreateCard,
  onSetDropTarget,
  onMoveTodo,
  onSetDragState,
  children,
}: DashboardColumnProps) => {
  return (
    <section
      key={column.id}
      data-testid={`column-${column.id}`}
      data-touch-column-id={column.id}
      data-touch-column-length={columnTodos.length}
      className={`rounded-xl border bg-slate-800/50 p-3 transition-colors ${
        dropTarget?.columnId === column.id
          ? 'border-cyan-200/70'
          : 'border-white/10'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!dragState) return;

        onSetDropTarget({ columnId: column.id, index: columnTodos.length });
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (!dragState) return;

        const targetIndex =
          dropTarget?.columnId === column.id
            ? dropTarget.index
            : columnTodos.length;

        void onMoveTodo(dragState.todoId, column.id, targetIndex);
        onSetDragState(null);
        onSetDropTarget(null);
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{column.name}</h3>
          <IconButton
            variant="primary"
            onClick={() => onOpenCreateCard(dashboardId, column.id)}
            data-testid={`new-card-button-${dashboardId}-${column.id}`}
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
        {children}

        <div
          data-testid={`drop-${column.id}-end`}
          className="h-0 overflow-hidden"
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
};
