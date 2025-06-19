"use client";
import { createContext, useContext, useEffect, useState } from "react";

const DarkModeContext = createContext({
  dark: false,
  toggle: () => {},
});

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <DarkModeContext.Provider value={{
      dark,
      toggle: () => setDark(v => !v)
    }}>
      {children}
    </DarkModeContext.Provider>
  );
}