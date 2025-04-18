'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/lib/language-context';

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  return (
    <Button
      variant="ghost"
      className="text-sm font-medium"
      onClick={toggleLanguage}
    >
      {language === 'fr' ? 'EN' : 'FR'}
    </Button>
  );
};
