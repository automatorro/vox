-- Add importance column to items table for Eisenhower Matrix support
ALTER TABLE public.items 
ADD COLUMN importance text DEFAULT 'low' CHECK (importance IN ('low', 'high'));