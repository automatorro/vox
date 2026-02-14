-- Add unique constraint on endpoint for upsert support
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);