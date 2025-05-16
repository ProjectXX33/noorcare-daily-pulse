
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile } from './useUserProfile';
import { supabase } from '@/lib/supabase';
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
    let initialCheckComplete = false;
    let navigationInProgress = false;
    
    // Set max timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        console.log('Auth loading timed out');
      }
    }, 5000);
    
    // Set up auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? `User ID: ${session.user.id}` : 'No session');
      
      if (!isMounted) return;
      
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
              setIsLoading(false);
              
              // Only navigate if we're on the login page and initial check is complete
              // and no navigation is currently in progress
              if (initialCheckComplete && !navigationInProgress) {
                const currentPath = window.location.pathname;
                if (currentPath === '/login' || currentPath === '/') {
                  navigationInProgress = true;
                  console.log('Navigating from', currentPath, 'to dashboard');
                  const targetPath = appUser.role === 'admin' ? '/dashboard' : '/employee-dashboard';
                  navigate(targetPath, { replace: true });
                  // Reset navigation flag after a short delay
                  setTimeout(() => {
                    navigationInProgress = false;
                  }, 500);
                }
              }
            } else if (isMounted) {
              console.warn('User signed in but no profile found');
              toast.error("User profile not found");
              setUser(null);
              setIsAuthenticated(false);
              setIsLoading(false);
            }
          } catch (error) {
            console.error('Error processing auth state change:', error);
            setIsLoading(false);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          
          // Don't navigate here since we already navigate in the logout function
          // This prevents double navigation that can cause errors
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
            
            // Only navigate if we're on the login page and no navigation is in progress
            const currentPath = window.location.pathname;
            if ((currentPath === '/login' || currentPath === '/') && !navigationInProgress) {
              navigationInProgress = true;
              console.log('Navigating from', currentPath, 'to dashboard on initial check');
              const targetPath = appUser.role === 'admin' ? '/dashboard' : '/employee-dashboard';
              navigate(targetPath, { replace: true });
              // Reset navigation flag after a short delay
              setTimeout(() => {
                navigationInProgress = false;
              }, 500);
            }
          } else if (isMounted) {
            console.warn('Session exists but no user profile found');
            setUser(null);
            setIsAuthenticated(false);
            
            // If we have a valid auth session but no profile, sign out
            await supabase.auth.signOut();
            toast.error('User profile not found');
          }
        } else {
          // No session, ensure user is logged out
          setUser(null);
          setIsAuthenticated(false);
          
          // Only redirect to login if not already there and not on the root page
          // and no navigation is in progress
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/' && !navigationInProgress) {
            navigationInProgress = true;
            console.log('No session, redirecting to login page');
            navigate('/login', { replace: true });
            // Reset navigation flag after a short delay
            setTimeout(() => {
              navigationInProgress = false;
            }, 500);
          }
        }
      } catch (error) {
        console.error('Initial session check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          initialCheckComplete = true;
          clearTimeout(timeoutId);
        }
      }
    };
    
    initialCheck();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setIsAuthenticated, setIsLoading]);
};
