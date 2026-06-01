import { useMemo } from 'react';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';

const sortByWeight = (items: Todo[]) => [...items].sort((a, b) => a.weight - b.weight);

interface UseTodoListBoardDataArgs {
  todos: Todo[];
  activeDashboard: Dashboard | null;
}

export const useTodoListBoardData = ({ todos, activeDashboard }: UseTodoListBoardDataArgs) => {
  const columns = useMemo(() => activeDashboard?.columns ?? [], [activeDashboard]);

  const todosForActiveBoard = useMemo(() => {
    if (!activeDashboard) return [];

    return todos.filter((todo) => todo.boardId === activeDashboard.id && !todo.archived);
  }, [activeDashboard, todos]);

  const groupedTodos = useMemo(() => {
    const grouped: Record<string, Todo[]> = {};

    columns.forEach((column) => {
      grouped[column.id] = [];
    });

    todosForActiveBoard.forEach((todo) => {
      const columnId = todo.columnId;
      if (!grouped[columnId]) {
        grouped[columnId] = [];
      }
      grouped[columnId].push(todo);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = sortByWeight(grouped[key]);
    });

    return grouped;
  }, [columns, todosForActiveBoard]);

  return { columns, todosForActiveBoard, groupedTodos };
};
