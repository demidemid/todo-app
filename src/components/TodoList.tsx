import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboards } from '../hooks/useDashboards';
import { useUsers } from '../hooks/useUsers';
import type { Dashboard } from '../types/dashboard';
import { RotateCcw, Trash2 } from 'lucide-react';
import { TodoModal } from './TodoModal';
import { DashboardSection } from './todo-list/DashboardSection';
import { CreateCardModal, CreateDashboardModal, EditDashboardModal, ShareDashboardModal } from './todo-list/TodoListModals';
import { useTodoListBoardData } from './todo-list/useTodoListBoardData';
import { useTodoListController } from './todo-list/useTodoListController';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { useTodos } from '../hooks/useTodos.ts';

export type TodoListViewMode = 'dashboards' | 'archive';

interface TodoListProps {
  userId: string;
  userEmail?: string;
  viewMode?: TodoListViewMode;
}

export const TodoList = ({ userId, userEmail, viewMode = 'dashboards' }: TodoListProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardParamId = searchParams.get('dashboard');
  const dashboardSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [dashboardHoverId, setDashboardHoverId] = useState<string | null>(null);
  const [shareDashboardId, setShareDashboardId] = useState<string | null>(null);
  const [shareSelectedUserIds, setShareSelectedUserIds] = useState<string[]>([]);
  const [shareRecipientEmails, setShareRecipientEmails] = useState('');
  const [shareActionError, setShareActionError] = useState('');
  const [archiveMenuOpenId, setArchiveMenuOpenId] = useState<string | null>(null);
  const archiveMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const archiveMenuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const {
    dashboards,
    activeDashboard,
    activeDashboardId,
    setActiveDashboardId,
    loading: dashboardsLoading,
    error: dashboardsError,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    reorderDashboards,
    shareDashboard,
  } = useDashboards(userId, userEmail ?? null, dashboardParamId);

  const boardAccess = useMemo(
    () =>
      dashboards.map((dashboard) => ({
        id: dashboard.id,
        userId: dashboard.userId,
        readAllTodos:
          dashboard.userId !== userId
          || (dashboard.sharedWith?.length ?? 0) > 0
          || (dashboard.sharedWithEmails?.length ?? 0) > 0,
      })),
    [dashboards, userId]
  );
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos(userId, boardAccess);
  const { users, loading: usersLoading, error: usersError } = useUsers(userId);
  const dashboardsById = useMemo(
    () => new Map(dashboards.map((dashboard) => [dashboard.id, dashboard])),
    [dashboards]
  );

  const archivedTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.archived)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [todos]
  );

  const { columns, groupedTodos } = useTodoListBoardData({ todos, activeDashboard });
  const manageableDashboardIds = useMemo(
    () => dashboards.filter((dashboard) => dashboard.userId === userId).map((dashboard) => dashboard.id),
    [dashboards, userId]
  );
  const manageableIndexById = useMemo(
    () => new Map(manageableDashboardIds.map((id, index) => [id, index])),
    [manageableDashboardIds]
  );

  const controller = useTodoListController({
    todos,
    dashboards,
    activeDashboard,
    groupedTodos,
    columns,
    addTodo,
    updateTodo,
    deleteTodo,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    reorderDashboards,
  });

  const modalTodoId = searchParams.get('card');
  const modalTodo = modalTodoId ? todos.find((todo) => todo.id === modalTodoId) ?? null : null;
  const shareDashboardTarget = shareDashboardId
    ? dashboards.find((dashboard) => dashboard.id === shareDashboardId) ?? null
    : null;

  const updateSearch = useCallback(
    (updater: (nextParams: URLSearchParams) => void) => {
      setSearchParams((prevParams) => {
        const nextParams = new URLSearchParams(prevParams);
        updater(nextParams);
        return nextParams;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (dashboards.length === 0 || !dashboardParamId) return;

    const exists = dashboards.some((dashboard) => dashboard.id === dashboardParamId);

    if (!exists) {
      updateSearch((nextParams) => {
        nextParams.delete('dashboard');
      });
      return;
    }

    setActiveDashboardId((prevDashboardId) =>
      prevDashboardId === dashboardParamId ? prevDashboardId : dashboardParamId
    );
  }, [dashboardParamId, dashboards, setActiveDashboardId, updateSearch]);

  useEffect(() => {
    if (!archiveMenuOpenId) return;

    const handleOutsidePointer = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      const menu = archiveMenuRefs.current[archiveMenuOpenId];
      const trigger = archiveMenuButtonRefs.current[archiveMenuOpenId];
      if ((menu && menu.contains(event.target)) || (trigger && trigger.contains(event.target))) {
        return;
      }

      setArchiveMenuOpenId(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setArchiveMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [archiveMenuOpenId]);

  const openTodoByLink = (todoId: string, dashboardId: string) => {
    updateSearch((nextParams) => {
      nextParams.set('card', todoId);
      nextParams.set('dashboard', dashboardId);
    });
  };

  const closeTodoLink = () => {
    updateSearch((nextParams) => {
      nextParams.delete('card');
    });
  };

  const openShareModal = (dashboard: Dashboard) => {
    setShareDashboardId(dashboard.id);
    setShareSelectedUserIds(dashboard.sharedWith ?? []);
    setShareRecipientEmails((dashboard.sharedWithEmails ?? []).join(', '));
    setShareActionError('');
  };

  const closeShareModal = () => {
    setShareDashboardId(null);
    setShareSelectedUserIds([]);
    setShareRecipientEmails('');
    setShareActionError('');
  };

  const toggleShareUser = (targetUserId: string) => {
    setShareSelectedUserIds((prev) =>
      prev.includes(targetUserId)
        ? prev.filter((userIdItem) => userIdItem !== targetUserId)
        : [...prev, targetUserId]
    );
  };

  const handleSaveShare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shareDashboardTarget) return;
    if (usersLoading || usersError) return;

    setShareActionError('');

    try {
      const selectedEmails = users
        .filter((user) => shareSelectedUserIds.includes(user.id))
        .map((user) => user.email);
      const manualEmails = shareRecipientEmails
        .split(/[\n,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      await shareDashboard(shareDashboardTarget.id, shareSelectedUserIds, [...selectedEmails, ...manualEmails]);
      closeShareModal();
    } catch (shareError) {
      setShareActionError(shareError instanceof Error ? shareError.message : 'Failed to share dashboard');
    }
  };

  if (loading || dashboardsLoading) {
    return <div className="py-8 text-center text-slate-300">Loading todos...</div>;
  }

  if (error || dashboardsError) {
    return (
      <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">
        Error: {error ?? dashboardsError}
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'dashboards' && (
        <IconButton
          type="button"
          variant="primary"
          onClick={() => controller.setIsCreateDashboardModalOpen(true)}
          data-testid="new-dashboard-button"
          label="New dashboard"
          className="fixed bottom-6 right-6 z-40 size-12 rounded-full border-cyan-300/45 bg-cyan-300/20 text-cyan-100 shadow-lg shadow-cyan-900/30 hover:bg-cyan-300/30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </IconButton>
      )}

      {controller.dashboardActionError && (
        <div className="mb-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {controller.dashboardActionError}
        </div>
      )}

      <CreateDashboardModal
        open={controller.isCreateDashboardModalOpen}
        dashboardName={controller.dashboardName}
        columnDraft={controller.columnDraft}
        dashboardColumns={controller.dashboardColumns}
        formError={controller.dashboardFormError}
        onClose={() => controller.setIsCreateDashboardModalOpen(false)}
        onDashboardNameChange={controller.setDashboardName}
        onColumnDraftChange={controller.setColumnDraft}
        onAddColumn={controller.addColumnToDraft}
        onSubmit={controller.handleCreateDashboard}
      />

      <CreateCardModal
        open={controller.isCreateModalOpen}
        title={controller.title}
        description={controller.description}
        onClose={() => {
          controller.setIsCreateModalOpen(false);
          controller.setCreateCardDashboardId(null);
          controller.setCreateCardColumnId(null);
        }}
        onTitleChange={controller.setTitle}
        onDescriptionChange={controller.setDescription}
        onSubmit={controller.handleAddTodo}
      />

      <EditDashboardModal
        open={controller.isEditDashboardModalOpen}
        dashboardName={controller.editingDashboardName}
        columns={controller.editingDashboardColumns}
        columnDraft={controller.editingColumnDraft}
        actionError={controller.dashboardActionError}
        onClose={() => controller.setIsEditDashboardModalOpen(false)}
        onDashboardNameChange={controller.setEditingDashboardName}
        onColumnDraftChange={controller.setEditingColumnDraft}
        onAddColumn={controller.addColumnToEditDraft}
        onRemoveColumn={(columnId) =>
          controller.setEditingDashboardColumns((prev) => prev.filter((item) => item.id !== columnId))
        }
        onColumnNameChange={(columnId, value) => {
          controller.setEditingDashboardColumns((prev) =>
            prev.map((item) => (item.id === columnId ? { ...item, name: value } : item))
          );
        }}
        onSubmit={controller.handleSaveDashboardEdit}
      />

      <ShareDashboardModal
        open={shareDashboardTarget != null}
        dashboardName={shareDashboardTarget?.name ?? ''}
        users={users}
        selectedUserIds={shareSelectedUserIds}
        recipientEmails={shareRecipientEmails}
        loadingUsers={usersLoading}
        usersError={usersError}
        actionError={shareActionError}
        onClose={closeShareModal}
        onToggleUser={toggleShareUser}
        onRecipientEmailsChange={setShareRecipientEmails}
        onSubmit={handleSaveShare}
      />

      {viewMode === 'dashboards' ? (
        <div
          className="space-y-3"
          onDragOver={(event) => {
            event.preventDefault();
            if (!controller.dashboardDragId || !manageableIndexById.has(controller.dashboardDragId)) return;

            const sections = dashboards
              .filter((dashboard) => dashboard.userId === userId)
              .map((dashboard, index) => ({
                id: dashboard.id,
                index,
                element: dashboardSectionRefs.current[dashboard.id],
              }))
              .filter((item): item is { id: string; index: number; element: HTMLElement } => item.element != null);

            if (sections.length === 0) return;

            const pointerY = event.clientY;

            const exactMatch = sections.find((item) => {
              const rect = item.element.getBoundingClientRect();
              return rect.height > 0 && pointerY >= rect.top && pointerY <= rect.bottom;
            });

            if (exactMatch) {
              const sourceIndex = dashboards.findIndex((dashboard) => dashboard.id === controller.dashboardDragId);
              const nextIndex = sourceIndex < exactMatch.index ? exactMatch.index + 1 : exactMatch.index;
              controller.setDashboardDropIndex(nextIndex);
              setDashboardHoverId(exactMatch.id);
              return;
            }

            const firstRect = sections[0].element.getBoundingClientRect();
            if (pointerY < firstRect.top) {
              controller.setDashboardDropIndex(0);
              setDashboardHoverId(sections[0].id);
              return;
            }

            const lastRect = sections[sections.length - 1].element.getBoundingClientRect();
            if (pointerY > lastRect.bottom) {
              controller.setDashboardDropIndex(dashboards.length);
              setDashboardHoverId(sections[sections.length - 1].id);
              return;
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!controller.dashboardDragId) return;

            const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;
            const activeDragId = draggedDashboardId ?? controller.dashboardDragId;
            if (!activeDragId || !manageableIndexById.has(activeDragId)) return;

            const targetIndex = controller.dashboardDropIndex ?? manageableDashboardIds.length;
            void controller.handleDashboardDrop(targetIndex, draggedDashboardId, manageableDashboardIds);
            setDashboardHoverId(null);
          }}
          onDragEndCapture={() => {
            window.setTimeout(() => {
              controller.setDashboardDragId(null);
              controller.setDashboardDropIndex(null);
              setDashboardHoverId(null);
            }, 0);
          }}
        >
          {dashboards.map((dashboard, index) => (
            <DashboardSection
              key={dashboard.id}
              sectionRef={(element) => {
                dashboardSectionRefs.current[dashboard.id] = element;
              }}
              dashboard={dashboard}
              isExpanded={activeDashboardId === dashboard.id}
              isDragging={controller.dashboardDragId === dashboard.id}
              isDropTarget={
                dashboard.userId === userId &&
                dashboardHoverId === dashboard.id &&
                controller.dashboardDragId !== dashboard.id
              }
              dashboardsLength={dashboards.length}
              columns={columns}
              groupedTodos={groupedTodos}
              editingTodoId={controller.editingTodoId}
              editingTitle={controller.editingTitle}
              editingDescription={controller.editingDescription}
              menuOpenId={controller.menuOpenId}
              menuButtonRefs={controller.menuButtonRefs}
              dragState={controller.dragState}
              dropTarget={controller.dropTarget}
              canManageDashboard={dashboard.userId === userId}
              onToggle={(dashboardId) => {
                const nextDashboardId = activeDashboardId === dashboardId ? null : dashboardId;

                setActiveDashboardId(nextDashboardId);
                updateSearch((nextParams) => {
                  if (nextDashboardId) {
                    nextParams.set('dashboard', nextDashboardId);
                  } else {
                    nextParams.delete('dashboard');
                    nextParams.delete('card');
                  }
                });
              }}
              onDashboardDragStart={() => {
                if (dashboard.userId !== userId) return;
                controller.setDashboardDragId(dashboard.id);
                const sourceIndex = manageableIndexById.get(dashboard.id);
                controller.setDashboardDropIndex(sourceIndex ?? index);
                setDashboardHoverId(dashboard.id);
              }}
              onDashboardDragOver={(event) => {
                event.preventDefault();
                if (dashboard.userId !== userId) return;
                if (!controller.dashboardDragId || !manageableIndexById.has(controller.dashboardDragId)) return;

                const sourceIndex = manageableIndexById.get(controller.dashboardDragId);
                const targetIndex = manageableIndexById.get(dashboard.id);
                if (sourceIndex == null || targetIndex == null) return;

                const nextIndex = sourceIndex < targetIndex ? targetIndex + 1 : targetIndex;
                controller.setDashboardDropIndex(nextIndex);
                setDashboardHoverId(dashboard.id);
              }}
              onDashboardDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (dashboard.userId !== userId) return;
                const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;
                const activeDragId = draggedDashboardId ?? controller.dashboardDragId;
                if (!activeDragId || !manageableIndexById.has(activeDragId)) return;

                const sourceIndex = manageableIndexById.get(activeDragId);
                const targetIndex = manageableIndexById.get(dashboard.id);
                if (sourceIndex == null || targetIndex == null) return;

                const nextIndex = sourceIndex < targetIndex ? targetIndex + 1 : targetIndex;
                void controller.handleDashboardDrop(nextIndex, draggedDashboardId, manageableDashboardIds);
              }}
              onOpenEditDashboard={controller.openEditDashboard}
              onDeleteDashboard={(dashboardId, dashboardName) =>
                void controller.handleDeleteDashboard(dashboardId, dashboardName)
              }
              onOpenShareDashboard={(dashboardId) => {
                const nextDashboard = dashboards.find((item) => item.id === dashboardId);
                if (!nextDashboard || nextDashboard.userId !== userId) return;
                openShareModal(nextDashboard);
              }}
              onOpenCreateCard={(dashboardId, columnId) => {
                setActiveDashboardId(dashboardId);
                updateSearch((nextParams) => {
                  nextParams.set('dashboard', dashboardId);
                });
                controller.setCreateCardDashboardId(dashboardId);
                controller.setCreateCardColumnId(columnId);
                controller.setIsCreateModalOpen(true);
              }}
              onMoveTodo={controller.handleMoveTodo}
              onSetDragState={controller.setDragState}
              onSetDropTarget={controller.setDropTarget}
              onOpenTodoModal={(todo) => {
                openTodoByLink(todo.id, todo.boardId);
              }}
              onCancelEdit={controller.cancelEdit}
              onSaveEdit={(todoId) => void controller.handleSaveEdit(todoId)}
              onEditTitleChange={controller.setEditingTitle}
              onEditDescriptionChange={controller.setEditingDescription}
              onEditKeyDown={controller.handleEditKeyDown}
              onToggleMenu={(todoId) => controller.setMenuOpenId(controller.menuOpenId === todoId ? null : todoId)}
              onCloseMenu={() => controller.setMenuOpenId(null)}
              onMenuEdit={(todo) => controller.startEdit(todo)}
              onMenuArchive={(todoId) => void controller.handleArchiveTodo(todoId)}
              onMenuDelete={(todoId) => void controller.handleDeleteTodo(todoId)}
            />
          ))}
        </div>
      ) : (
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
                  onClick={() => openTodoByLink(todo.id, todo.boardId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openTodoByLink(todo.id, todo.boardId);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-cyan-300/40 hover:bg-slate-900"
                  data-testid={`archive-card-${todo.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">{todo.title}</p>
                    <div
                      className="relative"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <IconButton
                        label="Open archive card actions"
                        variant="neutral"
                        size="sm"
                        data-testid={`archive-menu-trigger-${todo.id}`}
                        aria-haspopup="menu"
                        aria-expanded={archiveMenuOpenId === todo.id}
                        ref={(element) => {
                          archiveMenuButtonRefs.current[todo.id] = element;
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setArchiveMenuOpenId((prev) => (prev === todo.id ? null : todo.id));
                        }}
                      >
                        <svg width="18" height="18" fill="none" viewBox="0 0 20 20" aria-hidden="true">
                          <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                          <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                        </svg>
                      </IconButton>

                      {archiveMenuOpenId === todo.id && (
                        <div
                          ref={(element) => {
                            archiveMenuRefs.current[todo.id] = element;
                          }}
                          className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-white/10 bg-slate-900 shadow-lg"
                          data-testid={`archive-menu-${todo.id}`}
                          role="menu"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="flex w-full items-center justify-start rounded-none border-x-0 border-b border-t-0 px-3 py-2 text-left text-sm font-normal text-slate-100 hover:bg-cyan-400/10"
                            data-testid={`archive-menu-unarchive-${todo.id}`}
                            startIcon={<RotateCcw size={14} aria-hidden="true" />}
                            onClick={(event) => {
                              event.stopPropagation();
                              setArchiveMenuOpenId(null);
                              void controller.handleUnarchiveTodo(todo.id);
                            }}
                          >
                            Return to board
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="flex w-full items-center justify-start rounded-none border-x-0 border-b-0 border-t border-rose-400/10 px-3 py-2 text-left text-sm font-normal text-rose-200 hover:bg-rose-400/10"
                            data-testid={`archive-menu-delete-${todo.id}`}
                            startIcon={<Trash2 size={14} aria-hidden="true" />}
                            onClick={(event) => {
                              event.stopPropagation();
                              setArchiveMenuOpenId(null);
                              void controller.handleDeleteTodo(todo.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
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
      )}

      {modalTodo && (
        <TodoModal
          todo={modalTodo}
          userId={userId}
          userEmail={userEmail}
          onClose={closeTodoLink}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
          columns={columns}
        />
      )}
    </div>
  );
};
