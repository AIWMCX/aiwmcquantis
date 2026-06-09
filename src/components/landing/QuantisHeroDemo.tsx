import { useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

/* ── Industry Data ── */
const IND: Record<string, IndustryData> = {
  SaaS: {
    icon: '⚡',
    city: 'Remote',
    capital: 50000,
    price: 89,
    customers: 30,
    opCosts: 10000,
    cac: 150,
    churn: 5,
    breakEven: 8,
    rev12: 28400,
    runway: 14,
    risk: 42,
    margin: 68,
    verdict: 'PROCEED',
    verdictColor: 'var(--q-status-green)',
    verdictBorder: 'var(--q-status-green-border)',
    verdictBg: 'var(--q-status-green-bg)',
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
    icon: '☕',
    city: 'Austin, TX',
    capital: 45000,
    price: 6.5,
    customers: 80,
    opCosts: 12000,
    cac: 12,
    churn: 8,
    breakEven: 14,
    rev12: 8400,
    runway: 9,
    risk: 78,
    margin: 18,
    verdict: 'HIGH RISK',
    verdictColor: 'var(--q-status-red)',
    verdictBorder: 'var(--q-status-red-border)',
    verdictBg: 'var(--q-status-red-bg)',
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
      "Competitor avg ticket is $8.90 — you're priced 27% below market",
    ],
    mc: { p10: 3200, p50: 8400, p90: 16200, survive: 29 },
    benchmarks: { avgBreakEven: 16, avgRev12: 9200, avgChurn: 9 },
  },
  Restaurant: {
    icon: '🍽️',
    city: 'Denver, CO',
    capital: 120000,
    price: 28,
    customers: 200,
    opCosts: 22000,
    cac: 35,
    churn: 15,
    breakEven: 18,
    rev12: 19200,
    runway: 11,
    risk: 71,
    margin: 22,
    verdict: 'PIVOT',
    verdictColor: 'var(--q-status-yellow)',
    verdictBorder: 'var(--q-status-yellow-border)',
    verdictBg: 'var(--q-status-yellow-bg)',
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
    icon: '💪',
    city: 'Chicago, IL',
    capital: 80000,
    price: 59,
    customers: 120,
    opCosts: 14000,
    cac: 95,
    churn: 6,
    breakEven: 11,
    rev12: 16200,
    runway: 12,
    risk: 55,
    margin: 34,
    verdict: 'PIVOT',
    verdictColor: 'var(--q-status-yellow)',
    verdictBorder: 'var(--q-status-yellow-border)',
    verdictBg: 'var(--q-status-yellow-bg)',
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
    icon: '🛒',
    city: 'Online',
    capital: 25000,
    price: 47,
    customers: 150,
    opCosts: 7500,
    cac: 28,
    churn: 22,
    breakEven: 6,
    rev12: 31200,
    runway: 16,
    risk: 38,
    margin: 41,
    verdict: 'PROCEED',
    verdictColor: 'var(--q-status-green)',
    verdictBorder: 'var(--q-status-green-border)',
    verdictBg: 'var(--q-status-green-bg)',
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
  icon: string;
  city: string;
  capital: number;
  price: number;
  customers: number;
  opCosts: number;
  cac: number;
  churn: number;
  breakEven: number;
  rev12: number;
  runway: number;
  risk: number;
  margin: number;
  verdict: string;
  verdictColor: string;
  verdictBorder: string;
  verdictBg: string;
  verdictText: string;
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
    desc: 'When cumulative revenue exceeds cumulative costs.',
    crit: 'If runway ends before break-even → business dies without new capital.',
  },
  rev12: {
    title: 'Revenue at Month 12',
    desc: 'Projected monthly revenue after 12 months at current growth & churn.',
    crit: 'Investors benchmark 3-5× growth from M1 → M12.',
  },
  runway: {
    title: 'Cash Runway',
    desc: 'Months until starting capital is exhausted at current burn rate.',
    crit: 'Quantis flags runway < break-even month as fatal.',
  },
  risk: {
    title: 'Risk Score (0–100)',
    desc: 'Composite of LTV:CAC, churn, saturation, runway, margin — benchmarked against 95,500 businesses.',
    crit: '<40 Proceed · 40–70 Pivot · >70 High Risk.',
  },
};

function fmt(n: number) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + n;
}

function riskColor(s: number) {
  return s >= 70
    ? 'var(--q-status-red)'
    : s >= 50
      ? 'var(--q-status-yellow)'
      : 'var(--q-status-green)';
}

function riskLabel(s: number) {
  return s >= 70 ? 'CRITICAL' : s >= 50 ? 'HIGH' : 'LOW';
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-default)' }}
    >
      <div className="font-semibold text-[11px]" style={{ color: 'var(--q-accent-primary)' }}>
        {payload[0].payload.month}
      </div>
      <div className="font-bold text-[13px]" style={{ color: 'var(--q-text-primary)' }}>
        {fmt(payload[0].value)}
      </div>
    </div>
  );
};

export function QuantisHeroDemo() {
  const [industry, setIndustry] = useState('Coffee Shop');
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [idea, setIdea] = useState<GeneratedIdea | null>(null);

  const ind = IND[industry];
  const revData = ind.monthlyRev.map((v, i) => ({ month: `M${i + 1}`, revenue: v }));
  const beColor =
    ind.breakEven <= 10
      ? 'var(--q-status-green)'
      : ind.breakEven <= 15
        ? 'var(--q-status-yellow)'
        : 'var(--q-status-red)';
  const runwayOk = ind.runway >= ind.breakEven;
  const metric = activeMetric ? METRIC_INFO[activeMetric] : null;

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
        idea: `AI-powered bookkeeping for independent ${industry.toLowerCase()} businesses`,
        differentiator: 'Niche focus cuts onboarding from 8hrs to 20min — supports premium pricing',
        startingCapital: 30000,
        pricePerCustomer: 249,
        customersAtLaunch: 12,
        monthlyOpCosts: 5000,
        estimatedBreakEven: 6,
        estimatedRevM12: 38800,
        riskNote: 'B2B sales cycle averages 3 months — model this in CAC',
      });
    }
    setGenerating(false);
  }, [industry]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--q-bg-surface)',
        border: '1px solid var(--q-border-subtle)',
        boxShadow: 'var(--q-shadow-elevated)',
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{
          background: 'var(--q-bg-elevated)',
          borderBottom: '1px solid var(--q-border-subtle)',
        }}
      >
        <div className="flex gap-1.5">
          {['var(--q-status-red)', 'var(--q-status-yellow)', 'var(--q-status-green)'].map((c) => (
            <div
              key={c}
              className="w-2.5 h-2.5 rounded-full opacity-75"
              style={{ background: c }}
            />
          ))}
        </div>
        <div
          className="flex-1 rounded-md px-3 py-1 flex items-center justify-center gap-2"
          style={{ background: 'var(--q-bg-input)' }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--q-status-green)', opacity: 0.7 }}
          />
          <span className="text-[11px] font-mono" style={{ color: 'var(--q-text-disabled)' }}>
            aiwmcquantis.com/analysis
          </span>
        </div>
        <div className="flex gap-1.5">
          <span
            className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
            style={{ background: 'var(--q-accent-glow)', color: 'var(--q-accent-primary)' }}
          >
            QUANTIS AI
          </span>
          <span
            className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded"
            style={{ background: 'var(--q-status-green-bg)', color: 'var(--q-status-green)' }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Nav bar with industry tabs — horizontal scroll on small screens */}
      <div
        className="flex items-center justify-between px-4 py-2.5 gap-3"
        style={{
          background: 'var(--q-bg-surface)',
          borderBottom: '1px solid var(--q-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'var(--q-gradient-accent)' }}
          >
            <span className="text-[11px] text-white font-extrabold">Q</span>
          </div>
          <div className="hidden sm:block">
            <div
              className="text-[12px] font-bold leading-tight"
              style={{ color: 'var(--q-text-primary)' }}
            >
              AIWMC Quantis
            </div>
            <div className="text-[9px]" style={{ color: 'var(--q-text-disabled)' }}>
              Pre-Mortem Engine
            </div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {Object.keys(IND).map((k) => (
            <button
              key={k}
              onClick={() => {
                setIndustry(k);
                setIdea(null);
                setActiveMetric(null);
              }}
              className="px-2.5 py-1 text-[10px] rounded-md cursor-pointer transition-all duration-150 whitespace-nowrap shrink-0"
              style={{
                border:
                  industry === k
                    ? '1px solid var(--q-accent-primary)'
                    : '1px solid var(--q-border-subtle)',
                background: industry === k ? 'var(--q-accent-glow)' : 'transparent',
                color: industry === k ? 'var(--q-accent-primary)' : 'var(--q-text-tertiary)',
                fontWeight: industry === k ? 700 : 500,
              }}
            >
              {IND[k].icon} {k}
            </button>
          ))}
        </div>
      </div>

      {/* Main content — fixed min-height to prevent jumps between industries */}
      <div className="p-4 sm:p-5" style={{ minHeight: 420 }}>
        {/* Verdict banner */}
        <div
          className="rounded-lg mb-4 px-4 py-3 flex items-center gap-3"
          style={{
            background: ind.verdictBg,
            border: `1px solid ${ind.verdictBorder}`,
          }}
        >
          <span
            className="text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded text-white whitespace-nowrap"
            style={{ background: ind.verdictColor }}
          >
            {ind.verdict}
          </span>
          <span
            className="text-[12px] flex-1 leading-snug"
            style={{ color: 'var(--q-text-secondary)' }}
          >
            {ind.verdictText}
          </span>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-1">
          {[
            {
              key: 'breakEven',
              label: 'Break-even',
              value: `Mo. ${ind.breakEven}`,
              sub: ind.runway < ind.breakEven ? '⚠ runway gap' : '✓ covered',
              color: beColor,
            },
            {
              key: 'rev12',
              label: 'Revenue M12',
              value: fmt(ind.rev12),
              sub: `vs avg ${fmt(ind.benchmarks.avgRev12)}`,
              color: 'var(--q-chart-1)',
            },
            {
              key: 'runway',
              label: 'Cash Runway',
              value: `${ind.runway} mo`,
              sub: runwayOk ? '✓ safe' : '⚠ critical',
              color: runwayOk ? 'var(--q-status-green)' : 'var(--q-status-red)',
            },
            {
              key: 'risk',
              label: 'Risk Score',
              value: String(ind.risk),
              sub: riskLabel(ind.risk),
              color: riskColor(ind.risk),
            },
          ].map((m) => (
            <div
              key={m.key}
              onMouseEnter={() => setActiveMetric(m.key)}
              onMouseLeave={() => setActiveMetric(null)}
              className="rounded-lg p-3 cursor-pointer transition-all duration-200 relative overflow-hidden"
              style={{
                background: activeMetric === m.key ? 'var(--q-bg-elevated)' : 'var(--q-bg-input)',
                border:
                  activeMetric === m.key
                    ? `1px solid ${m.color}`
                    : '1px solid var(--q-border-subtle)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-200"
                style={{
                  background: m.color,
                  opacity: activeMetric === m.key ? 1 : 0.25,
                }}
              />
              <div
                className="text-[10px] font-semibold tracking-wider uppercase mb-1.5"
                style={{ color: 'var(--q-text-tertiary)' }}
              >
                {m.label}
              </div>
              <div
                className="text-xl font-extrabold leading-none mb-1"
                style={{
                  color: m.color,
                  fontFamily: 'var(--q-font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {m.value}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--q-text-disabled)' }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Metric tooltip — FIXED HEIGHT REGION, no layout shift */}
        <div
          className="h-[52px] mb-3 transition-opacity duration-150 flex items-center"
          style={{ opacity: metric ? 1 : 0 }}
        >
          {metric && (
            <div
              className="rounded-lg px-4 py-2.5 w-full flex gap-3 items-start"
              style={{
                background: 'var(--q-bg-elevated)',
                border: '1px solid var(--q-border-default)',
              }}
            >
              <div className="flex-1 min-w-0">
                <span
                  className="text-[11px] font-bold mr-2"
                  style={{ color: 'var(--q-accent-primary)' }}
                >
                  ℹ {metric.title}
                </span>
                <span
                  className="text-[11px] leading-snug"
                  style={{ color: 'var(--q-text-secondary)' }}
                >
                  {metric.desc}
                </span>
                <span
                  className="text-[10px] ml-2"
                  style={{ color: 'var(--q-status-red)', opacity: 0.85 }}
                >
                  → {metric.crit}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart + Risk side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          {/* Revenue chart */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}
          >
            <div className="flex justify-between items-center mb-2.5">
              <span
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--q-text-tertiary)' }}
              >
                Revenue Trajectory
              </span>
              <span className="text-[10px]" style={{ color: 'var(--q-text-disabled)' }}>
                12-mo projection
              </span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={revData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id={`hero-g-${industry}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--q-accent-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--q-accent-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: 'var(--q-text-disabled)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--q-text-disabled)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <ReferenceLine
                  x={`M${ind.breakEven}`}
                  stroke={beColor}
                  strokeDasharray="3 2"
                  strokeOpacity={0.6}
                  label={{
                    value: 'B/E',
                    position: 'top',
                    fill: beColor,
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
                <RechartTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--q-accent-primary)"
                  strokeWidth={2}
                  fill={`url(#hero-g-${industry})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Risk breakdown */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}
          >
            <div
              className="text-[10px] font-semibold tracking-wider uppercase mb-3"
              style={{ color: 'var(--q-text-tertiary)' }}
            >
              Risk Factors
            </div>
            {ind.riskFactors.map((r, i) => (
              <div key={i} className={i < 3 ? 'mb-2.5' : ''}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px]" style={{ color: 'var(--q-text-secondary)' }}>
                    {r.name}
                  </span>
                  <span
                    className="text-[9px] font-bold tracking-wider"
                    style={{ color: riskColor(r.score) }}
                  >
                    {riskLabel(r.score)}
                  </span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'var(--q-bg-elevated)' }}>
                  <div
                    className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${r.score}%`, background: riskColor(r.score) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div
          className="rounded-lg p-3 mb-4"
          style={{ background: 'var(--q-bg-input)', border: '1px solid var(--q-border-subtle)' }}
        >
          <div
            className="text-[10px] font-semibold tracking-wider uppercase mb-2.5"
            style={{ color: 'var(--q-text-tertiary)' }}
          >
            Fatal Assumptions · Key Findings
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {ind.insights.map((insight, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span
                  className="text-[11px] mt-px shrink-0"
                  style={{ color: 'var(--q-accent-primary)' }}
                >
                  →
                </span>
                <span
                  className="text-[11px] leading-snug"
                  style={{ color: 'var(--q-text-secondary)' }}
                >
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Idea — compact single row */}
        <div
          className="flex items-center gap-3 pt-3"
          style={{ borderTop: '1px solid var(--q-border-subtle)' }}
        >
          <div className="flex-1 min-w-0">
            {idea ? (
              <div>
                <div
                  className="text-[11px] font-bold mb-0.5"
                  style={{ color: 'var(--q-accent-primary)' }}
                >
                  ✦ {idea.idea}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <span className="text-[10px]" style={{ color: 'var(--q-text-disabled)' }}>
                    B/E: M{idea.estimatedBreakEven}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--q-text-disabled)' }}>
                    ${idea.pricePerCustomer}/mo
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--q-status-green)' }}>
                    ⚡ {idea.differentiator.slice(0, 60)}…
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--q-text-tertiary)' }}>
                No idea? Let Quantis generate a calculable {industry} concept.
              </span>
            )}
          </div>
          <button
            onClick={handleGenerateIdea}
            disabled={generating}
            className="shrink-0 px-4 py-2 rounded-lg text-[11px] font-bold transition-all duration-200 whitespace-nowrap"
            style={{
              border: '1px solid var(--q-accent-primary)',
              background: 'var(--q-accent-glow)',
              color: 'var(--q-accent-primary)',
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? '⟳ Generating…' : `✦ Generate Idea`}
          </button>
        </div>
      </div>
    </div>
  );
}
