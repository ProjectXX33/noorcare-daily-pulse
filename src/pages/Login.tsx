
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';

const Login = () => {
  const { isAuthenticated, user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState('en');
  const [isProcessingReset, setIsProcessingReset] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load language preference on component mount
  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = storedLang;
    }
  }, []);

  // Translation object for multilingual support
  const translations = {
    en: {
      enterNewPassword: "Please enter your new password",
      passwordUpdated: "Password updated successfully!",
      resetError: "Failed to update password"
    },
    ar: {
      enterNewPassword: "الرجاء إدخال كلمة المرور الجديدة",
      passwordUpdated: "تم تحديث كلمة المرور بنجاح!",
      resetError: "فشل في تحديث كلمة المرور"
    }
  };

  const t = translations[language as keyof typeof translations];
  
  // Handle password reset flow
  useEffect(() => {
    const handlePasswordReset = async () => {
      const accessToken = searchParams.get('access_token');
      const type = searchParams.get('type');
      
      console.log('Password reset parameters:', { accessToken: !!accessToken, type });
      
      if (type === 'recovery' && accessToken && !isProcessingReset) {
        setIsProcessingReset(true);
        try {
          const newPassword = prompt(t.enterNewPassword) || '';
          
          if (!newPassword) {
            setIsProcessingReset(false);
            return;
          }
          
          console.log('Updating password...');
          const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
          });
          
          if (error) throw error;
          
          if (data) {
            toast.success(t.passwordUpdated);
            // Refresh session after password update
            await refreshSession();
            console.log('Password updated successfully');
          }
        } catch (error) {
          console.error('Error resetting password:', error);
          toast.error(t.resetError);
        } finally {
          setIsProcessingReset(false);
        }
      }
    };
    
    handlePasswordReset();
  }, [searchParams, t, isProcessingReset, refreshSession]);

  // Check authentication status and redirect if needed
  useEffect(() => {
    console.log('Login page - checking auth status. isAuthenticated:', isAuthenticated);
    
    // Clear the loading state after a short delay to prevent UI freeze
    const loadingTimeout = setTimeout(() => setIsLoading(false), 1000);
    
    // If user is already authenticated, redirect to appropriate dashboard
    if (isAuthenticated && user) {
      console.log('User is authenticated, redirecting to dashboard');
      const targetPath = user.role === 'admin' ? '/dashboard' : '/employee-dashboard';
      navigate(targetPath, { replace: true });
      return;
    }
    
    // Only proceed with session check if not authenticated
    if (!isAuthenticated) {
      const checkSession = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          
          if (data.session) {
            console.log('Session found on login page, refreshing session...');
            await refreshSession();
          } else {
            console.log('No active session found on login page');
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Login page session check error:', error);
          setIsLoading(false);
        }
      };
      
      checkSession();
    } else {
      setIsLoading(false);
    }
    
    return () => clearTimeout(loadingTimeout);
  }, [isAuthenticated, user, navigate, refreshSession]);

  // Render a loading state while checking authentication
  if (isLoading && !isProcessingReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show login form if not authenticated
  if (isAuthenticated && user) {
    return null; // This will be unmounted as the redirect happens
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <LanguageProvider>
          <LoginForm />
        </LanguageProvider>
      </div>
    </div>
  );
};

export default Login;
