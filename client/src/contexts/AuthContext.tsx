import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export const AUTH_STORAGE_KEY = 'admin_auth';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  point?: number;
  mileage?: number;
};

export type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }>;
  logout: () => void;
  getToken: () => string | null;
  clearAuth: () => void;
};

const initialState: AuthState = {
  token: null,
  user: null,
  ready: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): Partial<AuthState> {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as StoredAuth;
    if (data.accessToken && data.refreshToken && data.user) {
      return { token: data.accessToken, user: data.user };
    }
  } catch {
    // ignore
  }
  return {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...initialState, ready: false });

  const persist = useCallback((accessToken: string | null, refreshToken: string | null, user: AuthUser | null) => {
    if (accessToken && refreshToken && user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user }));
      setState((s) => ({ ...s, token: accessToken, user }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setState((s) => ({ ...s, token: null, user: null }));
    }
  }, []);

  useEffect(() => {
    const stored = loadStored();
    setState((s) => ({ ...s, ...stored, ready: true }));
  }, []);

  useEffect(() => {
    const handler = () => persist(null, null, null);
    window.addEventListener('auth:sessionExpired', handler);
    return () => window.removeEventListener('auth:sessionExpired', handler);
  }, [persist]);

  const login = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: (data as { error?: string }).error ?? '로그인 실패' };
        }
        const { accessToken, refreshToken, user } = data as {
          accessToken: string;
          refreshToken: string;
          user: AuthUser;
        };
        if (!accessToken || !refreshToken || !user) return { ok: false, error: '응답 형식 오류' };
        persist(accessToken, refreshToken, user);
        return { ok: true, user };
      } catch (e) {
        const { isNetworkError, dispatchNetworkError } = await import('../api/client');
        if (isNetworkError(e)) dispatchNetworkError();
        return { ok: false, error: e instanceof Error ? e.message : '로그인 실패' };
      }
    },
    [persist]
  );

  const clearAuth = useCallback(() => {
    persist(null, null, null);
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as StoredAuth;
        if (data.refreshToken) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: data.refreshToken }),
          });
        }
      }
    } catch (e) {
      const { isNetworkError, dispatchNetworkError } = await import('../api/client');
      if (isNetworkError(e)) dispatchNetworkError();
    } finally {
      persist(null, null, null);
    }
  }, [persist]);

  const getToken = useCallback(() => state.token, [state.token]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    getToken,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
