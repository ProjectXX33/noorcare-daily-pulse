import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkTimeConfig } from '@/types';
import { Settings, Moon, Sun, Bell, Volume2, VolumeX, Palette } from 'lucide-react';

interface Preferences {
  notifications: {
    enabled: boolean;
    email: boolean;
    sound: boolean;
  };
  workReminders: {
    checkInReminder: boolean;
    checkOutReminder: boolean;
    workTimeAlarm: boolean;
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
      email: true,
      sound: true
    },
    workReminders: {
      checkInReminder: true,
      checkOutReminder: true,
      workTimeAlarm: true
    }
  });
  const [workTimeConfig, setWorkTimeConfig] = useState<WorkTimeConfig | null>(null);
  const [workTimeForm, setWorkTimeForm] = useState({
    dailyResetTime: '09:00',
    workDayStart: '09:00',
    workDayEnd: '00:00'
  });

  useEffect(() => {
    // On mount, apply dark mode from localStorage immediately
    const localDark = localStorage.getItem('theme');
    if (localDark === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

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

    const loadWorkTimeConfig = async () => {
      if (!user || user.role !== 'admin') return;

      try {
        const { data, error } = await supabase
          .from('work_time_config')
          .select('*')
          .eq('name', 'default')
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          const config: WorkTimeConfig = {
            id: data.id,
            name: data.name,
            dailyResetTime: data.daily_reset_time,
            workDayStart: data.work_day_start,
            workDayEnd: data.work_day_end,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
          };
          setWorkTimeConfig(config);
          setWorkTimeForm({
            dailyResetTime: config.dailyResetTime,
            workDayStart: config.workDayStart,
            workDayEnd: config.workDayEnd
          });
        }
      } catch (error) {
        console.error('Error loading work time config:', error);
      }
    };

    loadPreferences();
    loadWorkTimeConfig();
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

  const handleWorkTimeUpdate = async () => {
    if (!user || user.role !== 'admin') return;
    
    setLoading(true);
    try {
      if (workTimeConfig) {
        // Update existing config
        const { error } = await supabase
          .from('work_time_config')
          .update({
            daily_reset_time: workTimeForm.dailyResetTime,
            work_day_start: workTimeForm.workDayStart,
            work_day_end: workTimeForm.workDayEnd,
            updated_at: new Date().toISOString()
          })
          .eq('id', workTimeConfig.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('work_time_config')
          .insert({
            name: 'default',
            daily_reset_time: workTimeForm.dailyResetTime,
            work_day_start: workTimeForm.workDayStart,
            work_day_end: workTimeForm.workDayEnd
          });

        if (error) throw error;
      }

      toast.success('Work time configuration updated successfully');
    } catch (error) {
      console.error('Error updating work time config:', error);
      toast.error('Failed to update work time configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight flex items-center gap-2">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                {t('settings') || 'Settings'}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {t('manageSettings') || 'Manage your account settings and preferences'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Mobile-optimized tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
            <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 px-3">
              {t('profile') || 'Profile'}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs sm:text-sm py-2 px-3">
              {t('preferences') || 'Preferences'}
            </TabsTrigger>
            {user?.role === 'admin' && (
              <>
                <TabsTrigger value="system" className="text-xs sm:text-sm py-2 px-3 col-span-2 lg:col-span-1">
                  {t('system') || 'System'}
                </TabsTrigger>
                <TabsTrigger value="worktime" className="text-xs sm:text-sm py-2 px-3 col-span-2 lg:col-span-1">
                  {t('workTime') || 'Work Time'}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-4 md:mt-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">{t('personalInformation') || 'Personal Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Mobile-responsive form */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-xs sm:text-sm">{t('fullName') || 'Full Name'}</Label>
                    <Input
                      id="name"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs sm:text-sm">{t('email') || 'Email'}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  {t('updateProfile') || 'Update Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Password Section */}
            {user?.role !== 'employee' && (
              <Card className="mt-4 md:mt-6">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">{t('changePassword') || 'Change Password'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="password" className="text-xs sm:text-sm">{t('newPassword') || 'New Password'}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={userProfile.password}
                        onChange={(e) => setUserProfile({ ...userProfile, password: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">{t('confirmPassword') || 'Confirm Password'}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={userProfile.confirmPassword}
                        onChange={(e) => setUserProfile({ ...userProfile, confirmPassword: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handlePasswordUpdate} 
                    disabled={loading || !userProfile.password}
                    className="w-full sm:w-auto min-h-[44px] text-sm"
                  >
                    {t('updatePassword') || 'Update Password'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-4 md:mt-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">{t('notificationSettings') || 'Notification Settings'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Mobile-responsive preference toggles */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Enable Notifications</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Receive notifications for tasks and events
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.notifications?.enabled || false}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences?.notifications, enabled: checked }
                      })}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Email Notifications</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.notifications?.email || false}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences?.notifications, email: checked }
                      })}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium text-sm sm:text-base">Sound Notifications</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Play sound for notifications and alerts
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences?.notifications?.sound || false}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        notifications: { ...preferences?.notifications, sound: checked }
                      })}
                    />
                  </div>
                </div>

                {/* Appearance Settings */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Appearance Settings
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Theme Settings</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Use the theme toggle in the top navigation bar to switch between light and dark themes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Work Reminders Settings */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Work Reminders
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Check-in Reminders</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Get reminded to check in at the start of your shift
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.workReminders?.checkInReminder || false}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        workReminders: { ...preferences?.workReminders, checkInReminder: checked }
                      })}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Check-out Reminders</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Get reminded to check out after working overtime
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.workReminders?.checkOutReminder || false}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        workReminders: { ...preferences?.workReminders, checkOutReminder: checked }
                      })}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Work Time Alarm</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Play alarm sound when work counter reaches 0
                      </p>
                    </div>
                    <Switch
                      checked={preferences?.workReminders?.workTimeAlarm || false}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        workReminders: { ...preferences?.workReminders, workTimeAlarm: checked }
                      })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handlePreferencesUpdate} 
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  Save
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab - Admin only */}
          {user?.role === 'admin' && (
            <TabsContent value="system" className="mt-4 md:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">{t('systemSettings') || 'System Settings'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                      <h4 className="font-medium text-sm sm:text-base text-blue-800 dark:text-blue-200 mb-2">
                        {t('databaseMaintenance') || 'Database Maintenance'}
                      </h4>
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mb-3">
                        {t('systemMaintenanceDescription') || 'Perform system maintenance tasks and data cleanup'}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="min-h-[44px] sm:min-h-auto text-xs sm:text-sm"
                      >
                        {t('performMaintenance') || 'Perform Maintenance'}
                      </Button>
                    </div>

                    <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                      <h4 className="font-medium text-sm sm:text-base text-amber-800 dark:text-amber-200 mb-2">
                        {t('systemBackup') || 'System Backup'}
                      </h4>
                      <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mb-3">
                        {t('backupDescription') || 'Create a backup of all system data'}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="min-h-[44px] sm:min-h-auto text-xs sm:text-sm"
                      >
                        {t('createBackup') || 'Create Backup'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Work Time Tab - Admin only */}
          {user?.role === 'admin' && (
            <TabsContent value="worktime" className="mt-4 md:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">{t('workTimeConfiguration') || 'Work Time Configuration'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="dailyResetTime" className="text-xs sm:text-sm">
                        {t('dailyResetTime') || 'Daily Reset Time'}
                      </Label>
                      <Input
                        id="dailyResetTime"
                        type="time"
                        value={workTimeForm.dailyResetTime}
                        onChange={(e) => setWorkTimeForm({ ...workTimeForm, dailyResetTime: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="workDayStart" className="text-xs sm:text-sm">
                        {t('workDayStart') || 'Work Day Start'}
                      </Label>
                      <Input
                        id="workDayStart"
                        type="time"
                        value={workTimeForm.workDayStart}
                        onChange={(e) => setWorkTimeForm({ ...workTimeForm, workDayStart: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="workDayEnd" className="text-xs sm:text-sm">
                        {t('workDayEnd') || 'Work Day End'}
                      </Label>
                      <Input
                        id="workDayEnd"
                        type="time"
                        value={workTimeForm.workDayEnd}
                        onChange={(e) => setWorkTimeForm({ ...workTimeForm, workDayEnd: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
                    <h4 className="font-medium text-sm sm:text-base mb-2">{t('configurationInfo') || 'Configuration Info'}</h4>
                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      <p>• {t('dailyResetTimeDescription') || 'Daily Reset Time: When daily counters reset'}</p>
                      <p>• {t('workDayStartDescription') || 'Work Day Start: Official work day begins'}</p>
                      <p>• {t('workDayEndDescription') || 'Work Day End: Official work day ends'}</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleWorkTimeUpdate} 
                    disabled={loading}
                    className="w-full sm:w-auto min-h-[44px] text-sm"
                  >
                    {t('updateWorkTime') || 'Update Work Time Settings'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
