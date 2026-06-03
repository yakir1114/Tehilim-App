import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("tehilim_theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch {}
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem("tehilim_theme", mode);
    } catch {}
  }, [mode]);

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
