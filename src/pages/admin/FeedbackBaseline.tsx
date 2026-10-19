/**
 * Structured feedback baseline (charter 6.7-6.11, Phase 6 Public Trust
 * Foundation, 2026-08-29). Reads public.product_feedback (submitted via
 * ProductFeedbackDialog) and computes an honest respondent-count-qualified
 * promoter/passive/detractor baseline -- charter 6.7 explicitly forbids
 * presenting a small-n NPS as market truth, so the sample size is the most
 * prominent number on this page, not a footnote.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackRow {
  id: string;
  likelihood_to_recommend: number;
  main_reason: string | null;
  most_trusted_output: string | null;
  least_trusted_output: string | null;
  missing_decision: string | null;
  would_use_again: boolean | null;
  created_at: string;
}

const MEANINGFUL_SAMPLE_SIZE = 30;

export default function FeedbackBaseline() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('product_feedback')
      .select('*')
      .order('created_at', { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }

  const n = rows.length;
  const promoters = rows.filter((r) => r.likelihood_to_recommend >= 9).length;
  const passives = rows.filter((r) => r.likelihood_to_recommend >= 7 && r.likelihood_to_recommend <= 8).length;
  const detractors = rows.filter((r) => r.likelihood_to_recommend <= 6).length;
  const nps = n > 0 ? Math.round(((promoters - detractors) / n) * 100) : null;
  const wouldReturnCount = rows.filter((r) => r.would_use_again === true).length;
  const wouldReturnAnswered = rows.filter((r) => r.would_use_again !== null).length;

  const leastTrustedThemes = rows.map((r) => r.least_trusted_output).filter((v): v is string => !!v && v.trim().length > 0);
  const missingDecisionThemes = rows.map((r) => r.missing_decision).filter((v): v is string => !!v && v.trim().length > 0);

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feedback Baseline</h1>
            <p className="text-sm text-muted-foreground mt-1">Structured feedback baseline — charter 6.7-6.11</p>
          </div>
          <button onClick={load} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <Card className={n < MEANINGFUL_SAMPLE_SIZE ? 'border-amber-500/40' : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />{n} respondent{n === 1 ? '' : 's'}</CardTitle>
            <CardDescription>
              {n < MEANINGFUL_SAMPLE_SIZE
                ? `Below ${MEANINGFUL_SAMPLE_SIZE} responses — treat every number below as directional qualitative signal, not a statistically meaningful NPS. Do not quote this externally as "our NPS."`
                : `${MEANINGFUL_SAMPLE_SIZE}+ responses — still a small B2B sample; report with the respondent count alongside any number quoted externally.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-500">{promoters}</div>
                <div className="text-xs text-muted-foreground">Promoters (9-10)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-500">{passives}</div>
                <div className="text-xs text-muted-foreground">Passives (7-8)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{detractors}</div>
                <div className="text-xs text-muted-foreground">Detractors (0-6)</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Score (promoters − detractors, informal until n≥{MEANINGFUL_SAMPLE_SIZE})</span>
              <span className="font-mono font-semibold text-foreground">{nps === null ? '—' : nps}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Would use Quantis again</span>
              <span className="font-mono font-semibold text-foreground">
                {wouldReturnAnswered > 0 ? `${wouldReturnCount}/${wouldReturnAnswered}` : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Least-trusted output (raw responses)</CardTitle>
            <CardDescription>Each repeated theme here should become a prioritized issue (charter 6.11) — no automatic clustering applied, read them directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {leastTrustedThemes.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
            {leastTrustedThemes.map((t, i) => (
              <div key={i} className="text-sm p-2 rounded-md bg-muted/40 text-foreground">{t}</div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Missing decisions (raw responses)</CardTitle>
            <CardDescription>What users say Quantis doesn't yet help them decide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingDecisionThemes.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
            {missingDecisionThemes.map((t, i) => (
              <div key={i} className="text-sm p-2 rounded-md bg-muted/40 text-foreground">{t}</div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="p-3 rounded-md border border-border text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={r.likelihood_to_recommend >= 9 ? 'default' : r.likelihood_to_recommend >= 7 ? 'secondary' : 'destructive'}>
                    Score {r.likelihood_to_recommend}/10
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.main_reason && <p className="text-muted-foreground">"{r.main_reason}"</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
