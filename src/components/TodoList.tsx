import { useState } from 'react';
import { useTodos } from '../hooks/useTodos';

interface TodoListProps {
  userId: string;
}

export const TodoList = ({ userId }: TodoListProps) => {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos(userId);
  const [input, setInput] = useState('');

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await addTodo({
        title: input.trim(),
        description: '',
        completed: false,
      });
      setInput('');
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await updateTodo(id, { completed: !completed });
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id);
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-slate-300">Loading todos...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleAddTodo} className="mb-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggleTodo(todo.id, todo.completed)}
              className="size-4 accent-cyan-400"
            />
            <span
              className={`flex-1 text-sm ${
                todo.completed ? 'text-slate-400 line-through' : 'text-slate-100'
              }`}
            >
              {todo.title}
            </span>
            <button
              onClick={() => handleDeleteTodo(todo.id)}
              className="rounded-md border border-rose-300/40 bg-rose-400/10 px-2 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-400/20"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">No todos yet. Add your first task.</p>
      )}
    </div>
  );
};
