import { useState, useRef } from 'react';
import { TodoModal } from './TodoModal';
import { CardMenu } from './CardMenu';
import { useTodos } from '../hooks/useTodos';
import type { Todo, TodoStatus } from '../types/todo';

interface TodoListProps {
  userId: string;
  userEmail?: string;
}

interface DragState {
  todoId: string;
}

interface DropTarget {
  status: TodoStatus;
  index: number;
}

const COLUMNS: Array<{ status: TodoStatus; title: string }> = [
  { status: 'todo', title: 'To do' },
  { status: 'in_progress', title: 'In progress' },
  { status: 'done', title: 'Done' },
];

const sortByWeight = (items: Todo[]) => [...items].sort((a, b) => a.weight - b.weight);

export const TodoList = ({ userId, userEmail }: TodoListProps) => {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos(userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [modalTodo, setModalTodo] = useState<Todo | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const groupedTodos: Record<TodoStatus, Todo[]> = {
    todo: sortByWeight(todos.filter((todo) => todo.status === 'todo')),
    in_progress: sortByWeight(todos.filter((todo) => todo.status === 'in_progress')),
    done: sortByWeight(todos.filter((todo) => todo.status === 'done')),
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) return;

    try {
      await addTodo({
        title: normalizedTitle,
        description: normalizedDescription,
      });
      setTitle('');
      setDescription('');
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const handleMoveTodo = async (todoId: string, targetStatus: TodoStatus, targetIndex: number) => {
    const draggedTodo = todos.find((todo) => todo.id === todoId);
    if (!draggedTodo) return;

    const sourceStatus = draggedTodo.status;
    const sourceTodos = groupedTodos[sourceStatus].filter((todo) => todo.id !== todoId);
    const targetTodos =
      sourceStatus === targetStatus
        ? sourceTodos
        : groupedTodos[targetStatus].filter((todo) => todo.id !== todoId);

    const safeIndex = Math.max(0, Math.min(targetIndex, targetTodos.length));

    const movedTodo: Todo = {
      ...draggedTodo,
      status: targetStatus,
      completed: targetStatus === 'done',
    };

    const nextTargetTodos = [...targetTodos];
    nextTargetTodos.splice(safeIndex, 0, movedTodo);

    const updates: Array<Promise<void>> = [];

    nextTargetTodos.forEach((todo, index) => {
      const nextWeight = (index + 1) * 1000;
      const shouldUpdate =
        todo.id === movedTodo.id || todo.weight !== nextWeight || todo.status !== targetStatus;

      if (shouldUpdate) {
        updates.push(
          updateTodo(todo.id, {
            status: targetStatus,
            completed: targetStatus === 'done',
            weight: nextWeight,
          })
        );
      }
    });

    if (sourceStatus !== targetStatus) {
      sourceTodos.forEach((todo, index) => {
        const nextWeight = (index + 1) * 1000;
        if (todo.weight !== nextWeight) {
          updates.push(
            updateTodo(todo.id, {
              weight: nextWeight,
            })
          );
        }
      });
    }

    try {
      await Promise.all(updates);
    } catch (err) {
      console.error('Error moving todo:', err);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
    setEditingDescription(todo.description ?? '');
  };

  const cancelEdit = () => {
    setEditingTodoId(null);
    setEditingTitle('');
    setEditingDescription('');
  };

  const handleSaveEdit = async (todoId: string) => {
    const normalizedTitle = editingTitle.trim();
    const normalizedDescription = editingDescription.trim();

    if (!normalizedTitle) {
      return;
    }

    try {
      await updateTodo(todoId, {
        title: normalizedTitle,
        description: normalizedDescription,
      });
      cancelEdit();
    } catch (err) {
      console.error('Error updating todo content:', err);
    }
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, todoId: string) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleSaveEdit(todoId);
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
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="new-card-button"
          className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300"
        >
          New card
        </button>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <form
            onSubmit={handleAddTodo}
            data-testid="create-card-modal"
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-white">Create new card</h3>

            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="create-card-title"
              placeholder="Task title"
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              autoFocus
            />

            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="create-card-description"
              placeholder="Optional details"
              rows={4}
              className="mb-5 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                data-testid="create-card-cancel"
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="create-card-submit"
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
              >
                Add card
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTodos = groupedTodos[column.status];

          return (
            <section
              key={column.status}
              data-testid={`column-${column.status}`}
              className="rounded-xl border border-white/10 bg-slate-800/50 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragState) return;

                void handleMoveTodo(dragState.todoId, column.status, columnTodos.length);
                setDragState(null);
                setDropTarget(null);
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{column.title}</h3>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                  {columnTodos.length}
                </span>
              </div>

              <div className="space-y-2">
                {columnTodos.map((todo, index) => (
                  <div key={todo.id}>
                    <div
                      data-testid={`drop-${column.status}-${index}`}
                      className={`h-2 rounded border border-dashed transition-all duration-150 ${
                        dropTarget?.status === column.status && dropTarget.index === index
                          ? 'animate-pulse border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                          : 'border-cyan-200/20 bg-cyan-300/10'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropTarget({ status: column.status, index });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!dragState) return;

                        void handleMoveTodo(dragState.todoId, column.status, index);
                        setDragState(null);
                        setDropTarget(null);
                      }}
                    />

                    <article
                      data-testid={`card-${todo.id}`}
                      draggable={editingTodoId !== todo.id}
                      onDragStart={() => setDragState({ todoId: todo.id })}
                      onDragEnd={() => {
                        setDragState(null);
                        setDropTarget(null);
                      }}
                      onClick={() => {
                        if (editingTodoId !== todo.id) setModalTodo(todo);
                      }}
                      className={`rounded-lg border border-white/10 bg-slate-900/70 p-3 select-none transition-shadow duration-150 hover:shadow-lg ${
                        editingTodoId === todo.id ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      {editingTodoId === todo.id ? (
                        <div>
                          <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Title</label>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
                            data-testid={`edit-title-${todo.id}`}
                            className="mb-3 w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
                            autoFocus
                          />

                          <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Description</label>
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
                            data-testid={`edit-description-${todo.id}`}
                            rows={3}
                            className="mb-3 w-full resize-none rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              data-testid={`edit-cancel-${todo.id}`}
                              className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveEdit(todo.id)}
                              data-testid={`edit-save-${todo.id}`}
                              className="rounded-md bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-900 transition hover:bg-cyan-300"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{todo.title}</p>
                            {todo.description && (
                              <p className="mt-1 text-xs text-slate-300">{todo.description}</p>
                            )}
                          </div>
                          <div className="relative flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Open menu"
                              data-testid={`card-menu-trigger-${todo.id}`}
                              className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                              onClick={e => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === todo.id ? null : todo.id);
                              }}
                              ref={el => {
                                menuButtonRefs.current[todo.id] = el;
                                if (el && menuOpenId === todo.id) el.focus();
                              }}
                            >
                              <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
                                <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                                <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                                <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                              </svg>
                            </button>
                            {menuOpenId === todo.id && (
                              <CardMenu
                                anchorRef={menuButtonRefs}
                                anchorId={todo.id}
                                onEdit={() => {
                                  setMenuOpenId(null);
                                  startEdit(todo);
                                }}
                                onDelete={() => {
                                  setMenuOpenId(null);
                                  handleDeleteTodo(todo.id);
                                }}
                                onClose={() => setMenuOpenId(null)}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  </div>
                ))}

                <div
                  data-testid={`drop-${column.status}-end`}
                  className={`h-3 rounded border border-dashed transition-all duration-150 ${
                    dropTarget?.status === column.status && dropTarget.index === columnTodos.length
                      ? 'animate-pulse border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                      : 'border-white/20 bg-white/5'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTarget({ status: column.status, index: columnTodos.length });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!dragState) return;

                    void handleMoveTodo(dragState.todoId, column.status, columnTodos.length);
                    setDragState(null);
                    setDropTarget(null);
                  }}
                />
              </div>
            </section>
          );
        })}
      </div>

      {todos.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">No cards yet. Add your first task.</p>
      )}

      {modalTodo && (
        <TodoModal
          todo={modalTodo}
          userId={userId}
          userEmail={userEmail}
          onClose={() => setModalTodo(null)}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
        />
      )}
    </div>
  );
};
