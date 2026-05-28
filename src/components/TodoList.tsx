import { TodoModal } from './TodoModal';
import { Fragment } from 'react';
import { DashboardSection } from './todo-list/DashboardSection';
import { CreateCardModal, CreateDashboardModal, EditDashboardModal } from './todo-list/TodoListModals';
import { useTodos } from '../hooks/useTodos';
import { useDashboards } from '../hooks/useDashboards';
import { useTodoListController } from './todo-list/useTodoListController';
import { useTodoListBoardData } from './todo-list/useTodoListBoardData';
import { Button } from './ui/Button';

interface TodoListProps {
  userId: string;
  userEmail?: string;
}

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
          <Button
            type="button"
            variant="secondary"
            onClick={() => controller.setIsCreateDashboardModalOpen(true)}
            data-testid="new-dashboard-button"
          >
            New dashboard
          </Button>
        </div>
      </div>

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

      <div className="space-y-3">
        {dashboards.map((dashboard, index) => (
          <Fragment key={dashboard.id}>
            {controller.dashboardDragId && (
              <div
                data-testid={`dashboard-drop-zone-${index}`}
                className={`h-2 rounded border border-dashed transition-all duration-150 ${
                  controller.dashboardDropIndex === index
                    ? 'border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                    : 'border-transparent bg-transparent'
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!controller.dashboardDragId) return;
                  controller.setDashboardDropIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;
                  void controller.handleDashboardDrop(index, draggedDashboardId);
                }}
              />
            )}

            <DashboardSection
              dashboard={dashboard}
              isExpanded={activeDashboardId === dashboard.id}
              isDragging={controller.dashboardDragId === dashboard.id}
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
                setActiveDashboardId((prev) => (prev === dashboardId ? null : dashboardId));
              }}
              onDashboardDragStart={() => {
                controller.setDashboardDragId(dashboard.id);
                controller.setDashboardDropIndex(index);
              }}
              onDashboardDragEnd={() => {
                window.setTimeout(() => {
                  controller.setDashboardDragId(null);
                  controller.setDashboardDropIndex(null);
                }, 0);
              }}
              onOpenEditDashboard={controller.openEditDashboard}
              onDeleteDashboard={(dashboardId, dashboardName) => void controller.handleDeleteDashboard(dashboardId, dashboardName)}
              onOpenCreateCard={(dashboardId, columnId) => {
                setActiveDashboardId(dashboardId);
                controller.setCreateCardDashboardId(dashboardId);
                controller.setCreateCardColumnId(columnId);
                controller.setIsCreateModalOpen(true);
              }}
              onMoveTodo={controller.handleMoveTodo}
              onSetDragState={controller.setDragState}
              onSetDropTarget={controller.setDropTarget}
              onOpenTodoModal={controller.setModalTodo}
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
          </Fragment>
        ))}

        {controller.dashboardDragId && (
          <div
            data-testid={`dashboard-drop-zone-${dashboards.length}`}
            className={`h-2 rounded border border-dashed transition-all duration-150 ${
              controller.dashboardDropIndex === dashboards.length
                ? 'border-cyan-100 bg-cyan-300/60 shadow-[0_0_0_1px_rgba(165,243,252,0.35)]'
                : 'border-transparent bg-transparent'
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!controller.dashboardDragId) return;
              controller.setDashboardDropIndex(dashboards.length);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const draggedDashboardId = event.dataTransfer?.getData('text/plain') || undefined;
              void controller.handleDashboardDrop(dashboards.length, draggedDashboardId);
            }}
          />
        )}
      </div>

      {controller.modalTodo && (
        <TodoModal
          todo={controller.modalTodo}
          userId={userId}
          userEmail={userEmail}
          onClose={() => controller.setModalTodo(null)}
          updateTodo={updateTodo}
          deleteTodo={deleteTodo}
        />
      )}
    </div>
  );
};
