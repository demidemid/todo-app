import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { useTodoListControllerStore } from '../../stores/useTodoListControllerStore';
import { useTodoListDndStore } from '../../stores/useTodoListDndStore';

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
  reorderDashboards: (orderedDashboardIds: string[]) => Promise<void>;
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
  reorderDashboards,
}: UseTodoListControllerArgs) => {
  const ui = useTodoListControllerStore(useShallow((state) => ({
    title: state.title,
    description: state.description,
    isCreateModalOpen: state.isCreateModalOpen,
    createCardDashboardId: state.createCardDashboardId,
    createCardColumnId: state.createCardColumnId,
    isCreateDashboardModalOpen: state.isCreateDashboardModalOpen,
    dashboardName: state.dashboardName,
    columnDraft: state.columnDraft,
    dashboardColumns: state.dashboardColumns,
    dashboardFormError: state.dashboardFormError,
    dashboardActionError: state.dashboardActionError,
    isEditDashboardModalOpen: state.isEditDashboardModalOpen,
    editingDashboardId: state.editingDashboardId,
    editingDashboardName: state.editingDashboardName,
    editingDashboardColumns: state.editingDashboardColumns,
    editingColumnDraft: state.editingColumnDraft,
    editingTodoId: state.editingTodoId,
    editingTitle: state.editingTitle,
    editingDescription: state.editingDescription,
    setTitle: state.setTitle,
    setDescription: state.setDescription,
    setIsCreateModalOpen: state.setIsCreateModalOpen,
    setCreateCardDashboardId: state.setCreateCardDashboardId,
    setCreateCardColumnId: state.setCreateCardColumnId,
    setIsCreateDashboardModalOpen: state.setIsCreateDashboardModalOpen,
    setDashboardName: state.setDashboardName,
    setColumnDraft: state.setColumnDraft,
    setDashboardColumns: state.setDashboardColumns,
    setDashboardFormError: state.setDashboardFormError,
    setDashboardActionError: state.setDashboardActionError,
    setIsEditDashboardModalOpen: state.setIsEditDashboardModalOpen,
    setEditingDashboardId: state.setEditingDashboardId,
    setEditingDashboardName: state.setEditingDashboardName,
    setEditingDashboardColumns: state.setEditingDashboardColumns,
    setEditingColumnDraft: state.setEditingColumnDraft,
    setEditingTodoId: state.setEditingTodoId,
    setEditingTitle: state.setEditingTitle,
    setEditingDescription: state.setEditingDescription,
    resetControllerUiState: state.resetControllerUiState,
  })));

  const dnd = useTodoListDndStore(useShallow((state) => ({
    dragState: state.dragState,
    dropTarget: state.dropTarget,
    dashboardDragId: state.dashboardDragId,
    dashboardDropIndex: state.dashboardDropIndex,
    setDragState: state.setDragState,
    setDropTarget: state.setDropTarget,
    setDashboardDragId: state.setDashboardDragId,
    setDashboardDropIndex: state.setDashboardDropIndex,
    resetDndState: state.resetDndState,
  })));

  const { resetControllerUiState } = ui;
  const { resetDndState } = dnd;

  useEffect(() => {
    resetControllerUiState();
    resetDndState();
  }, [resetControllerUiState, resetDndState]);

  const handleAddTodo = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedTitle = ui.title.trim();
    const normalizedDescription = ui.description.trim();

    if (!normalizedTitle) return;

    const targetDashboardId = ui.createCardDashboardId ?? activeDashboard?.id ?? null;
    if (!targetDashboardId) return;

    const targetDashboard = dashboards.find((dashboard) => dashboard.id === targetDashboardId);
    const targetColumns = targetDashboard?.id === activeDashboard?.id ? columns : targetDashboard?.columns ?? [];
    if (!targetDashboard || targetColumns.length === 0) return;

    const hasSelectedColumn =
      ui.createCardColumnId != null && targetColumns.some((column) => column.id === ui.createCardColumnId);
    const targetColumnId = hasSelectedColumn ? (ui.createCardColumnId ?? undefined) : targetColumns[0]?.id;
    if (!targetColumnId) return;

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
      ui.setTitle('');
      ui.setDescription('');
      ui.setIsCreateModalOpen(false);
      ui.setCreateCardDashboardId(null);
      ui.setCreateCardColumnId(null);
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
    ui.setEditingTodoId(todo.id);
    ui.setEditingTitle(todo.title);
    ui.setEditingDescription(todo.description ?? '');
  };

  const cancelEdit = () => {
    ui.setEditingTodoId(null);
    ui.setEditingTitle('');
    ui.setEditingDescription('');
  };

  const handleSaveEdit = async (todoId: string) => {
    const normalizedTitle = ui.editingTitle.trim();
    const normalizedDescription = ui.editingDescription.trim();

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

  const handleArchiveTodo = async (id: string) => {
    try {
      await updateTodo(id, {
        archived: true,
      });
    } catch (error) {
      console.error('Error archiving todo:', error);
    }
  };

  const handleUnarchiveTodo = async (id: string) => {
    try {
      await updateTodo(id, {
        archived: false,
      });
    } catch (error) {
      console.error('Error unarchiving todo:', error);
    }
  };

  const addColumnToDraft = () => {
    const normalized = ui.columnDraft.trim();
    if (!normalized) return;
    ui.setDashboardColumns((prev) => [...prev, normalized]);
    ui.setColumnDraft('');
  };

  const handleCreateDashboard = async (event: React.FormEvent) => {
    event.preventDefault();
    ui.setDashboardFormError('');

    try {
      const extraColumn = ui.columnDraft.trim();
      const finalColumns = extraColumn ? [...ui.dashboardColumns, extraColumn] : ui.dashboardColumns;
      if (hasDuplicateColumnNames(finalColumns)) {
        throw new Error('Column names must be unique within a dashboard');
      }
      await addDashboard(ui.dashboardName, finalColumns);
      ui.setDashboardName('');
      ui.setColumnDraft('');
      ui.setDashboardColumns([]);
      ui.setIsCreateDashboardModalOpen(false);
    } catch (createError) {
      ui.setDashboardFormError(createError instanceof Error ? createError.message : 'Failed to create dashboard');
    }
  };

  const openEditDashboard = (dashboardId: string) => {
    const dashboard = dashboards.find((item) => item.id === dashboardId);
    if (!dashboard) return;

    ui.setDashboardActionError('');
    ui.setEditingDashboardId(dashboard.id);
    ui.setEditingDashboardName(dashboard.name);
    ui.setEditingDashboardColumns(
      dashboard.columns.map((column) => ({
        id: column.id,
        name: column.name,
        order: column.order,
        isDone: column.isDone,
      }))
    );
    ui.setEditingColumnDraft('');
    ui.setIsEditDashboardModalOpen(true);
  };

  const addColumnToEditDraft = () => {
    const normalized = ui.editingColumnDraft.trim();
    if (!normalized) return;

    ui.setEditingDashboardColumns((prev) => [
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
    ui.setEditingColumnDraft('');
  };

  const handleSaveDashboardEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    ui.setDashboardActionError('');

    if (!ui.editingDashboardId) return;

    const normalizedColumns = ui.editingDashboardColumns
      .map((column, index) => ({
        ...column,
        name: column.name.trim(),
        order: index,
      }))
      .filter((column) => column.name.length > 0);

    if (hasDuplicateColumnNames(normalizedColumns.map((column) => column.name))) {
      ui.setDashboardActionError('Column names must be unique within a dashboard');
      return;
    }

    try {
      await updateDashboard(ui.editingDashboardId, ui.editingDashboardName, normalizedColumns);
      ui.setIsEditDashboardModalOpen(false);
      ui.setEditingDashboardId(null);
      ui.setEditingDashboardName('');
      ui.setEditingDashboardColumns([]);
      ui.setEditingColumnDraft('');
    } catch (updateError) {
      ui.setDashboardActionError(updateError instanceof Error ? updateError.message : 'Failed to update dashboard');
    }
  };

  const handleDeleteDashboard = async (dashboardId: string, dashboardName: string) => {
    ui.setDashboardActionError('');

    const confirmed = window.confirm(`Delete dashboard "${dashboardName}"? Cards will be moved to another dashboard.`);
    if (!confirmed) return;

    try {
      await deleteDashboard(dashboardId);
    } catch (deleteError) {
      ui.setDashboardActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete dashboard');
    }
  };

  const handleDashboardDrop = async (
    targetIndex: number,
    draggedDashboardId?: string,
    reorderableDashboardIds?: string[]
  ) => {
    const activeDragId = draggedDashboardId ?? dnd.dashboardDragId;
    if (!activeDragId) return;

    const reorderableIdSet = reorderableDashboardIds ? new Set(reorderableDashboardIds) : null;
    const reorderableDashboards = reorderableIdSet
      ? dashboards.filter((dashboard) => reorderableIdSet.has(dashboard.id))
      : dashboards;

    const sourceIndex = reorderableDashboards.findIndex((dashboard) => dashboard.id === activeDragId);
    if (sourceIndex < 0) {
      dnd.setDashboardDragId(null);
      dnd.setDashboardDropIndex(null);
      return;
    }

    const normalizedTargetIndex = Math.max(0, Math.min(targetIndex, reorderableDashboards.length));
    const nextDashboards = [...reorderableDashboards];
    const [movedDashboard] = nextDashboards.splice(sourceIndex, 1);

    const insertIndex = sourceIndex < normalizedTargetIndex ? normalizedTargetIndex - 1 : normalizedTargetIndex;
    nextDashboards.splice(insertIndex, 0, movedDashboard);

    dnd.setDashboardDragId(null);
    dnd.setDashboardDropIndex(null);

    if (insertIndex === sourceIndex) return;

    try {
      await reorderDashboards(nextDashboards.map((dashboard) => dashboard.id));
    } catch (error) {
      ui.setDashboardActionError(error instanceof Error ? error.message : 'Failed to reorder dashboards');
    }
  };

  return {
    ...ui,
    ...dnd,
    handleAddTodo,
    handleMoveTodo,
    startEdit,
    cancelEdit,
    handleSaveEdit,
    handleEditKeyDown,
    handleArchiveTodo,
    handleUnarchiveTodo,
    handleDeleteTodo,
    addColumnToDraft,
    handleCreateDashboard,
    openEditDashboard,
    addColumnToEditDraft,
    handleSaveDashboardEdit,
    handleDeleteDashboard,
    handleDashboardDrop,
  };
};
