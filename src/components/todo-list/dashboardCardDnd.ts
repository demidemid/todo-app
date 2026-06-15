import type React from 'react';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface BuildCardDropHandlersParams {
  columnId: string;
  cardIndex: number;
  dragState: DragState | null;
  onSetDropTarget: (state: DropTarget | null) => void;
  onMoveTodo: (todoId: string, targetColumnId: string, targetIndex: number) => void;
  onSetDragState: (state: DragState | null) => void;
}

export const resolveCardDropIndex = (
  event: React.DragEvent<HTMLElement>,
  baseIndex: number,
): number => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.height <= 0) return baseIndex;

  const midpointY = rect.top + rect.height / 2;
  return event.clientY > midpointY ? baseIndex + 1 : baseIndex;
};

export const buildCardDropHandlers = ({
  columnId,
  cardIndex,
  dragState,
  onSetDropTarget,
  onMoveTodo,
  onSetDragState,
}: BuildCardDropHandlersParams) => ({
  onDragOver: (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragState) return;

    const targetIndex = resolveCardDropIndex(event, cardIndex);
    onSetDropTarget({ columnId, index: targetIndex });
  },
  onDrop: (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragState) return;

    const targetIndex = resolveCardDropIndex(event, cardIndex);
    void onMoveTodo(dragState.todoId, columnId, targetIndex);
    onSetDragState(null);
    onSetDropTarget(null);
  },
});
