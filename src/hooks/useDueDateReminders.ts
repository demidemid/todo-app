import { useEffect, useRef } from 'react';
import type { Todo } from '../types/todo';
import { shouldFireScheduledReminder } from '../utils/dueDate';

interface UseDueDateRemindersArgs {
  todos: Todo[];
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
}

const sendReminder = (todo: Todo) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (window.Notification.permission !== 'granted') {
    return;
  }

  new window.Notification('Task reminder', {
    body: `Due tomorrow: ${todo.title}`,
  });
};

export const useDueDateReminders = ({ todos, updateTodo }: UseDueDateRemindersArgs) => {
  const processingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const run = () => {
      const now = new Date();

      todos.forEach((todo) => {
        if (processingIdsRef.current.has(todo.id)) {
          return;
        }

        if (!shouldFireScheduledReminder(todo, now)) {
          return;
        }

        processingIdsRef.current.add(todo.id);

        void (async () => {
          try {
            await updateTodo(todo.id, { reminderScheduledAt: null });
            sendReminder(todo);
          } finally {
            processingIdsRef.current.delete(todo.id);
          }
        })();
      });
    };

    run();
    const timer = window.setInterval(run, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [todos, updateTodo]);
};
