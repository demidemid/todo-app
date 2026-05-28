import { useRef, useState } from 'react';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';

interface DragState {
  todoId: string;
}

interface DropTarget {
  columnId: string;
  index: number;
}

interface UseTodoListControllerArgs {
  todos: Todo[];
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  columns: DashboardColumn[];
  groupedTodos: Record<string, Todo[]>;
  addTodo: (todo: Pick<Todo, 'title' | 'description'>, options: { boardId: string; columnId?: string }) => Promise<string>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  addDashboard: (name: string, columnNames: string[]) => Promise<string>;
  updateDashboard: (dashboardId: string, name: string, columns: DashboardColumn[]) => Promise<void>;
  deleteDashboard: (dashboardId: string) => Promise<void>;
}

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

export const useTodoListController = ({
  todos,
  dashboards,
  activeDashboard,
  columns,
  groupedTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  addDashboard,
  updateDashboard,
  deleteDashboard,
}: UseTodoListControllerArgs) => {
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

  const handleAddTodo = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle) return;

    const targetDashboardId = createCardDashboardId ?? activeDashboard?.id ?? null;
    if (!targetDashboardId) return;

    const targetDashboard = dashboards.find((dashboard) => dashboard.id === targetDashboardId);
    const targetColumns = targetDashboard?.id === activeDashboard?.id ? columns : targetDashboard?.columns ?? [];
    if (!targetDashboard || targetColumns.length === 0) return;

    const hasSelectedColumn =
      createCardColumnId != null && targetColumns.some((column) => column.id === createCardColumnId);
    const targetColumnId = hasSelectedColumn ? createCardColumnId : targetColumns[0].id;

    try {
      await addTodo(
        {
          title: normalizedTitle,
          description: normalizedDescription,
        },
        {
          boardId: targetDashboard.id,
          columnId: targetColumnId,
        }
      );
      setTitle('');
      setDescription('');
      setIsCreateModalOpen(false);
      setCreateCardDashboardId(null);
      setCreateCardColumnId(null);
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const handleMoveTodo = async (todoId: string, targetColumnId: string, targetIndex: number) => {
    const draggedTodo = todos.find((todo) => todo.id === todoId);
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
      const shouldUpdate = todo.id === movedTodo.id || todo.weight !== nextWeight || todo.columnId !== targetColumnId;

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
    } catch (error) {
      console.error('Error moving todo:', error);
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
    } catch (error) {
      console.error('Error updating todo content:', error);
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
    } catch (error) {
      console.error('Error deleting todo:', error);
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

  return {
    title,
    setTitle,
    description,
    setDescription,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createCardDashboardId,
    setCreateCardDashboardId,
    createCardColumnId,
    setCreateCardColumnId,
    isCreateDashboardModalOpen,
    setIsCreateDashboardModalOpen,
    dashboardName,
    setDashboardName,
    columnDraft,
    setColumnDraft,
    dashboardColumns,
    dashboardFormError,
    dashboardActionError,
    isEditDashboardModalOpen,
    setIsEditDashboardModalOpen,
    editingDashboardId,
    editingDashboardName,
    setEditingDashboardName,
    editingDashboardColumns,
    setEditingDashboardColumns,
    editingColumnDraft,
    setEditingColumnDraft,
    dragState,
    setDragState,
    dropTarget,
    setDropTarget,
    editingTodoId,
    editingTitle,
    setEditingTitle,
    editingDescription,
    setEditingDescription,
    modalTodo,
    setModalTodo,
    menuOpenId,
    setMenuOpenId,
    menuButtonRefs,
    handleAddTodo,
    handleMoveTodo,
    startEdit,
    cancelEdit,
    handleSaveEdit,
    handleEditKeyDown,
    handleDeleteTodo,
    addColumnToDraft,
    handleCreateDashboard,
    openEditDashboard,
    addColumnToEditDraft,
    handleSaveDashboardEdit,
    handleDeleteDashboard,
  };
};
