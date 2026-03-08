import React, { forwardRef } from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths, getMonthlyRevenue } from '@/types/analysis';
import { formatPaybackDisplay } from '@/lib/formatPayback';
import { TrendingUp, Shield, Clock, DollarSign, Target, BarChart3 } from 'lucide-react';

interface ViralCardProps {
  result: BusinessAnalysisResult;
  variant: 'twitter' | 'reddit';
}

const fmt = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v).toLocaleString()}`;
};

const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

export const ViralCard = forwardRef<HTMLDivElement, ViralCardProps>(
  ({ result, variant }, ref) => {
    const profit = getMonthlyProfit(result.financial_analysis);
    const revenue = getMonthlyRevenue(result.financial_analysis);
    const payback = getPaybackMonths(result.financial_analysis);
    const roi = result.financial_analysis.returns?.roi_year_1 ?? result.financial_analysis.roi_year_1 ?? 0;
    const grossMargin = result.financial_analysis.scenarios?.base?.gross_margin ?? 0;
    const confidence = result.confidence_score;
    const idea = result.metadata.idea;
    const location = result.metadata.location;
    const industry = result.metadata.industry_detected ?? 'General';

    const isProfitable = profit > 0;
    const verdictLabel = isProfitable ? 'VIABLE' : 'NEEDS WORK';
    const verdictColor = isProfitable ? '#22c55e' : '#f59e0b';

    const w = variant === 'twitter' ? 1200 : 1200;
    const h = variant === 'twitter' ? 675 : 628;

    return (
      <div
        ref={ref}
        style={{
          width: `${w}px`,
          height: `${h}px`,
          background: 'linear-gradient(145deg, #0c1222 0%, #111b30 50%, #0f172a 100%)',
          color: '#f1f5f9',
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient orb */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: '400px',
          height: '400px',
          background: `radial-gradient(circle, ${isProfitable ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'} 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />

        {/* Top row: brand + verdict */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '3px', color: '#3b82f6', marginBottom: '4px' }}>
              QUANTIS ANALYSIS
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px' }}>
              www.aiwmcquantis.com
            </div>
          </div>
          <div style={{
            padding: '8px 20px',
            borderRadius: '6px',
            border: `2px solid ${verdictColor}`,
            backgroundColor: `${verdictColor}15`,
          }}>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '3px', color: verdictColor }}>
              {verdictLabel}
            </span>
          </div>
        </div>

        {/* Business idea */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: '24px' }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: 1.25,
            color: '#f1f5f9',
            maxWidth: '800px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {idea}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '13px', color: '#94a3b8' }}>
            <span>{location}</span>
            <span>•</span>
            <span style={{ textTransform: 'capitalize' }}>{industry.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginTop: '28px',
          position: 'relative',
          zIndex: 1,
        }}>
          {[
            { label: 'Monthly Profit', value: fmt(profit), icon: '💰', highlight: isProfitable },
            { label: 'Monthly Revenue', value: fmt(revenue), icon: '📈' },
            { label: 'Gross Margin', value: pct(grossMargin), icon: '📊' },
            { label: 'Payback', value: formatPaybackDisplay(payback, profit), icon: '⏱️' },
          ].map((m, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(30,41,59,0.7)',
              borderRadius: '10px',
              padding: '20px',
              border: m.highlight ? `1px solid ${verdictColor}30` : '1px solid rgba(51,65,85,0.5)',
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {m.icon} {m.label}
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                color: m.highlight ? verdictColor : '#f1f5f9',
              }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row: ROI + confidence + CTA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid rgba(51,65,85,0.4)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Year 1 ROI</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: roi > 0 ? '#22c55e' : '#ef4444' }}>{pct(roi)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Confidence</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: confidence >= 70 ? '#3b82f6' : '#f59e0b' }}>{confidence}%</div>
            </div>
          </div>
          <div style={{
            fontSize: '13px',
            color: '#94a3b8',
            fontStyle: 'italic',
          }}>
            Validate your idea in 60 seconds →
          </div>
        </div>
      </div>
    );
  }
);

ViralCard.displayName = 'ViralCard';
