import type { KeyboardEvent } from 'react';
import { Archive, Pencil, Share2, Trash2 } from 'lucide-react';
import { EllipsisMenu } from '../ui/EllipsisMenu';
import { IconButton } from '../ui/IconButton';

interface DashboardSectionHeaderProps {
  dashboardId: string;
  dashboardName: string;
  dashboardsLength: number;
  canManageDashboard: boolean;
  isExpanded: boolean;
  completedCount: number | null;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onDashboardDragStart?: () => void;
  onDashboardDragEnd?: () => void;
  onOpenEditDashboard: (dashboardId: string) => void;
  onDeleteDashboard: (dashboardId: string, dashboardName: string) => void;
  onOpenShareDashboard?: (dashboardId: string) => void;
  onArchiveAllCompleted?: (dashboardId: string) => void;
}

export const DashboardSectionHeader = ({
  dashboardId,
  dashboardName,
  dashboardsLength,
  canManageDashboard,
  isExpanded,
  completedCount,
  onToggle,
  onKeyDown,
  onDashboardDragStart,
  onDashboardDragEnd,
  onOpenEditDashboard,
  onDeleteDashboard,
  onOpenShareDashboard,
  onArchiveAllCompleted,
}: DashboardSectionHeaderProps) => {
  return (
    <div
      className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3"
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onKeyDown={onKeyDown}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <IconButton
          variant="neutral"
          size="sm"
          label="Drag dashboard"
          data-testid={`dashboard-drag-handle-${dashboardId}`}
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
              event.dataTransfer.setData('text/plain', dashboardId);
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

        <span className="truncate text-sm font-semibold text-slate-100">{dashboardName}</span>
      </div>

      {canManageDashboard && (
        <EllipsisMenu
          trigger={{
            label: 'Open dashboard actions',
            testId: `dashboard-actions-trigger-${dashboardId}`,
          }}
          menu={{
            testId: `dashboard-actions-menu-${dashboardId}`,
            ariaLabel: `Dashboard actions for ${dashboardName}`,
          }}
          stopPropagation
          items={[
            {
              id: 'share',
              label: 'Share',
              icon: <Share2 size={14} aria-hidden="true" />,
              onSelect: () => onOpenShareDashboard?.(dashboardId),
              testId: `share-dashboard-button-${dashboardId}`,
            },
            {
              id: 'edit',
              label: 'Edit',
              icon: <Pencil size={14} aria-hidden="true" />,
              onSelect: () => onOpenEditDashboard(dashboardId),
              testId: `edit-dashboard-button-${dashboardId}`,
            },
            {
              id: 'archive-all-completed',
              label: 'Archive all completed',
              icon: <Archive size={14} aria-hidden="true" />,
              onSelect: () => onArchiveAllCompleted?.(dashboardId),
              testId: `archive-completed-dashboard-button-${dashboardId}`,
              disabled: !isExpanded || completedCount === 0,
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <Trash2 size={14} aria-hidden="true" />,
              onSelect: () => onDeleteDashboard(dashboardId, dashboardName),
              testId: `delete-dashboard-button-${dashboardId}`,
              variant: 'danger',
              disabled: dashboardsLength <= 1,
            },
          ]}
        />
      )}
    </div>
  );
};
