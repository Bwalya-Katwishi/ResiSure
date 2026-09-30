import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(async (options = {}) => {
    await AsyncStorage.removeItem('resisure_token');
    setUser(null);
    if (options.reason === 'session_expired') {
      setSessionExpired(true);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout({ reason: 'session_expired' }));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('resisure_token');
        if (!token) return;
        const res = await getMe();
        setUser(res.data.data.user);
      } catch {
        await AsyncStorage.removeItem('resisure_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (token, nextUser) => {
    await AsyncStorage.setItem('resisure_token', token);
    setSessionExpired(false);
    setUser(nextUser);
  };

  const refreshUser = async () => {
    const res = await getMe();
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, setUser, refreshUser, sessionExpired, clearSessionExpired,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
