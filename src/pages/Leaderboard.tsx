import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Footer } from '@/components/layout/Footer';
import { PageSEO } from '@/components/seo/PageSEO';
import { logger } from '@/lib/logger';
import { 
  Trophy, TrendingUp, ArrowRight, MapPin, 
  DollarSign, Clock, RefreshCw, Share2, Moon, Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

interface LeaderboardEntry {
  rank_position: number;
  industry: string;
  location: string;
  idea_score: number;
  monthly_profit: number;
  payback_months: number | null;
  net_margin: number;
  share_token: string;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
    : score >= 5 
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
    : 'bg-destructive/10 text-destructive border-destructive/30';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border', color)}>
      {score}/10
    </span>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

const SAMPLE_ENTRIES: (LeaderboardEntry & { isSample: true })[] = [
  { rank_position: 1, industry: 'Specialty Coffee Shop', location: 'Austin, TX', idea_score: 8, monthly_profit: 3800, payback_months: 8, net_margin: 18.4, share_token: '', isSample: true },
  { rank_position: 2, industry: 'SaaS Project Management Tool', location: 'San Francisco, CA', idea_score: 7, monthly_profit: 12000, payback_months: 5, net_margin: 34.2, share_token: '', isSample: true },
  { rank_position: 3, industry: 'Boutique Fitness Studio', location: 'Miami, FL', idea_score: 6, monthly_profit: 2100, payback_months: 11, net_margin: 14.7, share_token: '', isSample: true },
  { rank_position: 4, industry: 'Sustainable E-commerce Brand', location: 'New York, NY', idea_score: 7, monthly_profit: 6800, payback_months: 9, net_margin: 22.1, share_token: '', isSample: true },
  { rank_position: 5, industry: 'Online Course Platform', location: 'Remote', idea_score: 8, monthly_profit: 9200, payback_months: 4, net_margin: 61.3, share_token: '', isSample: true },
];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [usingSamples, setUsingSamples] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { theme, setTheme } = useTheme();

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_weekly_leaderboard');
      if (rpcError) throw rpcError;
      const results = (data as LeaderboardEntry[]) || [];
      if (results.length === 0) {
        setEntries(SAMPLE_ENTRIES);
        setUsingSamples(true);
      } else {
        setEntries(results);
        setUsingSamples(false);
      }
      setLastRefresh(new Date());
    } catch (err) {
      logger.error('[Leaderboard]', err);
      // Fall back to samples on error too
      setEntries(SAMPLE_ENTRIES);
      setUsingSamples(true);
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadLeaderboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/">
            <img src={aiwmcLogoText} alt="AIWMC Quantis" className="h-8 w-auto dark:invert" />
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/app">
              <Button size="sm" className="gap-2">
                Validate My Idea <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Trophy className="w-4 h-4" />
            Live Leaderboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            This Month's Top Business Ideas
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real analyses from founders — anonymized and ranked by score. 
            Only ideas with a public share link appear here.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        {/* Samples notice */}
        {usingSamples && !loading && (
          <div className="mb-6 p-3 rounded-xl border border-border bg-muted/40 text-center">
            <p className="text-sm text-muted-foreground">
              Showing sample entries — <strong className="text-foreground">be the first to appear here!</strong>{' '}
              Run an analysis and click "Share Link" to join the leaderboard.
            </p>
          </div>
        )}

        {/* Leaderboard */}
        {loading ? (
          <LeaderboardSkeleton />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isSample = 'isSample' in entry && (entry as { isSample?: boolean }).isSample;
              return (
              <div
                key={entry.rank_position}
                className={cn(
                  "rounded-xl border bg-card p-4 sm:p-5 transition-all hover:shadow-md",
                  entry.rank_position <= 3 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-border"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center shrink-0 pt-0.5">
                    <RankIcon rank={entry.rank_position} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {entry.industry}
                      </h3>
                      <ScoreBadge score={entry.idea_score} />
                      {isSample && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {entry.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-success" />
                        ${entry.monthly_profit.toLocaleString()}/mo profit
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {entry.net_margin.toFixed(1)}% margin
                      </span>
                      {entry.payback_months && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {entry.payback_months}mo payback
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View report — hide for sample entries */}
                  {!isSample && entry.share_token && (
                    <Link 
                      to={`/share/${entry.share_token}`}
                      className="shrink-0"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <Share2 className="w-3.5 h-3.5" />
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* How to appear */}
        {entries.length > 0 && (
          <div className="mt-8 p-5 rounded-xl border border-dashed border-border bg-muted/30 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Want to appear on the leaderboard?</p>
            <p className="text-sm text-muted-foreground">
              Run an analysis, then click <strong>"Share Link"</strong> on your results. 
              Shared analyses automatically appear here when they score in the top 10.
            </p>
            <Link to="/app">
              <Button className="gap-2">
                Validate My Idea — Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Social share prompt */}
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              const text = entries.length > 0
                ? `This week's top business idea on AIWMC Quantis: ${entries[0]?.industry} in ${entries[0]?.location} scored ${entries[0]?.idea_score}/10 with $${entries[0]?.monthly_profit.toLocaleString()}/mo profit. What does YOUR idea score?`
                : 'Check out the top business ideas validated by AIWMC Quantis this month!';
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://aiwmcquantis.com/leaderboard')}`,
                '_blank'
              );
            }}
          >
            <Share2 className="w-4 h-4" />
            Share Leaderboard on Twitter
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
