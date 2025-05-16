
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
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Function to fetch user profile data
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      if (!userData) {
        console.error('No user data found for ID:', userId);
        return null;
      }
      
      console.log('User profile data retrieved:', userData);
      
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
      
      return appUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Function to refresh the session
  const refreshSession = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      if (!sessionData?.session) {
        console.log('No active session found');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // Explicitly refresh the session token to extend its validity
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // Force logout on token refresh failure
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      console.log('Active session found, user ID:', sessionData.session.user.id);
      
      const appUser = await fetchUserProfile(sessionData.session.user.id);
      
      if (appUser) {
        console.log('User profile set from session:', appUser);
        setUser(appUser);
        setIsAuthenticated(true);
        
        // Redirect to the appropriate dashboard based on role
        if (appUser.role === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/employee-dashboard');
        }
      } else {
        console.warn('Session exists but no user profile found');
        // If we have a valid auth session but no user profile, sign out
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Refresh session error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing session on load and set up auto-refresh
  useEffect(() => {
    console.log('AuthProvider mounted, initializing auth state');
    
    // Set max timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      console.log('Auth loading timed out');
    }, 5000);
    
    // Initial session check
    refreshSession().then(() => clearTimeout(timeoutId));
    
    // Set up periodic token refresh to prevent session expiration
    // This is critical to prevent the cookie problem
    const refreshInterval = setInterval(() => {
      // Only refresh if we're authenticated
      if (isAuthenticated) {
        console.log('Performing scheduled token refresh');
        supabase.auth.refreshSession().catch(err => {
          console.error('Scheduled token refresh failed:', err);
        });
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        try {
          const appUser = await fetchUserProfile(session.user.id);
          
          if (appUser) {
            console.log('User signed in:', appUser);
            setUser(appUser);
            setIsAuthenticated(true);
            
            // Redirect to the appropriate dashboard based on role
            if (appUser.role === 'admin') {
              navigate('/dashboard');
            } else {
              navigate('/employee-dashboard');
            }
          } else {
            console.warn('User signed in but no profile found');
            // Clean up if profile missing
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Error processing auth state change:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Fixed: Removed the comparison with "USER_DELETED" which was causing the error
        console.log('User signed out');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(refreshInterval);
      authListener.subscription.unsubscribe();
    };
  }, [navigate, isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log('Attempting login for:', email);
      
      // Sign in with Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        toast.error('Invalid email or password');
        return false;
      }
      
      if (!data.user) {
        console.error('No user returned from auth');
        toast.error('Invalid email or password');
        return false;
      }
      
      console.log('Auth successful, fetching user profile');
      
      // Get user profile
      const appUser = await fetchUserProfile(data.user.id);
      
      if (!appUser) {
        console.error('User profile not found after successful auth');
        toast.error('User profile not found');
        // Sign out since profile is missing
        await supabase.auth.signOut();
        return false;
      }
      
      console.log('Login successful, user:', appUser);
      setUser(appUser);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${appUser.name}!`);
      
      // Redirect based on role
      if (appUser.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/employee-dashboard');
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error('An error occurred during login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
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
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated, 
      isLoading, 
      refreshSession 
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
