import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  resolved: 'dark',
  setTheme: () => {},
});

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored ?? 'dark';
  });

  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const t = stored ?? 'dark';
    return t === 'system' ? getSystemTheme() : t;
  });

  const setTheme = (t: Theme) => {
    localStorage.setItem('theme', t);
    setThemeState(t);
  };

  // Resolve and apply whenever theme or system preference changes
  useEffect(() => {
    const r = theme === 'system' ? getSystemTheme() : theme;
    setResolved(r);
    applyTheme(r);
  }, [theme]);

  // Listen for OS-level theme changes when in system mode
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        const r = getSystemTheme();
        setResolved(r);
        applyTheme(r);
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
