import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { getToken, setToken } from '../api/client';
import * as authApi from '../api/auth';

// Dernier profil connu, gardé sur l'appareil : l'appli s'ouvre tout de suite
// (même sur un réseau mobile lent ou coupé) et revalide la session en fond.
const USER_KEY = 'ssa.user';
function readCachedUser() {
  try { return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function writeCachedUser(u) {
  try {
    if (u) window.localStorage.setItem(USER_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(USER_KEY);
  } catch { /* stockage indisponible : pas de cache, sans conséquence */ }
}

// Seul un refus explicite du serveur invalide la session. Une coupure, un
// délai dépassé ou une page d'opérateur ne doivent JAMAIS déconnecter.
const isAuthRejection = (err) => err?.status === 401;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? readCachedUser() : null));
  // loading | authenticated | anonymous | offline (serveur injoignable au démarrage)
  const [status, setStatus] = useState(() => {
    if (!getToken()) return 'anonymous';
    return readCachedUser() ? 'authenticated' : 'loading';
  });
  const [attempt, setAttempt] = useState(0);

  const clearSession = useCallback(() => {
    setToken(null);
    writeCachedUser(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Au démarrage (et à chaque « Réessayer ») : revalide le jeton enregistré.
  useEffect(() => {
    if (!getToken()) return undefined;
    let active = true;
    authApi.me()
      .then(({ user: current }) => {
        if (!active) return;
        writeCachedUser(current);
        setUser(current);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (!active) return;
        if (isAuthRejection(err)) clearSession();
        // Réseau indisponible : avec un profil en cache on reste connecté,
        // sinon on propose de réessayer au lieu de déconnecter.
        else setStatus((st) => (st === 'authenticated' ? st : 'offline'));
      });
    return () => { active = false; };
  }, [attempt, clearSession]);

  const retry = useCallback(() => { setStatus('loading'); setAttempt((n) => n + 1); }, []);

  const login = useCallback(async (identifier, password) => {
    const { token, user: current } = await authApi.login(identifier, password);
    setToken(token);
    writeCachedUser(current);
    setUser(current);
    setStatus('authenticated');
    return current;
  }, []);

  // Used after accepting an invitation: the accept endpoint already returns
  // a valid { token, user } pair, so we skip a redundant login round-trip.
  const setSession = useCallback((token, current) => {
    setToken(token);
    writeCachedUser(current);
    setUser(current);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout is best-effort; the token is stateless server-side.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, logout, setSession, retry }),
    [user, status, login, logout, setSession, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
