import { useMemo } from 'react';
import type { Dashboard } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { getDueDateState } from '../../utils/dueDate';
import type { DueHighlightEntry } from './DueHighlightsBanner';

interface UseTodoListDerivedDataArgs {
  todos: Todo[];
  dashboardsById: Map<string, Dashboard>;
}

interface UseTodoListDerivedDataResult {
  archivedTodos: Todo[];
  dueHighlights: DueHighlightEntry[];
}

export const useTodoListDerivedData = ({
  todos,
  dashboardsById,
}: UseTodoListDerivedDataArgs): UseTodoListDerivedDataResult => {
  const archivedTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.archived)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [todos],
  );

  const dueHighlights = useMemo(() => {
    const now = new Date();
    type HighlightDueState = DueHighlightEntry['dueState'];
    const rankByState = (state: ReturnType<typeof getDueDateState>) => {
      if (state === 'overdue') return 0;
      if (state === 'due_today') return 1;
      if (state === 'due_tomorrow') return 2;
      return 3;
    };

    return todos
      .filter(
        (todo) =>
          !todo.archived
          && Boolean(todo.dueDate)
          && Boolean(todo.remindOneDayBefore)
          && !(todo.isCompleted ?? todo.status === 'done'),
      )
      .map((todo) => ({
        todo,
        dueState: getDueDateState(todo, now),
      }))
      .filter((entry): entry is { todo: Todo; dueState: HighlightDueState } => (
        entry.dueState === 'overdue' || entry.dueState === 'due_today' || entry.dueState === 'due_tomorrow'
      ))
      .map((todo) => {
        const dashboardName = dashboardsById.get(todo.todo.boardId)?.name ?? 'Unknown dashboard';
        const dueState = todo.dueState;
        const dueText = dueState === 'overdue'
          ? `was due on ${todo.todo.dueDate}`
          : dueState === 'due_today'
            ? 'is due today'
            : dueState === 'due_tomorrow'
              ? 'is due tomorrow'
              : 'is due';

        return {
          todo: todo.todo,
          dashboardName,
          dueText,
          dueState,
          rank: rankByState(dueState),
          sortDate: todo.todo.dueDate ?? '9999-99-99',
        };
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.sortDate.localeCompare(b.sortDate);
      })
      .slice(0, 8);
  }, [dashboardsById, todos]);

  return {
    archivedTodos,
    dueHighlights,
  };
};