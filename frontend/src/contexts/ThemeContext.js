import React, { createContext, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext({
  theme: 'dark', // default
  resolvedTheme: 'dark',
  setTheme: () => {}
});

const THEME_STORAGE_KEY = 'app_theme';

export const THEMES = [
  { key: 'system', label: 'System', description: 'Match your device' },
  { key: 'dark', label: 'Midnight', description: 'Deep and focused' },
  { key: 'light', label: 'Daylight', description: 'Crisp and bright' },
  { key: 'aurora', label: 'Aurora', description: 'Northern lights glow' },
  { key: 'synthwave', label: 'Synthwave', description: 'Neon retro night' },
  { key: 'ocean', label: 'Deep Ocean', description: 'Calm abyssal blues' },
  { key: 'terminal', label: 'Terminal', description: 'Green-screen hacker' },
  { key: 'sakura', label: 'Sakura', description: 'Soft cherry blossom' },
  { key: 'solar', label: 'Solar', description: 'Warm amber tones' },
  { key: 'high-contrast', label: 'High contrast', description: 'Maximum legibility' },
];

export const LIGHT_THEMES = ['light', 'sakura'];

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    } catch {
      return 'system';
    }
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemTheme;
    }

    return theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute('content', bg);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}