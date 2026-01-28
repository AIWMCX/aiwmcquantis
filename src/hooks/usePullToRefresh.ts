import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isTouching = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only activate if scrolled to top
      if (container.scrollTop > 0 || isRefreshing) return;
      
      startY.current = e.touches[0].clientY;
      isTouching = true;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching || isRefreshing) return;
      
      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;
      
      if (delta > 0 && container.scrollTop === 0) {
        e.preventDefault();
        // Apply resistance to make it feel natural
        const distance = Math.min(delta / resistance, threshold * 1.5);
        setPullDistance(distance);
        
        // Haptic feedback at threshold
        if (distance >= threshold && pullDistance < threshold) {
          triggerHaptic();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isTouching) return;
      isTouching = false;
      setIsPulling(false);
      
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic();
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isRefreshing, onRefresh, pullDistance, threshold, resistance, triggerHaptic]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
  };
}
