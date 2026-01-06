-- Add order column to items for persistence
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;