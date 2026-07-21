-- The Methodology page has queried public.data_provenance since it was
-- built, but the table was never created -- confirmed 2026-07-21: the
-- query throws, falls through silently, and the "Verified Data Sources"
-- section has been rendering nothing in production. Seeded from
-- src/lib/canonical-data-sources.ts, which already had accurate,
-- arithmetically self-consistent data (690,074 records, matching this
-- table row-for-row) -- it just had nowhere real to write to.

CREATE TABLE IF NOT EXISTS public.data_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  license_type text NOT NULL,
  source_url text,
  coverage_description text,
  record_count bigint,
  date_range_start text,
  date_range_end text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.data_provenance IS
  'Public-facing data-source provenance shown on /methodology. Read-only for anon/authenticated; only service_role/postgres can write. Seeded 2026-07-21 from src/lib/canonical-data-sources.ts.';

ALTER TABLE public.data_provenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_provenance public read" ON public.data_provenance;
CREATE POLICY "data_provenance public read"
  ON public.data_provenance
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.data_provenance TO anon, authenticated;
GRANT ALL ON public.data_provenance TO service_role;

INSERT INTO public.data_provenance
  (source_name, license_type, coverage_description, record_count, date_range_start, date_range_end)
VALUES
  ('SEC XBRL Financial Statement Dataset', 'public_domain',
   'Line-item P&L, balance sheet and cash-flow distributions for benchmark derivation.',
   500000, '2009', '2025'),
  ('World Bank Enterprise Surveys', 'cc_by_4.0',
   'Cross-country SME cost structures, employment, and sales benchmarks.',
   180000, '2006', '2024'),
  ('JPMorgan Chase Institute SME Cash Flow', 'academic_reference',
   'Cash buffer, runway, and revenue volatility distributions for SMBs.',
   10000, '2015', '2023'),
  ('ProjectionHub SMB Benchmarks', 'public_reference',
   'COGS, payroll, rent and profit-margin ratios across small business industries.',
   50, '2020', '2025'),
  ('Kaggle Coffee Shop Financials (CC0)', 'cc0',
   'Calibration anchors for hospitality / food-service unit economics.',
   24, '2022', '2023'),
  ('AIWMC Quantis Benchmark Library', 'proprietary_derived',
   'P25/Median/P75 ranges per industry x geography x metric used in every metric badge.',
   97500, 'Continuously refreshed', null);
