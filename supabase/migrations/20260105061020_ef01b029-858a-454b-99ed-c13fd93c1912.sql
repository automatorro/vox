-- Add recurrence support to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS recurrence_type text CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'none')),
ADD COLUMN IF NOT EXISTS recurrence_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS parent_item_id uuid REFERENCES public.items(id) ON DELETE CASCADE;

-- Set default for existing items
UPDATE public.items SET recurrence_type = 'none' WHERE recurrence_type IS NULL;

-- Create index for faster lookup of recurring items
CREATE INDEX IF NOT EXISTS idx_items_parent_id ON public.items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_items_recurrence ON public.items(recurrence_type) WHERE recurrence_type != 'none';