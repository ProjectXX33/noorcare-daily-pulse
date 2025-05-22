import React from 'react';
import { Moon, Sun } from 'lucide-react';
// import { useTheme } from '@/contexts/ThemeContext';

// Placeholder ThemeToggle (does nothing)
const ThemeToggle = () => {
  return (
    <button className="flex items-center gap-2 px-2 py-1 rounded bg-muted text-muted-foreground cursor-not-allowed" disabled>
      <Sun className="h-4 w-4" />
      <Moon className="h-4 w-4" />
      <span>Theme</span>
    </button>
  );
};

export default ThemeToggle; 