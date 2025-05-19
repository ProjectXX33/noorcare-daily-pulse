
import React, { createContext, useContext } from 'react';
import { User } from '../types';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAuthStateChange } from '../hooks/useAuthStateChange';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    setIsLoading,
    refreshSession,
    login,
    logout,
    updateUserProfile
  } = useSessionManager();

  // Set up auth state change listener
  useAuthStateChange({
    setUser,
    setIsAuthenticated,
    setIsLoading,
    refreshSession,
    isAuthenticated
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated, 
      isLoading, 
      refreshSession,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
