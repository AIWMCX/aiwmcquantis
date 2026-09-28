import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  enabled?: boolean;
  onCommandK?: () => void;
}

export function useKeyboardShortcuts({ enabled = true, onCommandK }: ShortcutConfig = {}) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const isMod = e.metaKey || e.ctrlKey;

    // Cmd+K → command palette / search
    if (isMod && e.key === 'k') {
      e.preventDefault();
      onCommandK?.();
      return;
    }

    // Alt+N → New analysis
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      navigate('/app');
      return;
    }

    // Alt+D → Dashboard
    if (e.altKey && e.key === 'd') {
      e.preventDefault();
      navigate('/app');
      return;
    }

    // Alt+S → Reports (Docs Studio)
    if (e.altKey && e.key === 's') {
      e.preventDefault();
      navigate('/docs');
      return;
    }

    // Escape → close modals (handled by Radix, but useful for custom overlays)
  }, [enabled, navigate, onCommandK]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
