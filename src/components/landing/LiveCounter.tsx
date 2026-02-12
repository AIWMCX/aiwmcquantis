import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'live_counter_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedCount {
  count: number;
  timestamp: number;
}

export function LiveCounter() {
  const [count, setCount] = useState<number | null>(() => {
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
    return null;
  });

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count: dbCount, error } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true });

        if (!error && dbCount !== null) {
          setCount(dbCount);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            count: dbCount,
            timestamp: Date.now(),
          }));
        }
      } catch (e) {
        console.error('Failed to fetch analysis count:', e);
      }
    };

    fetchCount();
  }, []);

  // If count is low or unknown, show "early adopter" messaging
  if (count === null || count < 100) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">
          New — be one of the first to validate
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
      <TrendingUp className="w-4 h-4 text-success" />
      <span className="text-sm font-medium text-success">
        {count.toLocaleString()} businesses analyzed
      </span>
    </div>
  );
}
