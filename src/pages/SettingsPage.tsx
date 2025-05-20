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
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Preferences {
  notifications: {
    enabled: boolean;
    email: boolean;
  };
}

const SettingsPage = () => {
  const { user, updateUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState<Preferences>({
    notifications: {
      enabled: true,
      email: true
    }
  });

  useEffect(() => {
    // Initialize user profile
    if (user) {
      setUserProfile({
        ...userProfile,
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.preferences) {
          setPreferences(data.preferences as Preferences);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
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
      
      toast.success(t('profileUpdated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('failedToUpdateProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!userProfile.password || !userProfile.confirmPassword) {
      toast.error(t('enterBothPasswords'));
      return;
    }
    
    if (userProfile.password !== userProfile.confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
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
      
      toast.success(t('passwordUpdated'));
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(t('failedToUpdatePassword'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ preferences })
        .eq('id', user.id);

      if (error) throw error;

      // Store notification preferences in local storage as backup
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences.notifications));
      
      toast.success(t('preferencesUpdated'));
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error(t('errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container mx-auto py-6 space-y-6 ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className={`flex ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
          <TabsTrigger value="account" className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
            <User className="h-4 w-4" />
            <span>{t('account')}</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
            <Bell className="h-4 w-4" />
            <span>{t('preferences')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
            <Lock className="h-4 w-4" />
            <span>{t('security')}</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile')}</CardTitle>
              <CardDescription>{t('personalInfo')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={language === 'ar' ? 'text-right' : 'text-left'}>{t('name')}</Label>
                    <Input 
                      id="name" 
                      value={userProfile.name} 
                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                      className={language === 'ar' ? 'text-right' : 'text-left'}
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className={language === 'ar' ? 'text-right' : 'text-left'}>{t('email')}</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={userProfile.email} 
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                      className={language === 'ar' ? 'text-right' : 'text-left'}
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${language === 'ar' ? 'ml-2' : 'mr-2'}`}></div>
                      {t('updateProfile')}
                    </div>
                  ) : t('updateProfile')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('interfaceSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="mt-4 flex flex-col gap-2">
                  <Label htmlFor="language" className={language === 'ar' ? 'text-right' : 'text-left'}>{t('language')}</Label>
                  <div className={`w-full md:w-80 ${language === 'ar' ? 'ml-auto' : ''}`}>
                    <LanguageSelector />
                  </div>
                </div>
                <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Sun className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    <div className="space-y-0.5">
                      <Label className={language === 'ar' ? 'text-right' : 'text-left'}>{t('theme')}</Label>
                      <p className={`text-sm text-muted-foreground transition-colors duration-200 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        {theme === 'dark' ? t('darkMode') : t('lightMode')}
                      </p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
                <div className={`flex ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                  <Button 
                    className={`mt-4 bg-primary hover:bg-primary/90 ${language === 'ar' ? 'ml-auto' : ''}`} 
                    onClick={handlePreferencesUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}> 
                        <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${language === 'ar' ? 'ml-2' : 'mr-2'}`}></div>
                        {t('savePreferences')}
                      </div>
                    ) : t('savePreferences')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationsSettings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="space-y-0.5">
                    <Label className={language === 'ar' ? 'text-right' : 'text-left'}>{t('notificationsSettings')}</Label>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t('notificationsDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.enabled}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, enabled: checked }
                      }))
                    }
                  />
                </div>
                
                <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="space-y-0.5">
                    <Label className={language === 'ar' ? 'text-right' : 'text-left'}>{t('emailNotifications')}</Label>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t('emailNotificationsDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.email}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: checked }
                      }))
                    }
                  />
                </div>
                
                <div className={`flex ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                  <Button 
                    className={`mt-4 bg-primary hover:bg-primary/90 ${language === 'ar' ? 'ml-auto' : ''}`} 
                    onClick={handlePreferencesUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${language === 'ar' ? 'ml-2' : 'mr-2'}`}></div>
                        {t('saveChanges')}
                      </div>
                    ) : t('saveChanges')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('changePassword')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className={language === 'ar' ? 'text-right' : 'text-left'}>{t('newPassword')}</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={userProfile.password} 
                      onChange={(e) => setUserProfile({...userProfile, password: e.target.value})}
                      className={language === 'ar' ? 'text-right' : 'text-left'}
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className={language === 'ar' ? 'text-right' : 'text-left'}>{t('confirmPassword')}</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={userProfile.confirmPassword} 
                      onChange={(e) => setUserProfile({...userProfile, confirmPassword: e.target.value})}
                      className={language === 'ar' ? 'text-right' : 'text-left'}
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handlePasswordUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ${language === 'ar' ? 'ml-2' : 'mr-2'}`}></div>
                      {t('updatePassword')}
                    </div>
                  ) : t('updatePassword')}
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
