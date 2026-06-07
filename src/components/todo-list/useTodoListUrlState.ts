import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import type { Dashboard } from '../../types/dashboard';

interface UseTodoListUrlStateResult {
  dashboardParamId: string | null;
  modalTodoId: string | null;
  updateSearch: (updater: (nextParams: URLSearchParams) => void) => void;
  openTodoByLink: (todoId: string, dashboardId: string) => void;
  closeTodoLink: () => void;
}

export const useTodoListUrlState = (): UseTodoListUrlStateResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardParamId = searchParams.get('dashboard');
  const modalTodoId = searchParams.get('card');

  const updateSearch = useCallback(
    (updater: (nextParams: URLSearchParams) => void) => {
      setSearchParams((prevParams) => {
        const nextParams = new URLSearchParams(prevParams);
        updater(nextParams);
        return nextParams;
      });
    },
    [setSearchParams],
  );

  const openTodoByLink = useCallback((todoId: string, dashboardId: string) => {
    updateSearch((nextParams) => {
      nextParams.set('card', todoId);
      nextParams.set('dashboard', dashboardId);
    });
  }, [updateSearch]);

  const closeTodoLink = useCallback(() => {
    updateSearch((nextParams) => {
      nextParams.delete('card');
    });
  }, [updateSearch]);

  return {
    dashboardParamId,
    modalTodoId,
    updateSearch,
    openTodoByLink,
    closeTodoLink,
  };
};

interface UseSyncDashboardQueryParamArgs {
  dashboardParamId: string | null;
  dashboards: Dashboard[];
  setActiveDashboardId: Dispatch<SetStateAction<string | null>>;
  updateSearch: (updater: (nextParams: URLSearchParams) => void) => void;
}

export const useSyncDashboardQueryParam = ({
  dashboardParamId,
  dashboards,
  setActiveDashboardId,
  updateSearch,
}: UseSyncDashboardQueryParamArgs) => {
  useEffect(() => {
    if (dashboards.length === 0 || !dashboardParamId) return;

    const exists = dashboards.some((dashboard) => dashboard.id === dashboardParamId);

    if (!exists) {
      updateSearch((nextParams) => {
        nextParams.delete('dashboard');
      });
      return;
    }

    setActiveDashboardId((prevDashboardId) =>
      prevDashboardId === dashboardParamId ? prevDashboardId : dashboardParamId,
    );
  }, [dashboardParamId, dashboards, setActiveDashboardId, updateSearch]);
};
