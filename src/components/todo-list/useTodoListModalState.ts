import { useMemo } from 'react';
import type { FormEvent } from 'react';
import type { Dashboard } from '../../types/dashboard';
import type { useTodoListController } from './useTodoListController';

interface ShareTargetUser {
  id: string;
  email: string;
}

interface UseTodoListModalStateArgs {
  controller: ReturnType<typeof useTodoListController>;
  shareDashboardTarget: Dashboard | null;
  users: ShareTargetUser[];
  shareSelectedUserIds: string[];
  shareRecipientEmails: string;
  usersLoading: boolean;
  usersError: string | null;
  shareActionError: string;
  closeShareModal: () => void;
  toggleShareUser: (userId: string) => void;
  setShareRecipientEmails: (value: string) => void;
  handleSaveShare: (event: FormEvent) => Promise<void>;
}

export const useTodoListModalState = ({
  controller,
  shareDashboardTarget,
  users,
  shareSelectedUserIds,
  shareRecipientEmails,
  usersLoading,
  usersError,
  shareActionError,
  closeShareModal,
  toggleShareUser,
  setShareRecipientEmails,
  handleSaveShare,
}: UseTodoListModalStateArgs) => {
  return useMemo(() => ({
    createDashboard: {
      state: {
        open: controller.isCreateDashboardModalOpen,
        dashboardName: controller.dashboardName,
        columnDraft: controller.columnDraft,
        dashboardColumns: controller.dashboardColumns,
        formError: controller.dashboardFormError,
      },
      actions: {
        onClose: controller.closeCreateDashboardModal,
        onDashboardNameChange: controller.setDashboardName,
        onColumnDraftChange: controller.setColumnDraft,
        onAddColumn: controller.addColumnToDraft,
        onRemoveColumn: controller.removeCreateDashboardColumn,
        onColumnNameChange: controller.updateCreateDashboardColumnName,
        onReorderColumn: controller.reorderCreateDashboardColumns,
        onSubmit: controller.handleCreateDashboard,
      },
    },
    createCard: {
      state: {
        open: controller.isCreateModalOpen,
        title: controller.title,
        description: controller.description,
      },
      actions: {
        onClose: () => {
          controller.setIsCreateModalOpen(false);
          controller.setCreateCardDashboardId(null);
          controller.setCreateCardColumnId(null);
        },
        onTitleChange: controller.setTitle,
        onDescriptionChange: controller.setDescription,
        onSubmit: controller.handleAddTodo,
      },
    },
    editDashboard: {
      state: {
        open: controller.isEditDashboardModalOpen,
        dashboardName: controller.editingDashboardName,
        columns: controller.editingDashboardColumns,
        columnDraft: controller.editingColumnDraft,
        actionError: controller.dashboardActionError,
      },
      actions: {
        onClose: () => controller.setIsEditDashboardModalOpen(false),
        onDashboardNameChange: controller.setEditingDashboardName,
        onColumnDraftChange: controller.setEditingColumnDraft,
        onAddColumn: controller.addColumnToEditDraft,
        onRemoveColumn: (columnId: string) =>
          controller.setEditingDashboardColumns((prev) => prev.filter((item) => item.id !== columnId)),
        onColumnNameChange: (columnId: string, value: string) => {
          controller.setEditingDashboardColumns((prev) =>
            prev.map((item) => (item.id === columnId ? { ...item, name: value } : item)),
          );
        },
        onReorderColumn: controller.reorderEditDashboardColumns,
        onSubmit: controller.handleSaveDashboardEdit,
      },
    },
    shareDashboard: {
      state: {
        open: shareDashboardTarget != null,
        dashboardName: shareDashboardTarget?.name ?? '',
        users,
        selectedUserIds: shareSelectedUserIds,
        recipientEmails: shareRecipientEmails,
        loadingUsers: usersLoading,
        usersError,
        actionError: shareActionError,
      },
      actions: {
        onClose: closeShareModal,
        onToggleUser: toggleShareUser,
        onRecipientEmailsChange: setShareRecipientEmails,
        onSubmit: handleSaveShare,
      },
    },
  }), [
    closeShareModal,
    controller,
    handleSaveShare,
    setShareRecipientEmails,
    shareActionError,
    shareDashboardTarget,
    shareRecipientEmails,
    shareSelectedUserIds,
    toggleShareUser,
    users,
    usersError,
    usersLoading,
  ]);
};