import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Dashboard, DashboardColumn } from '../../types/dashboard';
import type { Todo } from '../../types/todo';
import { useTodoListControllerStore } from '../../stores/useTodoListControllerStore';
import { useTodoListDndStore } from '../../stores/useTodoListDndStore';
import { resolveReminderScheduledAt } from '../../utils/dueDate';
import {
  useHasTodoListStoresProvider,
  useTodoListControllerStoreScoped,
  useTodoListDndStoreScoped,
} from '../../stores/todoListStoresContext';
import { isHotkeyPressed } from '../../hooks/useHotkey';

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

const reorderByIndex = <T,>(items: T[], sourceIndex: number, targetIndex: number): T[] => {
  if (sourceIndex < 0 || sourceIndex >= items.length || targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  if (sourceIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
};

const isTransientCreateCardError = (error: unknown): boolean => {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';

  const normalizedCode = errorCode.toLowerCase();
  const normalizedMessage = errorMessage.toLowerCase();

  return (
    normalizedCode.includes('network-request-failed')
    || normalizedCode.includes('unavailable')
    || normalizedCode.includes('deadline-exceeded')
    || normalizedCode.includes('internal')
    || normalizedMessage.includes('err_connection_closed')
    || normalizedMessage.includes('network')
    || normalizedMessage.includes('securetoken.googleapis.com')
  );
};

const getBlockedMoveErrorMessage = (todo: Todo, targetColumnName: string): string => {
  const blockedReason = todo.blockedReason?.trim() ?? 'Unknown block reason';
  return `Card "${todo.title}" can't be moved to ${targetColumnName} because it is blocked: ${blockedReason}`;
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
  const hasScopedStores = useHasTodoListStoresProvider();
  const didInitFallbackRef = useRef(false);

  if (!hasScopedStores && !didInitFallbackRef.current) {
    useTodoListControllerStore.getState().resetControllerUiState();
    useTodoListDndStore.getState().resetDndState();
    didInitFallbackRef.current = true;
  }

  const ui = useTodoListControllerStoreScoped(useShallow((state) => ({
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
  })));

  const dnd = useTodoListDndStoreScoped(useShallow((state) => ({
    dragState: state.dragState,
    dropTarget: state.dropTarget,
    dashboardDragId: state.dashboardDragId,
    dashboardDropIndex: state.dashboardDropIndex,
    setDragState: state.setDragState,
    setDropTarget: state.setDropTarget,
    setDashboardDragId: state.setDashboardDragId,
    setDashboardDropIndex: state.setDashboardDropIndex,
  })));

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

    const draftTitle = normalizedTitle;
    const draftDescription = normalizedDescription;
    const draftDashboardId = targetDashboard.id;
    const draftColumnId = targetColumnId;

    const closeCreateCardModal = () => {
      ui.setIsCreateModalOpen(false);
      ui.setCreateCardDashboardId(null);
      ui.setCreateCardColumnId(null);
    };

    closeCreateCardModal();
    ui.setTitle('');
    ui.setDescription('');

    try {
      await addTodo(
        {
          title: draftTitle,
          description: draftDescription,
        },
        {
          boardId: draftDashboardId,
          columnId: draftColumnId,
        }
      );
    } catch (error) {
      if (!isTransientCreateCardError(error)) {
        ui.setTitle(draftTitle);
        ui.setDescription(draftDescription);
        ui.setCreateCardDashboardId(draftDashboardId);
        ui.setCreateCardColumnId(draftColumnId);
        ui.setIsCreateModalOpen(true);
      }
      console.error('Error adding todo:', error);
    }
  };

  const handleMoveTodo = async (todoId: string, targetColumnId: string, targetIndex: number) => {
    const draggedTodo = todos.find((todo) => todo.id === todoId);
    if (!draggedTodo) return;
    if (!activeDashboard) return;

    const targetColumns = columns;
    const targetColumn = targetColumns.find((column) => column.id === targetColumnId);

    if (targetColumn?.isDone && draggedTodo.blockedReason?.trim()) {
      ui.setDashboardActionError(getBlockedMoveErrorMessage(draggedTodo, targetColumn.name));
      return;
    }

    ui.setDashboardActionError('');

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

    const isCompleted = Boolean(targetColumn?.isDone);
    const completedAt = isCompleted ? new Date().toISOString() : null;
    const reminderScheduledAt = resolveReminderScheduledAt(
      {
        ...draggedTodo,
        isCompleted,
        completedAt,
      },
      new Date()
    );

    const nextTargetTodos = [...targetTodos];
    nextTargetTodos.splice(safeIndex, 0, movedTodo);

    const updates: Array<Promise<void>> = [];

    nextTargetTodos.forEach((todo, index) => {
      const nextWeight = (index + 1) * 1000;
      const shouldUpdate = todo.id === movedTodo.id || todo.weight !== nextWeight || todo.columnId !== targetColumnId;

      if (shouldUpdate) {
        const completionUpdates = todo.id === movedTodo.id
          ? {
              isCompleted,
              completedAt,
              reminderScheduledAt,
            }
          : {};

        updates.push(
          updateTodo(todo.id, {
            status: targetColumnId,
            columnId: targetColumnId,
            boardId: activeDashboard.id,
            weight: nextWeight,
            ...completionUpdates,
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
    if (isHotkeyPressed('escape', event)) {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (isHotkeyPressed('mod+enter', event)) {
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

  const handleArchiveAllCompleted = async (dashboardId: string) => {
    const dashboard = dashboards.find((item) => item.id === dashboardId);
    if (!dashboard || dashboard.columns.length === 0) return;

    const fallbackLastColumn = dashboard.columns.reduce((latest, column) => (
      column.order > latest.order ? column : latest
    ));
    const completedColumn = dashboard.columns.find((column) => column.isDone) ?? fallbackLastColumn;

    const completedTodos = todos.filter((todo) => (
      todo.boardId === dashboardId
      && !todo.archived
      && (todo.columnId === completedColumn.id || todo.status === completedColumn.id)
    ));

    if (completedTodos.length === 0) return;

    try {
      await Promise.all(
        completedTodos.map((todo) => updateTodo(todo.id, { archived: true }))
      );
    } catch (error) {
      console.error('Error archiving completed todos:', error);
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

  const updateCreateDashboardColumnName = (index: number, value: string) => {
    ui.setDashboardColumns((prev) => prev.map((column, columnIndex) => (columnIndex === index ? value : column)));
  };

  const removeCreateDashboardColumn = (index: number) => {
    ui.setDashboardColumns((prev) => prev.filter((_, columnIndex) => columnIndex !== index));
  };

  const reorderCreateDashboardColumns = (sourceIndex: number, targetIndex: number) => {
    ui.setDashboardColumns((prev) => reorderByIndex(prev, sourceIndex, targetIndex));
  };

  const closeCreateDashboardModal = () => {
    ui.setDashboardName('');
    ui.setColumnDraft('');
    ui.setDashboardColumns([]);
    ui.setDashboardFormError('');
    ui.setIsCreateDashboardModalOpen(false);
  };

  const handleCreateDashboard = async (event: React.FormEvent) => {
    event.preventDefault();
    ui.setDashboardFormError('');

    try {
      const extraColumn = ui.columnDraft.trim();
      const finalColumns = (extraColumn ? [...ui.dashboardColumns, extraColumn] : ui.dashboardColumns)
        .map((columnName) => columnName.trim())
        .filter((columnName) => columnName.length > 0);
      if (hasDuplicateColumnNames(finalColumns)) {
        throw new Error('Column names must be unique within a dashboard');
      }
      await addDashboard(ui.dashboardName, finalColumns);
      closeCreateDashboardModal();
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

  const reorderEditDashboardColumns = (sourceIndex: number, targetIndex: number) => {
    ui.setEditingDashboardColumns((prev) => reorderByIndex(prev, sourceIndex, targetIndex));
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
    handleArchiveAllCompleted,
    handleUnarchiveTodo,
    handleDeleteTodo,
    addColumnToDraft,
    updateCreateDashboardColumnName,
    removeCreateDashboardColumn,
    reorderCreateDashboardColumns,
    closeCreateDashboardModal,
    handleCreateDashboard,
    openEditDashboard,
    addColumnToEditDraft,
    reorderEditDashboardColumns,
    handleSaveDashboardEdit,
    handleDeleteDashboard,
    handleDashboardDrop,
  };
};
