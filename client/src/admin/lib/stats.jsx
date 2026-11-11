import { createContext, useContext, useMemo } from 'react';
import { useApiQuery } from './hooks.js';

const StatsContext = createContext({
  stats: null,
  error: null,
  loading: false,
  refreshing: false,
  updatedAt: null,
  reload: () => {},
});

export const STATS_REFRESH_MS = 30_000;

/** Shares GET /api/admin/stats between the sidebar badges and the dashboard (auto-refresh 30 s). */
export function StatsProvider({ children }) {
  const q = useApiQuery('/admin/stats', { interval: STATS_REFRESH_MS });
  const value = useMemo(
    () => ({
      stats: q.data ?? null,
      error: q.error,
      loading: q.loading,
      refreshing: q.refreshing,
      updatedAt: q.updatedAt,
      reload: q.reload,
    }),
    [q.data, q.error, q.loading, q.refreshing, q.updatedAt, q.reload],
  );
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats() {
  return useContext(StatsContext);
}
