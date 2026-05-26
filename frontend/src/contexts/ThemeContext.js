import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({
  theme: 'dark', // default
  setTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('app_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', theme);
    } catch {}
    // Toggle root class for easier styling
    const root = document.querySelector('#root') || document.body;
    root.classList.remove('App.dark-mode', 'App.light-mode', 'App.solar-mode', 'App.high-contrast');
    if (theme === 'dark') root.classList.add('App', 'App.dark-mode');
    else if (theme === 'light') root.classList.add('App', 'App.light-mode');
    else if (theme === 'solar') root.classList.add('App', 'App.solar-mode');
    else if (theme === 'high-contrast') root.classList.add('App', 'App.high-contrast');
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}