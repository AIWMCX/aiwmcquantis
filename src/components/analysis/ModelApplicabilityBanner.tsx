/**
 * ModelApplicabilityBanner — Domain 5/12 audit (Q41/Q45/Q119/Q165/Q179).
 *
 * The financial engine assumes a steady monthly-transaction revenue shape.
 * Some business archetypes (see src/config/business-archetypes.ts --
 * currently: capacity-constrained service, project-based services,
 * contingency fee, transaction percentage) have 'poor' fit against that
 * shape. A server-side detector flags these at ingestion time and
 * populates `result.model_applicability_warning`.
 *
 * This banner surfaces that warning honestly, next to the report, so a
 * professional reader can see that the numbers below are indicative rather
 * than reliable for this specific business shape. The report still renders
 * -- we WARN, we do not BLOCK.
 *
 * Place near the top of the results view, ABOVE the KPI cards.
 */
import { AlertTriangle } from "lucide-react";
import type { BusinessAnalysisResult } from "@/types/analysis";
import { BUSINESS_ARCHETYPES } from "@/config/business-archetypes";

interface ModelApplicabilityBannerProps {
  warning: NonNullable<BusinessAnalysisResult["model_applicability_warning"]>;
}

export function ModelApplicabilityBanner({ warning }: ModelApplicabilityBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm"
      style={{ borderColor: "hsl(38 92% 50% / 0.4)", background: "hsl(38 92% 50% / 0.08)" }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color: "hsl(38 92% 40%)" }}
          aria-hidden="true"
        />
        <div className="space-y-1.5">
          <p className="font-semibold text-foreground">
            Revenue shape may not match this engine's model
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Detected in your description: <strong className="text-foreground">{BUSINESS_ARCHETYPES[warning.detected_shape].label}</strong>
            {" "}(matched phrase &ldquo;{warning.matched_phrase}&rdquo;). This engine
            assumes steady monthly-transaction revenue.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {warning.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
