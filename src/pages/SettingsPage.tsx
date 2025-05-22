import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Preferences {
  notifications: {
    enabled: boolean;
    email: boolean;
  };
}

const SettingsPage = () => {
  const { user, updateUserProfile } = useAuth();
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
    <div className="w-full max-w-3xl mx-auto py-8 px-2 md:px-0">
      <Card className="shadow-lg border bg-white dark:bg-background rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('settings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="flex flex-col md:flex-row gap-2 mb-6">
              <TabsTrigger value="account">{t('account')}</TabsTrigger>
              <TabsTrigger value="preferences">{t('preferences')}</TabsTrigger>
              <TabsTrigger value="security">{t('security')}</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    value={userProfile.name}
                    onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={e => setUserProfile({ ...userProfile, email: e.target.value })}
                  />
                </div>
              </div>
              <Button className="mt-6 w-full md:w-auto" onClick={handleProfileUpdate} disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {t('updateProfile')}
                  </div>
                ) : t('updateProfile')}
              </Button>
            </TabsContent>
            <TabsContent value="preferences">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Label className="mb-0">{t('language')}</Label>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">Coming Soon</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="mb-0">Dark Mode</Label>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">Coming Soon</span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="security">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="password">{t('newPassword')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userProfile.password}
                    onChange={e => setUserProfile({ ...userProfile, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={userProfile.confirmPassword}
                    onChange={e => setUserProfile({ ...userProfile, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <Button className="mt-6 w-full md:w-auto" onClick={handlePasswordUpdate} disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {t('updatePassword')}
                  </div>
                ) : t('updatePassword')}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
