import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface AuthState {
  apiKey: string;
  setApiKey: (key: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState>({
  apiKey: '',
  setApiKey: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setKey] = useState(() => localStorage.getItem('om_api_key') || '');

  useEffect(() => {
    const saved = localStorage.getItem('om_api_key');
    if (saved) {
      api.setApiKey(saved);
      setKey(saved);
    }
  }, []);

  const setApiKey = (key: string) => {
    localStorage.setItem('om_api_key', key);
    api.setApiKey(key);
    setKey(key);
  };

  return (
    <AuthContext.Provider value={{ apiKey, setApiKey, isAuthenticated: !!apiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
