import React, { useMemo, useRef } from 'react';
import { Hand } from 'lucide-react';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { normalizeTodoChecklists } from '../../utils/todoChecklist';
import { formatDueDateBadgeLabel, getDueDateState } from '../../utils/dueDate';
import { useHotkeyHandler } from '../../hooks/useHotkey';
import { DashboardColumn as DashboardColumnSection } from './DashboardColumn';
import { DashboardSectionHeader } from './DashboardSectionHeader';
import { DashboardTodoCardContent } from './DashboardTodoCardContent';
import { DashboardTouchDragPreview } from './DashboardTouchDragPreview';
import { buildCardDropHandlers } from './dashboardCardDnd';
import { getChecklistBadgePalette } from './checklistBadgePalette';
import { useDashboardTouchDnd } from './useDashboardTouchDnd';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface DashboardSectionInteractionState {
  editingTodoId: string | null;
  editingTitle: string;
  editingDescription: string;
  dragState: DragState | null;
  dropTarget: DropTarget | null;
}

interface DashboardSectionActions {
  onToggle: (dashboardId: string) => void;
  onDashboardDragStart?: () => void;
  onDashboardDragEnd?: () => void;
  onDashboardDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDashboardDrop?: (event: React.DragEvent<HTMLElement>) => void;
  onOpenEditDashboard: (dashboardId: string) => void;
  onDeleteDashboard: (dashboardId: string, dashboardName: string) => void;
  onOpenShareDashboard?: (dashboardId: string) => void;
  onArchiveAllCompleted?: (dashboardId: string) => void;
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
  onMenuEdit: (todo: Todo) => void;
  onMenuArchive: (todoId: string) => void;
  onMenuDelete: (todoId: string) => void;
}

interface DashboardSectionProps {
  sectionRef?: (element: HTMLElement | null) => void;
  dashboard: Dashboard;
  isExpanded: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dashboardsLength: number;
  columns: DashboardColumn[];
  groupedTodos: Record<string, Todo[]>;
  interactionState?: DashboardSectionInteractionState;
  actions?: DashboardSectionActions;
  editingTodoId?: string | null;
  editingTitle?: string;
  editingDescription?: string;
  dragState?: DragState | null;
  dropTarget?: DropTarget | null;
  onToggle?: (dashboardId: string) => void;
  onDashboardDragStart?: () => void;
  onDashboardDragEnd?: () => void;
  onDashboardDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDashboardDrop?: (event: React.DragEvent<HTMLElement>) => void;
  onOpenEditDashboard?: (dashboardId: string) => void;
  onDeleteDashboard?: (dashboardId: string, dashboardName: string) => void;
  onOpenShareDashboard?: (dashboardId: string) => void;
  onArchiveAllCompleted?: (dashboardId: string) => void;
  canManageDashboard?: boolean;
  onOpenCreateCard?: (dashboardId: string, columnId: string) => void;
  onMoveTodo?: (todoId: string, targetColumnId: string, targetIndex: number) => void;
  onSetDragState?: (state: DragState | null) => void;
  onSetDropTarget?: (state: DropTarget | null) => void;
  onOpenTodoModal?: (todo: Todo) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (todoId: string) => void;
  onEditTitleChange?: (value: string) => void;
  onEditDescriptionChange?: (value: string) => void;
  onEditKeyDown?: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, todoId: string) => void;
  onMenuEdit?: (todo: Todo) => void;
  onMenuArchive?: (todoId: string) => void;
  onMenuDelete?: (todoId: string) => void;
  onAddTagFilter?: (tag: string) => void;
}

export const DashboardSection = ({
  sectionRef,
  dashboard,
  isExpanded,
  isDragging = false,
  isDropTarget = false,
  dashboardsLength,
  columns,
  groupedTodos,
  interactionState,
  actions,
  editingTodoId: legacyEditingTodoId,
  editingTitle: legacyEditingTitle,
  editingDescription: legacyEditingDescription,
  dragState: legacyDragState,
  dropTarget: legacyDropTarget,
  onToggle: legacyOnToggle,
  onDashboardDragStart: legacyOnDashboardDragStart,
  onDashboardDragEnd: legacyOnDashboardDragEnd,
  onDashboardDragOver: legacyOnDashboardDragOver,
  onDashboardDrop: legacyOnDashboardDrop,
  onOpenEditDashboard: legacyOnOpenEditDashboard,
  onDeleteDashboard: legacyOnDeleteDashboard,
  onOpenShareDashboard: legacyOnOpenShareDashboard,
  onArchiveAllCompleted: legacyOnArchiveAllCompleted,
  canManageDashboard = true,
  onOpenCreateCard: legacyOnOpenCreateCard,
  onMoveTodo: legacyOnMoveTodo,
  onSetDragState: legacyOnSetDragState,
  onSetDropTarget: legacyOnSetDropTarget,
  onOpenTodoModal: legacyOnOpenTodoModal,
  onCancelEdit: legacyOnCancelEdit,
  onSaveEdit: legacyOnSaveEdit,
  onEditTitleChange: legacyOnEditTitleChange,
  onEditDescriptionChange: legacyOnEditDescriptionChange,
  onEditKeyDown: legacyOnEditKeyDown,
  onMenuEdit: legacyOnMenuEdit,
  onMenuArchive: legacyOnMenuArchive,
  onMenuDelete: legacyOnMenuDelete,
  onAddTagFilter,
}: DashboardSectionProps) => {
  const resolvedState: DashboardSectionInteractionState = interactionState ?? {
    editingTodoId: legacyEditingTodoId ?? null,
    editingTitle: legacyEditingTitle ?? '',
    editingDescription: legacyEditingDescription ?? '',
    dragState: legacyDragState ?? null,
    dropTarget: legacyDropTarget ?? null,
  };

  const resolvedActions: DashboardSectionActions = actions ?? {
    onToggle: legacyOnToggle ?? (() => { }),
    onDashboardDragStart: legacyOnDashboardDragStart,
    onDashboardDragEnd: legacyOnDashboardDragEnd,
    onDashboardDragOver: legacyOnDashboardDragOver,
    onDashboardDrop: legacyOnDashboardDrop,
    onOpenEditDashboard: legacyOnOpenEditDashboard ?? (() => { }),
    onDeleteDashboard: legacyOnDeleteDashboard ?? (() => { }),
    onOpenShareDashboard: legacyOnOpenShareDashboard,
    onArchiveAllCompleted: legacyOnArchiveAllCompleted,
    onOpenCreateCard: legacyOnOpenCreateCard ?? (() => { }),
    onMoveTodo: legacyOnMoveTodo ?? (() => { }),
    onSetDragState: legacyOnSetDragState ?? (() => { }),
    onSetDropTarget: legacyOnSetDropTarget ?? (() => { }),
    onOpenTodoModal: legacyOnOpenTodoModal ?? (() => { }),
    onCancelEdit: legacyOnCancelEdit ?? (() => { }),
    onSaveEdit: legacyOnSaveEdit ?? (() => { }),
    onEditTitleChange: legacyOnEditTitleChange ?? (() => { }),
    onEditDescriptionChange: legacyOnEditDescriptionChange ?? (() => { }),
    onEditKeyDown: legacyOnEditKeyDown ?? (() => { }),
    onMenuEdit: legacyOnMenuEdit ?? (() => { }),
    onMenuArchive: legacyOnMenuArchive ?? (() => { }),
    onMenuDelete: legacyOnMenuDelete ?? (() => { }),
  };

  const {
    editingTodoId,
    editingTitle,
    editingDescription,
    dragState,
    dropTarget,
  } = resolvedState;

  const {
    onToggle,
    onDashboardDragStart,
    onDashboardDragEnd,
    onDashboardDragOver,
    onDashboardDrop,
    onOpenEditDashboard,
    onDeleteDashboard,
    onOpenShareDashboard,
    onArchiveAllCompleted,
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
    onMenuArchive,
    onMenuDelete,
  } = resolvedActions;

  const toggleDashboard = () => onToggle(dashboard.id);

  const handleHeaderEnter = useHotkeyHandler('enter', (event) => {
    event.preventDefault();
    toggleDashboard();
  });

  const handleHeaderSpace = useHotkeyHandler('space', (event) => {
    event.preventDefault();
    toggleDashboard();
  });

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handleHeaderEnter(event);
    handleHeaderSpace(event);
  };

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    touchDraggingTodoId,
    touchDragPreview,
    getTouchCardHandlers,
  } = useDashboardTouchDnd({
    editingTodoId,
    dropTarget,
    scrollContainerRef,
    onMoveTodo,
    onSetDragState,
    onSetDropTarget,
  });

  const todoById = useMemo(() => {
    const lookup = new Map<string, Todo>();
    columns.forEach((column) => {
      (groupedTodos[column.id] ?? []).forEach((todo) => {
        lookup.set(todo.id, todo);
      });
    });
    return lookup;
  }, [columns, groupedTodos]);

  const touchPreviewTitle = touchDragPreview
    ? (todoById.get(touchDragPreview.todoId)?.title ?? 'Moving card')
    : null;
  const touchPreviewTodo = touchDragPreview
    ? (todoById.get(touchDragPreview.todoId) ?? null)
    : null;
  const touchPreviewDueState = touchPreviewTodo ? getDueDateState(touchPreviewTodo, new Date()) : null;
  const touchPreviewDueLabel = formatDueDateBadgeLabel(touchPreviewTodo?.dueDate);
  const touchPreviewChecklist = touchPreviewTodo
    ? (normalizeTodoChecklists(touchPreviewTodo.checklists, touchPreviewTodo.checklist)[0] ?? null)
    : null;
  const touchPreviewChecklistClosed = touchPreviewChecklist
    ? touchPreviewChecklist.items.filter((item) => item.checked).length
    : 0;
  const touchPreviewChecklistTotal = touchPreviewChecklist ? touchPreviewChecklist.items.length : 0;
  const touchPreviewChecklistPalette = touchPreviewChecklist
    ? getChecklistBadgePalette(touchPreviewChecklistClosed, touchPreviewChecklistTotal)
    : null;

  const fallbackLastColumn = dashboard.columns.length > 0
    ? dashboard.columns.reduce((latest, column) => (column.order > latest.order ? column : latest))
    : null;
  const completedColumn = dashboard.columns.find((column) => column.isDone) ?? fallbackLastColumn;
  const completedCount = isExpanded && completedColumn ? (groupedTodos[completedColumn.id] ?? []).length : null;

  return (
    <section
      ref={sectionRef}
      key={dashboard.id}
      className={`rounded-xl border bg-slate-900/50 transition-all ${isDropTarget
        ? 'border-cyan-200/80 ring-1 ring-cyan-300/70 shadow-[0_0_0_1px_rgba(165,243,252,0.25)]'
        : 'border-white/10'
        } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-testid={`dashboard-${dashboard.id}`}
      onDragOver={onDashboardDragOver}
      onDrop={onDashboardDrop}
    >
      <DashboardSectionHeader
        dashboardId={dashboard.id}
        dashboardName={dashboard.name}
        dashboardsLength={dashboardsLength}
        canManageDashboard={canManageDashboard}
        isExpanded={isExpanded}
        completedCount={completedCount}
        onToggle={toggleDashboard}
        onKeyDown={handleHeaderKeyDown}
        onDashboardDragStart={onDashboardDragStart}
        onDashboardDragEnd={onDashboardDragEnd}
        onOpenEditDashboard={onOpenEditDashboard}
        onDeleteDashboard={onDeleteDashboard}
        onOpenShareDashboard={onOpenShareDashboard}
        onArchiveAllCompleted={onArchiveAllCompleted}
      />

      {isExpanded && (
        <div className="border-t border-white/10 p-4">
          <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
            <div
              className="grid min-w-full gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(16rem, 1fr))` }}
            >
              {columns.map((column) => {
                const columnTodos = groupedTodos[column.id] ?? [];

                return (
                  <DashboardColumnSection
                    key={column.id}
                    dashboardId={dashboard.id}
                    column={column}
                    columnTodos={columnTodos}
                    dropTarget={dropTarget}
                    dragState={dragState}
                    onOpenCreateCard={onOpenCreateCard}
                    onSetDropTarget={onSetDropTarget}
                    onMoveTodo={onMoveTodo}
                    onSetDragState={onSetDragState}
                  >
                    {columnTodos.map((todo, index) => {
                      const dueState = getDueDateState(todo, new Date());
                      const dueDateHint = todo.dueDate ? `The task must be completed before ${todo.dueDate}` : undefined;
                      const dueLabel = formatDueDateBadgeLabel(todo.dueDate);

                      return (
                        <div
                          key={todo.id}
                          data-testid={`drop-${column.id}-${index}`}
                          className="flex w-full flex-col"
                          {...buildCardDropHandlers({
                            columnId: column.id,
                            cardIndex: index,
                            dragState,
                            onSetDropTarget,
                            onMoveTodo,
                            onSetDragState,
                          })}
                        >
                          <article
                            data-testid={`card-${todo.id}`}
                            data-touch-card-id={todo.id}
                            data-touch-column-id={column.id}
                            data-touch-card-index={index}
                            draggable={editingTodoId !== todo.id}
                            onDragStart={() => onSetDragState({ todoId: todo.id })}
                            onDragEnd={() => {
                              onSetDragState(null);
                              onSetDropTarget(null);
                            }}
                            className={`relative flex flex-col w-full ${touchDraggingTodoId === todo.id ? 'opacity-70 shadow-2xl ring-1 ring-cyan-300/60' : ''
                              } ${editingTodoId === todo.id ? 'cursor-default' : 'cursor-pointer'}`}
                            {...getTouchCardHandlers(
                              todo.id,
                              () => onOpenTodoModal(todo),
                            )}

                          >
                            {todo.blockedReason?.trim() && (
                              <div
                                className="pointer-events-none inline-flex w-full items-center gap-1.5 rounded-t-lg rounded-b-none border border-b-0 border-rose-500/20 bg-rose-500/30 px-3 py-1.5 text-[11px] font-semibold text-rose-50 shadow-[inset_0_-1px_0_rgba(251,113,133,0.35)]"
                                data-testid={`card-blocked-reason-${todo.id}`}
                                title={todo.blockedReason}
                              >
                                <Hand size={12} className="shrink-0" aria-hidden="true" />
                                <span className="truncate">{todo.blockedReason}</span>
                              </div>
                            )}
                            <div
                              data-testid={`card-surface-${todo.id}`}
                              className={`relative w-full rounded-lg border bg-slate-900/70 p-3 pb-12 select-none transition-shadow duration-150 hover:shadow-lg ${todo.blockedReason?.trim() ? 'rounded-t-none border-t-0' : ''} ${dueState === 'overdue' ? 'border-rose-300/45 ring-1 ring-rose-300/35' : 'border-white/10'}`}
                            >

                              <DashboardTodoCardContent
                                todo={todo}
                                editing={editingTodoId === todo.id}
                                editingTitle={editingTitle}
                                editingDescription={editingDescription}
                                dueState={dueState}
                                dueLabel={dueLabel}
                                dueDateHint={dueDateHint}
                                onEditTitleChange={onEditTitleChange}
                                onEditDescriptionChange={onEditDescriptionChange}
                                onEditKeyDown={onEditKeyDown}
                                onCancelEdit={onCancelEdit}
                                onSaveEdit={onSaveEdit}
                                onMenuArchive={onMenuArchive}
                                onMenuDelete={onMenuDelete}
                                onTagClick={onAddTagFilter}
                              />
                            </div >
                          </article>
                        </div>
                      );
                    })}
                  </DashboardColumnSection>
                );
              })}

              {columns.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/20 bg-slate-900/30 p-4 text-sm text-slate-300">
                  This dashboard has no columns yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DashboardTouchDragPreview
        preview={touchDragPreview}
        title={touchPreviewTitle}
        dueLabel={touchPreviewDueLabel}
        dueState={touchPreviewDueState}
        checklistTitle={touchPreviewChecklist?.title ?? null}
        checklistClosed={touchPreviewChecklistClosed}
        checklistTotal={touchPreviewChecklistTotal}
        checklistPalette={touchPreviewChecklistPalette}
        commentsCount={touchPreviewTodo?.comments?.length ?? 0}
      />
    </section>
  );
};
