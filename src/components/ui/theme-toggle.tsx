import { useEffect, useState } from 'react';
import styles from './theme-toggle.module.css';

const STORAGE_KEY = 'theme-preference';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const applyTheme = (theme: string) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const getStoredTheme = () => {
    if (typeof window === 'undefined') return 'light';
    
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme');
    if (stored) return stored;
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  useEffect(() => {
    setMounted(true);
    
    // Initialize theme on mount
    const currentTheme = getStoredTheme();
    setIsDark(currentTheme === 'dark');
    applyTheme(currentTheme);
  }, []);

  const onClick = () => {
    const newTheme = isDark ? 'light' : 'dark';
    
    // Update state
    setIsDark(!isDark);
    
    // Apply to DOM immediately
    applyTheme(newTheme);
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEY, newTheme);
    
    // Also store in the old key for compatibility
    localStorage.setItem('theme', newTheme);
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme: newTheme } }));
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return <div className={styles.themeToggle} />;
  }

  return (
    <button
      id="theme-toggle"
      className={styles.themeToggle}
      onClick={onClick}
      aria-label={isDark ? 'dark' : 'light'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      type="button"
    >
      <svg
        className={styles.sunAndMoon}
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <mask className={styles.moon} id="moon-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle cx="24" cy="10" r="6" fill="black" />
        </mask>
        <circle
          className={styles.sun}
          cx="12"
          cy="12"
          r="6"
          mask="url(#moon-mask)"
          fill="currentColor"
        />
        <g className={styles.sunBeams} stroke="currentColor">
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </button>
  );
} 