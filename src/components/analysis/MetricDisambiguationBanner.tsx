/**
 * MetricDisambiguationBanner — F4 fix.
 *
 * Educates users on the two distinct payback metrics so they never confuse:
 *   - CAC Payback (months): time to recover ONE customer's acquisition cost
 *   - Project Payback (years): time to recover the TOTAL initial investment
 *
 * Place directly under the metrics grid on the analysis results dashboard.
 */
import { Info } from "lucide-react";

interface MetricDisambiguationBannerProps {
  cacPaybackMonths: number;
  projectPaybackYears: number;
  initialInvestment: number;
  currencySymbol?: string;
}

export function MetricDisambiguationBanner({
  cacPaybackMonths,
  projectPaybackYears,
  initialInvestment,
  currencySymbol = "$",
}: MetricDisambiguationBannerProps) {
  const projectPaybackDisplay =
    projectPaybackYears >= 900
      ? "not recoverable at current net profit"
      : `${projectPaybackYears.toFixed(1)} years`;

  return (
    <div className="mb-6 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong className="text-foreground">Metric disambiguation:</strong>{" "}
          <strong className="text-foreground">CAC Payback</strong> ({cacPaybackMonths.toFixed(1)} months)
          measures how long to recover the cost of acquiring{" "}
          <em>one customer</em>.{" "}
          <strong className="text-foreground">Project Payback</strong> ({projectPaybackDisplay})
          measures how long to recover the{" "}
          <em>total initial investment</em> of {currencySymbol}
          {initialInvestment.toLocaleString()}. These are different metrics
          measuring different things — never compare them directly.
        </p>
      </div>
    </div>
  );
}
