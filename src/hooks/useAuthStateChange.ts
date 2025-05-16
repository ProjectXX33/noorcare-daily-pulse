
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
    
    // Set max timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      console.log('Auth loading timed out');
    }, 5000);
    
    // Initial session check - avoid redundant calls
    const initialCheck = async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error('Initial session check failed:', error);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    initialCheck();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? `User ID: ${session.user.id}` : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        try {
          const appUser = await fetchUserProfile(session.user.id);
          
          if (appUser) {
            console.log('User signed in:', appUser);
            setUser(appUser);
            setIsAuthenticated(true);
            
            // Only navigate if we're not already on the target page
            const currentPath = window.location.pathname;
            const targetPath = appUser.role === 'admin' ? '/dashboard' : '/employee-dashboard';
            
            if (currentPath === '/login' || currentPath === '/') {
              navigate(targetPath);
            }
          } else {
            console.warn('User signed in but no profile found');
            toast.error("User profile not found");
            // Clean up if profile missing
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Error processing auth state change:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        // Don't call refreshSession() here as it can cause an infinite loop
      }
      
      setIsLoading(false);
    });
    
    return () => {
      clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [navigate, setUser, setIsAuthenticated, setIsLoading, refreshSession]);
};
