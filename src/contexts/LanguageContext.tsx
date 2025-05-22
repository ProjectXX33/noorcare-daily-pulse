import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface TranslationType {
  // Navigation
  dashboard: string;
  employees: string;
  reports: string;
  tasks: string;
  checkIn: string;
  dailyReport: string;
  settings: string;
  signOut: string;
  events: string;
  
  // Notifications
  notificationsTitle: string;
  noNotifications: string;
  markAllAsRead: string;
  loading: string;
  viewAll: string;
  mentioned: string;
  task: string;
  moment: string;
  minutes: string;
  hours: string;
  days: string;

  // Settings
  general: string;
  generalSettingsDescription: string;
  language: string;
  theme: string;
  darkMode: string;
  lightMode: string;
  notificationsSettings: string;
  notificationsSettingsDescription: string;
  notificationsDescription: string;
  emailNotifications: string;
  emailNotificationsDescription: string;
  saveChanges: string;
  changesSaved: string;
  errorSaving: string;
  account: string;
  preferences: string;
  security: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    employees: "Employees",
    reports: "Reports",
    tasks: "Tasks",
    checkIn: "Check In",
    dailyReport: "Daily Report",
    settings: "Settings",
    signOut: "Sign Out",
    events: 'Events',
    
    // Notifications
    notificationsTitle: "Notifications",
    noNotifications: "No new notifications",
    markAllAsRead: "Mark all as read",
    loading: "Loading...",
    viewAll: "View all",
    mentioned: "mentioned you in",
    task: "a task",
    moment: "just now",
    minutes: "minutes ago",
    hours: "hours ago",
    days: "days ago",

    // Settings
    general: "General",
    generalSettingsDescription: "Manage your general settings",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    notificationsSettings: "Notifications",
    notificationsSettingsDescription: "Manage your notification preferences",
    notificationsDescription: "Receive notifications about important updates",
    emailNotifications: "Email Notifications",
    emailNotificationsDescription: "Receive notifications via email",
    saveChanges: "Save Changes",
    changesSaved: "Changes saved successfully",
    errorSaving: "Error saving changes",
    account: 'Account',
    preferences: 'Preferences',
    security: 'Security',
  },
  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    employees: "الموظفين",
    reports: "التقارير",
    tasks: "المهام",
    checkIn: "تسجيل الحضور",
    dailyReport: "التقرير اليومي",
    settings: "الإعدادات",
    signOut: "تسجيل الخروج",
    events: 'الفعاليات',
    
    // Notifications
    notificationsTitle: "الإشعارات",
    noNotifications: "لا توجد إشعارات جديدة",
    markAllAsRead: "تعليم الكل كمقروء",
    loading: "جاري التحميل...",
    viewAll: "عرض الكل",
    mentioned: "ذكرك في",
    task: "مهمة",
    moment: "الآن",
    minutes: "دقائق مضت",
    hours: "ساعات مضت",
    days: "أيام مضت",

    // Settings
    general: "عام",
    generalSettingsDescription: "إدارة الإعدادات العامة",
    language: "اللغة",
    theme: "المظهر",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    notificationsSettings: "الإشعارات",
    notificationsSettingsDescription: "إدارة تفضيلات الإشعارات",
    notificationsDescription: "تلقي إشعارات حول التحديثات المهمة",
    emailNotifications: "إشعارات البريد الإلكتروني",
    emailNotificationsDescription: "تلقي الإشعارات عبر البريد الإلكتروني",
    saveChanges: "حفظ التغييرات",
    changesSaved: "تم حفظ التغييرات بنجاح",
    errorSaving: "خطأ في حفظ التغييرات",
    account: 'الحساب',
    preferences: 'التفضيلات',
    security: 'الأمان',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('preferredLanguage');
    return (stored === 'en' || stored === 'ar') ? stored : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferredLanguage', lang);
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'ar');
    document.body.classList.toggle('ltr', lang === 'en');
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  // Initialize body direction and classes
  useEffect(() => {
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', language === 'ar');
    document.body.classList.toggle('ltr', language === 'en');
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
