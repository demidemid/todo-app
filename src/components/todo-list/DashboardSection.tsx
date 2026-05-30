import React, { useEffect, useRef, useState } from 'react';
import { CardMenu } from '../CardMenu';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { RichTextEditor } from '../todo-modal/RichTextEditor';
import { MessageCircle, Pencil, Share2, Trash2 } from 'lucide-react';
import { FaFile, FaFileArchive, FaFileAudio, FaFileCode, FaFileExcel, FaFileImage, FaFilePdf, FaFilePowerpoint, FaFileVideo, FaFileWord } from 'react-icons/fa';

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

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
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
  editingTodoId: string | null;
  editingTitle: string;
  editingDescription: string;
  menuOpenId: string | null;
  menuButtonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  dragState: DragState | null;
  dropTarget: DropTarget | null;
  onToggle: (dashboardId: string) => void;
  onDashboardDragStart?: () => void;
  onDashboardDragEnd?: () => void;
  onDashboardDragOver?: (event: React.DragEvent<HTMLElement>) => void;
  onDashboardDrop?: (event: React.DragEvent<HTMLElement>) => void;
  onOpenEditDashboard: (dashboardId: string) => void;
  onDeleteDashboard: (dashboardId: string, dashboardName: string) => void;
  onOpenShareDashboard?: (dashboardId: string) => void;
  canManageDashboard?: boolean;
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
  sectionRef,
  dashboard,
  isExpanded,
  isDragging = false,
  isDropTarget = false,
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
  onDashboardDragStart,
  onDashboardDragEnd,
  onDashboardDragOver,
  onDashboardDrop,
  onOpenEditDashboard,
  onDeleteDashboard,
  onOpenShareDashboard,
  canManageDashboard = true,
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
  const [isDashboardActionsOpen, setIsDashboardActionsOpen] = useState(false);
  const dashboardActionsRef = useRef<HTMLDivElement | null>(null);
  const toggleDashboard = () => onToggle(dashboard.id);

  useEffect(() => {
    if (!isDashboardActionsOpen) return;

    const handleOutsidePointer = (event: MouseEvent) => {
      if (!dashboardActionsRef.current) return;
      const target = event.target;
      if (target instanceof Node && !dashboardActionsRef.current.contains(target)) {
        setIsDashboardActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDashboardActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDashboardActionsOpen]);

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDashboard();
    }
  };

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
          <div className="relative flex items-center" ref={dashboardActionsRef}>
            <IconButton
              variant="neutral"
              label="Open dashboard actions"
              data-testid={`dashboard-actions-trigger-${dashboard.id}`}
              aria-haspopup="menu"
              aria-expanded={isDashboardActionsOpen}
              className={isDashboardActionsOpen ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100' : ''}
              onClick={(event) => {
                event.stopPropagation();
                setIsDashboardActionsOpen((prev) => !prev);
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="10" cy="16" r="1.5" fill="currentColor" />
              </svg>
            </IconButton>

            {isDashboardActionsOpen && (
              <div
                className="absolute right-0 top-10 z-50 w-40 rounded-lg border border-white/10 bg-slate-900 shadow-lg"
                data-testid={`dashboard-actions-menu-${dashboard.id}`}
                role="menu"
                aria-label={`Dashboard actions for ${dashboard.name}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex w-full items-center justify-start gap-2 rounded-none border-x-0 border-b border-t-0 px-4 py-2 text-left text-sm font-normal text-slate-100 hover:bg-cyan-400/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDashboardActionsOpen(false);
                    onOpenShareDashboard?.(dashboard.id);
                  }}
                  data-testid={`share-dashboard-button-${dashboard.id}`}
                >
                  <Share2 size={14} aria-hidden="true" />
                  <span>Share</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex w-full items-center justify-start gap-2 rounded-none border-x-0 border-b border-t-0 px-4 py-2 text-left text-sm font-normal text-slate-100 hover:bg-cyan-400/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDashboardActionsOpen(false);
                    onOpenEditDashboard(dashboard.id);
                  }}
                  data-testid={`edit-dashboard-button-${dashboard.id}`}
                >
                  <Pencil size={14} aria-hidden="true" />
                  <span>Edit</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex w-full items-center justify-start gap-2 rounded-none border-x-0 border-b-0 border-t border-rose-400/10 px-4 py-2 text-left text-sm font-normal text-rose-200 hover:bg-rose-400/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDashboardActionsOpen(false);
                    onDeleteDashboard(dashboard.id, dashboard.name);
                  }}
                  data-testid={`delete-dashboard-button-${dashboard.id}`}
                  disabled={dashboardsLength <= 1}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        )}

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
                          className={`relative rounded-lg border border-white/10 bg-slate-900/70 p-3 pb-8 select-none transition-shadow duration-150 hover:shadow-lg ${
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
                              </div>
                              <div className="relative flex items-center gap-2">
                                <IconButton
                                  variant="neutral"
                                  size="sm"
                                  label="Open menu"
                                  className={menuOpenId === todo.id ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100' : ''}
                                  data-testid={`card-menu-trigger-${todo.id}`}
                                  aria-haspopup="menu"
                                  aria-expanded={menuOpenId === todo.id}
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
                              <div className="pointer-events-none absolute bottom-2 left-3 inline-flex items-center gap-1 text-[11px] font-medium text-white">
                                <MessageCircle size={12} className="text-white" aria-hidden="true" />
                                <span>{todo.comments?.length ?? 0}</span>
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
