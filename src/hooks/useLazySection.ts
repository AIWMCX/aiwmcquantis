/**
 * Progressive Hydration Hook
 * 
 * Uses IntersectionObserver to load below-fold sections only when
 * they become visible, reducing initial bundle size and improving LCP.
 * 
 * Features:
 * - Configurable root margin for pre-loading
 * - Triggers once and disconnects (no re-triggering)
 * - SSR-safe with typeof window check
 */

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseLazySectionOptions {
  /** How far before the element enters viewport to trigger (e.g., "200px") */
  rootMargin?: string;
  /** Visibility threshold (0-1) to trigger */
  threshold?: number;
  /** Whether to start visible (for critical sections) */
  initiallyVisible?: boolean;
}

interface UseLazySectionResult {
  /** Ref to attach to the container element */
  ref: RefObject<HTMLDivElement>;
  /** Whether the section should be rendered */
  isVisible: boolean;
  /** Whether the section has ever been visible (for animations) */
  hasBeenVisible: boolean;
}

/**
 * Hook for progressive hydration of below-fold sections
 * 
 * @example
 * const { ref, isVisible } = useLazySection({ rootMargin: '200px' });
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible ? <HeavyComponent /> : <Skeleton />}
 *   </div>
 * );
 */
export function useLazySection(
  options: UseLazySectionOptions = {}
): UseLazySectionResult {
  const {
    rootMargin = '100px',
    threshold = 0,
    initiallyVisible = false,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(initiallyVisible);
  const [hasBeenVisible, setHasBeenVisible] = useState(initiallyVisible);

  useEffect(() => {
    // Skip if already visible or no browser support
    if (isVisible || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      if (!('IntersectionObserver' in window)) {
        // Fallback: make visible immediately if no IntersectionObserver
        setIsVisible(true);
        setHasBeenVisible(true);
      }
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasBeenVisible(true);
            // Disconnect after first intersection (one-time trigger)
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin, threshold]);

  return { ref, isVisible, hasBeenVisible };
}
