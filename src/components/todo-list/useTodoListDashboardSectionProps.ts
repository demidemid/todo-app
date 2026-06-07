import { useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import type { useTodoListController } from './useTodoListController';
import type { DashboardSectionActions, DashboardSectionActionsFactory } from './useDashboardSectionActions';

interface DashboardSectionInteractionState {
  editingTodoId: string | null;
  editingTitle: string;
  editingDescription: string;
  dragState: { todoId: string } | null;
  dropTarget: { columnId: string; index: number } | null;
}

interface UseTodoListDashboardSectionPropsArgs {
  dashboards: Dashboard[];
  userId: string;
  activeDashboardId: string | null;
  dashboardHoverId: string | null;
  controller: ReturnType<typeof useTodoListController>;
  columns: DashboardColumn[];
  groupedTodos: Record<string, Todo[]>;
  getDashboardSectionActions: DashboardSectionActionsFactory;
  dashboardSectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}

interface DashboardSectionViewModel {
  dashboard: Dashboard;
  sectionRef: (element: HTMLElement | null) => void;
  isExpanded: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dashboardsLength: number;
  columns: DashboardColumn[];
  groupedTodos: Record<string, Todo[]>;
  interactionState: DashboardSectionInteractionState;
  canManageDashboard: boolean;
  actions: DashboardSectionActions;
}

export const useTodoListDashboardSectionProps = ({
  dashboards,
  userId,
  activeDashboardId,
  dashboardHoverId,
  controller,
  columns,
  groupedTodos,
  getDashboardSectionActions,
  dashboardSectionRefs,
}: UseTodoListDashboardSectionPropsArgs): DashboardSectionViewModel[] => {
  return useMemo(() => dashboards.map((dashboard, index) => ({
    dashboard,
    sectionRef: (element: HTMLElement | null) => {
      dashboardSectionRefs.current[dashboard.id] = element;
    },
    isExpanded: activeDashboardId === dashboard.id,
    isDragging: controller.dashboardDragId === dashboard.id,
    isDropTarget:
      dashboard.userId === userId
      && dashboardHoverId === dashboard.id
      && controller.dashboardDragId !== dashboard.id,
    dashboardsLength: dashboards.length,
    columns,
    groupedTodos,
    interactionState: {
      editingTodoId: controller.editingTodoId,
      editingTitle: controller.editingTitle,
      editingDescription: controller.editingDescription,
      dragState: controller.dragState,
      dropTarget: controller.dropTarget,
    },
    canManageDashboard: dashboard.userId === userId,
    actions: getDashboardSectionActions(dashboard, index),
  })), [
    activeDashboardId,
    columns,
    controller,
    dashboardHoverId,
    dashboardSectionRefs,
    dashboards,
    getDashboardSectionActions,
    groupedTodos,
    userId,
  ]);
};