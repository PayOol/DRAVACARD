"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";
const STORAGE_KEY = "drava-theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

export function readThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_QUERY);
    try {
      updatePreference(readThemePreference(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Storage may be blocked; system and in-memory choices still work.
    }
    setSystemDark(media.matches);
    setReady(true);
    const onSystemChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        updatePreference(readThemePreference(event.newValue));
      }
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const dark =
      preference === "dark" || (preference === "system" && systemDark);
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.dataset.theme = preference;
    root.style.colorScheme = dark ? "dark" : "light";
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", dark ? "#0b1220" : "#ffffff");
    }
  }, [preference, ready, systemDark]);

  const setPreference = useCallback((value: ThemePreference) => {
    const next = readThemePreference(value);
    updatePreference(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Never make displaying the page depend on persistent storage.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
