import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first
      const saved = localStorage.getItem('theme');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      // Default to dark mode when no preference saved
      return true;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Dispatch custom event for theme change (skip on initial mount)
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark } }));
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="glass-card-sm fixed top-6 right-6 z-50 p-3 hover:scale-105 transition-all duration-300"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
