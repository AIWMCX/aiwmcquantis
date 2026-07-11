export type MonthsMetricResult =
  | {
      status: "VALUE";
      months: string;
      horizonMonths: number;
      formulaId: string;
      reasonCode: null;
    }
  | {
      status:
        | "NOT_ACHIEVED_WITHIN_HORIZON"
        | "NOT_APPLICABLE"
        | "INSUFFICIENT_INPUTS"
        | "INVALID_INPUTS"
        | "MODEL_UNSUPPORTED";
      months: null;
      horizonMonths: number;
      formulaId: string;
      reasonCode: string;
    };

export function assertNoNumericSentinel(result: MonthsMetricResult): void {
  const forbidden = ["999", "Infinity", "NaN"]; // sentinel-scan-ignore
  if (forbidden.includes(result.months as string)) {
    throw new Error(`Forbidden customer-facing sentinel: ${result.months}`);
  }
}
