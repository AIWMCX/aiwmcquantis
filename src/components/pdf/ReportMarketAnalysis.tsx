import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';
import { computeMarketSizing, formatUsd } from '@/lib/market-sizing';

interface ReportMarketAnalysisProps {
  result: BusinessAnalysisResult;
}

export function ReportMarketAnalysis({ result }: ReportMarketAnalysisProps) {
  const market = result.market_analysis;
  // Always render computed values so the PDF never ships an empty TAM/SAM/SOM.
  const sizing = computeMarketSizing(result, { idea: result.metadata?.idea });
  const tamLabel = market?.market_size?.tam || formatUsd(sizing.tam.value_usd);
  const samLabel = market?.market_size?.sam || formatUsd(sizing.sam.value_usd);
  const somLabel = market?.market_size?.som || formatUsd(sizing.som.value_usd);

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Market Analysis" idea={result.metadata.idea} pageNumber={5} />

      {/* Market Size */}
      <div style={pdfStyles.sectionTitle}>Market Size Analysis</div>
      <div style={pdfStyles.marketSizeContainer}>
        <div style={pdfStyles.marketSizeItem}>
          <div style={pdfStyles.marketSizeCircle}>
            <div style={pdfStyles.marketSizeLabel}>TAM</div>
            <div style={pdfStyles.marketSizeValue}>{tamLabel}</div>
            <div style={pdfStyles.marketSizeDesc}>Total Addressable Market</div>
          </div>
        </div>
        <div style={pdfStyles.marketSizeItem}>
          <div style={{ ...pdfStyles.marketSizeCircle, borderColor: '#3b82f6' }}>
            <div style={pdfStyles.marketSizeLabel}>SAM</div>
            <div style={pdfStyles.marketSizeValue}>{samLabel}</div>
            <div style={pdfStyles.marketSizeDesc}>Serviceable Addressable Market</div>
          </div>
        </div>
        <div style={pdfStyles.marketSizeItem}>
          <div style={{ ...pdfStyles.marketSizeCircle, borderColor: '#22c55e' }}>
            <div style={pdfStyles.marketSizeLabel}>SOM</div>
            <div style={pdfStyles.marketSizeValue}>{somLabel}</div>
            <div style={pdfStyles.marketSizeDesc}>Serviceable Obtainable Market</div>
          </div>
        </div>
      </div>
      <div style={{ ...pdfStyles.paragraph, fontSize: 9, color: '#475569', marginTop: 4 }}>
        {sizing.tam.investor_framing} {sizing.sam.investor_framing} {sizing.som.investor_framing}
      </div>

      {/* Market Trends */}
      <div style={pdfStyles.sectionTitle}>Key Market Trends</div>
      <div style={pdfStyles.listContainer}>
        {market.trends.map((trend, i) => (
          <div key={i} style={pdfStyles.listItem}>
            <span style={pdfStyles.listBullet}>{i + 1}</span>
            <span style={pdfStyles.listText}>{trend}</span>
          </div>
        ))}
      </div>

      {/* Competitive Landscape */}
      <div style={pdfStyles.sectionTitle}>Competitive Landscape</div>
      <div style={pdfStyles.paragraph}>
        {market.competition.competitive_landscape}
      </div>

      {/* Competitors Table */}
      {market.competition.main_competitors.length > 0 && (
        <table style={pdfStyles.table}>
          <thead>
            <tr>
              <th style={pdfStyles.tableHeader}>Competitor</th>
              <th style={pdfStyles.tableHeader}>Strengths</th>
              <th style={pdfStyles.tableHeader}>Weaknesses</th>
            </tr>
          </thead>
          <tbody>
            {market.competition.main_competitors.map((comp, i) => {
              const competitor = typeof comp === 'string' 
                ? { name: comp, strengths: '-', weaknesses: '-' }
                : comp;
              return (
                <tr key={i}>
                  <td style={pdfStyles.tableCell}>{competitor.name}</td>
                  <td style={pdfStyles.tableCell}>{competitor.strengths}</td>
                  <td style={pdfStyles.tableCell}>{competitor.weaknesses}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Market Gaps */}
      <div style={pdfStyles.sectionTitle}>Market Gaps & Opportunities</div>
      <div style={pdfStyles.highlightBox}>
        <div style={pdfStyles.highlightLabel}>Identified Gap</div>
        <div style={pdfStyles.highlightText}>{market.competition.market_gaps}</div>
      </div>

      <div style={{ ...pdfStyles.highlightBox, borderColor: '#22c55e', marginTop: '12px' }}>
        <div style={pdfStyles.highlightLabel}>Growth Opportunities</div>
        <div style={pdfStyles.highlightText}>{market.growth_opportunities}</div>
      </div>

      {/* Barriers to Entry */}
      <div style={pdfStyles.sectionTitle}>Barriers to Entry</div>
      <div style={pdfStyles.paragraph}>
        {market.barriers_to_entry}
      </div>

      <ReportFooter pageNumber={5} />
    </div>
  );
}
