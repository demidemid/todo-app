import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { useTodoListBoardData } from './useTodoListBoardData';

const dashboard: Dashboard = {
  id: 'board-1',
  userId: 'user-1',
  name: 'Main board',
  order: 0,
  columns: [
    { id: 'todo', name: 'To do', order: 0, isDone: false },
    { id: 'done', name: 'Done', order: 1, isDone: true },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const todos: Todo[] = [
  {
    id: 't-1',
    userId: 'user-1',
    title: 'A',
    description: '',
    status: 'todo',
    boardId: 'board-1',
    columnId: 'todo',
    weight: 3000,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 't-2',
    userId: 'user-1',
    title: 'B',
    description: '',
    status: 'todo',
    boardId: 'board-1',
    columnId: 'todo',
    weight: 1000,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 't-3',
    userId: 'user-1',
    title: 'Foreign board',
    description: '',
    status: 'todo',
    boardId: 'board-2',
    columnId: 'todo',
    weight: 500,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 't-4',
    userId: 'user-1',
    title: 'Unknown column',
    description: '',
    status: 'blocked',
    boardId: 'board-1',
    columnId: 'blocked',
    weight: 2000,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

describe('useTodoListBoardData', () => {
  it('returns empty values when no active dashboard is selected', () => {
    const { result } = renderHook(() =>
      useTodoListBoardData({ todos, activeDashboard: null }),
    );

    expect(result.current.columns).toEqual([]);
    expect(result.current.todosForActiveBoard).toEqual([]);
    expect(result.current.groupedTodos).toEqual({});
  });

  it('filters todos by active board and sorts each group by weight', () => {
    const { result } = renderHook(() =>
      useTodoListBoardData({ todos, activeDashboard: dashboard }),
    );

    expect(result.current.todosForActiveBoard.map((todo) => todo.id)).toEqual(['t-1', 't-2', 't-4']);
    expect(result.current.groupedTodos.todo.map((todo) => todo.id)).toEqual(['t-2', 't-1']);
    expect(result.current.groupedTodos.done).toEqual([]);
  });

  it('creates a group for todos whose column is not present in dashboard columns', () => {
    const { result } = renderHook(() =>
      useTodoListBoardData({ todos, activeDashboard: dashboard }),
    );

    expect(result.current.groupedTodos.blocked.map((todo) => todo.id)).toEqual(['t-4']);
  });
});
