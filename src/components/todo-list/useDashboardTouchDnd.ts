import { useEffect, useRef, useState } from 'react';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface PendingTouchDrag {
  todoId: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  activated: boolean;
  holdTimer: number | null;
}

const TOUCH_DRAG_HOLD_MS = 160;
const TOUCH_DRAG_CANCEL_DISTANCE_PX = 10;

interface TouchDragPreview {
  todoId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

interface UseDashboardTouchDndParams {
  editingTodoId: string | null;
  dropTarget: DropTarget | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onMoveTodo: (todoId: string, targetColumnId: string, targetIndex: number) => void;
  onSetDragState: (state: DragState | null) => void;
  onSetDropTarget: (state: DropTarget | null) => void;
}

export const useDashboardTouchDnd = ({
  editingTodoId,
  dropTarget,
  scrollContainerRef,
  onMoveTodo,
  onSetDragState,
  onSetDropTarget,
}: UseDashboardTouchDndParams) => {
  const touchDragRef = useRef<{ todoId: string; moved: boolean } | null>(null);
  const pendingTouchDragRef = useRef<PendingTouchDrag | null>(null);
  const suppressCardClickUntilRef = useRef(0);
  const [touchDraggingTodoId, setTouchDraggingTodoId] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<TouchDragPreview | null>(null);

  const clearPendingTouchDrag = () => {
    const pending = pendingTouchDragRef.current;
    if (pending?.holdTimer != null) {
      window.clearTimeout(pending.holdTimer);
    }
    pendingTouchDragRef.current = null;
  };

  const resetTouchDragState = () => {
    onSetDragState(null);
    onSetDropTarget(null);
    touchDragRef.current = null;
    clearPendingTouchDrag();
    setTouchDraggingTodoId(null);
    setTouchDragPreview(null);
  };

  const applyTouchEdgeAutoScroll = (scrollContainer: HTMLDivElement | null, clientX: number, clientY: number) => {
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const threshold = Math.max(28, Math.min(96, rect.width * 0.16));

    let delta = 0;
    if (clientX < rect.left + threshold) {
      const intensity = (rect.left + threshold - clientX) / threshold;
      delta = -Math.max(1, Math.round(18 * intensity));
    } else if (clientX > rect.right - threshold) {
      const intensity = (clientX - (rect.right - threshold)) / threshold;
      delta = Math.max(1, Math.round(18 * intensity));
    }

    if (delta !== 0) {
      scrollContainer.scrollLeft += delta;
    }

    const viewportHeight = window.innerHeight || 0;
    if (viewportHeight <= 0 || typeof window.scrollBy !== 'function') return;

    const verticalThreshold = Math.max(36, Math.min(120, viewportHeight * 0.12));
    let deltaY = 0;

    if (clientY < verticalThreshold) {
      const intensity = (verticalThreshold - clientY) / verticalThreshold;
      deltaY = -Math.max(1, Math.round(16 * intensity));
    } else if (clientY > viewportHeight - verticalThreshold) {
      const intensity = (clientY - (viewportHeight - verticalThreshold)) / verticalThreshold;
      deltaY = Math.max(1, Math.round(16 * intensity));
    }

    if (deltaY !== 0) {
      window.scrollBy(0, deltaY);
    }
  };

  const resolveTouchDropTarget = (clientX: number, clientY: number): DropTarget | null => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;

    const cardElement = element.closest<HTMLElement>('[data-touch-card-id]');
    if (cardElement) {
      const columnId = cardElement.dataset.touchColumnId;
      const baseIndexRaw = cardElement.dataset.touchCardIndex;
      const baseIndex = baseIndexRaw != null ? Number(baseIndexRaw) : NaN;
      if (!columnId || Number.isNaN(baseIndex)) return null;

      const rect = cardElement.getBoundingClientRect();
      const midpointY = rect.top + rect.height / 2;
      return {
        columnId,
        index: clientY > midpointY ? baseIndex + 1 : baseIndex,
      };
    }

    const columnElement = element.closest<HTMLElement>('[data-touch-column-id]');
    if (columnElement) {
      const columnId = columnElement.dataset.touchColumnId;
      const columnLengthRaw = columnElement.dataset.touchColumnLength;
      const columnLength = columnLengthRaw != null ? Number(columnLengthRaw) : 0;
      if (!columnId || Number.isNaN(columnLength)) return null;

      return {
        columnId,
        index: columnLength,
      };
    }

    return null;
  };

  useEffect(() => () => {
    clearPendingTouchDrag();
  }, []);

  const getTouchCardHandlers = (
    todoId: string,
    onCardOpen: () => void,
  ) => ({
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
      if (editingTodoId === todoId) return;
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      if (!touch) return;
      const rect = event.currentTarget.getBoundingClientRect();

      clearPendingTouchDrag();

      const pending: PendingTouchDrag = {
        todoId,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        width: rect.width,
        height: rect.height,
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top,
        activated: false,
        holdTimer: null,
      };

      pending.holdTimer = window.setTimeout(() => {
        const currentPending = pendingTouchDragRef.current;
        if (!currentPending || currentPending.todoId !== todoId) return;

        currentPending.activated = true;
        touchDragRef.current = { todoId, moved: false };
        setTouchDraggingTodoId(todoId);
        setTouchDragPreview({
          todoId,
          x: currentPending.lastX,
          y: currentPending.lastY,
          width: currentPending.width,
          height: currentPending.height,
          offsetX: currentPending.offsetX,
          offsetY: currentPending.offsetY,
        });
        onSetDragState({ todoId });
      }, TOUCH_DRAG_HOLD_MS);

      pendingTouchDragRef.current = pending;
    },
    onTouchMove: (event: React.TouchEvent<HTMLElement>) => {
      if (editingTodoId === todoId) return;
      const pendingTouchDrag = pendingTouchDragRef.current;
      if (!pendingTouchDrag || pendingTouchDrag.todoId !== todoId) return;

      const touch = event.touches[0];
      if (!touch) return;

      pendingTouchDrag.lastX = touch.clientX;
      pendingTouchDrag.lastY = touch.clientY;

      if (!pendingTouchDrag.activated) {
        const movedDistance = Math.hypot(
          touch.clientX - pendingTouchDrag.startX,
          touch.clientY - pendingTouchDrag.startY,
        );
        if (movedDistance > TOUCH_DRAG_CANCEL_DISTANCE_PX) {
          clearPendingTouchDrag();
        }
        return;
      }

      const touchDrag = touchDragRef.current;
      if (!touchDrag || touchDrag.todoId !== todoId) return;

      event.preventDefault();

      setTouchDragPreview((prev) => (prev
        ? { ...prev, x: touch.clientX, y: touch.clientY }
        : prev
      ));

      applyTouchEdgeAutoScroll(scrollContainerRef.current, touch.clientX, touch.clientY);

      const target = resolveTouchDropTarget(touch.clientX, touch.clientY);
      if (target) {
        touchDrag.moved = true;
        onSetDropTarget(target);
      }
    },
    onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
      if (editingTodoId === todoId) return;
      const pendingTouchDrag = pendingTouchDragRef.current;
      if (!pendingTouchDrag || pendingTouchDrag.todoId !== todoId) return;

      if (!pendingTouchDrag.activated) {
        clearPendingTouchDrag();
        return;
      }

      const touchDrag = touchDragRef.current;
      if (!touchDrag || touchDrag.todoId !== todoId) return;

      if (touchDrag.moved) {
        event.preventDefault();
      }

      const changedTouch = event.changedTouches[0];
      const resolvedTarget = changedTouch
        ? resolveTouchDropTarget(changedTouch.clientX, changedTouch.clientY)
        : null;
      const target = resolvedTarget ?? dropTarget;

      if (touchDrag.moved && target) {
        void onMoveTodo(todoId, target.columnId, target.index);
        suppressCardClickUntilRef.current = Date.now() + 250;
      }

      resetTouchDragState();
    },
    onTouchCancel: () => {
      resetTouchDragState();
    },
    onClick: () => {
      if (Date.now() < suppressCardClickUntilRef.current) return;
      if (editingTodoId !== todoId) onCardOpen();
    },
  });

  return {
    touchDraggingTodoId,
    touchDragPreview,
    getTouchCardHandlers,
  };
};
