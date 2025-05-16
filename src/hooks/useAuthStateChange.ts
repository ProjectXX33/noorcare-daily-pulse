
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile } from './useUserProfile';
import { supabase } from '@/lib/supabase';

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
  }, [navigate, isAuthenticated, setUser, setIsAuthenticated, setIsLoading, refreshSession]);
};
