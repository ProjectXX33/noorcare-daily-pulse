import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchUserProfile } from './useUserProfile';
import UserActivityTracker from '@/utils/userActivityTracker';

export const useSessionManager = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const navigate = useNavigate();

  // Function to refresh the session
  const refreshSession = async (): Promise<void> => {
    // Prevent rapid consecutive refreshes
    const now = Date.now();
    if (now - lastRefresh < 1000) {
      console.log('Refresh throttled - skipping');
      return;
    }
    
    setLastRefresh(now);
    
    try {
      console.log('Refreshing session...');
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
      
      console.log('Active session found, user ID:', sessionData.session.user.id);
      
      // Don't re-fetch profile if we already have it and user ID matches
      if (user && user.id === sessionData.session.user.id) {
        console.log('User profile already loaded, skipping fetch');
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
      
      const appUser = await fetchUserProfile(sessionData.session.user.id);
      
      if (appUser) {
        console.log('User profile set from session:', appUser);
        setUser(appUser);
        setIsAuthenticated(true);
        
        // Initialize activity tracking
        const activityTracker = UserActivityTracker.getInstance();
        await activityTracker.initialize(appUser.id);
      } else {
        console.warn('Session exists but no user profile found');
        // If we have a valid auth session but no user profile, sign out
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
        toast.error('User profile not found');
      }
    } catch (error) {
      console.error('Refresh session error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log in a user
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
        setIsLoading(false);
        return false;
      }
      
      if (!data.user) {
        console.error('No user returned from auth');
        toast.error('Invalid email or password');
        setIsLoading(false);
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
        setIsLoading(false);
        return false;
      }
      
      console.log('Login successful, user:', appUser);
      setUser(appUser);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${appUser.name}!`);
      
      // Initialize activity tracking
      const activityTracker = UserActivityTracker.getInstance();
      await activityTracker.initialize(appUser.id);
      
      // Don't navigate here - this navigation will be handled by the onAuthStateChange listener
      // We want to avoid multiple navigation attempts
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error('An error occurred during login');
      setIsLoading(false);
      return false;
    }
  };

  // Function to log out the user
  const logout = async () => {
    try {
      console.log('Logging out...');
      setIsLoading(true);
      
      // First update local state to prevent redirection attempts
      setUser(null);
      setIsAuthenticated(false);
      
      // Then navigate to login page
      navigate('/login', { replace: true });
      
      // Finally sign out from Supabase
      // This prevents errors when the auth state changes while redirecting
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          toast.success('You have been logged out');
        } catch (error) {
          console.error('Delayed signout error:', error);
        } finally {
          setIsLoading(false);
        }
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
      setIsLoading(false);
    }
  };

  // Function to update user profile
  const updateUserProfile = async (userData: Partial<User>): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      setIsLoading(true);
      
      // Update the user profile in the database
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          username: userData.username,
          department: userData.department,
          position: userData.position
        })
        .eq('id', userData.id || user.id);
      
      if (error) {
        throw error;
      }
      
      // Update the local user state
      if (userData.id === user.id) {
        setUser({
          ...user,
          ...userData
        });
      }
      
      console.log('User profile updated successfully');
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
};
