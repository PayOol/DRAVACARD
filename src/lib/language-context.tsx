"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("fr");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  // Load language preference from localStorage if available
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("language");
      if (savedLanguage === "fr" || savedLanguage === "en") {
        setLanguage(savedLanguage);
      }
    } catch {
      // The interface still works when browser storage is unavailable.
    }
    setPreferenceLoaded(true);
  }, []);

  // Save language preference to localStorage whenever it changes
  useEffect(() => {
    document.documentElement.lang = language;
    if (!preferenceLoaded) return;
    try {
      localStorage.setItem("language", language);
    } catch {
      // Keep the in-memory preference in restricted browsing modes.
    }
  }, [language, preferenceLoaded]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
