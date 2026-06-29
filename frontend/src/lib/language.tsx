import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type AppLanguage = "de" | "en";

type LanguageContextValue = {
  language: AppLanguage;
  languageLabel: string;
  nextLanguageLabel: string;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
};

const languageStorageKey = "avareno-language";
const defaultLanguage: AppLanguage = "de";
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    languageLabel: language === "de" ? "Deutsch" : "English",
    nextLanguageLabel: language === "de" ? "English" : "Deutsch",
    setLanguage: setLanguageState,
    toggleLanguage: () => setLanguageState((current) => (current === "de" ? "en" : "de"))
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

function readStoredLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(languageStorageKey);
    return stored === "en" ? "en" : defaultLanguage;
  } catch {
    return defaultLanguage;
  }
}
