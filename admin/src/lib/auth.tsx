'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from './api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  language: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const savedToken = localStorage.getItem('qp_token');
    const savedUser = localStorage.getItem('qp_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await authApi.login(identifier, password);

    // Vérifier que c'est un admin
    if (!['super_admin', 'admin'].includes(response.user.role)) {
      throw new Error('Accès réservé aux administrateurs');
    }

    setUser(response.user);
    setToken(response.accessToken);

    localStorage.setItem('qp_token', response.accessToken);
    localStorage.setItem('qp_refresh', response.refreshToken);
    localStorage.setItem('qp_user', JSON.stringify(response.user));
  }, []);

  const logout = useCallback(() => {
    if (token) {
      authApi.logout(token).catch(() => {});
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('qp_token');
    localStorage.removeItem('qp_refresh');
    localStorage.removeItem('qp_user');
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
