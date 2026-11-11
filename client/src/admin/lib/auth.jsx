import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, onUnauthorized } from './api.js';
import { PageLoader } from '../components/Skeleton.jsx';

const AuthContext = createContext(null);

/**
 * status: 'loading' | 'authenticated' | 'unauthenticated'
 * reason (when unauthenticated): null | 'expired' | 'logout' | 'unreachable'
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', admin: null, reason: null });

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/admin/auth/me');
      setState({ status: 'authenticated', admin: data?.admin ?? null, reason: null });
      return true;
    } catch (err) {
      setState({ status: 'unauthenticated', admin: null, reason: err?.status === 401 ? null : 'unreachable' });
      return false;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Any 401 from a protected endpoint while signed in = session expired.
  useEffect(
    () =>
      onUnauthorized(() => {
        setState((s) => (s.status === 'authenticated' ? { status: 'unauthenticated', admin: null, reason: 'expired' } : s));
      }),
    [],
  );

  const login = useCallback(async ({ email, password }) => {
    const data = await api.post('/admin/auth/login', { email, password });
    setState({ status: 'authenticated', admin: data?.admin ?? null, reason: null });
    return data?.admin ?? null;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/admin/auth/logout');
    } finally {
      setState({ status: 'unauthenticated', admin: null, reason: 'logout' });
    }
  }, []);

  const value = useMemo(() => ({ ...state, refresh, login, logout }), [state, refresh, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Route guard: redirects to /admin/login (remembering the target) unless signed in. */
export function RequireAuth({ children }) {
  const { status, reason } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader label="Checking your session…" />;

  if (status !== 'authenticated') {
    const state =
      reason === 'logout'
        ? { loggedOut: true }
        : {
            from: { pathname: location.pathname, search: location.search, hash: location.hash },
            expired: reason === 'expired',
          };
    return <Navigate to="/admin/login" replace state={state} />;
  }

  return children;
}
