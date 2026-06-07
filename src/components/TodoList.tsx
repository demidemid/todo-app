import { useMemo, useRef } from 'react';
import { useDashboards } from '../hooks/useDashboards';
import { useUsers } from '../hooks/useUsers';
import { TodoModal } from './TodoModal';
import { ArchiveTodoListView } from './todo-list/ArchiveTodoListView';
import { DashboardDndContainer } from './todo-list/DashboardDndContainer';
import { DashboardSection } from './todo-list/DashboardSection';
import type { DueHighlightEntry } from './todo-list/DueHighlightsBanner';
import { useSyncDashboardQueryParam, useTodoListUrlState } from './todo-list/useTodoListUrlState';
import { CreateCardModal, CreateDashboardModal, EditDashboardModal, ShareDashboardModal } from './todo-list/TodoListModals';
import { useTodoListBoardData } from './todo-list/useTodoListBoardData';
import { useTodoListController } from './todo-list/useTodoListController';
import { getDueDateState } from '../utils/dueDate';
import { IconButton } from './ui/IconButton';
import { useTodos } from '../hooks/useTodos.ts';
import { useDueDateReminders } from '../hooks/useDueDateReminders';
import { TodoListStoresProvider } from '../stores/TodoListStoresProvider';
import { useTodoListUiStoreScoped } from '../stores/todoListStoresContext';

export type TodoListViewMode = 'dashboards' | 'archive';

interface TodoListProps {
  userId: string;
  userEmail?: string;
  viewMode?: TodoListViewMode;
}

const TodoListContent = ({ userId, userEmail, viewMode = 'dashboards' }: TodoListProps) => {
  const {
    dashboardParamId,
    modalTodoId,
    updateSearch,
    openTodoByLink,
    closeTodoLink,
  } = useTodoListUrlState();
  const dashboardSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const dashboardHoverId = useTodoListUiStoreScoped((state) => state.dashboardHoverId);
  const setDashboardHoverId = useTodoListUiStoreScoped((state) => state.setDashboardHoverId);
  const shareDashboardId = useTodoListUiStoreScoped((state) => state.shareDashboardId);
  const shareSelectedUserIds = useTodoListUiStoreScoped((state) => state.shareSelectedUserIds);
  const shareRecipientEmails = useTodoListUiStoreScoped((state) => state.shareRecipientEmails);
  const shareActionError = useTodoListUiStoreScoped((state) => state.shareActionError);
  const openShareModal = useTodoListUiStoreScoped((state) => state.openShareModal);
  const closeShareModal = useTodoListUiStoreScoped((state) => state.closeShareModal);
  const toggleShareUser = useTodoListUiStoreScoped((state) => state.toggleShareUser);
  const setShareRecipientEmails = useTodoListUiStoreScoped((state) => state.setShareRecipientEmails);
  const setShareActionError = useTodoListUiStoreScoped((state) => state.setShareActionError);

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
  useDueDateReminders({ todos, updateTodo });
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

  const dueHighlights = useMemo(() => {
    const now = new Date();
    type HighlightDueState = DueHighlightEntry['dueState'];
    const rankByState = (state: ReturnType<typeof getDueDateState>) => {
      if (state === 'overdue') return 0;
      if (state === 'due_today') return 1;
      if (state === 'due_tomorrow') return 2;
      return 3;
    };

    return todos
      .filter(
        (todo) =>
          !todo.archived
          && Boolean(todo.dueDate)
          && Boolean(todo.remindOneDayBefore)
          && !(todo.isCompleted ?? todo.status === 'done')
      )
      .map((todo) => ({
        todo,
        dueState: getDueDateState(todo, now),
      }))
      .filter((entry): entry is { todo: typeof todos[number]; dueState: HighlightDueState } => (
        entry.dueState === 'overdue' || entry.dueState === 'due_today' || entry.dueState === 'due_tomorrow'
      ))
      .map((todo) => {
        const dashboardName = dashboardsById.get(todo.todo.boardId)?.name ?? 'Unknown dashboard';
        const dueState = todo.dueState;
        const dueText = dueState === 'overdue'
          ? `was due on ${todo.todo.dueDate}`
          : dueState === 'due_today'
            ? 'is due today'
            : dueState === 'due_tomorrow'
              ? 'is due tomorrow'
              : 'is due';

        return {
          todo: todo.todo,
          dashboardName,
          dueText,
          dueState,
          rank: rankByState(dueState),
          sortDate: todo.todo.dueDate ?? '9999-99-99',
        };
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.sortDate.localeCompare(b.sortDate);
      })
      .slice(0, 8);
  }, [dashboardsById, todos]);

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

  const modalTodo = modalTodoId ? todos.find((todo) => todo.id === modalTodoId) ?? null : null;
  const modalColumns = modalTodo
    ? dashboardsById.get(modalTodo.boardId)?.columns ?? []
    : [];
  const shareDashboardTarget = shareDashboardId
    ? dashboards.find((dashboard) => dashboard.id === shareDashboardId) ?? null
    : null;

  useSyncDashboardQueryParam({
    dashboardParamId,
    dashboards,
    setActiveDashboardId,
    updateSearch,
  });

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
        state={{
          open: controller.isCreateDashboardModalOpen,
          dashboardName: controller.dashboardName,
          columnDraft: controller.columnDraft,
          dashboardColumns: controller.dashboardColumns,
          formError: controller.dashboardFormError,
        }}
        actions={{
          onClose: controller.closeCreateDashboardModal,
          onDashboardNameChange: controller.setDashboardName,
          onColumnDraftChange: controller.setColumnDraft,
          onAddColumn: controller.addColumnToDraft,
          onRemoveColumn: controller.removeCreateDashboardColumn,
          onColumnNameChange: controller.updateCreateDashboardColumnName,
          onReorderColumn: controller.reorderCreateDashboardColumns,
          onSubmit: controller.handleCreateDashboard,
        }}
      />

      <CreateCardModal
        state={{
          open: controller.isCreateModalOpen,
          title: controller.title,
          description: controller.description,
        }}
        actions={{
          onClose: () => {
            controller.setIsCreateModalOpen(false);
            controller.setCreateCardDashboardId(null);
            controller.setCreateCardColumnId(null);
          },
          onTitleChange: controller.setTitle,
          onDescriptionChange: controller.setDescription,
          onSubmit: controller.handleAddTodo,
        }}
      />

      <EditDashboardModal
        state={{
          open: controller.isEditDashboardModalOpen,
          dashboardName: controller.editingDashboardName,
          columns: controller.editingDashboardColumns,
          columnDraft: controller.editingColumnDraft,
          actionError: controller.dashboardActionError,
        }}
        actions={{
          onClose: () => controller.setIsEditDashboardModalOpen(false),
          onDashboardNameChange: controller.setEditingDashboardName,
          onColumnDraftChange: controller.setEditingColumnDraft,
          onAddColumn: controller.addColumnToEditDraft,
          onRemoveColumn: (columnId) =>
            controller.setEditingDashboardColumns((prev) => prev.filter((item) => item.id !== columnId)),
          onColumnNameChange: (columnId, value) => {
            controller.setEditingDashboardColumns((prev) =>
              prev.map((item) => (item.id === columnId ? { ...item, name: value } : item))
            );
          },
          onReorderColumn: controller.reorderEditDashboardColumns,
          onSubmit: controller.handleSaveDashboardEdit,
        }}
      />

      <ShareDashboardModal
        state={{
          open: shareDashboardTarget != null,
          dashboardName: shareDashboardTarget?.name ?? '',
          users,
          selectedUserIds: shareSelectedUserIds,
          recipientEmails: shareRecipientEmails,
          loadingUsers: usersLoading,
          usersError,
          actionError: shareActionError,
        }}
        actions={{
          onClose: closeShareModal,
          onToggleUser: toggleShareUser,
          onRecipientEmailsChange: setShareRecipientEmails,
          onSubmit: handleSaveShare,
        }}
      />

      {viewMode === 'dashboards' ? (
        <DashboardDndContainer
          dashboards={dashboards}
          userId={userId}
          dashboardSectionRefs={dashboardSectionRefs}
          dashboardDragId={controller.dashboardDragId}
          dashboardDropIndex={controller.dashboardDropIndex}
          setDashboardDropIndex={controller.setDashboardDropIndex}
          setDashboardDragId={controller.setDashboardDragId}
          handleDashboardDrop={controller.handleDashboardDrop}
          manageableIndexById={manageableIndexById}
          manageableDashboardIds={manageableDashboardIds}
          setDashboardHoverId={setDashboardHoverId}
          dueHighlights={dueHighlights}
          onOpenTodoByLink={openTodoByLink}
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
              interactionState={{
                editingTodoId: controller.editingTodoId,
                editingTitle: controller.editingTitle,
                editingDescription: controller.editingDescription,
                dragState: controller.dragState,
                dropTarget: controller.dropTarget,
              }}
              canManageDashboard={dashboard.userId === userId}
              actions={{
                onToggle: (dashboardId) => {
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
                },
                onDashboardDragStart: () => {
                  if (dashboard.userId !== userId) return;
                  controller.setDashboardDragId(dashboard.id);
                  const sourceIndex = manageableIndexById.get(dashboard.id);
                  controller.setDashboardDropIndex(sourceIndex ?? index);
                  setDashboardHoverId(dashboard.id);
                },
                onDashboardDragOver: (event) => {
                  event.preventDefault();
                  if (dashboard.userId !== userId) return;
                  if (!controller.dashboardDragId || !manageableIndexById.has(controller.dashboardDragId)) return;

                  const sourceIndex = manageableIndexById.get(controller.dashboardDragId);
                  const targetIndex = manageableIndexById.get(dashboard.id);
                  if (sourceIndex == null || targetIndex == null) return;

                  const nextIndex = sourceIndex < targetIndex ? targetIndex + 1 : targetIndex;
                  controller.setDashboardDropIndex(nextIndex);
                  setDashboardHoverId(dashboard.id);
                },
                onDashboardDrop: (event) => {
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
                },
                onOpenEditDashboard: controller.openEditDashboard,
                onDeleteDashboard: (dashboardId, dashboardName) =>
                  void controller.handleDeleteDashboard(dashboardId, dashboardName),
                onOpenShareDashboard: (dashboardId) => {
                  const nextDashboard = dashboards.find((item) => item.id === dashboardId);
                  if (!nextDashboard || nextDashboard.userId !== userId) return;
                  openShareModal(nextDashboard);
                },
                onArchiveAllCompleted: (dashboardId) => void controller.handleArchiveAllCompleted(dashboardId),
                onOpenCreateCard: (dashboardId, columnId) => {
                  setActiveDashboardId(dashboardId);
                  updateSearch((nextParams) => {
                    nextParams.set('dashboard', dashboardId);
                  });
                  controller.setCreateCardDashboardId(dashboardId);
                  controller.setCreateCardColumnId(columnId);
                  controller.setIsCreateModalOpen(true);
                },
                onMoveTodo: controller.handleMoveTodo,
                onSetDragState: controller.setDragState,
                onSetDropTarget: controller.setDropTarget,
                onOpenTodoModal: (todo) => {
                  openTodoByLink(todo.id, todo.boardId);
                },
                onCancelEdit: controller.cancelEdit,
                onSaveEdit: (todoId) => void controller.handleSaveEdit(todoId),
                onEditTitleChange: controller.setEditingTitle,
                onEditDescriptionChange: controller.setEditingDescription,
                onEditKeyDown: controller.handleEditKeyDown,
                onMenuEdit: (todo) => controller.startEdit(todo),
                onMenuArchive: (todoId) => void controller.handleArchiveTodo(todoId),
                onMenuDelete: (todoId) => void controller.handleDeleteTodo(todoId),
              }}
            />
          ))}
        </DashboardDndContainer>
      ) : (
        <ArchiveTodoListView
          archivedTodos={archivedTodos}
          dashboardsById={dashboardsById}
          onOpenTodoByLink={openTodoByLink}
          onUnarchiveTodo={(todoId) => {
            void controller.handleUnarchiveTodo(todoId);
          }}
          onDeleteTodo={(todoId) => {
            void controller.handleDeleteTodo(todoId);
          }}
        />
      )}

      {modalTodo && (
        <TodoModal
          todo={modalTodo}
          userId={userId}
          userEmail={userEmail}
          onClose={closeTodoLink}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
          columns={modalColumns}
        />
      )}
    </div>
  );
};

export const TodoList = (props: TodoListProps) => (
  <TodoListStoresProvider>
    <TodoListContent {...props} />
  </TodoListStoresProvider>
);
