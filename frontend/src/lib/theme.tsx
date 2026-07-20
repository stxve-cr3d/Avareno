import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemePreference = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

type ThemeContextValue = {
  actualTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => void;
  themeLabel: string;
  themePreference: ThemePreference;
};

const themeStorageKey = "avareno-theme";
const defaultThemePreference: ThemePreference = "light";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => readStoredThemePreference());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => readSystemTheme());
  const actualTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");

    function syncSystemTheme() {
      setSystemTheme(media.matches ? "light" : "dark");
    }

    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = actualTheme;
    document.documentElement.dataset.themePreference = themePreference;
    document.documentElement.style.colorScheme = actualTheme;
    window.localStorage.setItem(themeStorageKey, themePreference);

    const themeColor = actualTheme === "dark" ? "#101311" : "#f7f8f5";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [actualTheme, themePreference]);

  const value = useMemo<ThemeContextValue>(() => ({
    actualTheme,
    setThemePreference: setThemePreferenceState,
    themeLabel: themePreference === "system" ? `System (${actualTheme === "dark" ? "Dunkel" : "Hell"})` : themePreference === "dark" ? "Dunkel" : "Hell",
    themePreference
  }), [actualTheme, themePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

function readStoredThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isThemePreference(stored) ? stored : defaultThemePreference;
  } catch {
    return defaultThemePreference;
  }
}

function readSystemTheme(): ResolvedTheme {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "dark" || value === "light";
}
