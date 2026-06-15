import { MessageCircle } from 'lucide-react';
import type { DueDateState } from '../../utils/dueDate';
import { TodoCardDueDateBadge } from './TodoCardDueDateBadge';

interface TouchDragPreviewPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

interface DashboardTouchDragPreviewProps {
  preview: TouchDragPreviewPosition | null;
  title: string | null;
  dueLabel: string | null;
  dueState: DueDateState | null;
  checklistTitle: string | null;
  checklistClosed: number;
  checklistTotal: number;
  checklistPalette: string | null;
  commentsCount: number;
}

export const DashboardTouchDragPreview = ({
  preview,
  title,
  dueLabel,
  dueState,
  checklistTitle,
  checklistClosed,
  checklistTotal,
  checklistPalette,
  commentsCount,
}: DashboardTouchDragPreviewProps) => {
  if (!preview || !title) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-[120] overflow-hidden rounded-lg border border-cyan-300/60 bg-slate-900/90 p-3 pb-8 text-sm font-semibold text-cyan-100 shadow-2xl shadow-cyan-900/40"
      style={{
        left: preview.x - preview.offsetX,
        top: preview.y - preview.offsetY,
        width: preview.width,
        height: preview.height,
      }}
      data-testid="touch-drag-preview"
      aria-hidden="true"
    >
      <div className="flex h-full flex-col justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-slate-100">{title}</p>
          <div className="mt-2">
            <TodoCardDueDateBadge dueLabel={dueLabel} dueState={dueState} />
          </div>
          {checklistTitle && checklistPalette && (
            <div
              className={`mt-2 inline-flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] font-medium ${checklistPalette}`}
            >
              <span className="truncate">{checklistTitle}</span>
              <span className="shrink-0">{checklistClosed}/{checklistTotal}</span>
            </div>
          )}
        </div>
        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90">
          <MessageCircle size={12} className="text-white/90" aria-hidden="true" />
          <span>{commentsCount}</span>
        </div>
      </div>
    </div>
  );
};
