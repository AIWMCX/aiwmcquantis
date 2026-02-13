import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, TrendingUp, DollarSign, AlertTriangle, MapPin, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerItem {
  id: number;
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  business: string;
  location: string;
}

const TICKER_DATA: TickerItem[] = [
  { id: 1, icon: DollarSign, label: 'Monthly Profit', value: '$4,200', color: 'text-success', business: 'Coffee Shop', location: 'Denver' },
  { id: 2, icon: TrendingUp, label: 'ROI', value: '168%', color: 'text-primary', business: 'SaaS Platform', location: 'Austin' },
  { id: 3, icon: AlertTriangle, label: 'Risks Found', value: '3 flags', color: 'text-warning', business: 'E-commerce', location: 'NYC' },
  { id: 4, icon: BarChart3, label: 'Payback', value: '7.1 mo', color: 'text-primary', business: 'Fitness Studio', location: 'LA' },
  { id: 5, icon: DollarSign, label: 'Break-Even', value: '$8.3K/mo', color: 'text-success', business: 'Consulting', location: 'London' },
  { id: 6, icon: TrendingUp, label: 'LTV/CAC', value: '4.2x', color: 'text-primary', business: 'Mobile App', location: 'Berlin' },
  { id: 7, icon: AlertTriangle, label: 'Risk Score', value: 'Medium', color: 'text-warning', business: 'Restaurant', location: 'Miami' },
  { id: 8, icon: DollarSign, label: 'Net Margin', value: '23%', color: 'text-success', business: 'Agency', location: 'Toronto' },
];

function TickerCard({ item, isNew }: { item: TickerItem; isNew: boolean }) {
  return (
    <div
      className={cn(
        'flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-card border border-border shadow-sm',
        'transition-all duration-500',
        isNew ? 'animate-fade-in' : ''
      )}
    >
      <div className={cn('p-2 rounded-lg bg-muted/50')}>
        <item.icon className={cn('w-4 h-4', item.color)} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-lg font-bold', item.color)}>{item.value}</span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{item.business} • {item.location}</span>
        </div>
      </div>
    </div>
  );
}

export function ResultsTicker() {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-advance ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleIndex(prev => (prev + 1) % TICKER_DATA.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll the ticker row
  useEffect(() => {
    if (!scrollRef.current) return;
    const scrollAmount = visibleIndex * 260;
    scrollRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
  }, [visibleIndex]);

  return (
    <section className="py-8 md:py-12 bg-muted/20 overflow-hidden relative">
      {/* Animated gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              Sample Analysis Outputs
            </h2>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              — example results from the engine
            </span>
          </div>
          <Link to="/app">
            <Button variant="outline" size="sm" className="gap-2 group">
              <Zap className="w-4 h-4 text-primary group-hover:animate-pulse" />
              Try it yourself — free
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>

        {/* Scrolling Ticker Row */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TICKER_DATA.map((item, idx) => (
            <div key={item.id} className="snap-start">
              <TickerCard item={item} isNew={idx === visibleIndex} />
            </div>
          ))}
          {/* Duplicate for infinite feel */}
          {TICKER_DATA.slice(0, 3).map((item) => (
            <div key={`dup-${item.id}`} className="snap-start">
              <TickerCard item={item} isNew={false} />
            </div>
          ))}
        </div>

        {/* Active indicator dots */}
        <div className="flex items-center justify-center gap-0 mt-2">
          {TICKER_DATA.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setVisibleIndex(idx)}
              className="relative p-3 group"
              aria-label={`Show result ${idx + 1}`}
            >
              <span
                className={cn(
                  'block rounded-full transition-all duration-300',
                  idx === visibleIndex
                    ? 'w-4 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Animated gradient border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </section>
  );
}
