-- P0-09 (MP7 accuracy audit): payback_months stores a legacy 999 sentinel
-- meaning "not achieved within horizon" (see financial-calculator.ts). This
-- is safely guarded everywhere it's displayed (payback-display-no-sentinel-
-- leak.test.ts), and the typed, sentinel-free result already persists
-- separately in analyses.investment_payback_result. This comment is pure
-- documentation -- no behavioral change -- to stop a future analytics/
-- reporting query from silently averaging 999 into a real number.
comment on column public.analyses.payback_months is
  'Legacy integer contract: 999 = NOT_ACHIEVED_WITHIN_HORIZON (not a real month count). Never AVG/SUM this column directly -- filter out 999 first, or use investment_payback_result (typed, sentinel-free) instead.';
