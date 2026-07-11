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
  if (result.months === "999" || result.months === "Infinity" || result.months === "NaN") {
    throw new Error(`Forbidden customer-facing sentinel: ${result.months}`);
  }
}
