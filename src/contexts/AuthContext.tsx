
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockUsers } from '../data/mockData';
import { User } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for user in localStorage on initial load
    const storedUser = localStorage.getItem('noorcare_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored user', error);
        localStorage.removeItem('noorcare_user');
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // In a real app, this would be an API call to verify credentials
    // For demo, just check if username exists in our mockUsers and assume password is correct
    // In production, we'd use Laravel's API to authenticate

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const foundUser = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (foundUser) {
      // In a real app, we would validate the password here
      setUser(foundUser);
      setIsAuthenticated(true);
      localStorage.setItem('noorcare_user', JSON.stringify(foundUser));
      toast.success(`Welcome back, ${foundUser.name}!`);
      return true;
    }
    
    toast.error('Invalid username or password');
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('noorcare_user');
    navigate('/login');
    toast.success('You have been logged out');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
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
