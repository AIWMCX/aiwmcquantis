/**
 * The kernel's own decimal constructor.
 *
 * A clone, not the global Decimal: quantis-math.ts and quantis-math-server.ts both
 * call Decimal.set() on the shared constructor, and the kernel must not depend on
 * (or change) that global state. The `npm:` specifier is the one Deno uses; Vitest
 * aliases it to the decimal.js in package.json (vitest.config.ts) and Vite does the
 * same (vite.config.ts), so this file loads unchanged in all three runtimes.
 */
import { Decimal as BaseDecimal } from 'npm:decimal.js@10.4.3';

export const KDecimal = BaseDecimal.clone({ precision: 20, rounding: BaseDecimal.ROUND_HALF_UP });
export type KDecimal = InstanceType<typeof KDecimal>;

export class KernelInputError extends Error {}

/** Parses a decimal string. Throws on anything that is not a finite number: a caller bug, not a business state. */
export function parseDecimal(value: string, field: string): KDecimal {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new KernelInputError(`${field} must be a non-empty decimal string`);
  }
  let parsed: KDecimal;
  try {
    parsed = new KDecimal(value.trim());
  } catch {
    throw new KernelInputError(`${field} is not a decimal: ${JSON.stringify(value)}`);
  }
  if (!parsed.isFinite()) throw new KernelInputError(`${field} must be finite`);
  return parsed;
}

export const money = (d: KDecimal): string => d.toDecimalPlaces(2).toFixed(2);
export const ratio = (d: KDecimal): string => d.toDecimalPlaces(4).toFixed(4);
export const months2 = (d: KDecimal): string => d.toDecimalPlaces(2).toFixed(2);
