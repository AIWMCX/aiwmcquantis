import { useEffect, useRef, useState } from 'react';

/**
 * Hook for lazy loading elements when they enter the viewport
 * Uses IntersectionObserver for efficient visibility detection
 */
export const useLazyLoad = (rootMargin = '50px') => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Stop observing once loaded
          observer.unobserve(currentRef);
        }
      },
      { 
        rootMargin, 
        threshold: 0.01 
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [rootMargin]);

  return { ref, isInView };
};

/**
 * Hook for lazy loading with a callback function
 */
export const useLazyLoadCallback = (
  callback: () => void,
  options?: { rootMargin?: string; threshold?: number }
) => {
  const ref = useRef<HTMLElement>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const currentRef = ref.current;
    
    if (!currentRef || hasTriggered.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          callback();
          observer.unobserve(currentRef);
        }
      },
      { 
        rootMargin: options?.rootMargin || '50px', 
        threshold: options?.threshold || 0.01 
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [callback, options?.rootMargin, options?.threshold]);

  return ref;
};
