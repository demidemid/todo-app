import { useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { Dashboard } from '../../types/dashboard';

interface ShareTargetUser {
  id: string;
  email: string;
}

interface UseTodoListShareActionsArgs {
  dashboards: Dashboard[];
  shareDashboardId: string | null;
  users: ShareTargetUser[];
  shareSelectedUserIds: string[];
  shareRecipientEmails: string;
  usersLoading: boolean;
  usersError: string | null;
  shareDashboard: (dashboardId: string, userIds: string[], recipientEmails: string[]) => Promise<void>;
  closeShareModal: () => void;
  setShareActionError: (error: string) => void;
}

interface UseTodoListShareActionsResult {
  shareDashboardTarget: Dashboard | null;
  handleSaveShare: (event: FormEvent) => Promise<void>;
}

export const useTodoListShareActions = ({
  dashboards,
  shareDashboardId,
  users,
  shareSelectedUserIds,
  shareRecipientEmails,
  usersLoading,
  usersError,
  shareDashboard,
  closeShareModal,
  setShareActionError,
}: UseTodoListShareActionsArgs): UseTodoListShareActionsResult => {
  const shareDashboardTarget = useMemo(
    () => (shareDashboardId ? dashboards.find((dashboard) => dashboard.id === shareDashboardId) ?? null : null),
    [dashboards, shareDashboardId],
  );

  const handleSaveShare = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!shareDashboardTarget) return;
    if (usersLoading || usersError) return;

    setShareActionError('');

    try {
      const selectedEmails = users
        .filter((user) => shareSelectedUserIds.includes(user.id))
        .map((user) => user.email);
      const manualEmails = shareRecipientEmails
        .split(/[\n,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      await shareDashboard(shareDashboardTarget.id, shareSelectedUserIds, [...selectedEmails, ...manualEmails]);
      closeShareModal();
    } catch (shareError) {
      setShareActionError(shareError instanceof Error ? shareError.message : 'Failed to share dashboard');
    }
  }, [
    closeShareModal,
    setShareActionError,
    shareDashboard,
    shareDashboardTarget,
    shareRecipientEmails,
    shareSelectedUserIds,
    users,
    usersError,
    usersLoading,
  ]);

  return {
    shareDashboardTarget,
    handleSaveShare,
  };
};