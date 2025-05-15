
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Login = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Handle password reset flow
  useEffect(() => {
    const handlePasswordReset = async () => {
      const accessToken = searchParams.get('access_token');
      const type = searchParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        // User clicked a password reset link
        try {
          const { data, error } = await supabase.auth.updateUser({
            password: prompt('Please enter your new password') || '',
          });
          
          if (error) throw error;
          
          if (data) {
            toast.success('Password updated successfully!');
          }
        } catch (error) {
          console.error('Error resetting password:', error);
          toast.error('Failed to update password');
        }
      }
    };
    
    handlePasswordReset();
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
