import { TodoModal } from './TodoModal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardSection } from './todo-list/DashboardSection';
import { CreateCardModal, CreateDashboardModal, EditDashboardModal } from './todo-list/TodoListModals';
import { useTodos } from '../hooks/useTodos';
import { useDashboards } from '../hooks/useDashboards';
import { useTodoListController } from './todo-list/useTodoListController';
import { useTodoListBoardData } from './todo-list/useTodoListBoardData';
import { IconButton } from './ui/IconButton';

interface TodoListProps {
  userId: string;
  userEmail?: string;
}

export const TodoList = ({ userId, userEmail }: TodoListProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [dashboardHoverId, setDashboardHoverId] = useState<string | null>(null);
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
    reorderDashboards,
  } = useDashboards(userId);
  const { columns, groupedTodos } = useTodoListBoardData({ todos, activeDashboard });
  const controller = useTodoListController({
    todos,
    dashboards,
    activeDashboard,
    groupedTodos,
    columns,
    addTodo,
    updateTodo,
    deleteTodo,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    reorderDashboards,
  });

  const modalTodoId = searchParams.get('card');
  const dashboardParamId = searchParams.get('dashboard');
  const modalTodo = modalTodoId ? todos.find((todo) => todo.id === modalTodoId) ?? null : null;

  const updateSearch = useCallback((updater: (nextParams: URLSearchParams) => void) => {
    setSearchParams((prevParams) => {
      const nextParams = new URLSearchParams(prevParams);
      updater(nextParams);
      return nextParams;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (dashboards.length === 0 || !dashboardParamId) return;

    const exists = dashboards.some((dashboard) => dashboard.id === dashboardParamId);

    if (!exists) {
      updateSearch((nextParams) => {
        nextParams.delete('dashboard');
      });
      return;
    }

    if (activeDashboardId !== dashboardParamId) {
      setActiveDashboardId(dashboardParamId);
    }
  }, [dashboardParamId, dashboards, setActiveDashboardId, updateSearch]);

  const openTodoByLink = (todoId: string, dashboardId: string) => {
    updateSearch((nextParams) => {
      nextParams.set('card', todoId);
      nextParams.set('dashboard', dashboardId);
    });
  };

  const closeTodoLink = () => {
    updateSearch((nextParams) => {
      nextParams.delete('card');
    });
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
      <IconButton
        type="button"
        variant="primary"
        onClick={() => controller.setIsCreateDashboardModalOpen(true)}
        data-testid="new-dashboard-button"
        label="New dashboard"
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full border-cyan-300/45 bg-cyan-300/20 text-cyan-100 shadow-lg shadow-cyan-900/30 hover:bg-cyan-300/30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </IconButton>

      {controller.dashboardActionError && (
        <div className="mb-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {controller.dashboardActionError}
        </div>
      )}

      <CreateDashboardModal
        open={controller.isCreateDashboardModalOpen}
        dashboardName={controller.dashboardName}
        columnDraft={controller.columnDraft}
        dashboardColumns={controller.dashboardColumns}
        formError={controller.dashboardFormError}
        onClose={() => controller.setIsCreateDashboardModalOpen(false)}
        onDashboardNameChange={controller.setDashboardName}
        onColumnDraftChange={controller.setColumnDraft}
        onAddColumn={controller.addColumnToDraft}
        onSubmit={controller.handleCreateDashboard}
      />

      <CreateCardModal
        open={controller.isCreateModalOpen}
        title={controller.title}
        description={controller.description}
        onClose={() => {
          controller.setIsCreateModalOpen(false);
          controller.setCreateCardDashboardId(null);
          controller.setCreateCardColumnId(null);
        }}
        onTitleChange={controller.setTitle}
        onDescriptionChange={controller.setDescription}
        onSubmit={controller.handleAddTodo}
      />

      <EditDashboardModal
        open={controller.isEditDashboardModalOpen}
        dashboardName={controller.editingDashboardName}
        columns={controller.editingDashboardColumns}
        columnDraft={controller.editingColumnDraft}
        actionError={controller.dashboardActionError}
        onClose={() => controller.setIsEditDashboardModalOpen(false)}
        onDashboardNameChange={controller.setEditingDashboardName}
        onColumnDraftChange={controller.setEditingColumnDraft}
        onAddColumn={controller.addColumnToEditDraft}
        onRemoveColumn={(columnId) =>
          controller.setEditingDashboardColumns((prev) => prev.filter((item) => item.id !== columnId))
        }
        onColumnNameChange={(columnId, value) => {
          controller.setEditingDashboardColumns((prev) =>
            prev.map((item) => (item.id === columnId ? { ...item, name: value } : item))
          );
        }}
        onSubmit={controller.handleSaveDashboardEdit}
      />

      <div
        className="space-y-3"
        onDragOver={(event) => {
          event.preventDefault();
          if (!controller.dashboardDragId) return;

          const sections = dashboards
            .map((dashboard, index) => ({
              id: dashboard.id,
              index,
              element: dashboardSectionRefs.current[dashboard.id],
            }))
            .filter((item): item is { id: string; index: number; element: HTMLElement } => item.element != null);

          if (sections.length === 0) return;

          const pointerY = event.clientY;

          const exactMatch = sections.find((item) => {
            const rect = item.element.getBoundingClientRect();
            return rect.height > 0 && pointerY >= rect.top && pointerY <= rect.bottom;
          });

          if (exactMatch) {
            const sourceIndex = dashboards.findIndex((dashboard) => dashboard.id === controller.dashboardDragId);
            const nextIndex = sourceIndex < exactMatch.index ? exactMatch.index + 1 : exactMatch.index;
            controller.setDashboardDropIndex(nextIndex);
            setDashboardHoverId(exactMatch.id);
            return;
          }

          const firstRect = sections[0].element.getBoundingClientRect();
          if (pointerY < firstRect.top) {
            controller.setDashboardDropIndex(0);
            setDashboardHoverId(sections[0].id);
            return;
          }

          const lastRect = sections[sections.length - 1].element.getBoundingClientRect();
          if (pointerY > lastRect.bottom) {
            controller.setDashboardDropIndex(dashboards.length);
            setDashboardHoverId(sections[sections.length - 1].id);
            return;
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!controller.dashboardDragId) return;

          const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;
          const targetIndex = controller.dashboardDropIndex ?? dashboards.length;
          void controller.handleDashboardDrop(targetIndex, draggedDashboardId);
          setDashboardHoverId(null);
        }}
        onDragEndCapture={() => {
          window.setTimeout(() => {
            controller.setDashboardDragId(null);
            controller.setDashboardDropIndex(null);
            setDashboardHoverId(null);
          }, 0);
        }}
      >
        {dashboards.map((dashboard, index) => (
          <DashboardSection
            key={dashboard.id}
            sectionRef={(element) => {
              dashboardSectionRefs.current[dashboard.id] = element;
            }}
            dashboard={dashboard}
            isExpanded={activeDashboardId === dashboard.id}
            isDragging={controller.dashboardDragId === dashboard.id}
            isDropTarget={dashboardHoverId === dashboard.id && controller.dashboardDragId !== dashboard.id}
            dashboardsLength={dashboards.length}
            columns={columns}
            groupedTodos={groupedTodos}
            editingTodoId={controller.editingTodoId}
            editingTitle={controller.editingTitle}
            editingDescription={controller.editingDescription}
            menuOpenId={controller.menuOpenId}
            menuButtonRefs={controller.menuButtonRefs}
            dragState={controller.dragState}
            dropTarget={controller.dropTarget}
              onToggle={(dashboardId) => {
                const nextDashboardId = activeDashboardId === dashboardId ? null : dashboardId;

                setActiveDashboardId(nextDashboardId);
                updateSearch((nextParams) => {
                  if (nextDashboardId) {
                    nextParams.set('dashboard', nextDashboardId);
                  } else {
                    nextParams.delete('dashboard');
                    nextParams.delete('card');
                  }
                });
              }}
            onDashboardDragStart={() => {
              controller.setDashboardDragId(dashboard.id);
              controller.setDashboardDropIndex(index);
              setDashboardHoverId(dashboard.id);
            }}
            onDashboardDragOver={(event) => {
              event.preventDefault();
              if (!controller.dashboardDragId) return;

              const sourceIndex = dashboards.findIndex((item) => item.id === controller.dashboardDragId);
              const nextIndex = sourceIndex < index ? index + 1 : index;
              controller.setDashboardDropIndex(nextIndex);
              setDashboardHoverId(dashboard.id);
            }}
            onDashboardDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;

              const sourceIndex = dashboards.findIndex((item) => item.id === (draggedDashboardId ?? controller.dashboardDragId));
              const targetIndex = sourceIndex < index ? index + 1 : index;
              void controller.handleDashboardDrop(targetIndex, draggedDashboardId);
            }}
            onOpenEditDashboard={controller.openEditDashboard}
            onDeleteDashboard={(dashboardId, dashboardName) => void controller.handleDeleteDashboard(dashboardId, dashboardName)}
            onOpenCreateCard={(dashboardId, columnId) => {
              setActiveDashboardId(dashboardId);
                updateSearch((nextParams) => {
                  nextParams.set('dashboard', dashboardId);
                });
              controller.setCreateCardDashboardId(dashboardId);
              controller.setCreateCardColumnId(columnId);
              controller.setIsCreateModalOpen(true);
            }}
            onMoveTodo={controller.handleMoveTodo}
            onSetDragState={controller.setDragState}
            onSetDropTarget={controller.setDropTarget}
            onOpenTodoModal={(todo) => {
                openTodoByLink(todo.id, todo.boardId);
            }}
            onCancelEdit={controller.cancelEdit}
            onSaveEdit={(todoId) => void controller.handleSaveEdit(todoId)}
            onEditTitleChange={controller.setEditingTitle}
            onEditDescriptionChange={controller.setEditingDescription}
            onEditKeyDown={controller.handleEditKeyDown}
            onToggleMenu={(todoId) => controller.setMenuOpenId(controller.menuOpenId === todoId ? null : todoId)}
            onCloseMenu={() => controller.setMenuOpenId(null)}
            onMenuEdit={(todo) => controller.startEdit(todo)}
            onMenuDelete={(todoId) => void controller.handleDeleteTodo(todoId)}
          />
        ))}
      </div>

      {modalTodo && (
        <TodoModal
          todo={modalTodo}
          userId={userId}
          userEmail={userEmail}
          onClose={closeTodoLink}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
        />
      )}
    </div>
  );
};
