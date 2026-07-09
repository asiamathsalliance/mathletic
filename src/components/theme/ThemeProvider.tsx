"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AccentColor, ThemeMode } from "@/types/profile";

interface ThemeContextValue {
  theme: ThemeMode;
  accent: AccentColor;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const ACCENT_VARS: Record<AccentColor, string> = {
  green: "#B8D444",
  blue: "#2E6DA4",
  purple: "#8B5CF6",
  orange: "#F59E0B",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [accent, setAccentState] = useState<AccentColor>("green");

  useEffect(() => {
    const stored = localStorage.getItem("mathletic-theme");
    const storedAccent = localStorage.getItem("mathletic-accent") as AccentColor | null;
    if (stored === "light" || stored === "dark" || stored === "system") setThemeState(stored);
    if (storedAccent && storedAccent in ACCENT_VARS) setAccentState(storedAccent);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
    root.style.setProperty("--primary", ACCENT_VARS[accent]);
    localStorage.setItem("mathletic-theme", theme);
    localStorage.setItem("mathletic-accent", accent);
  }, [theme, accent]);

  const setTheme = (t: ThemeMode) => setThemeState(t);
  const setAccent = (a: AccentColor) => setAccentState(a);

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
