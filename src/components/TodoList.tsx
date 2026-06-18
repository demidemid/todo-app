import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
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

const DASHBOARD_ACTION_ERROR_TIMEOUT_MS = 10000;
const DASHBOARD_ACTION_ERROR_EXIT_ANIMATION_MS = 300;

interface DashboardActionErrorBannerProps {
  message: string;
  onTimeout: () => void;
}

const DashboardActionErrorBanner = ({ message, onTimeout }: DashboardActionErrorBannerProps) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);
  const handleTimeout = useEffectEvent(onTimeout);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
      setProgress(0);
    });

    const startExitAfter = DASHBOARD_ACTION_ERROR_TIMEOUT_MS;

    const exitTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, startExitAfter);

    const closeTimer = window.setTimeout(() => {
      handleTimeout();
    }, DASHBOARD_ACTION_ERROR_TIMEOUT_MS + DASHBOARD_ACTION_ERROR_EXIT_ANIMATION_MS);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(exitTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <div
      className={`fixed left-1/2 top-4 z-50 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-rose-300/30 bg-slate-950/80 text-sm text-rose-200 shadow-lg shadow-rose-950/20 ring-1 ring-black/10 backdrop-blur-md transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      data-testid="dashboard-action-error"
    >
      <div className="bg-rose-400/10 p-3">{message}</div>
      <div className="h-1 w-full bg-rose-200/8" aria-hidden="true">
        <div
          className="h-full bg-rose-300/55 transition-[width] ease-linear"
          data-testid="dashboard-action-error-progress"
          style={{
            width: `${progress}%`,
            transitionDuration: `${DASHBOARD_ACTION_ERROR_TIMEOUT_MS}ms`,
          }}
        />
      </div>
    </div>
  );
};

interface TodoListProps {
  userId: string;
  userEmail?: string;
  viewMode?: TodoListViewMode;
  tagFilters?: string[];
  onAddTagFilter?: (tag: string) => void;
  onAvailableTagsChange?: (tags: string[]) => void;
}

const normalizeTags = (tags: string[] | undefined): string[] => {
  if (!Array.isArray(tags)) return [];

  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalizedTags));
};

const TodoListContent = ({
  userId,
  userEmail,
  viewMode = 'dashboards',
  tagFilters = [],
  onAddTagFilter,
  onAvailableTagsChange,
}: TodoListProps) => {
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
  const normalizedSelectedTagFilters = useMemo(() => normalizeTags(tagFilters), [tagFilters]);
  const allAvailableTags = useMemo(() => {
    const normalizedTags = todos
      .flatMap((item) => item.tags ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return Array.from(new Set(normalizedTags)).sort((left, right) => left.localeCompare(right));
  }, [todos]);

  useEffect(() => {
    onAvailableTagsChange?.(allAvailableTags);
  }, [allAvailableTags, onAvailableTagsChange]);

  const todosWithTagFilter = useMemo(() => {
    if (normalizedSelectedTagFilters.length === 0) {
      return todos;
    }

    return todos.filter((todo) => {
      const todoTags = normalizeTags(todo.tags);
      return normalizedSelectedTagFilters.some((tag) => todoTags.includes(tag));
    });
  }, [todos, normalizedSelectedTagFilters]);

  useDueDateReminders({ todos, updateTodo });
  const { users, loading: usersLoading, error: usersError } = useUsers(userId);
  const dashboardsById = useMemo(
    () => new Map(dashboards.map((dashboard) => [dashboard.id, dashboard])),
    [dashboards]
  );
  const { archivedTodos, dueHighlights } = useTodoListDerivedData({ todos: todosWithTagFilter, dashboardsById });

  const { columns, groupedTodos } = useTodoListBoardData({ todos: todosWithTagFilter, activeDashboard });
  const manageableDashboardIds = useMemo(
    () => dashboards.filter((dashboard) => dashboard.userId === userId).map((dashboard) => dashboard.id),
    [dashboards, userId]
  );
  const manageableIndexById = useMemo(
    () => new Map(manageableDashboardIds.map((id, index) => [id, index])),
    [manageableDashboardIds]
  );

  const controller = useTodoListController({
    todos: todosWithTagFilter,
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
  const availableTags = allAvailableTags;
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
        <DashboardActionErrorBanner
          key={controller.dashboardActionError}
          message={controller.dashboardActionError}
          onTimeout={() => controller.setDashboardActionError('')}
        />
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
              onAddTagFilter={onAddTagFilter}
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
          availableTags={availableTags}
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
