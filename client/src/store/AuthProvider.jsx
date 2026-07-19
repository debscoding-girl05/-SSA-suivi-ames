import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { getToken, setToken } from '../api/client';
import * as authApi from '../api/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  // On mount, restore the session from a stored token (if any).
  useEffect(() => {
    let active = true;

    async function restore() {
      if (!getToken()) {
        if (active) setStatus('anonymous');
        return;
      }
      try {
        const { user: current } = await authApi.me();
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
      } catch {
        // Token invalid/expired — clear it.
        setToken(null);
        if (active) setStatus('anonymous');
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { token, user: current } = await authApi.login(identifier, password);
    setToken(token);
    setUser(current);
    setStatus('authenticated');
    return current;
  }, []);

  // Used after accepting an invitation: the accept endpoint already returns
  // a valid { token, user } pair, so we skip a redundant login round-trip.
  const setSession = useCallback((token, current) => {
    setToken(token);
    setUser(current);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout is best-effort; the token is stateless server-side.
    }
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, setSession }),
    [user, status, login, logout, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
