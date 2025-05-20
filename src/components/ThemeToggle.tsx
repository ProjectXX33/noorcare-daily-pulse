import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      data-state={theme === 'dark' ? 'checked' : 'unchecked'}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-all duration-300 ease-in-out ${
          theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
            theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`}
        >
          <Sun className="h-3 w-3 text-amber-500" />
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
            theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          }`}
        >
          <Moon className="h-3 w-3 text-slate-400" />
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle; 