
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  translations: Record<string, Record<string, string>>;
}

// Initialize with common translations
const defaultTranslations = {
  en: {
    // Common translations
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    loading: "Loading...",
    error: "An error occurred",
    success: "Success",
    edit: "Edit",
    delete: "Delete",
    view: "View",
    close: "Close",
    back: "Back",
    next: "Next",
    search: "Search",
    filter: "Filter",
    actions: "Actions",
    // Status translations
    complete: "Complete",
    inProgress: "In Progress",
    onHold: "On Hold",
    // Role translations
    admin: "Admin",
    employee: "Employee",
    // Form translations
    requiredField: "This field is required",
    invalidEmail: "Please enter a valid email address",
    passwordMismatch: "Passwords do not match",
    // Pages and sections
    dashboard: "Dashboard",
    login: "Login",
    logout: "Logout",
    profile: "Profile",
    tasks: "Tasks",
    reports: "Reports",
    employees: "Employees",
    notifications: "Notifications",
    // Task related
    taskTitle: "Title",
    taskDescription: "Description",
    taskStatus: "Status",
    taskProgress: "Progress",
    taskAssignedTo: "Assigned To",
    // Employee related
    employeeName: "Name",
    employeeEmail: "Email",
    employeeUsername: "Username",
    employeeDepartment: "Department",
    employeePosition: "Position",
    employeeRole: "Role"
  },
  ar: {
    // Common translations
    save: "حفظ",
    cancel: "إلغاء",
    submit: "إرسال",
    loading: "جار التحميل...",
    error: "حدث خطأ",
    success: "تم بنجاح",
    edit: "تعديل",
    delete: "حذف",
    view: "عرض",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    search: "بحث",
    filter: "تصفية",
    actions: "إجراءات",
    // Status translations
    complete: "مكتمل",
    inProgress: "قيد التنفيذ",
    onHold: "قيد الانتظار",
    // Role translations
    admin: "مدير",
    employee: "موظف",
    // Form translations
    requiredField: "هذا الحقل مطلوب",
    invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صالح",
    passwordMismatch: "كلمات المرور غير متطابقة",
    // Pages and sections
    dashboard: "لوحة التحكم",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    profile: "الملف الشخصي",
    tasks: "المهام",
    reports: "التقارير",
    employees: "الموظفين",
    notifications: "الإشعارات",
    // Task related
    taskTitle: "العنوان",
    taskDescription: "الوصف",
    taskStatus: "الحالة",
    taskProgress: "التقدم",
    taskAssignedTo: "تم تعيينه إلى",
    // Employee related
    employeeName: "الاسم",
    employeeEmail: "البريد الإلكتروني",
    employeeUsername: "اسم المستخدم",
    employeeDepartment: "القسم",
    employeePosition: "المنصب",
    employeeRole: "الدور"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState(defaultTranslations);

  useEffect(() => {
    // Load language preference from localStorage
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguageState(storedLang);
    }
  }, []);

  useEffect(() => {
    // Update document direction based on language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
  };

  // Translation function
  const t = (key: string): string => {
    const langTranslations = translations[language];
    return langTranslations[key] || key;
  };

  // Add component-specific translations
  const addTranslations = (componentName: string, newTranslations: Record<Language, Record<string, string>>) => {
    setTranslations(prev => {
      const updated = { ...prev };
      Object.keys(newTranslations).forEach(lang => {
        if (lang in updated) {
          updated[lang as Language] = {
            ...updated[lang as Language],
            ...newTranslations[lang as Language]
          };
        }
      });
      return updated;
    });
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      translations
    }}>
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
