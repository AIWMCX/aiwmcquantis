UPDATE public.subscriptions
SET current_period_end = now() + interval '10 years',
    cancel_at_period_end = false,
    status = 'active'
WHERE stripe_customer_id = 'founder_lifetime';