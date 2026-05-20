import { createContext, useContext, useState, ReactNode } from 'react';
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

  const setApiKey = (key: string) => {
    localStorage.setItem('om_api_key', key);
    api.setApiKey(key);
    setKey(key);
  };

  // Initialize
  if (apiKey) {
    api.setApiKey(apiKey);
  }

  return (
    <AuthContext.Provider value={{ apiKey, setApiKey, isAuthenticated: !!apiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
