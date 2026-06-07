import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '../../types/dashboard';
import { DashboardDndContainer } from './DashboardDndContainer';

const dashboards: Dashboard[] = [
  {
    id: 'board-1',
    userId: 'user-1',
    name: 'Board 1',
    order: 0,
    columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'board-2',
    userId: 'user-1',
    name: 'Board 2',
    order: 1,
    columns: [{ id: 'todo2', name: 'To do', order: 0, isDone: false }],
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  },
];

const setup = (overrides?: Partial<ComponentProps<typeof DashboardDndContainer>>) => {
  const setDashboardDropIndex = vi.fn();
  const setDashboardDragId = vi.fn();
  const setDashboardHoverId = vi.fn();
  const handleDashboardDrop = vi.fn();
  const dashboardSectionRefs = {
    current: {} as Record<string, HTMLElement | null>,
  };

  render(
    <DashboardDndContainer
      dashboards={dashboards}
      userId="user-1"
      dashboardSectionRefs={dashboardSectionRefs}
      dashboardDragId="board-1"
      dashboardDropIndex={2}
      setDashboardDropIndex={setDashboardDropIndex}
      setDashboardDragId={setDashboardDragId}
      handleDashboardDrop={handleDashboardDrop}
      manageableIndexById={new Map([
        ['board-1', 0],
        ['board-2', 1],
      ])}
      manageableDashboardIds={['board-1', 'board-2']}
      setDashboardHoverId={setDashboardHoverId}
      dueHighlights={[]}
      onOpenTodoByLink={vi.fn()}
      {...(overrides ?? {})}
    >
      <div data-testid="dashboard-board-1">Board 1</div>
      <div data-testid="dashboard-board-2">Board 2</div>
    </DashboardDndContainer>,
  );

  const board1 = screen.getByTestId('dashboard-board-1');
  const board2 = screen.getByTestId('dashboard-board-2');

  dashboardSectionRefs.current['board-1'] = board1;
  dashboardSectionRefs.current['board-2'] = board2;

  vi.spyOn(board1, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    bottom: 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    toJSON: () => ({}),
  } as DOMRect);

  vi.spyOn(board2, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 120,
    top: 120,
    bottom: 220,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    toJSON: () => ({}),
  } as DOMRect);

  const container = screen.getByTestId('dashboard-dnd-container');

  return {
    board1,
    board2,
    container,
    setDashboardDropIndex,
    setDashboardDragId,
    setDashboardHoverId,
    handleDashboardDrop,
  };
};

describe('DashboardDndContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('supports dropping a dragged dashboard on the list container', () => {
    const { container, handleDashboardDrop, setDashboardHoverId } = setup();

    fireEvent.drop(container);

    expect(handleDashboardDrop).toHaveBeenCalledWith(2, undefined, ['board-1', 'board-2']);
    expect(setDashboardHoverId).toHaveBeenCalledWith(null);
  });

  it('ignores container drop when no dashboard drag is active', () => {
    const { container, handleDashboardDrop } = setup({
      dashboardDragId: null,
    });

    fireEvent.drop(container);

    expect(handleDashboardDrop).not.toHaveBeenCalled();
  });

  it('cleans drag state on drag end capture timeout', () => {
    vi.useFakeTimers();

    const { container, setDashboardDragId, setDashboardDropIndex, setDashboardHoverId } = setup();

    fireEvent.dragEnd(container);

    act(() => {
      vi.runAllTimers();
    });

    expect(setDashboardDragId).toHaveBeenCalledWith(null);
    expect(setDashboardDropIndex).toHaveBeenCalledWith(null);
    expect(setDashboardHoverId).toHaveBeenCalledWith(null);

    vi.useRealTimers();
  });
});
