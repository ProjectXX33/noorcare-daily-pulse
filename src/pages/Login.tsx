
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';

const Login = () => {
  const { isAuthenticated, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState('en');
  const [isProcessingReset, setIsProcessingReset] = useState(false);
  
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
