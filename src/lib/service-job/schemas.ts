/**
 * Zod schemas for Service Job Quoting.
 * Shared between client forms and the data-access layer for runtime validation.
 */
import { z } from 'zod';

export const ScopeItemSchema = z.object({
  assembly_id: z.string().uuid(),
  quantity: z.number().positive().max(10_000),
  difficulty_factor: z.number().min(0.5).max(3.0),
  notes: z.string().max(500).optional(),
});

export const JobModifiersSchema = z
  .object({
    access_difficulty: z.number().min(0.5).max(3.0).optional(),
    height_factor: z.number().min(1).max(2.5).optional(),
    permit_required: z.boolean().optional(),
    permit_fee: z.number().min(0).max(10_000).optional(),
    after_hours: z.boolean().optional(),
    emergency: z.boolean().optional(),
    weekend: z.boolean().optional(),
    travel_miles: z.number().min(0).max(500).optional(),
  })
  .passthrough();

export const PricingProfileSchema = z.object({
  hourly_rate_journeyman: z.number().min(20).max(500),
  hourly_rate_helper: z.number().min(15).max(300).optional(),
  overhead_pct: z.number().min(0).max(1),
  target_margin_pct: z.number().min(0).max(0.9),
  material_markup_pct: z.number().min(0).max(2),
  waste_factor_default: z.number().min(0).max(0.5),
  tax_rate: z.number().min(0).max(0.25),
});

export const ServiceJobCreateSchema = z.object({
  trade_id: z.string().min(1),
  client_name: z.string().max(200).nullable().optional(),
  site_address: z.string().max(500).nullable().optional(),
  site_zip: z.string().max(20).nullable().optional(),
  building_type: z.string().max(100).nullable().optional(),
  year_built: z.number().int().min(1700).max(2100).nullable().optional(),
  scope_items: z.array(ScopeItemSchema).default([]),
  modifiers: JobModifiersSchema.default({}),
  pricing_profile: PricingProfileSchema,
});

export const ServiceJobPatchSchema = ServiceJobCreateSchema.partial().extend({
  status: z
    .enum(['draft', 'quoted', 'sent', 'won', 'lost', 'completed'])
    .optional(),
});

export const ServiceJobOutcomeSchema = z.object({
  actual_labor_hours: z.number().min(0).max(10_000).nullable().optional(),
  actual_materials_cost: z.number().min(0).nullable().optional(),
  actual_total_cost: z.number().min(0).nullable().optional(),
  actual_revenue: z.number().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const DEFAULT_PRICING_PROFILE = {
  hourly_rate_journeyman: 95,
  hourly_rate_helper: 55,
  overhead_pct: 0.18,
  target_margin_pct: 0.25,
  material_markup_pct: 0.35,
  waste_factor_default: 0.1,
  tax_rate: 0.08,
} as const;

export type ServiceJobCreateInput = z.infer<typeof ServiceJobCreateSchema>;
export type ServiceJobPatchInput = z.infer<typeof ServiceJobPatchSchema>;
export type ServiceJobOutcomeInput = z.infer<typeof ServiceJobOutcomeSchema>;
