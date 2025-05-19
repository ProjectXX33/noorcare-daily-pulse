
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import LanguageSelector from '@/components/LanguageSelector';
import { User, Lock, Bell, Moon, Sun, Smartphone } from 'lucide-react';

const SettingsPage = () => {
  const { user, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('preferredLanguage') || 'en');
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({
    theme: localStorage.getItem('theme') || 'light',
    notificationsEnabled: true,
    emailNotifications: true,
    darkMode: localStorage.getItem('theme') === 'dark',
  });

  // Translation object for multilingual support
  const translations = {
    en: {
      settings: "Settings",
      account: "Account",
      preferences: "Preferences",
      security: "Security",
      notifications: "Notifications",
      profile: "Profile",
      personalInfo: "Your personal information",
      name: "Name",
      email: "Email",
      updateProfile: "Update Profile",
      changePassword: "Change Password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      updatePassword: "Update Password",
      language: "Language",
      theme: "Theme",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      systemDefault: "System Default",
      notificationPrefs: "Notification Preferences",
      enableNotifications: "Enable Notifications",
      emailNotifications: "Email Notifications",
      pushNotifications: "Push Notifications",
      desktopNotifications: "Desktop Notifications",
      savePreferences: "Save Preferences",
      profileUpdated: "Profile updated successfully!",
      passwordUpdated: "Password updated successfully!",
      preferencesUpdated: "Preferences updated successfully!",
      accountSettings: "Account Settings",
      notificationSettings: "Notification Settings",
      interfaceSettings: "Interface Settings",
      userSettings: "User Settings"
    },
    ar: {
      settings: "الإعدادات",
      account: "الحساب",
      preferences: "التفضيلات",
      security: "الأمان",
      notifications: "الإشعارات",
      profile: "الملف الشخصي",
      personalInfo: "معلوماتك الشخصية",
      name: "الاسم",
      email: "البريد الإلكتروني",
      updateProfile: "تحديث الملف الشخصي",
      changePassword: "تغيير كلمة المرور",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      updatePassword: "تحديث كلمة المرور",
      language: "اللغة",
      theme: "المظهر",
      darkMode: "الوضع الداكن",
      lightMode: "الوضع الفاتح",
      systemDefault: "إفتراضي النظام",
      notificationPrefs: "تفضيلات الإشعارات",
      enableNotifications: "تفعيل الإشعارات",
      emailNotifications: "إشعارات البريد الإلكتروني",
      pushNotifications: "إشعارات الدفع",
      desktopNotifications: "إشعارات سطح المكتب",
      savePreferences: "حفظ التفضيلات",
      profileUpdated: "تم تحديث الملف الشخصي بنجاح!",
      passwordUpdated: "تم تحديث كلمة المرور بنجاح!",
      preferencesUpdated: "تم تحديث التفضيلات بنجاح!",
      accountSettings: "إعدادات الحساب",
      notificationSettings: "إعدادات الإشعارات",
      interfaceSettings: "إعدادات الواجهة",
      userSettings: "إعدادات المستخدم"
    }
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
    
    // Initialize user profile
    if (user) {
      setUserProfile({
        ...userProfile,
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update user profile
      await updateUserProfile({
        id: user.id,
        name: userProfile.name,
      });
      
      // Update email if changed
      if (userProfile.email !== user.email) {
        const { error } = await supabase.auth.updateUser({
          email: userProfile.email,
        });
        
        if (error) throw error;
      }
      
      toast.success(t.profileUpdated);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!userProfile.password || !userProfile.confirmPassword) {
      toast.error('Please enter both password fields');
      return;
    }
    
    if (userProfile.password !== userProfile.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: userProfile.password,
      });
      
      if (error) throw error;
      
      // Reset password fields
      setUserProfile({
        ...userProfile,
        password: '',
        confirmPassword: '',
      });
      
      toast.success(t.passwordUpdated);
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    setLoading(true);
    try {
      // Update theme preference
      localStorage.setItem('theme', preferences.darkMode ? 'dark' : 'light');
      
      // Apply theme
      document.documentElement.classList.toggle('dark', preferences.darkMode);
      
      // Here you would save notification preferences to the user's profile in Supabase
      // For now, we'll just set them in local storage
      localStorage.setItem('notifications', JSON.stringify({
        enabled: preferences.notificationsEnabled,
        email: preferences.emailNotifications,
      }));
      
      toast.success(t.preferencesUpdated);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    localStorage.setItem('preferredLanguage', value);
    setLanguage(value);
    window.location.reload(); // Refresh to apply language change
  };

  const handleThemeToggle = () => {
    const newDarkMode = !preferences.darkMode;
    setPreferences({
      ...preferences,
      darkMode: newDarkMode
    });
    
    // Update theme
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.settings}</h1>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{t.account}</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>{t.preferences}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span>{t.security}</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.profile}</CardTitle>
              <CardDescription>{t.personalInfo}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.name}</Label>
                    <Input 
                      id="name" 
                      value={userProfile.name} 
                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.email}</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={userProfile.email} 
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {t.updateProfile}
                    </div>
                  ) : t.updateProfile}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.interfaceSettings}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="language">{t.language}</Label>
                  <div className="w-full md:w-80">
                    <LanguageSelector />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.darkMode}</Label>
                    <p className="text-sm text-muted-foreground">
                      {preferences.darkMode ? t.darkMode : t.lightMode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <Switch
                      checked={preferences.darkMode}
                      onCheckedChange={handleThemeToggle}
                    />
                    <Moon className="h-4 w-4" />
                  </div>
                </div>
                
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {t.savePreferences}
                    </div>
                  ) : t.savePreferences}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t.notificationSettings}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.enableNotifications}</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about important updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notificationsEnabled}
                    onCheckedChange={(checked) => setPreferences({...preferences, notificationsEnabled: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.emailNotifications}</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
                    disabled={!preferences.notificationsEnabled}
                  />
                </div>
                
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {t.savePreferences}
                    </div>
                  ) : t.savePreferences}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.changePassword}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t.newPassword}</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={userProfile.password} 
                      onChange={(e) => setUserProfile({...userProfile, password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={userProfile.confirmPassword} 
                      onChange={(e) => setUserProfile({...userProfile, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handlePasswordUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {t.updatePassword}
                    </div>
                  ) : t.updatePassword}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
