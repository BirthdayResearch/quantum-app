import {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  PropsWithChildren,
} from "react";

type Theme = "dark" | "light";
export interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLight: boolean;
}

export function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    const storedPref = window.localStorage.getItem("color-theme");
    if (storedPref !== null) {
      return storedPref as Theme;
    }

    const systemPref = window.matchMedia("(prefers-color-scheme: dark)");
    if (!systemPref.matches) {
      return "light";
    }
  }
  return "dark";
}

const ThemeContext = createContext<ThemeContextProps>(undefined as any);

export function ThemeProvider({
  theme: initialTheme,
  children,
}: PropsWithChildren<{ theme: Theme }>): JSX.Element {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function rawSetTheme(rawTheme: Theme): void {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      const isDark = rawTheme === "dark";

      root.classList.remove(isDark ? "light" : "dark");
      root.classList.add(rawTheme);

      localStorage.setItem("color-theme", rawTheme);
    }
  }

  useEffect(() => {
    setTheme(getInitialTheme);
  }, []);

  useEffect(() => {
    rawSetTheme(theme);
  }, [theme]);

  const context: ThemeContextProps = useMemo(
    () => ({
      theme,
      setTheme,
      isLight: theme === "light",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  return (
    <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextProps {
  return useContext(ThemeContext);
}
