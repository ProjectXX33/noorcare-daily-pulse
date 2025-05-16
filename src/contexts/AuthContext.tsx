
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        
        // Get current session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData?.session) {
          setIsLoading(false);
          return;
        }
        
        // Get user profile
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user data:', error);
          // Don't show error toast on initial load to prevent unwanted notifications
          setIsLoading(false);
          return;
        }
        
        if (!userData) {
          console.error('No user data found');
          setIsLoading(false);
          return;
        }
        
        // Transform from database format to app format
        const appUser: User = {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department,
          position: userData.position,
          lastCheckin: userData.last_checkin ? new Date(userData.last_checkin) : undefined
        };
        
        setUser(appUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          // Get user profile after sign in
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching user profile:', error);
            return;
          }
          
          if (!userData) {
            console.error('No user data found after sign in');
            return;
          }
          
          const appUser: User = {
            id: userData.id,
            username: userData.username,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            department: userData.department,
            position: userData.position,
            lastCheckin: userData.last_checkin ? new Date(userData.last_checkin) : undefined
          };
          
          setUser(appUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error processing auth state change:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Sign in with Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error || !data.user) {
        toast.error('Invalid email or password');
        return false;
      }
      
      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (userError) {
        console.error('Error fetching user profile:', userError);
        toast.error('Error fetching user profile');
        return false;
      }
      
      if (!userData) {
        toast.error('User profile not found');
        return false;
      }
      
      // Transform to app user format
      const appUser: User = {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        position: userData.position,
        lastCheckin: userData.last_checkin ? new Date(userData.last_checkin) : undefined
      };
      
      setUser(appUser);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${userData.name}!`);
      
      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/employee-dashboard');
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast.success('You have been logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
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
