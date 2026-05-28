import { useMemo, useRef, useState } from 'react';
import { TodoModal } from './TodoModal';
import { CardMenu } from './CardMenu';
import { useTodos } from '../hooks/useTodos';
import { useDashboards } from '../hooks/useDashboards';
import type { DashboardColumn } from '../types/dashboard';
import type { Todo } from '../types/todo';

interface TodoListProps {
  userId: string;
  userEmail?: string;
}

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

const sortByWeight = (items: Todo[]) => [...items].sort((a, b) => a.weight - b.weight);

const hasDuplicateColumnNames = (columnNames: string[]) => {
  const seen = new Set<string>();

  for (const name of columnNames) {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized) continue;

    if (seen.has(normalized)) {
      return true;
    }

    seen.add(normalized);
  }

  return false;
};

export const TodoList = ({ userId, userEmail }: TodoListProps) => {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos(userId);
  const {
    dashboards,
    activeDashboard,
    activeDashboardId,
    setActiveDashboardId,
    loading: dashboardsLoading,
    error: dashboardsError,
    addDashboard,
    updateDashboard,
    deleteDashboard,
  } = useDashboards(userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCardDashboardId, setCreateCardDashboardId] = useState<string | null>(null);
  const [createCardColumnId, setCreateCardColumnId] = useState<string | null>(null);
  const [isCreateDashboardModalOpen, setIsCreateDashboardModalOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [columnDraft, setColumnDraft] = useState('');
  const [dashboardColumns, setDashboardColumns] = useState<string[]>([]);
  const [dashboardFormError, setDashboardFormError] = useState('');
  const [dashboardActionError, setDashboardActionError] = useState('');
  const [isEditDashboardModalOpen, setIsEditDashboardModalOpen] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);
  const [editingDashboardName, setEditingDashboardName] = useState('');
  const [editingDashboardColumns, setEditingDashboardColumns] = useState<DashboardColumn[]>([]);
  const [editingColumnDraft, setEditingColumnDraft] = useState('');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [modalTodo, setModalTodo] = useState<Todo | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const columns = useMemo(() => activeDashboard?.columns ?? [], [activeDashboard]);

  const todosForActiveBoard = useMemo(() => {
    if (!activeDashboard) return [];

    return todos.filter((todo) => todo.boardId === activeDashboard.id);
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

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) return;

    const targetDashboardId = createCardDashboardId ?? activeDashboard?.id ?? null;
    if (!targetDashboardId) return;

    const targetDashboard = dashboards.find((dashboard) => dashboard.id === targetDashboardId);
    if (!targetDashboard || targetDashboard.columns.length === 0) return;

    const hasSelectedColumn =
      createCardColumnId != null && targetDashboard.columns.some((column) => column.id === createCardColumnId);
    const targetColumnId = hasSelectedColumn ? createCardColumnId : targetDashboard.columns[0].id;

    try {
      await addTodo({
        title: normalizedTitle,
        description: normalizedDescription,
      }, {
        boardId: targetDashboard.id,
        columnId: targetColumnId,
      });
      setTitle('');
      setDescription('');
      setIsCreateModalOpen(false);
      setCreateCardDashboardId(null);
      setCreateCardColumnId(null);
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const handleMoveTodo = async (todoId: string, targetColumnId: string, targetIndex: number) => {
    const draggedTodo = todosForActiveBoard.find((todo) => todo.id === todoId);
    if (!draggedTodo) return;
    if (!activeDashboard) return;

    const sourceColumnId = draggedTodo.columnId;
    const sourceTodos = (groupedTodos[sourceColumnId] ?? []).filter((todo) => todo.id !== todoId);
    const targetTodos =
      sourceColumnId === targetColumnId
        ? sourceTodos
        : (groupedTodos[targetColumnId] ?? []).filter((todo) => todo.id !== todoId);

    const safeIndex = Math.max(0, Math.min(targetIndex, targetTodos.length));

    const movedTodo: Todo = {
      ...draggedTodo,
      status: targetColumnId,
      columnId: targetColumnId,
      boardId: activeDashboard.id,
    };

    const nextTargetTodos = [...targetTodos];
    nextTargetTodos.splice(safeIndex, 0, movedTodo);

    const updates: Array<Promise<void>> = [];

    nextTargetTodos.forEach((todo, index) => {
      const nextWeight = (index + 1) * 1000;
      const shouldUpdate =
        todo.id === movedTodo.id || todo.weight !== nextWeight || todo.columnId !== targetColumnId;

      if (shouldUpdate) {
        updates.push(
          updateTodo(todo.id, {
            status: targetColumnId,
            columnId: targetColumnId,
            boardId: activeDashboard.id,
            weight: nextWeight,
          })
        );
      }
    });

    if (sourceColumnId !== targetColumnId) {
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

  const addColumnToDraft = () => {
    const normalized = columnDraft.trim();
    if (!normalized) return;
    setDashboardColumns((prev) => [...prev, normalized]);
    setColumnDraft('');
  };

  const handleCreateDashboard = async (event: React.FormEvent) => {
    event.preventDefault();
    setDashboardFormError('');

    try {
      const extraColumn = columnDraft.trim();
      const finalColumns = extraColumn ? [...dashboardColumns, extraColumn] : dashboardColumns;
      if (hasDuplicateColumnNames(finalColumns)) {
        throw new Error('Column names must be unique within a dashboard');
      }
      await addDashboard(dashboardName, finalColumns);
      setDashboardName('');
      setColumnDraft('');
      setDashboardColumns([]);
      setIsCreateDashboardModalOpen(false);
    } catch (createError) {
      setDashboardFormError(createError instanceof Error ? createError.message : 'Failed to create dashboard');
    }
  };

  const openEditDashboard = (dashboardId: string) => {
    const dashboard = dashboards.find((item) => item.id === dashboardId);
    if (!dashboard) return;

    setDashboardActionError('');
    setEditingDashboardId(dashboard.id);
    setEditingDashboardName(dashboard.name);
    setEditingDashboardColumns(
      dashboard.columns.map((column) => ({
        id: column.id,
        name: column.name,
        order: column.order,
        isDone: column.isDone,
      }))
    );
    setEditingColumnDraft('');
    setIsEditDashboardModalOpen(true);
  };

  const addColumnToEditDraft = () => {
    const normalized = editingColumnDraft.trim();
    if (!normalized) return;

    setEditingDashboardColumns((prev) => [
      ...prev,
      {
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `col-${Date.now()}-${prev.length}`,
        name: normalized,
        order: prev.length,
        isDone: false,
      },
    ]);
    setEditingColumnDraft('');
  };

  const handleSaveDashboardEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDashboardActionError('');

    if (!editingDashboardId) return;

    const normalizedColumns = editingDashboardColumns
      .map((column, index) => ({
        ...column,
        name: column.name.trim(),
        order: index,
      }))
      .filter((column) => column.name.length > 0);

    if (hasDuplicateColumnNames(normalizedColumns.map((column) => column.name))) {
      setDashboardActionError('Column names must be unique within a dashboard');
      return;
    }

    try {
      await updateDashboard(editingDashboardId, editingDashboardName, normalizedColumns);
      setIsEditDashboardModalOpen(false);
      setEditingDashboardId(null);
      setEditingDashboardName('');
      setEditingDashboardColumns([]);
      setEditingColumnDraft('');
    } catch (updateError) {
      setDashboardActionError(updateError instanceof Error ? updateError.message : 'Failed to update dashboard');
    }
  };

  const handleDeleteDashboard = async (dashboardId: string, dashboardName: string) => {
    setDashboardActionError('');

    const confirmed = window.confirm(`Delete dashboard "${dashboardName}"? Cards will be moved to another dashboard.`);
    if (!confirmed) return;

    try {
      await deleteDashboard(dashboardId);
    } catch (deleteError) {
      setDashboardActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete dashboard');
    }
  };

  if (loading || dashboardsLoading) {
    return <div className="py-8 text-center text-slate-300">Loading todos...</div>;
  }

  if (error || dashboardsError) {
    return (
      <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">
        Error: {error ?? dashboardsError}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateDashboardModalOpen(true)}
            data-testid="new-dashboard-button"
            className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            New dashboard
          </button>
        </div>
      </div>

      {dashboardActionError && (
        <div className="mb-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {dashboardActionError}
        </div>
      )}

      {isCreateDashboardModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setIsCreateDashboardModalOpen(false)}
        >
          <form
            onSubmit={handleCreateDashboard}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            data-testid="create-dashboard-modal"
          >
            <h3 className="mb-4 text-lg font-semibold text-white">Create new dashboard</h3>

            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Dashboard name</label>
            <input
              type="text"
              value={dashboardName}
              onChange={(event) => setDashboardName(event.target.value)}
              placeholder="Product roadmap"
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              autoFocus
            />

            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Columns</label>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={columnDraft}
                onChange={(event) => setColumnDraft(event.target.value)}
                placeholder="Backlog"
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              />
              <button
                type="button"
                onClick={addColumnToDraft}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Add
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
              {dashboardColumns.length === 0 ? (
                <p className="text-xs text-slate-400">No columns yet. Add at least one column.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-200">
                  {dashboardColumns.map((columnName, index) => (
                    <li key={`${columnName}-${index}`}>{index + 1}. {columnName}</li>
                  ))}
                </ul>
              )}
            </div>

            {dashboardFormError && <p className="mb-3 text-sm text-rose-300">{dashboardFormError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateDashboardModalOpen(false)}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
              >
                Create dashboard
              </button>
            </div>
          </form>
        </div>
      )}

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => {
            setIsCreateModalOpen(false);
            setCreateCardDashboardId(null);
            setCreateCardColumnId(null);
          }}
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
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateCardDashboardId(null);
                  setCreateCardColumnId(null);
                }}
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

      {isEditDashboardModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setIsEditDashboardModalOpen(false)}
        >
          <form
            onSubmit={handleSaveDashboardEdit}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            data-testid="edit-dashboard-modal"
          >
            <h3 className="mb-4 text-lg font-semibold text-white">Edit dashboard</h3>

            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Dashboard name</label>
            <input
              type="text"
              value={editingDashboardName}
              onChange={(event) => setEditingDashboardName(event.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              autoFocus
            />

            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Columns</label>
            <div className="mb-3 space-y-2">
              {editingDashboardColumns.map((column) => (
                <div key={column.id} className="flex gap-2">
                  <input
                    type="text"
                    value={column.name}
                    onChange={(event) => {
                      setEditingDashboardColumns((prev) =>
                        prev.map((item) =>
                          item.id === column.id ? { ...item, name: event.target.value } : item
                        )
                      );
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
                    data-testid={`edit-dashboard-column-${column.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDashboardColumns((prev) => prev.filter((item) => item.id !== column.id));
                    }}
                    className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={editingColumnDraft}
                onChange={(event) => setEditingColumnDraft(event.target.value)}
                placeholder="Add column"
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
              />
              <button
                type="button"
                onClick={addColumnToEditDraft}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Add
              </button>
            </div>

            {dashboardActionError && <p className="mb-3 text-sm text-rose-300">{dashboardActionError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditDashboardModalOpen(false)}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
              >
                Save dashboard
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {dashboards.map((dashboard) => {
          const isExpanded = activeDashboardId === dashboard.id;

          return (
            <section
              key={dashboard.id}
              className="rounded-xl border border-white/10 bg-slate-900/50"
              data-testid={`dashboard-${dashboard.id}`}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-100">{dashboard.name}</span>

                  <button
                    type="button"
                    onClick={() => openEditDashboard(dashboard.id)}
                    data-testid={`edit-dashboard-button-${dashboard.id}`}
                    className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] p-1.5 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    aria-label={`Edit dashboard ${dashboard.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteDashboard(dashboard.id, dashboard.name)}
                    data-testid={`delete-dashboard-button-${dashboard.id}`}
                    className="shrink-0 rounded-md border border-rose-300/15 bg-rose-400/[0.03] p-1.5 text-rose-200/80 transition hover:border-rose-300/35 hover:bg-rose-400/[0.12] hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={dashboards.length <= 1}
                    aria-label={`Delete dashboard ${dashboard.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M10 3h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDashboardId((prev) => (prev === dashboard.id ? null : dashboard.id));
                  }}
                  className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  data-testid={`dashboard-toggle-${dashboard.id}`}
                  aria-label={isExpanded ? 'Collapse dashboard' : 'Expand dashboard'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    {!isExpanded && <path d="M12 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>}
                  </svg>
                </button>
              </div>

              {isExpanded && activeDashboard && activeDashboard.id === dashboard.id && (
                <div className="border-t border-white/10 p-4">
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
                  >
                    {columns.map((column: DashboardColumn) => {
                      const columnTodos = groupedTodos[column.id] ?? [];

                      return (
                        <section
                          key={column.id}
                          data-testid={`column-${column.id}`}
                          className="rounded-xl border border-white/10 bg-slate-800/50 p-3"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (!dragState) return;

                            void handleMoveTodo(dragState.todoId, column.id, columnTodos.length);
                            setDragState(null);
                            setDropTarget(null);
                          }}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">{column.name}</h3>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDashboardId(dashboard.id);
                                  setCreateCardDashboardId(dashboard.id);
                                  setCreateCardColumnId(column.id);
                                  setIsCreateModalOpen(true);
                                }}
                                data-testid={`new-card-button-${dashboard.id}-${column.id}`}
                                className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.03] px-2 py-0.5 text-sm font-semibold leading-none text-cyan-200/85 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.12] hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                                aria-label={`Add card to ${column.name}`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M12 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                  <path d="M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                              {columnTodos.length}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {columnTodos.map((todo, index) => (
                              <div key={todo.id}>
                                <div
                                  data-testid={`drop-${column.id}-${index}`}
                                  className={`h-2 rounded border border-dashed transition-all duration-150 ${
                                    dropTarget?.columnId === column.id && dropTarget.index === index
                                      ? 'animate-pulse border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                                      : 'border-cyan-200/20 bg-cyan-300/10'
                                  }`}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setDropTarget({ columnId: column.id, index });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!dragState) return;

                                    void handleMoveTodo(dragState.todoId, column.id, index);
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
                              data-testid={`drop-${column.id}-end`}
                              className={`h-3 rounded border border-dashed transition-all duration-150 ${
                                dropTarget?.columnId === column.id && dropTarget.index === columnTodos.length
                                  ? 'animate-pulse border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                                  : 'border-white/20 bg-white/5'
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDropTarget({ columnId: column.id, index: columnTodos.length });
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!dragState) return;

                                void handleMoveTodo(dragState.todoId, column.id, columnTodos.length);
                                setDragState(null);
                                setDropTarget(null);
                              }}
                            />
                          </div>
                        </section>
                      );
                    })}

                    {columns.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/20 bg-slate-900/30 p-4 text-sm text-slate-300">
                        This dashboard has no columns yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

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
