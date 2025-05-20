import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Language = 'en' | 'ar';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger className={`w-[180px] ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <SelectValue placeholder={t('language')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en" className={language === 'ar' ? 'text-right' : 'text-left'}>
          English
        </SelectItem>
        <SelectItem value="ar" className={language === 'ar' ? 'text-right' : 'text-left'}>
          العربية
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
