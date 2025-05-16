
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [language, setLanguage] = useState('en'); // Default language is English
  const {
    login
  } = useAuth();
  const navigate = useNavigate();

  // Translation object for multilingual support
  const translations = {
    en: {
      title: "NoorCare",
      resetPasswordDesc: "Enter your email to reset your password",
      loginDesc: "Enter your credentials to access your account",
      email: "Email",
      password: "Password",
      sendResetLink: "Send Reset Link",
      backToLogin: "Back to Login",
      signingIn: "Signing in...",
      signIn: "Sign In",
      forgotPassword: "Forgot your password?",
      languageSelector: "Language"
    },
    ar: {
      title: "نوركير",
      resetPasswordDesc: "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور",
      loginDesc: "أدخل بيانات الاعتماد الخاصة بك للوصول إلى حسابك",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      sendResetLink: "إرسال رابط إعادة التعيين",
      backToLogin: "العودة إلى تسجيل الدخول",
      signingIn: "جاري تسجيل الدخول...",
      signIn: "تسجيل الدخول",
      forgotPassword: "نسيت كلمة المرور؟",
      languageSelector: "اللغة"
    }
  };

  const t = translations[language as keyof typeof translations];

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

  const toggleLanguage = (value: string) => {
    setLanguage(value);
    // Store language preference
    localStorage.setItem('preferredLanguage', value);
    // Apply RTL for Arabic
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = value;
  };

  // Set language from storage or browser preference on component mount
  React.useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      toggleLanguage(storedLang);
    }
  }, []);

  return <Card className="w-full max-w-md" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className="flex justify-center mb-4">
          <img src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png" alt="NoorCare Logo" className="h-16 w-16 object-contain" />
        </div>
        <CardTitle className="text-2xl text-center text-primary">{t.title}</CardTitle>
        <CardDescription className="text-center">
          {resetPasswordMode ? t.resetPasswordDesc : t.loginDesc}
        </CardDescription>
        <div className="mt-2 flex justify-end">
          <Select value={language} onValueChange={toggleLanguage}>
            <SelectTrigger className="w-[110px]">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t.languageSelector} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {resetPasswordMode ? <form onSubmit={handleResetPassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">{t.email}</Label>
                <Input id="reset-email" type="email" placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? `${t.sendResetLink}...` : t.sendResetLink}
            </Button>
            <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setResetPasswordMode(false)} disabled={isLoading}>
              {t.backToLogin}
            </Button>
          </form> : <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input id="email" type="email" placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t.password}</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? t.signingIn : t.signIn}
            </Button>
            <div className="text-center mt-4">
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => setResetPasswordMode(true)}>
                {t.forgotPassword}
              </button>
            </div>
          </form>}
      </CardContent>
    </Card>;
};
export default LoginForm;
