import { useCallback } from 'react';
import type { Dispatch, DragEvent, SetStateAction } from 'react';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import type { useTodoListController } from './useTodoListController';

interface UseDashboardSectionActionsArgs {
  dashboards: Dashboard[];
  userId: string;
  activeDashboardId: string | null;
  setActiveDashboardId: Dispatch<SetStateAction<string | null>>;
  updateSearch: (updater: (nextParams: URLSearchParams) => void) => void;
  controller: ReturnType<typeof useTodoListController>;
  manageableIndexById: Map<string, number>;
  manageableDashboardIds: string[];
  setDashboardHoverId: (dashboardId: string | null) => void;
  openShareModal: (dashboard: Dashboard) => void;
  openTodoByLink: (todoId: string, dashboardId: string) => void;
}

export const useDashboardSectionActions = ({
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
}: UseDashboardSectionActionsArgs) => {
  return useCallback((dashboard: Dashboard, index: number) => ({
    onToggle: (dashboardId: string) => {
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
    onDashboardDragOver: (event: DragEvent<HTMLElement>) => {
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
    onDashboardDrop: (event: DragEvent<HTMLElement>) => {
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
    onDeleteDashboard: (dashboardId: string, dashboardName: string) =>
      void controller.handleDeleteDashboard(dashboardId, dashboardName),
    onOpenShareDashboard: (dashboardId: string) => {
      const nextDashboard = dashboards.find((item) => item.id === dashboardId);
      if (!nextDashboard || nextDashboard.userId !== userId) return;
      openShareModal(nextDashboard);
    },
    onArchiveAllCompleted: (dashboardId: string) => void controller.handleArchiveAllCompleted(dashboardId),
    onOpenCreateCard: (dashboardId: string, columnId: string) => {
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
    onOpenTodoModal: (todo: Todo) => {
      openTodoByLink(todo.id, todo.boardId);
    },
    onCancelEdit: controller.cancelEdit,
    onSaveEdit: (todoId: string) => void controller.handleSaveEdit(todoId),
    onEditTitleChange: controller.setEditingTitle,
    onEditDescriptionChange: controller.setEditingDescription,
    onEditKeyDown: controller.handleEditKeyDown,
    onMenuEdit: (todo: Todo) => controller.startEdit(todo),
    onMenuArchive: (todoId: string) => void controller.handleArchiveTodo(todoId),
    onMenuClone: (todoId: string) => void controller.handleCloneTodo(todoId),
    onMenuDelete: (todoId: string) => void controller.handleDeleteTodo(todoId),
  }), [
    activeDashboardId,
    controller,
    dashboards,
    manageableDashboardIds,
    manageableIndexById,
    openShareModal,
    openTodoByLink,
    setActiveDashboardId,
    setDashboardHoverId,
    updateSearch,
    userId,
  ]);
};

export type DashboardSectionActionsFactory = ReturnType<typeof useDashboardSectionActions>;
export type DashboardSectionActions = ReturnType<DashboardSectionActionsFactory>;