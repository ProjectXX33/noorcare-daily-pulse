
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserProfile } from './useUserProfile';

export const useSessionManager = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

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
      
      console.log('Active session found, user ID:', sessionData.session.user.id);
      
      // Don't re-fetch profile if we already have it and user ID matches
      if (user && user.id === sessionData.session.user.id) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
      
      const appUser = await fetchUserProfile(sessionData.session.user.id);
      
      if (appUser) {
        console.log('User profile set from session:', appUser);
        setUser(appUser);
        setIsAuthenticated(true);
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
      
      // Redirect based on role - let the auth state change handle this
      return true;
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error('An error occurred during login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log out the user
  const logout = async () => {
    try {
      console.log('Logging out...');
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast.success('You have been logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
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
    logout
  };
};
