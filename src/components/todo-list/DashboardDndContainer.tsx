import type { MutableRefObject, ReactNode } from 'react';
import type { Dashboard } from '../../types/dashboard';
import type { DueHighlightEntry } from './DueHighlightsBanner';
import { DueHighlightsBanner } from './DueHighlightsBanner';

interface DashboardDndContainerProps {
  dashboards: Dashboard[];
  userId: string;
  dashboardSectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  dashboardDragId: string | null;
  dashboardDropIndex: number | null;
  setDashboardDropIndex: (index: number | null) => void;
  setDashboardDragId: (dashboardId: string | null) => void;
  handleDashboardDrop: (
    targetIndex: number,
    draggedDashboardId?: string,
    manageableDashboardIds?: string[],
  ) => Promise<void> | void;
  manageableIndexById: Map<string, number>;
  manageableDashboardIds: string[];
  setDashboardHoverId: (dashboardId: string | null) => void;
  dueHighlights: DueHighlightEntry[];
  onOpenTodoByLink: (todoId: string, dashboardId: string) => void;
  children: ReactNode;
}

export const DashboardDndContainer = ({
  dashboards,
  userId,
  dashboardSectionRefs,
  dashboardDragId,
  dashboardDropIndex,
  setDashboardDropIndex,
  setDashboardDragId,
  handleDashboardDrop,
  manageableIndexById,
  manageableDashboardIds,
  setDashboardHoverId,
  dueHighlights,
  onOpenTodoByLink,
  children,
}: DashboardDndContainerProps) => {
  return (
    <div
      className="space-y-3"
      data-testid="dashboard-dnd-container"
      onDragOver={(event) => {
        event.preventDefault();
        if (!dashboardDragId || !manageableIndexById.has(dashboardDragId)) return;

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
          const sourceIndex = dashboards.findIndex((dashboard) => dashboard.id === dashboardDragId);
          const nextIndex = sourceIndex < exactMatch.index ? exactMatch.index + 1 : exactMatch.index;
          setDashboardDropIndex(nextIndex);
          setDashboardHoverId(exactMatch.id);
          return;
        }

        const firstRect = sections[0].element.getBoundingClientRect();
        if (pointerY < firstRect.top) {
          setDashboardDropIndex(0);
          setDashboardHoverId(sections[0].id);
          return;
        }

        const lastRect = sections[sections.length - 1].element.getBoundingClientRect();
        if (pointerY > lastRect.bottom) {
          setDashboardDropIndex(dashboards.length);
          setDashboardHoverId(sections[sections.length - 1].id);
          return;
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (!dashboardDragId) return;

        const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;
        const activeDragId = draggedDashboardId ?? dashboardDragId;
        if (!activeDragId || !manageableIndexById.has(activeDragId)) return;

        const targetIndex = dashboardDropIndex ?? manageableDashboardIds.length;
        void handleDashboardDrop(targetIndex, draggedDashboardId, manageableDashboardIds);
        setDashboardHoverId(null);
      }}
      onDragEndCapture={() => {
        window.setTimeout(() => {
          setDashboardDragId(null);
          setDashboardDropIndex(null);
          setDashboardHoverId(null);
        }, 0);
      }}
    >
      <DueHighlightsBanner entries={dueHighlights} onOpenTodoByLink={onOpenTodoByLink} />
      {children}
    </div>
  );
};
