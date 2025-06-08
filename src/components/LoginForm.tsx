import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
// import LanguageSelector from './LanguageSelector';
import { Mail, Lock } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { language } = useLanguage();

  const translations = {
    en: {
      title: "Login",
      description: "Enter your credentials to access the system",
      email: "Email",
      emailPlaceholder: "Enter your email",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      loginButton: "Login",
      loggingIn: "Logging in...",
      footer: "Employee Attendance and Management System"
    },
    ar: {
      title: "تسجيل الدخول",
      description: "أدخل بيانات الاعتماد للوصول إلى النظام",
      email: "البريد الإلكتروني",
      emailPlaceholder: "أدخل بريدك الإلكتروني",
      password: "كلمة المرور",
      passwordPlaceholder: "أدخل كلمة المرور",
      loginButton: "تسجيل الدخول",
      loggingIn: "جاري تسجيل الدخول...",
      footer: "نظام حضور وإدارة الموظفين"
    }
  };

  const t = translations[language as keyof typeof translations];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Attempting login with:', { email });
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <LanguageSelector />
      </div> */}
      
      <Card className="w-full max-w-md mx-auto shadow-card animate-fade-in glass-effect">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center items-center mb-2">
            <img
              src="/NQ-ICON.png"
              alt="NoorHub Logo"
              className="h-12 w-12"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-primary-600">{t.title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t.description}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t.email}</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <Input 
                  id="email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t.password}</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <Input 
                  id="password"
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-600 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.loggingIn}
                </div>
              ) : t.loginButton}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">{t.footer}</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginForm;
