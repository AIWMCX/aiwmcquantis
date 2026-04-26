/**
 * ThemeToggle — light/dark switch persisted via next-themes (localStorage key
 * "theme", configured in src/App.tsx). Used in both marketing Header and the
 * authenticated AppTopBar so the preference is consistent everywhere.
 */
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  /** Optional className passthrough for layout tweaks. */
  className?: string;
  /** When true, renders a smaller icon-only variant for compact toolbars. */
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // next-themes only knows the real theme after hydration.
  React.useEffect(() => setMounted(true), []);

  const current = (theme === 'system' ? resolvedTheme : theme) ?? 'light';
  const isDark = current === 'dark';

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={`${compact ? 'h-8 w-8' : 'h-9 w-9'} ${className ?? ''}`}
    >
      {/* Pre-hydration: render a stable Sun to avoid SSR/CSR mismatch flash. */}
      {!mounted ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
