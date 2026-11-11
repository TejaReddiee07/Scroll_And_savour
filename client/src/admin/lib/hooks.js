import { useCallback, useEffect, useRef, useState } from 'react';
import { api, toQueryString } from './api.js';

/**
 * GET an admin endpoint with loading / error / silent-refresh handling.
 *
 *   const q = useApiQuery('/admin/orders', { query: { page }, interval: 20000 });
 *   q.data, q.error, q.loading (first/filtered load), q.refreshing (silent),
 *   q.reload() (silent), q.refetch() (shows loading), q.setData(updater)
 *
 * Polling pauses while the tab is hidden and refreshes when it becomes visible.
 */
export function useApiQuery(path, { query, interval = 0, enabled = true } = {}) {
  const url = path ? `${path}${toQueryString(query)}` : null;
  const active = Boolean(url && enabled);

  const [state, setState] = useState({
    data: undefined,
    error: null,
    loading: active,
    refreshing: false,
    updatedAt: null,
  });
  const controllerRef = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!url) return undefined;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState((s) => (silent ? { ...s, refreshing: true } : { ...s, loading: true, error: null }));
      try {
        const data = await api.get(url, undefined, { signal: controller.signal });
        if (controller.signal.aborted) return undefined;
        setState({ data, error: null, loading: false, refreshing: false, updatedAt: Date.now() });
        return data;
      } catch (err) {
        if (controller.signal.aborted || err?.name === 'AbortError') return undefined;
        setState((s) =>
          silent && s.data !== undefined
            ? { ...s, refreshing: false }
            : { ...s, error: err, loading: false, refreshing: false },
        );
        return undefined;
      }
    },
    [url],
  );

  useEffect(() => {
    if (!active) return undefined;
    load();
    return () => controllerRef.current?.abort();
  }, [load, active]);

  useEffect(() => {
    if (!active || !interval) return undefined;
    const tick = () => {
      if (!document.hidden) load({ silent: true });
    };
    const timer = setInterval(tick, interval);
    const onVisibility = () => {
      if (!document.hidden) load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, interval, load]);

  const reload = useCallback(() => load({ silent: true }), [load]);
  const refetch = useCallback(() => load({ silent: false }), [load]);
  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  );

  return { ...state, reload, refetch, setData };
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Track a Set of ids with in-flight requests (e.g. per-row toggles). */
export function usePendingIds() {
  const [ids, setIds] = useState(() => new Set());
  const add = useCallback((id) => setIds((s) => new Set(s).add(id)), []);
  const remove = useCallback(
    (id) =>
      setIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      }),
    [],
  );
  return { has: (id) => ids.has(id), add, remove };
}
