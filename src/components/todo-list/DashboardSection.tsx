import React from 'react';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { normalizeTodoChecklist } from '../../utils/todoChecklist';
import { getDueDateState } from '../../utils/dueDate';
import { Button } from '../ui/Button';
import { EllipsisMenu } from '../ui/EllipsisMenu';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { RichTextEditor } from '../todo-modal/RichTextEditor';
import { Archive, MessageCircle, Pencil, Share2, Trash2 } from 'lucide-react';
import { FaFile, FaFileArchive, FaFileAudio, FaFileCode, FaFileExcel, FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileVideo, FaFileWord } from 'react-icons/fa';
import { useHotkeyHandler } from '../../hooks/useHotkey';

const extensionFromFileName = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === normalized.length - 1) return '';
  return normalized.slice(dotIndex + 1);
};

const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  const extension = extensionFromFileName(fileName);

  if (['pdf'].includes(extension)) return <FaFilePdf className="shrink-0 text-rose-300" aria-hidden="true" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(extension)) return <FaFileImage className="shrink-0 text-emerald-300" aria-hidden="true" />;
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(extension)) return <FaFileVideo className="shrink-0 text-cyan-300" aria-hidden="true" />;
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) return <FaFileAudio className="shrink-0 text-fuchsia-300" aria-hidden="true" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return <FaFileArchive className="shrink-0 text-amber-300" aria-hidden="true" />;
  if (['doc', 'docx', 'rtf', 'odt'].includes(extension)) return <FaFileWord className="shrink-0 text-sky-300" aria-hidden="true" />;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return <FaFileExcel className="shrink-0 text-green-300" aria-hidden="true" />;
  if (['ppt', 'pptx', 'odp'].includes(extension)) return <FaFilePowerpoint className="shrink-0 text-orange-300" aria-hidden="true" />;
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'md', 'xml', 'yml', 'yaml'].includes(extension)) return <FaFileCode className="shrink-0 text-violet-300" aria-hidden="true" />;

  return <FaFile className="shrink-0 text-slate-300" aria-hidden="true" />;
};

const normalizeSafeUrl = (rawUrl: string): string | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

const getChecklistBadgePalette = (closedItems: number, totalItems: number): string => {
  if (totalItems <= 0) {
    return 'border-rose-300/30 bg-rose-300/15 text-rose-100';
  }

  const percent = (closedItems / totalItems) * 100;

  if (percent < 25) {
    return 'border-rose-300/30 bg-rose-300/15 text-rose-100';
  }

  if (percent < 75) {
    return 'border-amber-300/35 bg-amber-300/15 text-amber-100';
  }

  return 'border-emerald-300/35 bg-emerald-300/15 text-emerald-100';
};

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

  const resolveCardDropIndex = (
    event: React.DragEvent<HTMLElement>,
    baseIndex: number,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return baseIndex;

    const midpointY = rect.top + rect.height / 2;
    return event.clientY > midpointY ? baseIndex + 1 : baseIndex;
  };

  const fallbackLastColumn = dashboard.columns.length > 0
    ? dashboard.columns.reduce((latest, column) => (column.order > latest.order ? column : latest))
    : null;
  const completedColumn = dashboard.columns.find((column) => column.isDone) ?? fallbackLastColumn;
  const completedCount = isExpanded && completedColumn ? (groupedTodos[completedColumn.id] ?? []).length : 0;

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
            triggerLabel="Open dashboard actions"
            triggerTestId={`dashboard-actions-trigger-${dashboard.id}`}
            menuTestId={`dashboard-actions-menu-${dashboard.id}`}
            menuAriaLabel={`Dashboard actions for ${dashboard.name}`}
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
                disabled: completedCount === 0,
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
          <div className="overflow-x-auto pb-2">
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
                      const dueDateHint = todo.dueDate ? `Due date: ${todo.dueDate}` : undefined;
                      const dueLabel = dueState === 'due_today'
                        ? 'Today'
                        : dueState === 'due_tomorrow'
                          ? 'Tomorrow'
                          : dueState === 'overdue'
                            ? 'Overdue'
                            : null;

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
                          draggable={editingTodoId !== todo.id}
                          onDragStart={() => onSetDragState({ todoId: todo.id })}
                          onDragEnd={() => {
                            onSetDragState(null);
                            onSetDropTarget(null);
                          }}
                          onClick={() => {
                            if (editingTodoId !== todo.id) onOpenTodoModal(todo);
                          }}
                          className={`relative w-full rounded-lg border bg-slate-900/70 p-3 pb-8 select-none transition-shadow duration-150 hover:shadow-lg ${
                            dueState === 'overdue' ? 'border-rose-300/45 ring-1 ring-rose-300/35' : 'border-white/10'
                          } ${
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
                              <RichTextEditor
                                value={editingDescription}
                                onChange={onEditDescriptionChange}
                                className="mb-3"
                                placeholder="Write a description with formatting..."
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
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-tight text-slate-100">{todo.title}</p>
                                {dueLabel && (
                                  <span
                                    className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                      dueState === 'overdue'
                                        ? 'border-rose-300/35 bg-rose-400/15 text-rose-100'
                                        : 'border-amber-300/35 bg-amber-300/15 text-amber-100'
                                    }`}
                                    data-testid={`card-due-badge-${todo.id}`}
                                    title={dueDateHint}
                                  >
                                    {dueLabel}
                                  </span>
                                )}
                                {(() => {
                                  const checklist = normalizeTodoChecklist(todo.checklist);
                                  if (!checklist) return null;

                                  const checklistTitle = checklist.title;
                                  const totalItems = checklist.items.length;
                                  const closedItems = checklist.items.filter((item) => item.checked).length;
                                  const checklistBadgePalette = getChecklistBadgePalette(closedItems, totalItems);

                                  return (
                                    <div
                                      className={`mt-2 inline-flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] font-medium ${checklistBadgePalette}`}
                                      data-testid={`card-checklist-badge-${todo.id}`}
                                    >
                                      <span className="truncate" data-testid={`card-checklist-title-${todo.id}`}>
                                        {checklistTitle}
                                      </span>
                                      <span className="shrink-0" data-testid={`card-checklist-progress-${todo.id}`}>
                                        {closedItems}/{totalItems}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {/* Меню/кнопка (оставляем как есть) */}
                                {Array.isArray(todo.files) && todo.files.length > 0 && (
                                  <ul className="mt-1 space-y-0.5">
                                    {todo.files.map((file) => (
                                      <li key={file.id} className="text-xs text-slate-300">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                          <FileTypeIcon fileName={file.name} />
                                          <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            onClick={(event) => event.stopPropagation()}
                                            className="truncate text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                                          >
                                            {file.name}
                                          </a>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {/* LINKS block — теперь всегда под меню/кнопкой */}
                                {Array.isArray(todo.links) && todo.links.length > 0 && (
                                  <ul className="mt-2 space-y-0.5">
                                    {todo.links.map((link, i) => (
                                      (() => {
                                        const safeUrl = normalizeSafeUrl(link.url);
                                        if (!safeUrl) return null;

                                        return (
                                          <li key={safeUrl + i} className="flex items-center gap-1.5 text-xs text-cyan-200">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-cyan-300" aria-hidden="true">
                                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                            <a
                                              href={safeUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={e => e.stopPropagation()}
                                              className="truncate max-w-30 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                                              title={safeUrl}
                                            >
                                              {link.name ? link.name : safeUrl}
                                            </a>
                                          </li>
                                        );
                                      })()
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <EllipsisMenu
                                triggerLabel={`Open actions for ${todo.title}`}
                                triggerTestId={`card-menu-trigger-${todo.id}`}
                                menuTestId="card-menu"
                                stopPropagation
                                items={[
                                  {
                                    id: 'archive',
                                    label: 'Archive',
                                    icon: <Archive size={14} aria-hidden="true" />,
                                    onSelect: () => onMenuArchive(todo.id),
                                    testId: 'card-menu-archive',
                                  },
                                  {
                                    id: 'delete',
                                    label: 'Delete',
                                    icon: <Trash2 size={14} aria-hidden="true" />,
                                    onSelect: () => onMenuDelete(todo.id),
                                    testId: 'card-menu-delete',
                                    variant: 'danger',
                                  },
                                ]}
                              />
                              <div className="pointer-events-none absolute bottom-2 left-3 inline-flex items-center gap-1 text-[11px] font-medium text-white">
                                <MessageCircle size={12} className="text-white" aria-hidden="true" />
                                <span>{todo.comments?.length ?? 0}</span>
                              </div>
                            </div>
                          )}
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
    </section>
  );
};
