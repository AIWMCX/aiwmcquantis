import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyRevenue } from '@/types/analysis';
import { pdfStyles, formatCurrency, formatNumber } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';

interface ReportFinancialsProps {
  result: BusinessAnalysisResult;
}

export function ReportFinancials({ result }: ReportFinancialsProps) {
  const financial = result.financial_analysis;
  const investment = financial.startup_investment;
  const expenses = financial.monthly_expenses;
  const scenarios = financial.scenarios;
  const unitEconomics = financial.unit_economics;

  return (
    <>
      {/* Page 3: Investment & Expenses */}
      <div style={pdfStyles.page}>
        <ReportHeader title="Financial Analysis" idea={result.metadata.idea} pageNumber={3} />

        {/* Investment Breakdown */}
        <div style={pdfStyles.sectionTitle}>Initial Investment Breakdown</div>
        <table style={pdfStyles.table}>
          <thead>
            <tr>
              <th style={pdfStyles.tableHeader}>Category</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Amount</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(investment.breakdown).map(([key, value]) => (
              <tr key={key}>
                <td style={pdfStyles.tableCell}>
                  {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                  {formatCurrency(value)}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                  {formatNumber((value / investment.total) * 100)}%
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#1e3a5f' }}>
              <td style={{ ...pdfStyles.tableCell, fontWeight: 'bold' }}>Total Investment</td>
              <td style={{ ...pdfStyles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(investment.total)}
              </td>
              <td style={{ ...pdfStyles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                100%
              </td>
            </tr>
          </tbody>
        </table>

        {/* Monthly Operating Expenses */}
        <div style={pdfStyles.sectionTitle}>Monthly Operating Expenses</div>
        <table style={pdfStyles.table}>
          <thead>
            <tr>
              <th style={pdfStyles.tableHeader}>Expense Category</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Monthly Cost</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Annual Cost</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(expenses.breakdown).map(([key, value]) => (
              <tr key={key}>
                <td style={pdfStyles.tableCell}>
                  {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                  {formatCurrency(value)}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                  {formatCurrency(value * 12)}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#1e3a5f' }}>
              <td style={{ ...pdfStyles.tableCell, fontWeight: 'bold' }}>Total Monthly</td>
              <td style={{ ...pdfStyles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(expenses.total)}
              </td>
              <td style={{ ...pdfStyles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(expenses.total * 12)}
              </td>
            </tr>
          </tbody>
        </table>

        <ReportFooter pageNumber={3} />
      </div>

      {/* Page 4: Scenario Analysis */}
      <div style={pdfStyles.page}>
        <ReportHeader title="Scenario Analysis" idea={result.metadata.idea} pageNumber={4} />

        {scenarios && (
          <>
            <div style={pdfStyles.sectionTitle}>Three-Scenario Financial Model</div>
            <table style={pdfStyles.table}>
              <thead>
                <tr>
                  <th style={pdfStyles.tableHeader}>Metric</th>
                  <th style={{ ...pdfStyles.tableHeader, textAlign: 'right', color: '#ef4444' }}>
                    Pessimistic
                  </th>
                  <th style={{ ...pdfStyles.tableHeader, textAlign: 'right', color: '#3b82f6' }}>
                    Base Case
                  </th>
                  <th style={{ ...pdfStyles.tableHeader, textAlign: 'right', color: '#22c55e' }}>
                    Optimistic
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={pdfStyles.tableCell}>Monthly Revenue</td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatCurrency(scenarios.pessimistic.revenue)}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatCurrency(scenarios.base.revenue)}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatCurrency(scenarios.optimistic.revenue)}
                  </td>
                </tr>
                <tr>
                  <td style={pdfStyles.tableCell}>Gross Profit</td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatCurrency(scenarios.pessimistic.gross_profit)}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatCurrency(scenarios.base.gross_profit)}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatCurrency(scenarios.optimistic.gross_profit)}
                  </td>
                </tr>
                <tr>
                  <td style={pdfStyles.tableCell}>Net Profit</td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right', color: scenarios.pessimistic.net_profit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {formatCurrency(scenarios.pessimistic.net_profit)}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right', color: scenarios.base.net_profit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {formatCurrency(scenarios.base.net_profit)}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right', color: scenarios.optimistic.net_profit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {formatCurrency(scenarios.optimistic.net_profit)}
                  </td>
                </tr>
                <tr>
                  <td style={pdfStyles.tableCell}>Gross Margin</td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatNumber(scenarios.pessimistic.gross_margin)}%
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatNumber(scenarios.base.gross_margin)}%
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatNumber(scenarios.optimistic.gross_margin)}%
                  </td>
                </tr>
                <tr>
                  <td style={pdfStyles.tableCell}>Net Margin</td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatNumber(scenarios.pessimistic.net_margin)}%
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatNumber(scenarios.base.net_margin)}%
                  </td>
                  <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                    {formatNumber(scenarios.optimistic.net_margin)}%
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Visual Bar Chart */}
            <div style={pdfStyles.chartSection}>
              <div style={pdfStyles.chartTitle}>Net Profit Comparison</div>
              <div style={pdfStyles.barChartContainer}>
                {[
                  { label: 'Pessimistic', value: scenarios.pessimistic.net_profit, color: '#ef4444' },
                  { label: 'Base', value: scenarios.base.net_profit, color: '#3b82f6' },
                  { label: 'Optimistic', value: scenarios.optimistic.net_profit, color: '#22c55e' },
                ].map((bar, i) => {
                  const maxValue = Math.max(
                    Math.abs(scenarios.pessimistic.net_profit),
                    Math.abs(scenarios.base.net_profit),
                    Math.abs(scenarios.optimistic.net_profit)
                  );
                  const width = Math.abs(bar.value) / maxValue * 100;
                  return (
                    <div key={i} style={pdfStyles.barRow}>
                      <div style={pdfStyles.barLabel}>{bar.label}</div>
                      <div style={pdfStyles.barTrack}>
                        <div style={{
                          ...pdfStyles.barFill,
                          width: `${width}%`,
                          backgroundColor: bar.color,
                        }} />
                      </div>
                      <div style={{ ...pdfStyles.barValue, color: bar.value >= 0 ? '#22c55e' : '#ef4444' }}>
                        {formatCurrency(bar.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Unit Economics */}
        {unitEconomics && (
          <>
            <div style={pdfStyles.sectionTitle}>Unit Economics</div>
            <div style={pdfStyles.metricsGrid}>
              <div style={pdfStyles.metricCard}>
                <div style={pdfStyles.metricCardLabel}>Customer Acquisition Cost (CAC)</div>
                <div style={pdfStyles.metricCardValue}>{formatCurrency(unitEconomics.cac)}</div>
              </div>
              <div style={pdfStyles.metricCard}>
                <div style={pdfStyles.metricCardLabel}>Lifetime Value (LTV)</div>
                <div style={pdfStyles.metricCardValue}>{formatCurrency(unitEconomics.ltv)}</div>
              </div>
              <div style={pdfStyles.metricCard}>
                <div style={pdfStyles.metricCardLabel}>LTV:CAC Ratio</div>
                <div style={{
                  ...pdfStyles.metricCardValue,
                  color: unitEconomics.ltv_cac_ratio >= 3 ? '#22c55e' : 
                         unitEconomics.ltv_cac_ratio >= 1 ? '#f59e0b' : '#ef4444'
                }}>
                  {formatNumber(unitEconomics.ltv_cac_ratio)}x
                </div>
              </div>
              <div style={pdfStyles.metricCard}>
                <div style={pdfStyles.metricCardLabel}>CAC Payback</div>
                <div style={pdfStyles.metricCardValue}>{formatNumber(unitEconomics.cac_payback_months)} months</div>
              </div>
            </div>
          </>
        )}

        <ReportFooter pageNumber={4} />
      </div>
    </>
  );
}
