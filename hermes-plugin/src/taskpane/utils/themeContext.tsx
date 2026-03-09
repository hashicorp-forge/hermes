import * as React from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = React.createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => {},
});

export const useTheme = () => React.useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("hermes-plugin-theme");
      return saved !== null ? saved === "dark" : true; // default to dark
    } catch {
      return true;
    }
  });

  const toggleTheme = React.useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hermes-plugin-theme", next ? "dark" : "light");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
