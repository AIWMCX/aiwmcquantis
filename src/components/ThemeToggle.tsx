
import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // Default for SSR or non-browser environments
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
      className="rounded-full w-12 h-12 text-foreground hover:bg-accent"
    >
      {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
    </Button>
  );
};

export default ThemeToggle;
