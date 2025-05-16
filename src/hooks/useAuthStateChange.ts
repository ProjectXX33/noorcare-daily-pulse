
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile } from './useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export interface AuthStateChangeProps {
  setUser: (user: any) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
}

export const useAuthStateChange = ({
  setUser,
  setIsAuthenticated,
  setIsLoading,
  refreshSession,
  isAuthenticated
}: AuthStateChangeProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider mounted, initializing auth state');
    
    let isMounted = true;
    
    // Set max timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        console.log('Auth loading timed out');
      }
    }, 5000);
    
    // Only perform initial check if needed
    const initialCheck = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Initial session check:', data.session ? 'Session exists' : 'No session');
        
        if (data.session) {
          // Session exists, use it directly instead of refreshing
          const appUser = await fetchUserProfile(data.session.user.id);
          
          if (appUser && isMounted) {
            console.log('User profile found during initial check:', appUser);
            setUser(appUser);
            setIsAuthenticated(true);
            
            // Only navigate if we're on the login page
            const currentPath = window.location.pathname;
            if (currentPath === '/login' || currentPath === '/') {
              const targetPath = appUser.role === 'admin' ? '/dashboard' : '/employee-dashboard';
              navigate(targetPath);
            }
          } else if (isMounted) {
            console.warn('Session exists but no user profile found');
            // Don't sign out here, let the auth state change handle it
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Initial session check failed:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };
    
    // Set up auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? `User ID: ${session.user.id}` : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        // Use setTimeout to prevent potential deadlocks with Supabase client
        setTimeout(async () => {
          if (!isMounted) return;
          
          try {
            const appUser = await fetchUserProfile(session.user.id);
            
            if (appUser && isMounted) {
              console.log('User signed in:', appUser);
              setUser(appUser);
              setIsAuthenticated(true);
              
              // Only navigate if we're on the login page
              const currentPath = window.location.pathname;
              if (currentPath === '/login' || currentPath === '/') {
                const targetPath = appUser.role === 'admin' ? '/dashboard' : '/employee-dashboard';
                navigate(targetPath);
              }
            } else if (isMounted) {
              console.warn('User signed in but no profile found');
              toast.error("User profile not found");
              // Clean up if profile missing
              await supabase.auth.signOut();
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (error) {
            console.error('Error processing auth state change:', error);
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          navigate('/login');
          setIsLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        // Don't call refreshSession() here as it can cause an infinite loop
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });
    
    // Then check for existing session
    initialCheck();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setIsAuthenticated, setIsLoading, refreshSession]);
};
