import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const BASE_COUNT = 12500; // Base number for social proof
const CACHE_KEY = 'live_counter_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedCount {
  count: number;
  timestamp: number;
}

export function LiveCounter() {
  const [count, setCount] = useState<number>(() => {
    // Try to get cached value first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, timestamp }: CachedCount = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return count;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return BASE_COUNT;
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Fetch real count from database
    const fetchCount = async () => {
      try {
        const { count: dbCount, error } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true });

        if (!error && dbCount !== null) {
          const realCount = BASE_COUNT + dbCount;
          setCount(realCount);
          
          // Cache the result
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            count: realCount,
            timestamp: Date.now(),
          }));
        }
      } catch (e) {
        console.error('Failed to fetch analysis count:', e);
      }
    };

    fetchCount();
  }, []);

  // Animate count occasionally to show "live" activity
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
      <div className="relative">
        <TrendingUp className="w-4 h-4 text-success" />
        {/* Pulse indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
      </div>
      <span 
        className={`text-sm font-medium text-success transition-transform ${
          isAnimating ? 'scale-110' : 'scale-100'
        }`}
      >
        {count.toLocaleString()} businesses analyzed
      </span>
    </div>
  );
}
