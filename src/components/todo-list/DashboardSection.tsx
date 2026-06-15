import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { normalizeTodoChecklists } from '../../utils/todoChecklist';
import { formatDueDateBadgeLabel, getDueDateState } from '../../utils/dueDate';
import { EllipsisMenu } from '../ui/EllipsisMenu';
import { IconButton } from '../ui/IconButton';
import { Archive, Pencil, Share2, Trash2 } from 'lucide-react';
import { useHotkeyHandler } from '../../hooks/useHotkey';
import { DashboardTodoCardContent } from './DashboardTodoCardContent';
import { DashboardTouchDragPreview } from './DashboardTouchDragPreview';
import { getChecklistBadgePalette } from './checklistBadgePalette';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface PendingTouchDrag {
  todoId: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  activated: boolean;
  holdTimer: number | null;
}

const TOUCH_DRAG_HOLD_MS = 160;
const TOUCH_DRAG_CANCEL_DISTANCE_PX = 10;

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
}: DashboardSectionProps) => {
  const resolvedState: DashboardSectionInteractionState = interactionState ?? {
    editingTodoId: legacyEditingTodoId ?? null,
    editingTitle: legacyEditingTitle ?? '',
    editingDescription: legacyEditingDescription ?? '',
    dragState: legacyDragState ?? null,
    dropTarget: legacyDropTarget ?? null,
  };

  const resolvedActions: DashboardSectionActions = actions ?? {
    onToggle: legacyOnToggle ?? (() => {}),
    onDashboardDragStart: legacyOnDashboardDragStart,
    onDashboardDragEnd: legacyOnDashboardDragEnd,
    onDashboardDragOver: legacyOnDashboardDragOver,
    onDashboardDrop: legacyOnDashboardDrop,
    onOpenEditDashboard: legacyOnOpenEditDashboard ?? (() => {}),
    onDeleteDashboard: legacyOnDeleteDashboard ?? (() => {}),
    onOpenShareDashboard: legacyOnOpenShareDashboard,
    onArchiveAllCompleted: legacyOnArchiveAllCompleted,
    onOpenCreateCard: legacyOnOpenCreateCard ?? (() => {}),
    onMoveTodo: legacyOnMoveTodo ?? (() => {}),
    onSetDragState: legacyOnSetDragState ?? (() => {}),
    onSetDropTarget: legacyOnSetDropTarget ?? (() => {}),
    onOpenTodoModal: legacyOnOpenTodoModal ?? (() => {}),
    onCancelEdit: legacyOnCancelEdit ?? (() => {}),
    onSaveEdit: legacyOnSaveEdit ?? (() => {}),
    onEditTitleChange: legacyOnEditTitleChange ?? (() => {}),
    onEditDescriptionChange: legacyOnEditDescriptionChange ?? (() => {}),
    onEditKeyDown: legacyOnEditKeyDown ?? (() => {}),
    onMenuEdit: legacyOnMenuEdit ?? (() => {}),
    onMenuArchive: legacyOnMenuArchive ?? (() => {}),
    onMenuDelete: legacyOnMenuDelete ?? (() => {}),
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

  const touchDragRef = useRef<{ todoId: string; moved: boolean } | null>(null);
  const pendingTouchDragRef = useRef<PendingTouchDrag | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const suppressCardClickUntilRef = useRef(0);
  const [touchDraggingTodoId, setTouchDraggingTodoId] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<{
    todoId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

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

  const clearPendingTouchDrag = () => {
    const pending = pendingTouchDragRef.current;
    if (pending?.holdTimer != null) {
      window.clearTimeout(pending.holdTimer);
    }
    pendingTouchDragRef.current = null;
  };

  const resetTouchDragState = () => {
    onSetDragState(null);
    onSetDropTarget(null);
    touchDragRef.current = null;
    clearPendingTouchDrag();
    setTouchDraggingTodoId(null);
    setTouchDragPreview(null);
  };

  const applyTouchEdgeAutoScroll = (clientX: number, clientY: number) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const threshold = Math.max(28, Math.min(96, rect.width * 0.16));

    let delta = 0;
    if (clientX < rect.left + threshold) {
      const intensity = (rect.left + threshold - clientX) / threshold;
      delta = -Math.max(1, Math.round(18 * intensity));
    } else if (clientX > rect.right - threshold) {
      const intensity = (clientX - (rect.right - threshold)) / threshold;
      delta = Math.max(1, Math.round(18 * intensity));
    }

    if (delta !== 0) {
      scrollContainer.scrollLeft += delta;
    }

    const viewportHeight = window.innerHeight || 0;
    if (viewportHeight <= 0 || typeof window.scrollBy !== 'function') return;

    const verticalThreshold = Math.max(36, Math.min(120, viewportHeight * 0.12));
    let deltaY = 0;

    if (clientY < verticalThreshold) {
      const intensity = (verticalThreshold - clientY) / verticalThreshold;
      deltaY = -Math.max(1, Math.round(16 * intensity));
    } else if (clientY > viewportHeight - verticalThreshold) {
      const intensity = (clientY - (viewportHeight - verticalThreshold)) / verticalThreshold;
      deltaY = Math.max(1, Math.round(16 * intensity));
    }

    if (deltaY !== 0) {
      window.scrollBy(0, deltaY);
    }
  };

  useEffect(() => () => {
    clearPendingTouchDrag();
  }, []);

  const resolveCardDropIndex = (
    event: React.DragEvent<HTMLElement>,
    baseIndex: number,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return baseIndex;

    const midpointY = rect.top + rect.height / 2;
    return event.clientY > midpointY ? baseIndex + 1 : baseIndex;
  };

  const resolveTouchDropTarget = (clientX: number, clientY: number): DropTarget | null => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;

    const cardElement = element.closest<HTMLElement>('[data-touch-card-id]');
    if (cardElement) {
      const columnId = cardElement.dataset.touchColumnId;
      const baseIndexRaw = cardElement.dataset.touchCardIndex;
      const baseIndex = baseIndexRaw != null ? Number(baseIndexRaw) : NaN;
      if (!columnId || Number.isNaN(baseIndex)) return null;

      const rect = cardElement.getBoundingClientRect();
      const midpointY = rect.top + rect.height / 2;
      return {
        columnId,
        index: clientY > midpointY ? baseIndex + 1 : baseIndex,
      };
    }

    const columnElement = element.closest<HTMLElement>('[data-touch-column-id]');
    if (columnElement) {
      const columnId = columnElement.dataset.touchColumnId;
      const columnLengthRaw = columnElement.dataset.touchColumnLength;
      const columnLength = columnLengthRaw != null ? Number(columnLengthRaw) : 0;
      if (!columnId || Number.isNaN(columnLength)) return null;

      return {
        columnId,
        index: columnLength,
      };
    }

    return null;
  };

  const fallbackLastColumn = dashboard.columns.length > 0
    ? dashboard.columns.reduce((latest, column) => (column.order > latest.order ? column : latest))
    : null;
  const completedColumn = dashboard.columns.find((column) => column.isDone) ?? fallbackLastColumn;
  const completedCount = isExpanded && completedColumn ? (groupedTodos[completedColumn.id] ?? []).length : null;

  return (
    <section
      ref={sectionRef}
      key={dashboard.id}
      className={`rounded-xl border bg-slate-900/50 transition-all ${
        isDropTarget
          ? 'border-cyan-200/80 ring-1 ring-cyan-300/70 shadow-[0_0_0_1px_rgba(165,243,252,0.25)]'
          : 'border-white/10'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-testid={`dashboard-${dashboard.id}`}
      onDragOver={onDashboardDragOver}
      onDrop={onDashboardDrop}
    >
      <div
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={toggleDashboard}
        onKeyDown={handleHeaderKeyDown}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IconButton
            variant="neutral"
            size="sm"
            label="Drag dashboard"
            data-testid={`dashboard-drag-handle-${dashboard.id}`}
            className={canManageDashboard ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60'}
            draggable={canManageDashboard}
            disabled={!canManageDashboard}
            onDragStart={(event) => {
              if (!canManageDashboard) {
                event.preventDefault();
                return;
              }

              event.stopPropagation();
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', dashboard.id);
              }
              onDashboardDragStart?.();
            }}
            onDragEnd={() => {
              onDashboardDragEnd?.();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>

          <span className="truncate text-sm font-semibold text-slate-100">{dashboard.name}</span>
        </div>

        {canManageDashboard && (
          <EllipsisMenu
            trigger={{
              label: 'Open dashboard actions',
              testId: `dashboard-actions-trigger-${dashboard.id}`,
            }}
            menu={{
              testId: `dashboard-actions-menu-${dashboard.id}`,
              ariaLabel: `Dashboard actions for ${dashboard.name}`,
            }}
            stopPropagation
            items={[
              {
                id: 'share',
                label: 'Share',
                icon: <Share2 size={14} aria-hidden="true" />,
                onSelect: () => onOpenShareDashboard?.(dashboard.id),
                testId: `share-dashboard-button-${dashboard.id}`,
              },
              {
                id: 'edit',
                label: 'Edit',
                icon: <Pencil size={14} aria-hidden="true" />,
                onSelect: () => onOpenEditDashboard(dashboard.id),
                testId: `edit-dashboard-button-${dashboard.id}`,
              },
              {
                id: 'archive-all-completed',
                label: 'Archive all completed',
                icon: <Archive size={14} aria-hidden="true" />,
                onSelect: () => onArchiveAllCompleted?.(dashboard.id),
                testId: `archive-completed-dashboard-button-${dashboard.id}`,
                disabled: !isExpanded || completedCount === 0,
              },
              {
                id: 'delete',
                label: 'Delete',
                icon: <Trash2 size={14} aria-hidden="true" />,
                onSelect: () => onDeleteDashboard(dashboard.id, dashboard.name),
                testId: `delete-dashboard-button-${dashboard.id}`,
                variant: 'danger',
                disabled: dashboardsLength <= 1,
              },
            ]}
          />
        )}

      </div>

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
                    {columnTodos.map((todo, index) => {
                      const dueState = getDueDateState(todo, new Date());
                      const dueDateHint = todo.dueDate ? `The task must be completed before ${todo.dueDate}` : undefined;
                      const dueLabel = formatDueDateBadgeLabel(todo.dueDate);

                      return (
                      <div
                        key={todo.id}
                        data-testid={`drop-${column.id}-${index}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!dragState) return;

                          const targetIndex = resolveCardDropIndex(event, index);
                          onSetDropTarget({ columnId: column.id, index: targetIndex });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!dragState) return;

                          const targetIndex = resolveCardDropIndex(event, index);
                          void onMoveTodo(dragState.todoId, column.id, targetIndex);
                          onSetDragState(null);
                          onSetDropTarget(null);
                        }}
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
                          onTouchStart={(event) => {
                            if (editingTodoId === todo.id) return;
                            if (event.touches.length !== 1) return;

                            const touch = event.touches[0];
                            if (!touch) return;
                            const rect = event.currentTarget.getBoundingClientRect();

                            clearPendingTouchDrag();

                            const pending: PendingTouchDrag = {
                              todoId: todo.id,
                              startX: touch.clientX,
                              startY: touch.clientY,
                              lastX: touch.clientX,
                              lastY: touch.clientY,
                              width: rect.width,
                              height: rect.height,
                              offsetX: touch.clientX - rect.left,
                              offsetY: touch.clientY - rect.top,
                              activated: false,
                              holdTimer: null,
                            };

                            pending.holdTimer = window.setTimeout(() => {
                              const currentPending = pendingTouchDragRef.current;
                              if (!currentPending || currentPending.todoId !== todo.id) return;

                              currentPending.activated = true;
                              touchDragRef.current = { todoId: todo.id, moved: false };
                              setTouchDraggingTodoId(todo.id);
                              setTouchDragPreview({
                                todoId: todo.id,
                                x: currentPending.lastX,
                                y: currentPending.lastY,
                                width: currentPending.width,
                                height: currentPending.height,
                                offsetX: currentPending.offsetX,
                                offsetY: currentPending.offsetY,
                              });
                              onSetDragState({ todoId: todo.id });
                            }, TOUCH_DRAG_HOLD_MS);

                            pendingTouchDragRef.current = pending;
                          }}
                          onTouchMove={(event) => {
                            if (editingTodoId === todo.id) return;
                            const pendingTouchDrag = pendingTouchDragRef.current;
                            if (!pendingTouchDrag || pendingTouchDrag.todoId !== todo.id) return;

                            const touch = event.touches[0];
                            if (!touch) return;

                            pendingTouchDrag.lastX = touch.clientX;
                            pendingTouchDrag.lastY = touch.clientY;

                            if (!pendingTouchDrag.activated) {
                              const movedDistance = Math.hypot(
                                touch.clientX - pendingTouchDrag.startX,
                                touch.clientY - pendingTouchDrag.startY,
                              );
                              if (movedDistance > TOUCH_DRAG_CANCEL_DISTANCE_PX) {
                                clearPendingTouchDrag();
                              }
                              return;
                            }

                            const touchDrag = touchDragRef.current;
                            if (!touchDrag || touchDrag.todoId !== todo.id) return;

                            event.preventDefault();

                            setTouchDragPreview((prev) => (prev
                              ? { ...prev, x: touch.clientX, y: touch.clientY }
                              : prev
                            ));

                            applyTouchEdgeAutoScroll(touch.clientX, touch.clientY);

                            const target = resolveTouchDropTarget(touch.clientX, touch.clientY);
                            if (target) {
                              touchDrag.moved = true;
                              onSetDropTarget(target);
                            }
                          }}
                          onTouchEnd={(event) => {
                            if (editingTodoId === todo.id) return;
                            const pendingTouchDrag = pendingTouchDragRef.current;
                            if (!pendingTouchDrag || pendingTouchDrag.todoId !== todo.id) return;

                            if (!pendingTouchDrag.activated) {
                              clearPendingTouchDrag();
                              return;
                            }

                            const touchDrag = touchDragRef.current;
                            if (!touchDrag || touchDrag.todoId !== todo.id) return;

                            if (touchDrag.moved) {
                              event.preventDefault();
                            }

                            const changedTouch = event.changedTouches[0];
                            const resolvedTarget = changedTouch
                              ? resolveTouchDropTarget(changedTouch.clientX, changedTouch.clientY)
                              : null;
                            const target = resolvedTarget ?? dropTarget;

                            if (touchDrag.moved && target) {
                              void onMoveTodo(todo.id, target.columnId, target.index);
                              suppressCardClickUntilRef.current = Date.now() + 250;
                            }

                            resetTouchDragState();
                          }}
                          onTouchCancel={() => {
                            resetTouchDragState();
                          }}
                          onClick={() => {
                            if (Date.now() < suppressCardClickUntilRef.current) return;
                            if (editingTodoId !== todo.id) onOpenTodoModal(todo);
                          }}
                          className={`relative w-full rounded-lg border bg-slate-900/70 p-3 pb-12 select-none transition-shadow duration-150 hover:shadow-lg ${
                            dueState === 'overdue' ? 'border-rose-300/45 ring-1 ring-rose-300/35' : 'border-white/10'
                          } ${
                            touchDraggingTodoId === todo.id ? 'opacity-70 shadow-2xl ring-1 ring-cyan-300/60' : ''
                          } ${
                            editingTodoId === todo.id ? 'cursor-default' : 'cursor-pointer'
                          }`}
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
                          />
                        </article>
                      </div>
                      );
                    })}

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
