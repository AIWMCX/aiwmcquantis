import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';

interface ReportMarketAnalysisProps {
  result: BusinessAnalysisResult;
}

export function ReportMarketAnalysis({ result }: ReportMarketAnalysisProps) {
  const market = result.market_analysis;

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Market Analysis" idea={result.metadata.idea} pageNumber={5} />

      {/* Market Size */}
      <div style={pdfStyles.sectionTitle}>Market Size Analysis</div>
      <div style={{ ...pdfStyles.disclaimer, marginBottom: '12px' }}>
        AI-modeled estimate — not derived from the deterministic financial engine or a direct
        market-data benchmark. Treat as a starting hypothesis to validate, not a verified figure.
      </div>
      <div style={pdfStyles.marketSizeContainer}>
        <div style={pdfStyles.marketSizeItem}>
          <div style={pdfStyles.marketSizeCircle}>
            <div style={pdfStyles.marketSizeLabel}>TAM</div>
            <div style={pdfStyles.marketSizeValue}>{market.market_size.tam}</div>
            <div style={pdfStyles.marketSizeDesc}>Total Addressable Market</div>
          </div>
        </div>
        <div style={pdfStyles.marketSizeItem}>
          <div style={{ ...pdfStyles.marketSizeCircle, borderColor: '#3b82f6' }}>
            <div style={pdfStyles.marketSizeLabel}>SAM</div>
            <div style={pdfStyles.marketSizeValue}>{market.market_size.sam}</div>
            <div style={pdfStyles.marketSizeDesc}>Serviceable Addressable Market</div>
          </div>
        </div>
        <div style={pdfStyles.marketSizeItem}>
          <div style={{ ...pdfStyles.marketSizeCircle, borderColor: '#22c55e' }}>
            <div style={pdfStyles.marketSizeLabel}>SOM</div>
            <div style={pdfStyles.marketSizeValue}>{market.market_size.som}</div>
            <div style={pdfStyles.marketSizeDesc}>Serviceable Obtainable Market</div>
          </div>
        </div>
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
