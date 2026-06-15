import { useMemo, useRef } from 'react';
import { useDashboards } from '../hooks/useDashboards';
import { useUsers } from '../hooks/useUsers';
import { TodoModal } from './TodoModal';
import { ArchiveTodoListView } from './todo-list/ArchiveTodoListView';
import { DashboardDndContainer } from './todo-list/DashboardDndContainer';
import { DashboardSection } from './todo-list/DashboardSection';
import { useDashboardSectionActions } from './todo-list/useDashboardSectionActions';
import { useTodoListDashboardSectionProps } from './todo-list/useTodoListDashboardSectionProps';
import { useTodoListDerivedData } from './todo-list/useTodoListDerivedData';
import { useTodoListModalState } from './todo-list/useTodoListModalState';
import { useTodoListShareActions } from './todo-list/useTodoListShareActions';
import { useSyncDashboardQueryParam, useTodoListUrlState } from './todo-list/useTodoListUrlState';
import { CreateCardModal, CreateDashboardModal, EditDashboardModal, ShareDashboardModal } from './todo-list/TodoListModals';
import { useTodoListBoardData } from './todo-list/useTodoListBoardData';
import { useTodoListController } from './todo-list/useTodoListController';
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
  const { archivedTodos, dueHighlights } = useTodoListDerivedData({ todos, dashboardsById });

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
  const { shareDashboardTarget, handleSaveShare } = useTodoListShareActions({
    dashboards,
    shareDashboardId,
    users,
    shareSelectedUserIds,
    shareRecipientEmails,
    usersLoading,
    usersError,
    shareDashboard,
    closeShareModal,
    setShareActionError,
  });
  const modalState = useTodoListModalState({
    controller,
    shareDashboardTarget,
    users,
    shareSelectedUserIds,
    shareRecipientEmails,
    usersLoading,
    usersError,
    shareActionError,
    closeShareModal,
    toggleShareUser,
    setShareRecipientEmails,
    handleSaveShare,
  });

  useSyncDashboardQueryParam({
    dashboardParamId,
    dashboards,
    setActiveDashboardId,
    updateSearch,
  });

  const getDashboardSectionActions = useDashboardSectionActions({
    dashboards,
    userId,
    activeDashboardId,
    setActiveDashboardId,
    updateSearch,
    controller,
    manageableIndexById,
    manageableDashboardIds,
    setDashboardHoverId,
    openShareModal,
    openTodoByLink,
  });
  const dashboardSectionViewModels = useTodoListDashboardSectionProps({
    dashboards,
    userId,
    activeDashboardId,
    dashboardHoverId,
    controller,
    columns,
    groupedTodos,
    getDashboardSectionActions,
    dashboardSectionRefs,
  });

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
        state={modalState.createDashboard.state}
        actions={modalState.createDashboard.actions}
      />

      <CreateCardModal
        state={modalState.createCard.state}
        actions={modalState.createCard.actions}
      />

      <EditDashboardModal
        state={modalState.editDashboard.state}
        actions={modalState.editDashboard.actions}
      />

      <ShareDashboardModal
        state={modalState.shareDashboard.state}
        actions={modalState.shareDashboard.actions}
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
          {dashboardSectionViewModels.map(({ dashboard, sectionRef, isExpanded, isDragging, isDropTarget, dashboardsLength, interactionState, canManageDashboard, actions }) => (
            <DashboardSection
              key={dashboard.id}
              sectionRef={sectionRef}
              dashboard={dashboard}
              isExpanded={isExpanded}
              isDragging={isDragging}
              isDropTarget={isDropTarget}
              dashboardsLength={dashboardsLength}
              columns={columns}
              groupedTodos={groupedTodos}
              interactionState={interactionState}
              canManageDashboard={canManageDashboard}
              actions={actions}
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
