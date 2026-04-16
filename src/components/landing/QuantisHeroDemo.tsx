import { useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

/* ── Industry Data ── */
const IND: Record<string, IndustryData> = {
  SaaS: {
    icon: '⚡', city: 'Remote',
    capital: 50000, price: 89, customers: 30, opCosts: 10000, cac: 150, churn: 5,
    breakEven: 8, rev12: 28400, runway: 14, risk: 42, margin: 68,
    verdict: 'PROCEED', verdictColor: 'var(--q-proceed)', verdictBorder: 'var(--q-proceed-border)',
    verdictBg: 'var(--q-proceed-bg)',
    verdictText: 'LTV:CAC at 11.8× — top quartile. Launch with retention focus.',
    monthlyRev: [890, 1780, 2670, 3560, 4450, 6230, 8010, 9790, 14240, 18690, 23140, 28400],
    riskFactors: [
      { name: 'Churn rate (5%/mo)', score: 52 },
      { name: 'CAC payback period', score: 38 },
      { name: 'Market penetration', score: 35 },
      { name: 'Runway to break-even', score: 29 },
    ],
    insights: [
      'LTV:CAC of 11.8× — SaaS top quartile benchmark is 3×+',
      'Month 8 break-even leaves 6-month capital buffer',
      'Price $89 is 23% below competitor median ($116) — raise it',
      'Reducing churn from 5% → 3% adds $2,670 LTV per customer',
    ],
    mc: { p10: 14200, p50: 28400, p90: 47800, survive: 78 },
    benchmarks: { avgBreakEven: 10, avgRev12: 22000, avgChurn: 6 },
  },
  'Coffee Shop': {
    icon: '☕', city: 'Austin, TX',
    capital: 45000, price: 6.5, customers: 80, opCosts: 12000, cac: 12, churn: 8,
    breakEven: 14, rev12: 8400, runway: 9, risk: 78, margin: 18,
    verdict: 'HIGH RISK', verdictColor: 'var(--q-danger)', verdictBorder: 'var(--q-danger-border)',
    verdictBg: 'var(--q-danger-bg)',
    verdictText: 'Runway ends Month 9. Break-even at 14. Fatal $29,400 gap.',
    monthlyRev: [520, 1040, 2080, 2860, 3640, 4420, 5200, 5980, 6760, 7540, 7960, 8400],
    riskFactors: [
      { name: 'Location dependency', score: 87 },
      { name: 'Profit margin (18%)', score: 72 },
      { name: 'Break-even vs runway', score: 65 },
      { name: 'Austin market saturation', score: 54 },
    ],
    insights: [
      '9-month runway vs 14-month break-even — fatal capital gap',
      'Need 1,847 transactions/mo at $6.50 avg ticket to break even',
      'Austin: 4.2 coffee shops/sq mile — saturation is HIGH',
      'Competitor avg ticket is $8.90 — you\'re priced 27% below market',
    ],
    mc: { p10: 3200, p50: 8400, p90: 16200, survive: 29 },
    benchmarks: { avgBreakEven: 16, avgRev12: 9200, avgChurn: 9 },
  },
  Restaurant: {
    icon: '🍽️', city: 'Denver, CO',
    capital: 120000, price: 28, customers: 200, opCosts: 22000, cac: 35, churn: 15,
    breakEven: 18, rev12: 19200, runway: 11, risk: 71, margin: 22,
    verdict: 'PIVOT', verdictColor: 'var(--q-pivot)', verdictBorder: 'var(--q-pivot-border)',
    verdictBg: 'var(--q-pivot-bg)',
    verdictText: 'High fixed leverage is dangerous. Ghost kitchen cuts costs 62%.',
    monthlyRev: [1400, 2800, 4200, 5600, 7000, 8400, 9800, 11200, 13400, 15600, 17400, 19200],
    riskFactors: [
      { name: 'Fixed cost leverage', score: 81 },
      { name: 'Labor cost ratio (34%)', score: 68 },
      { name: 'Customer retention', score: 64 },
      { name: 'Break-even timeline', score: 58 },
    ],
    insights: [
      '18-month break-even requires 200+ consistent covers per day',
      'Labor at 34% of revenue — danger zone starts at 35%',
      'Ghost kitchen model: same revenue, 62% lower fixed cost base',
      'Runway ends Month 11 — must pivot or raise capital by Month 8',
    ],
    mc: { p10: 8400, p50: 19200, p90: 34600, survive: 43 },
    benchmarks: { avgBreakEven: 20, avgRev12: 17500, avgChurn: 14 },
  },
  Fitness: {
    icon: '💪', city: 'Chicago, IL',
    capital: 80000, price: 59, customers: 120, opCosts: 14000, cac: 95, churn: 6,
    breakEven: 11, rev12: 16200, runway: 12, risk: 55, margin: 34,
    verdict: 'PIVOT', verdictColor: 'var(--q-pivot)', verdictBorder: 'var(--q-pivot-border)',
    verdictBg: 'var(--q-pivot-bg)',
    verdictText: 'Location-bound limits scale. Hybrid model unlocks 340% TAM.',
    monthlyRev: [708, 1416, 2124, 2832, 3540, 4720, 5900, 7080, 9440, 11800, 14040, 16200],
    riskFactors: [
      { name: 'Seasonal demand swings', score: 69 },
      { name: 'Equipment depreciation', score: 58 },
      { name: 'Churn rate (6%/mo)', score: 48 },
      { name: 'Staff turnover risk', score: 42 },
    ],
    insights: [
      'January rush drops 70% by March — must model seasonality',
      'Price $59 is 34% below boutique benchmark of $89',
      'Adding digital tier at $19/mo adds $22K+ annual revenue',
      'Equipment replacement reserve missing from your cost model',
    ],
    mc: { p10: 9200, p50: 16200, p90: 28800, survive: 57 },
    benchmarks: { avgBreakEven: 13, avgRev12: 14800, avgChurn: 7 },
  },
  Ecommerce: {
    icon: '🛒', city: 'Online',
    capital: 25000, price: 47, customers: 150, opCosts: 7500, cac: 28, churn: 22,
    breakEven: 6, rev12: 31200, runway: 16, risk: 38, margin: 41,
    verdict: 'PROCEED', verdictColor: 'var(--q-proceed)', verdictBorder: 'var(--q-proceed-border)',
    verdictBg: 'var(--q-proceed-bg)',
    verdictText: 'Strong unit economics. CAC efficiency is best-in-class. Scale now.',
    monthlyRev: [1410, 2820, 4230, 5640, 7050, 9400, 11750, 14100, 18800, 23500, 26850, 31200],
    riskFactors: [
      { name: 'Repeat purchase rate', score: 55 },
      { name: 'Platform dependency', score: 42 },
      { name: 'Inventory risk', score: 38 },
      { name: 'Margin compression', score: 31 },
    ],
    insights: [
      'CAC $28 on $47 AOV = 59% first-purchase payback — excellent',
      'Month 6 break-even is best-in-class for ecommerce startups',
      '22% monthly churn HIGH — email retention stack needed urgently',
      'Repeat purchase rate below 30% will compress LTV projections',
    ],
    mc: { p10: 18400, p50: 31200, p90: 52800, survive: 82 },
    benchmarks: { avgBreakEven: 9, avgRev12: 26000, avgChurn: 18 },
  },
};

interface IndustryData {
  icon: string; city: string;
  capital: number; price: number; customers: number; opCosts: number; cac: number; churn: number;
  breakEven: number; rev12: number; runway: number; risk: number; margin: number;
  verdict: string; verdictColor: string; verdictBorder: string; verdictBg: string; verdictText: string;
  monthlyRev: number[];
  riskFactors: { name: string; score: number }[];
  insights: string[];
  mc: { p10: number; p50: number; p90: number; survive: number };
  benchmarks: { avgBreakEven: number; avgRev12: number; avgChurn: number };
}

interface GeneratedIdea {
  idea: string;
  differentiator: string;
  startingCapital: number;
  pricePerCustomer: number;
  customersAtLaunch: number;
  monthlyOpCosts: number;
  estimatedBreakEven: number;
  estimatedRevM12: number;
  riskNote: string;
}

const METRIC_INFO: Record<string, { title: string; desc: string; crit: string }> = {
  breakEven: {
    title: 'Break-even Month',
    desc: 'Month when cumulative revenue first exceeds cumulative costs. Everything after this point is profit.',
    crit: 'If your runway ends before break-even, the business dies without new capital injection.',
  },
  rev12: {
    title: 'Revenue at Month 12',
    desc: 'Projected monthly recurring revenue at end of year one, at current growth rate and churn assumptions.',
    crit: 'Investors benchmark 3–5× growth from Month 1 to Month 12 in subscription businesses.',
  },
  runway: {
    title: 'Cash Runway',
    desc: 'Months until starting capital is exhausted at current burn rate and revenue trajectory.',
    crit: 'Quantis flags any scenario where runway < break-even month as a FATAL capital assumption.',
  },
  risk: {
    title: 'Risk Score (0–100)',
    desc: 'Composite of 12 variables: LTV:CAC ratio, churn rate, market saturation, runway cushion, margin, competition density — benchmarked against 95,500 real businesses.',
    crit: 'Below 40 → Proceed. 40–70 → Consider pivoting. Above 70 → High Risk.',
  },
};

type Depth = 'quick' | 'full' | 'deep';

const DEPTHS: { key: Depth; label: string; badge: string; time: string; desc: string; color: string; tags: string[] }[] = [
  { key: 'quick', label: 'Quick', badge: 'Gut check', time: '30s', desc: '3 vital signs · instant go/no-go', color: 'var(--q-quick-color)', tags: ['Break-even', 'Revenue M12', 'Risk score'] },
  { key: 'full', label: 'Full', badge: 'Recommended', time: '90s', desc: '12-variable investor-grade model', color: 'var(--q-full-color)', tags: ['All metrics', 'Revenue chart', 'Risk breakdown', 'Key insights'] },
  { key: 'deep', label: 'Deep', badge: 'CFO-grade', time: '3 min', desc: '1,000+ Monte Carlo simulations', color: 'var(--q-deep-color)', tags: ['Everything in Full', 'Monte Carlo', '5-yr projection'] },
];

function fmt(n: number) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n;
}

function riskColor(s: number) {
  return s >= 70 ? 'var(--q-danger)' : s >= 50 ? 'var(--q-pivot)' : 'var(--q-proceed)';
}

function riskLabel(s: number) {
  return s >= 70 ? 'CRITICAL' : s >= 50 ? 'HIGH' : 'LOW';
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md px-3 py-2 text-xs shadow-lg" style={{ background: '#0F1929', border: '1px solid #1E3A5F' }}>
      <div className="font-semibold text-[11px]" style={{ color: 'var(--q-full-color)' }}>{payload[0].payload.month}</div>
      <div className="font-bold text-[13px]" style={{ color: 'var(--q-text-primary)' }}>{fmt(payload[0].value)}</div>
    </div>
  );
};

export function QuantisHeroDemo() {
  const [industry, setIndustry] = useState('Coffee Shop');
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>('full');
  const [generating, setGenerating] = useState(false);
  const [idea, setIdea] = useState<GeneratedIdea | null>(null);

  const ind = IND[industry];
  const revData = ind.monthlyRev.map((v, i) => ({ month: `M${i + 1}`, revenue: v }));
  const beColor = ind.breakEven <= 10 ? 'var(--q-proceed)' : ind.breakEven <= 15 ? 'var(--q-pivot)' : 'var(--q-danger)';
  const runwayOk = ind.runway >= ind.breakEven;
  const metric = activeMetric ? METRIC_INFO[activeMetric] : null;

  const showChart = depth === 'full' || depth === 'deep';
  const showMonte = depth === 'deep';

  const handleGenerateIdea = useCallback(async () => {
    setGenerating(true);
    setIdea(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-idea', {
        body: { industry },
      });
      if (error) throw error;
      setIdea(data as GeneratedIdea);
    } catch {
      setIdea({
        idea: `Subscription-based equipment maintenance tracking for independent ${industry.toLowerCase()} operators`,
        differentiator: 'Predictive maintenance reduces downtime 40% — supports premium pricing at $149/mo',
        startingCapital: 30000, pricePerCustomer: 149, customersAtLaunch: 15,
        monthlyOpCosts: 5000, estimatedBreakEven: 7, estimatedRevM12: 38800,
        riskNote: 'B2B sales cycle averages 3 months — model this in CAC payback',
      });
    }
    setGenerating(false);
  }, [industry]);

  return (
    <div className="rounded-[14px] overflow-hidden" style={{
      background: '#070D1A',
      border: '1px solid #1A2744',
      boxShadow: '0 0 60px rgba(59,130,246,0.07)',
    }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{
        background: '#040810',
        borderBottom: '1px solid var(--q-border-subtle)',
      }}>
        <div className="flex gap-1.5">
          {['#EF4444', '#F59E0B', '#10B981'].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full opacity-75" style={{ background: c }} />
          ))}
        </div>
        <div className="flex-1 rounded-md px-3 py-1 flex items-center justify-center gap-2" style={{ background: 'var(--q-bg-input)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: '#10B981', opacity: 0.7 }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--q-text-disabled)' }}>aiwmcquantis.com/app</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(79,142,247,0.12)', color: '#4F8EF7' }}>DUAL-AI</span>
          <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>LIVE</span>
        </div>
      </div>

      {/* Nav bar with industry tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 gap-3" style={{
        background: 'var(--q-bg-surface)',
        borderBottom: '1px solid var(--q-border-subtle)',
      }}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--q-gradient-accent)' }}>
            <span className="text-[11px] font-extrabold" style={{ color: '#fff' }}>Q</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-[12px] font-bold leading-tight" style={{ color: 'var(--q-text-primary)' }}>
              AIWMC <span style={{ color: 'var(--aiwmc-green)' }}>Quantis</span>
            </div>
            <div className="text-[9px]" style={{ color: 'var(--q-text-disabled)' }}>Pre-Mortem Engine</div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {Object.keys(IND).map(k => {
            const isActive = industry === k;
            const d = IND[k];
            return (
              <button key={k} onClick={() => { setIndustry(k); setIdea(null); setActiveMetric(null); }}
                className="px-2.5 py-1 text-[10px] rounded-md cursor-pointer transition-all duration-150 whitespace-nowrap shrink-0"
                style={{
                  border: isActive ? `1px solid ${d.verdictColor}` : '1px solid var(--q-border-subtle)',
                  background: isActive ? d.verdictBg : 'transparent',
                  color: isActive ? d.verdictColor : 'var(--q-text-tertiary)',
                  fontWeight: isActive ? 700 : 500,
                }}>
                {d.icon} {k}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 sm:p-5" style={{ minHeight: 420 }}>
        {/* Verdict banner */}
        <div className="rounded-lg mb-4 px-4 py-3 flex flex-wrap items-center gap-3" style={{
          background: ind.verdictBg, border: `1px solid ${ind.verdictBorder}`,
        }}>
          <span className="text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded whitespace-nowrap" style={{ background: ind.verdictColor, color: '#fff' }}>
            {ind.verdict}
          </span>
          <span className="text-[12px] flex-1 leading-snug min-w-0" style={{ color: 'var(--q-text-secondary)' }}>{ind.verdictText}</span>
          <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded whitespace-nowrap" style={{
            border: `1px solid ${DEPTHS.find(d => d.key === depth)!.color}`,
            color: DEPTHS.find(d => d.key === depth)!.color,
          }}>
            {depth.toUpperCase()} · {DEPTHS.find(d => d.key === depth)!.time}
          </span>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-1">
          {[
            { key: 'breakEven', label: 'Break-even', value: `Mo. ${ind.breakEven}`, sub: ind.runway < ind.breakEven ? '⚠ runway gap' : '✓ covered', color: beColor },
            { key: 'rev12', label: 'Revenue M12', value: fmt(ind.rev12), sub: `vs avg ${fmt(ind.benchmarks.avgRev12)}`, color: 'var(--q-full-color)' },
            { key: 'runway', label: 'Cash Runway', value: `${ind.runway} mo`, sub: runwayOk ? '✓ safe' : '⚠ critical', color: runwayOk ? 'var(--q-proceed)' : 'var(--q-danger)' },
            { key: 'risk', label: 'Risk Score', value: String(ind.risk), sub: riskLabel(ind.risk), color: riskColor(ind.risk) },
          ].map(m => (
            <div key={m.key}
              onMouseEnter={() => setActiveMetric(m.key)}
              onMouseLeave={() => setActiveMetric(null)}
              className="rounded-[9px] p-3 cursor-pointer transition-all duration-200 relative overflow-hidden"
              style={{
                background: activeMetric === m.key ? 'var(--q-bg-elevated)' : 'var(--q-bg-input)',
                border: activeMetric === m.key ? `1px solid ${m.color}` : '1px solid var(--q-border-subtle)',
              }}>
              <div className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-200" style={{
                background: m.color, opacity: activeMetric === m.key ? 1 : 0.25,
              }} />
              <div className="text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: 'var(--q-text-tertiary)' }}>{m.label}</div>
              <div className="text-xl font-extrabold leading-none mb-1 transition-all duration-300" style={{ color: m.color, fontFamily: 'var(--q-font-mono)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
              <div className="text-[10px]" style={{ color: 'var(--q-text-disabled)' }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Metric tooltip */}
        <div className="h-[52px] mb-3 transition-opacity duration-150 flex items-center" style={{ opacity: metric ? 1 : 0 }}>
          {metric && (
            <div className="rounded-lg px-4 py-2.5 w-full flex gap-3 items-start" style={{
              background: '#0C1A2E', border: '1px solid #1A3050',
            }}>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold mr-2" style={{ color: '#60A5FA' }}>ℹ {metric.title}</span>
                <span className="text-[11px] leading-snug" style={{ color: '#64748B' }}>{metric.desc}</span>
                <span className="text-[10px] ml-2" style={{ color: '#EF4444', opacity: 0.8 }}>→ {metric.crit}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chart + Risk — visible in Full + Deep */}
        {showChart && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 animate-fade-in">
            {/* Revenue chart */}
            <div className="rounded-[9px] p-3" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--q-text-tertiary)' }}>Revenue Trajectory</span>
                <span className="text-[10px]" style={{ color: 'var(--q-text-disabled)' }}>12-mo projection</span>
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={revData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id={`hero-g-${industry}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#2A4060' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 9, fill: '#2A4060' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                  <ReferenceLine x={`M${ind.breakEven}`} stroke={beColor} strokeDasharray="3 2" strokeOpacity={0.6}
                    label={{ value: 'B/E', position: 'top', fill: beColor, fontSize: 9, fontWeight: 700 }} />
                  <RechartTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill={`url(#hero-g-${industry})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Risk breakdown */}
            <div className="rounded-[9px] p-3" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
              <div className="text-[10px] font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-text-tertiary)' }}>Risk Factors</div>
              {ind.riskFactors.map((r, i) => (
                <div key={i} className={i < 3 ? 'mb-2.5' : ''}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px]" style={{ color: '#4A6080' }}>{r.name}</span>
                    <span className="text-[9px] font-bold tracking-wider" style={{ color: riskColor(r.score) }}>{riskLabel(r.score)}</span>
                  </div>
                  <div className="h-[3px] rounded-full" style={{ background: '#0D1A2D' }}>
                    <div className="h-[3px] rounded-full transition-all duration-700" style={{ width: `${r.score}%`, background: riskColor(r.score) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights — visible in Full + Deep */}
        {showChart && (
          <div className="rounded-[9px] p-3 mb-4 animate-fade-in" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
            <div className="text-[10px] font-semibold tracking-wider uppercase mb-2.5" style={{ color: 'var(--q-text-tertiary)' }}>Fatal Assumptions · Key Findings</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {ind.insights.map((insight, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[11px] mt-px shrink-0" style={{ color: '#1D4ED8' }}>→</span>
                  <span className="text-[10px] leading-snug" style={{ color: '#64748B', lineHeight: 1.5 }}>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monte Carlo — visible in Deep only */}
        {showMonte && (
          <div className="rounded-[9px] p-3 mb-4 animate-fade-in" style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--q-text-tertiary)' }}>Monte Carlo · 1,000 Simulations</span>
              <span className="text-[9px] font-medium" style={{ color: 'var(--q-deep-color)' }}>Revenue M12 distribution</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'P10 (Pessimist)', value: ind.mc.p10, color: 'var(--q-monte-p10)' },
                { label: 'P50 (Realistic)', value: ind.mc.p50, color: 'var(--q-monte-p50)' },
                { label: 'P90 (Optimist)', value: ind.mc.p90, color: 'var(--q-monte-p90)' },
              ].map(mc => (
                <div key={mc.label} className="rounded-lg p-2.5 text-center" style={{
                  background: '#080F1C',
                  border: `1px solid color-mix(in srgb, ${mc.color} 13%, transparent)`,
                }}>
                  <div className="text-[9px] font-medium mb-1" style={{ color: '#4A6080' }}>{mc.label}</div>
                  <div className="text-sm font-extrabold" style={{ color: mc.color, fontFamily: 'var(--q-font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmt(mc.value)}</div>
                </div>
              ))}
            </div>
            {/* Survival bar */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px]" style={{ color: '#4A6080' }}>12-month survival probability</span>
              <span className="text-[11px] font-bold" style={{ color: ind.mc.survive >= 60 ? 'var(--q-proceed)' : ind.mc.survive >= 40 ? 'var(--q-pivot)' : 'var(--q-danger)' }}>{ind.mc.survive}%</span>
            </div>
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#0D1A2D' }}>
              <div className="h-full rounded-full transition-all duration-900" style={{
                width: `${ind.mc.survive}%`,
                background: `linear-gradient(90deg, var(--q-danger) 0%, var(--q-pivot) 50%, var(--q-proceed) 100%)`,
              }} />
            </div>
          </div>
        )}

        {/* Depth Selector — always visible */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {DEPTHS.map(d => {
            const isActive = depth === d.key;
            return (
              <button key={d.key} onClick={() => setDepth(d.key)}
                className="rounded-[9px] p-2.5 text-left cursor-pointer transition-all duration-200"
                style={{
                  background: isActive ? `color-mix(in srgb, ${d.color} 10%, transparent)` : '#0C1525',
                  border: isActive ? `1px solid ${d.color}` : '1px solid #111F38',
                }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-bold" style={{ color: isActive ? d.color : 'var(--q-text-secondary)' }}>{d.label}</span>
                  <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{
                    background: isActive ? `color-mix(in srgb, ${d.color} 15%, transparent)` : 'transparent',
                    color: d.color,
                    border: `1px solid color-mix(in srgb, ${d.color} 20%, transparent)`,
                  }}>{d.badge}</span>
                </div>
                <div className="text-[9px] mb-1.5" style={{ color: 'var(--q-text-disabled)' }}>{d.desc}</div>
                <div className="flex flex-wrap gap-1">
                  {d.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded" style={{
                      background: `color-mix(in srgb, ${d.color} 8%, transparent)`,
                      color: `color-mix(in srgb, ${d.color} 70%, var(--q-text-secondary))`,
                    }}>{tag}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Generate Idea */}
        <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--q-border-subtle)' }}>
          <div className="flex-1 min-w-0">
            {idea ? (
              <div className="rounded-lg p-2.5" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: '#60A5FA' }}>✦ Quantis-Validated Idea → Ready to Calculate</div>
                <div className="text-[11px] mb-1.5" style={{ color: 'var(--q-text-primary)' }}>{idea.idea}</div>
                <div className="flex gap-3 flex-wrap mb-1">
                  <span className="text-[9px]" style={{ color: '#334D6E' }}>Break-even: M{idea.estimatedBreakEven}</span>
                  <span className="text-[9px]" style={{ color: '#334D6E' }}>${idea.pricePerCustomer}/mo</span>
                  <span className="text-[9px]" style={{ color: '#334D6E' }}>Capital: ${idea.startingCapital.toLocaleString()}</span>
                  <span className="text-[9px]" style={{ color: '#334D6E' }}>M12: {fmt(idea.estimatedRevM12)}</span>
                </div>
                <div className="text-[9px]" style={{ color: '#10B981' }}>⚡ Edge: {idea.differentiator}</div>
                <div className="text-[9px] mt-0.5" style={{ color: '#F59E0B' }}>⚠ {idea.riskNote}</div>
              </div>
            ) : (
              <div>
                <span className="text-[11px]" style={{ color: 'var(--q-text-ghost)' }}>
                  No idea to test? Quantis generates a financially-viable {industry} concept — specific enough to calculate.
                </span>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--q-text-ghost)' }}>Calibrated to current market conditions, not a generic template.</div>
              </div>
            )}
          </div>
          <button onClick={handleGenerateIdea} disabled={generating}
            className="shrink-0 px-4 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 whitespace-nowrap"
            style={{
              border: '1px solid #3B82F6',
              background: 'rgba(59,130,246,0.13)',
              color: '#60A5FA',
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating ? 0.5 : 1,
            }}>
            {generating ? '⟳ Generating…' : idea ? `✦ Generate Another` : `✦ Generate ${industry} Idea`}
          </button>
        </div>
      </div>
    </div>
  );
}
