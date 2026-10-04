'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('pic_token');
    const saved = localStorage.getItem('pic_user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('pic_token');
        localStorage.removeItem('pic_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((data) => {
    localStorage.setItem('pic_token', data.token);
    localStorage.setItem('pic_user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pic_token');
    localStorage.removeItem('pic_user');
    localStorage.removeItem('ss_feed_cache');
    localStorage.removeItem('ss_feed_cache_ts');
    setUser(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('pic_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
