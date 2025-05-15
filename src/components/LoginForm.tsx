import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        // Navigation is handled within login function
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) {
        toast.error('Error sending password reset email: ' + error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.');
        setResetPasswordMode(false);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  return <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <img src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png" alt="NoorCare Logo" className="h-16 w-16 object-contain" />
        </div>
        <CardTitle className="text-2xl text-center text-primary">NoorCare</CardTitle>
        <CardDescription className="text-center">
          {resetPasswordMode ? 'Enter your email to reset your password' : 'Enter your credentials to access your account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {resetPasswordMode ? <form onSubmit={handleResetPassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setResetPasswordMode(false)} disabled={isLoading}>
              Back to Login
            </Button>
          </form> : <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center mt-4">
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => setResetPasswordMode(true)}>
                Forgot your password?
              </button>
            </div>
          </form>}
      </CardContent>
    </Card>;
};
export default LoginForm;