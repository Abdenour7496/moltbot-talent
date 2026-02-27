import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ── Types ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
  active: boolean;
  tenantId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    displayName: string;
    password: string;
    orgName?: string;
    orgIndustry?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

// ── Internal fetch helper (independent of api.ts) ──────────────────

const API_BASE = '/api';

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Provider ────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authFetch<AuthUser>('/auth/me');
      setUser(u);
    } catch {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    const { token, user: u } = await authFetch<{
      token: string;
      user: AuthUser;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('auth_token', token);
    setUser(u);
  };

  const register = async (data: {
    username: string;
    email: string;
    displayName: string;
    password: string;
    orgName?: string;
    orgIndustry?: string;
  }) => {
    const { token, user: u } = await authFetch<{
      token: string;
      user: AuthUser;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('auth_token', token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
