import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback((options = {}) => {
    localStorage.removeItem('resisure_token');
    setUser(null);
    if (options.redirect && typeof window !== 'undefined') {
      const query = options.reason === 'session_expired' ? '?reason=session_expired' : '';
      window.location.href = `/auth/login${query}`;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout({ redirect: true, reason: 'session_expired' }));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('resisure_token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = (token, userData) => {
    localStorage.setItem('resisure_token', token);
    setUser(userData);
  };

  const refreshUser = useCallback(async () => {
    const res = await getMe();
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);